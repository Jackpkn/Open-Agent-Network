import { getDb } from './store.js';
import { initProtocolSchema } from './schema.js';
import { newId } from './tokens.js';
import { formatUsdc, parseUsdc, splitFee, Micros } from './money.js';
import { config } from './config.js';

export type LedgerKind = 'hold' | 'release' | 'refund' | 'fee' | 'credit' | 'withdrawal';

export interface LedgerEntry {
  id: string;
  user_id: string | null;
  agent_id: number | null;
  job_id: string | null;
  kind: LedgerKind;
  amount_usdc: string;
  memo: string | null;
  created_at: string;
}

export class InsufficientFunds extends Error {
  constructor(needed: string, available: string) {
    super(`Not enough balance: this job needs ${needed} USDC and the account has ${available} USDC available.`);
    this.name = 'InsufficientFunds';
  }
}

/**
 * The internal settlement ledger.
 *
 * Default mode for the hiring flow: a hirer's money moves to `held` when the job
 * is funded and only leaves on an explicit release or refund. On-chain escrow is
 * a separate opt-in mode; this ledger keeps the identical state machine so
 * switching between them changes settlement, not job semantics.
 *
 * Every mutation is a single SQLite transaction, and release/refund are
 * idempotent — the watchdog and a worker callback can race without double-paying.
 */
class Ledger {
  private get db() {
    initProtocolSchema();
    return getDb();
  }

