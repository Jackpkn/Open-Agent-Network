import crypto from 'node:crypto';
import { getDb } from './store.js';
import { initProtocolSchema } from './schema.js';

export type EventActor = 'hub' | 'worker' | 'user' | 'watchdog';

export interface JobEvent {
  job_id: string;
  seq: number;
  type: string;
  actor: EventActor;
  payload: Record<string, unknown>;
  prev_hash: string | null;
  hash: string;
  created_at: string;
}

export type JobEventListener = (event: JobEvent) => void;

function hashEvent(prevHash: string | null, seq: number, type: string, actor: string, payload: unknown): string {
  const canonical = [prevHash ?? '', seq, type, actor, JSON.stringify(payload ?? {})].join('\n');
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * The append-only record of everything that happened to a job.
 *
 * Two jobs at once: it is the live progress feed a hirer watches, and it is the
 * evidence a dispute is decided from. Entries are hash-chained, so a settled job
 * cannot be quietly rewritten after the fact — altering any entry breaks every
 * hash after it, and the receipt pins the head of the chain.
 */
class JobLog {
  private listeners = new Map<string, Set<JobEventListener>>();

  private get db() {
    initProtocolSchema();
    return getDb();
  }

  /** Append an event. Sequence numbers are assigned inside the transaction, so concurrent writers cannot collide. */
  append(
    jobId: string,
    entry: { type: string; actor: EventActor; payload?: Record<string, unknown> }
  ): JobEvent {
    const payload = entry.payload ?? {};

    const written = this.db.transaction(() => {
      const tip = this.db
        .prepare('SELECT seq, hash FROM job_events WHERE job_id = ? ORDER BY seq DESC LIMIT 1')
        .get(jobId) as { seq: number; hash: string } | undefined;

      const seq = (tip?.seq ?? 0) + 1;
      const prevHash = tip?.hash ?? null;
      const hash = hashEvent(prevHash, seq, entry.type, entry.actor, payload);

      this.db
        .prepare(
          `INSERT INTO job_events (job_id, seq, type, actor, payload_json, prev_hash, hash)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(jobId, seq, entry.type, entry.actor, JSON.stringify(payload), prevHash, hash);

      return this.db
        .prepare('SELECT * FROM job_events WHERE job_id = ? AND seq = ?')
        .get(jobId, seq) as any;
    })();

    const event = this.rowToEvent(written);
    this.emit(event);
    return event;
  }

  /** Backlog for a reconnecting client. `afterSeq` comes straight from Last-Event-ID. */
  since(jobId: string, afterSeq = 0): JobEvent[] {
    const rows = this.db
      .prepare('SELECT * FROM job_events WHERE job_id = ? AND seq > ? ORDER BY seq ASC')
      .all(jobId, afterSeq) as any[];
    return rows.map((r) => this.rowToEvent(r));
  }

  head(jobId: string): JobEvent | undefined {
    const row = this.db
      .prepare('SELECT * FROM job_events WHERE job_id = ? ORDER BY seq DESC LIMIT 1')
      .get(jobId) as any;
    return row ? this.rowToEvent(row) : undefined;
  }

  /** Recompute the chain. Used by dispute review and by the receipt endpoint. */
  verifyChain(jobId: string): { valid: boolean; brokenAtSeq?: number } {
    let prevHash: string | null = null;

    for (const event of this.since(jobId, 0)) {
      const expected = hashEvent(prevHash, event.seq, event.type, event.actor, event.payload);
      if (expected !== event.hash) return { valid: false, brokenAtSeq: event.seq };
      prevHash = event.hash;
    }

    return { valid: true };
  }

  /** Live feed for one job. Returns an unsubscribe function. */
  subscribe(jobId: string, listener: JobEventListener): () => void {
    let set = this.listeners.get(jobId);
    if (!set) {
      set = new Set();
      this.listeners.set(jobId, set);
    }
    set.add(listener);

    return () => {
      const current = this.listeners.get(jobId);
      if (!current) return;
      current.delete(listener);
      if (current.size === 0) this.listeners.delete(jobId);
    };
  }

  subscriberCount(jobId: string): number {
    return this.listeners.get(jobId)?.size ?? 0;
  }

  private emit(event: JobEvent) {
    const set = this.listeners.get(event.job_id);
    if (!set) return;

    for (const listener of set) {
      try {
        listener(event);
      } catch (err) {
        // A broken subscriber must never stop the job or the other subscribers.
        console.warn(`[job-log] subscriber for ${event.job_id} threw:`, err);
      }
    }
  }

  private rowToEvent(row: any): JobEvent {
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(row.payload_json);
    } catch {
      payload = { unparseable: row.payload_json };
    }

    return {
      job_id: row.job_id,
      seq: row.seq,
      type: row.type,
      actor: row.actor,
      payload,
      prev_hash: row.prev_hash,
      hash: row.hash,
      created_at: row.created_at,
    };
  }
}

export const jobLog = new JobLog();