  private record(entry: Omit<LedgerEntry, 'id' | 'created_at'>) {
    this.db
      .prepare(
        `INSERT INTO ledger_entries (id, user_id, agent_id, job_id, kind, amount_usdc, memo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newId('led'),
        entry.user_id,
        entry.agent_id,
        entry.job_id,
        entry.kind,
        entry.amount_usdc,
        entry.memo
      );
  }

  private settledEntry(jobId: string): LedgerEntry | undefined {
    return this.db
      .prepare(`SELECT * FROM ledger_entries WHERE job_id = ? AND kind IN ('release','refund') LIMIT 1`)
      .get(jobId) as LedgerEntry | undefined;
  }

  /** Move funds from a hirer's spendable balance into a hold against one job. */
  hold(userId: string, jobId: string, amountUsdc: string): void {
    const amount = parseUsdc(amountUsdc);
    if (amount <= 0) throw new Error('Hold amount must be positive');

    this.db.transaction(() => {
      const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
      if (!row) throw new Error(`Unknown user ${userId}`);

      const balance: Micros = parseUsdc(row.balance_usdc);
      if (balance < amount) {
        throw new InsufficientFunds(formatUsdc(amount), formatUsdc(balance));
      }

      this.db
        .prepare('UPDATE users SET balance_usdc = ?, held_usdc = ? WHERE id = ?')
        .run(formatUsdc(balance - amount), formatUsdc(parseUsdc(row.held_usdc) + amount), userId);

      this.record({
        user_id: userId,
        agent_id: null,
        job_id: jobId,
        kind: 'hold',
        amount_usdc: formatUsdc(amount),
        memo: 'Funds held for job',
      });
    })();
  }

  /** Held amount for a job, or 0 if it was never funded or is already settled. */
  heldFor(jobId: string): Micros {
    if (this.settledEntry(jobId)) return 0;
    const row = this.db
      .prepare(`SELECT amount_usdc FROM ledger_entries WHERE job_id = ? AND kind = 'hold' LIMIT 1`)
      .get(jobId) as any;
    return row ? parseUsdc(row.amount_usdc) : 0;
  }

  /**
   * Pay the worker. Idempotent: a second call after settlement is a no-op, so the
   * acceptance watchdog and an explicit accept can both fire safely.
   */
  release(jobId: string, userId: string, agentId: number): { worker: string; fee: string } | null {
    let result: { worker: string; fee: string } | null = null;

    this.db.transaction(() => {
      if (this.settledEntry(jobId)) return;

      const holdRow = this.db
        .prepare(`SELECT amount_usdc FROM ledger_entries WHERE job_id = ? AND kind = 'hold' LIMIT 1`)
        .get(jobId) as any;
      if (!holdRow) return;

      const amount = parseUsdc(holdRow.amount_usdc);
      const { worker, fee } = splitFee(amount, config.protocolFeeBps);

      const userRow = this.db.prepare('SELECT held_usdc FROM users WHERE id = ?').get(userId) as any;
      if (userRow) {
        this.db
          .prepare('UPDATE users SET held_usdc = ? WHERE id = ?')
          .run(formatUsdc(Math.max(0, parseUsdc(userRow.held_usdc) - amount)), userId);
      }

      const nextClaimable = formatUsdc(this.claimable(agentId) + worker);
      const nextLifetime = formatUsdc(this.lifetime(agentId) + worker);
      this.db
        .prepare(
          `INSERT INTO agent_earnings (agent_id, claimable_usdc, lifetime_usdc)
           VALUES (?, ?, ?)
           ON CONFLICT(agent_id) DO UPDATE SET
             claimable_usdc = excluded.claimable_usdc,
             lifetime_usdc  = excluded.lifetime_usdc,
             updated_at     = strftime('%Y-%m-%dT%H:%M:%fZ','now')`
        )
        .run(agentId, nextClaimable, nextLifetime);

      this.record({ user_id: userId, agent_id: agentId, job_id: jobId, kind: 'release', amount_usdc: formatUsdc(worker), memo: 'Released to worker' });
      if (fee > 0) {
        this.record({ user_id: userId, agent_id: agentId, job_id: jobId, kind: 'fee', amount_usdc: formatUsdc(fee), memo: 'Protocol fee' });
      }

      result = { worker: formatUsdc(worker), fee: formatUsdc(fee) };
    })();

    return result;
  }

  /** Return held funds to the hirer. Idempotent for the same reason as release. */
  refund(jobId: string, userId: string, memo: string): string | null {
    let refunded: string | null = null;

    this.db.transaction(() => {
      if (this.settledEntry(jobId)) return;

      const holdRow = this.db
        .prepare(`SELECT amount_usdc FROM ledger_entries WHERE job_id = ? AND kind = 'hold' LIMIT 1`)
        .get(jobId) as any;
      if (!holdRow) return;

      const amount = parseUsdc(holdRow.amount_usdc);
      const userRow = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
      if (userRow) {
        this.db
          .prepare('UPDATE users SET balance_usdc = ?, held_usdc = ? WHERE id = ?')
          .run(
            formatUsdc(parseUsdc(userRow.balance_usdc) + amount),
            formatUsdc(Math.max(0, parseUsdc(userRow.held_usdc) - amount)),
            userId
          );
      }

      this.record({ user_id: userId, agent_id: null, job_id: jobId, kind: 'refund', amount_usdc: formatUsdc(amount), memo });
      refunded = formatUsdc(amount);
    })();

    return refunded;
  }

  claimable(agentId: number): Micros {
    const row = this.db.prepare('SELECT claimable_usdc FROM agent_earnings WHERE agent_id = ?').get(agentId) as any;
    return row ? parseUsdc(row.claimable_usdc) : 0;
  }

  lifetime(agentId: number): Micros {
    const row = this.db.prepare('SELECT lifetime_usdc FROM agent_earnings WHERE agent_id = ?').get(agentId) as any;
    return row ? parseUsdc(row.lifetime_usdc) : 0;
  }

  /**
   * Claim earnings. Records the payout and zeroes the claimable balance in one
   * transaction, so a retry cannot pay twice.
   *
   * This is bookkeeping, not a transfer: it produces the payout record that a
   * payment rail (or on-chain withdrawal) settles against. Nothing is sent here.
   */
  recordPayout(agentId: number, destination: string): { id: string; amount_usdc: string } | null {
    let payout: { id: string; amount_usdc: string } | null = null;

    this.db.transaction(() => {
      const amount = this.claimable(agentId);
      if (amount <= 0) return;

      const id = newId('pay');
      this.db
        .prepare('UPDATE agent_earnings SET claimable_usdc = ? WHERE agent_id = ?')
        .run(formatUsdc(0), agentId);
      this.db
        .prepare('INSERT INTO payouts (id, agent_id, amount_usdc, destination) VALUES (?, ?, ?, ?)')
        .run(id, agentId, formatUsdc(amount), destination);

      this.record({
        user_id: null,
        agent_id: agentId,
        job_id: null,
        kind: 'withdrawal',
        amount_usdc: formatUsdc(amount),
        memo: `Payout to ${destination}`,
      });

      payout = { id, amount_usdc: formatUsdc(amount) };
    })();

    return payout;
  }

  payoutsFor(agentId: number): Array<Record<string, unknown>> {
    return this.db
      .prepare('SELECT * FROM payouts WHERE agent_id = ? ORDER BY created_at DESC')
      .all(agentId) as Array<Record<string, unknown>>;
  }

  entriesFor(jobId: string): LedgerEntry[] {
    return this.db
      .prepare('SELECT * FROM ledger_entries WHERE job_id = ? ORDER BY created_at ASC')
      .all(jobId) as LedgerEntry[];
  }
}

export const ledger = new Ledger();
