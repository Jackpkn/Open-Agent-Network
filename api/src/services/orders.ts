import crypto from 'node:crypto';
import { getDb, store } from './store.js';
import { initProtocolSchema, JobState, TERMINAL_STATES, legacyStatusFor } from './schema.js';
import { artifacts, ArtifactRecord } from './artifacts.js';
import { jobLog, EventActor } from './job-log.js';
import { ledger } from './ledger.js';
import { eventHub } from './websocket-hub.js';
import { config } from './config.js';
import { hashSecret, newId } from './tokens.js';
import { formatUsdc, parseUsdc } from './money.js';
import { DataHandling, normalizeDataHandling } from './data-handling.js';

export interface Order {
  id: string;
  user_id: string | null;
  agent_id: number;
  agent_url: string;
  agent_name: string;
  skill_id: string;
  task_prompt: string;
  state: JobState;
  progress: number;
  current_step: string | null;
  steps: string[];
  /** How the hirer's client should render this agent's output. Declared by the skill. */
  result_view: ResultView;
  /** The agent's data-handling claim as it stood when this job was created. */
  data_handling: DataHandling;
  input_artifact_id: string | null;
  output_artifact_ids: string[];
  params: Record<string, unknown>;
  price_usdc: string;
  currency: string;
  task_hash: string | null;
  protocol: 'oan' | 'legacy' | null;
  worker_token_hash: string | null;
  deadline_at: string | null;
  dispatched_at: string | null;
  last_heartbeat_at: string | null;
  delivered_at: string | null;
  accept_by: string | null;
  settled_at: string | null;
  failure_code: string | null;
  failure_message: string | null;
  heartbeat_timeout_s: number;
  result_text: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * The shape of an agent's output, so a client can render work it has never seen.
 *
 * A table extractor, a code auditor and a translator produce completely different
 * things. Rather than the UI knowing about each agent, the skill declares which of
 * a handful of shapes its output takes, and the client has one renderer per shape.
 */
export type ResultView = 'table' | 'findings' | 'document' | 'text' | 'files';

const RESULT_VIEWS: ReadonlySet<string> = new Set(['table', 'findings', 'document', 'text', 'files']);

/** Fall back to the output type when a skill declares nothing. */
export function resultViewFor(skill: Record<string, unknown> | undefined): ResultView {
  const declared = skill?.result_view;
  if (typeof declared === 'string' && RESULT_VIEWS.has(declared)) return declared as ResultView;
  return 'files';
}

export class OrderError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message);
    this.name = 'OrderError';
  }
}

/**
 * Legal state transitions. Anything not listed here is rejected, so a late worker
 * callback can never resurrect a settled job or move money a second time.
 */
const TRANSITIONS: Record<JobState, JobState[]> = {
  funded: ['dispatched', 'canceled', 'failed', 'expired'],
  dispatched: ['working', 'delivered', 'stalled', 'failed', 'expired'],
  working: ['working', 'delivered', 'stalled', 'failed', 'expired'],
  stalled: ['working', 'delivered', 'failed', 'expired'],
  delivered: ['verifying', 'failed'],
  verifying: ['accepted', 'rejected', 'failed'],
  accepted: [],
  rejected: ['disputed', 'accepted'],
  disputed: ['accepted', 'refunded'],
  failed: [],
  expired: [],
  canceled: [],
  refunded: [],
};

/** Hirer-facing wording for each state. The worker's vocabulary never reaches the hirer raw. */
const STATE_MESSAGE: Record<JobState, string> = {
  funded: 'Finding your agent',
  dispatched: 'Starting up',
  working: 'Working on it',
  stalled: 'The agent has gone quiet',
  delivered: 'Checking the result',
  verifying: 'Checking the result',
  accepted: 'Done',
  rejected: 'You reported a problem',
  disputed: 'Under review',
  failed: 'Could not be completed',
  expired: 'Ran out of time',
  canceled: 'Canceled',
  refunded: 'Refunded',
};

class OrderService {
  private get db() {
    initProtocolSchema();
    return getDb();
  }

  /**
   * Bind the money to this exact piece of work.
   *
   * A worker can recompute this hash from what it was asked to do and compare it
   * against the funded escrow, so it can tell it is being paid for the task in
   * front of it rather than a cheaper one someone swapped in.
   */
  computeTaskHash(input: {
    jobId: string;
    skillId: string;
    inputSha256: string | null;
    params: Record<string, unknown>;
    priceUsdc: string;
    deadlineAt: string;
  }): string {
    const canonical = [
      input.jobId,
      input.skillId,
      input.inputSha256 ?? '',
      JSON.stringify(input.params ?? {}),
      input.priceUsdc,
      input.deadlineAt,
    ].join('\n');
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  create(input: {
    userId: string;
    agentId: number;
    skillId?: string;
    instructions: string;
    inputArtifactId?: string;
    params?: Record<string, unknown>;
    deadlineSeconds?: number;
  }): Order {
    const agent = store.getAgent(input.agentId);
    if (!agent) throw new OrderError(`No agent registered with id ${input.agentId}`, 404);
    if (!input.instructions?.trim()) throw new OrderError('Tell the agent what you need done');

    const skill =
      agent.agent_card.skills.find((s) => s.id === input.skillId) || agent.agent_card.skills[0];
    if (!skill) throw new OrderError(`Agent ${agent.agent_card.name} advertises no skills`, 409);

    let inputArtifact: ArtifactRecord | undefined;
    if (input.inputArtifactId) {
      inputArtifact = artifacts.get(input.inputArtifactId);
      if (!inputArtifact) throw new OrderError(`Upload ${input.inputArtifactId} not found`, 404);
      if (inputArtifact.owner_user_id !== input.userId) {
        throw new OrderError('That upload belongs to someone else', 403);
      }
      if (inputArtifact.job_id) throw new OrderError('That upload is already attached to a job', 409);
    }

    const jobId = newId('job');
    const price = formatUsdc(parseUsdc(agent.pricing_amount || '0.00'));
    const deadlineAt = new Date(
      Date.now() + (input.deadlineSeconds ?? config.defaultDeadlineSeconds) * 1000
    ).toISOString();
    const params = input.params ?? {};
    const steps = Array.isArray((skill as any).steps) ? ((skill as any).steps as string[]) : [];
    const resultView = resultViewFor(skill as unknown as Record<string, unknown>);

    // Freeze the agent's claim at hire time so a later card edit cannot rewrite
    // what it promised on work already done.
    const dataHandling = normalizeDataHandling(agent.agent_card.data_handling);

    const taskHash = this.computeTaskHash({
      jobId,
      skillId: skill.id,
      inputSha256: inputArtifact?.sha256 ?? null,
      params,
      priceUsdc: price,
      deadlineAt,
    });

    // Hold the money before the job exists, so a funding failure leaves nothing behind.
    if (parseUsdc(price) > 0) {
      ledger.hold(input.userId, jobId, price);
    }

    this.db
      .prepare(
        `INSERT INTO jobs (
           id, user_id, agent_id, agent_url, agent_name, skill_id, task_prompt,
           status, state, pricing_amount, pricing_currency,
           input_artifact_id, params_json, steps_json, task_hash, result_view,
           data_handling_json, deadline_at, heartbeat_timeout_s, escrow_mode
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        jobId,
        input.userId,
        agent.id,
        agent.agent_url,
        agent.agent_card.name,
        skill.id,
        input.instructions,
        legacyStatusFor('funded'),
        'funded',
        price,
        agent.pricing_currency || 'USDC',
        inputArtifact?.id ?? null,
        JSON.stringify(params),
        JSON.stringify(steps),
        taskHash,
        resultView,
        JSON.stringify(dataHandling),
        deadlineAt,
        config.heartbeatTimeoutSeconds,
        config.escrowMode
      );

    if (inputArtifact) artifacts.bindToJob(inputArtifact.id, jobId);

    jobLog.append(jobId, {
      type: 'created',
      actor: 'user',
      payload: {
        agent: agent.agent_card.name,
        skill: skill.id,
        price_usdc: price,
        input: inputArtifact ? artifacts.describe(inputArtifact) : null,
        task_hash: taskHash,
        data_handling: dataHandling,
        deadline_at: deadlineAt,
      },
    });

    const order = this.get(jobId)!;
    eventHub.broadcast('job_created', order as unknown as Record<string, unknown>);
    return order;
  }

  get(id: string): Order | undefined {
    const row = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as any;
    return row ? this.rowToOrder(row) : undefined;
  }

  /** Fetch a job the caller is entitled to see. Ownership is checked here, once. */
  getOwned(id: string, userId: string): Order {
    const order = this.get(id);
    if (!order || order.user_id !== userId) {
      // Same response for "missing" and "someone else's" — do not leak existence.
      throw new OrderError(`No job ${id}`, 404);
    }
    return order;
  }

  listForUser(userId: string, limit = 50): Order[] {
    const rows = this.db
      .prepare('SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(userId, limit) as any[];
    return rows.map((r) => this.rowToOrder(r));
  }

  /** Jobs the watchdog needs to look at. */
  listByStates(states: JobState[]): Order[] {
    const placeholders = states.map(() => '?').join(',');
    const rows = this.db
      .prepare(`SELECT * FROM jobs WHERE state IN (${placeholders})`)
      .all(...states) as any[];
    return rows.map((r) => this.rowToOrder(r));
  }

  /**
   * Move a job to a new state, refusing anything the machine does not allow.
   * Returns undefined when the transition is not legal, so callers racing each
   * other (watchdog vs. worker callback) resolve to one winner without throwing.
   */
  transition(
    id: string,
    next: JobState,
    options: { actor: EventActor; reason?: string; extra?: Record<string, unknown> }
  ): Order | undefined {
    const current = this.get(id);
    if (!current) return undefined;
    if (current.state === next && next !== 'working') return current;
    if (!TRANSITIONS[current.state].includes(next)) return undefined;

    const columns: string[] = ['state = ?', 'status = ?', "updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')"];
    const values: unknown[] = [next, legacyStatusFor(next)];

    if (next === 'dispatched') {
      columns.push("dispatched_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
      columns.push("last_heartbeat_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    }
    if (next === 'delivered') {
      columns.push("delivered_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    }
    if (next === 'accepted') {
      columns.push("settled_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
      columns.push('progress = 1');
    }
    if (options.extra?.failure_code) {
      columns.push('failure_code = ?');
      values.push(options.extra.failure_code);
    }
    if (options.extra?.failure_message) {
      columns.push('failure_message = ?');
      values.push(options.extra.failure_message);
    }

    values.push(id);
    this.db.prepare(`UPDATE jobs SET ${columns.join(', ')} WHERE id = ?`).run(...values);

    jobLog.append(id, {
      type: 'state',
      actor: options.actor,
      payload: {
        from: current.state,
        to: next,
        message: STATE_MESSAGE[next],
        reason: options.reason ?? null,
        ...(options.extra ?? {}),
      },
    });

    const updated = this.get(id)!;

    if (TERMINAL_STATES.has(next)) {
      artifacts.scheduleExpiry(id);
    }

    eventHub.broadcast('job_status_updated', updated as unknown as Record<string, unknown>);
    return updated;
  }

  /** Record that the worker is alive, and optionally which step it is on. */
  recordProgress(
    id: string,
    update: { step?: string; progress?: number; note?: string }
  ): Order | undefined {
    const order = this.get(id);
    if (!order) return undefined;
    if (!['dispatched', 'working', 'stalled'].includes(order.state)) return order;

    const progress =
      typeof update.progress === 'number' && Number.isFinite(update.progress)
        ? Math.max(0, Math.min(1, update.progress))
        : order.progress;

    this.db
      .prepare(
        `UPDATE jobs SET
           last_heartbeat_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
           current_step = COALESCE(?, current_step),
           progress = ?,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE id = ?`
      )
      .run(update.step ?? null, progress, id);

    // A worker that starts talking again clears the stall.
    if (order.state !== 'working') {
      this.transition(id, 'working', { actor: 'worker', reason: 'Worker reported progress' });
    }

    return this.get(id);
  }

  setWorkerToken(id: string, token: string): void {
    this.db.prepare('UPDATE jobs SET worker_token_hash = ? WHERE id = ?').run(hashSecret(token), id);
  }

  setProtocol(id: string, protocol: 'oan' | 'legacy'): void {
    this.db.prepare('UPDATE jobs SET protocol = ? WHERE id = ?').run(protocol, id);
  }

  recordDelivery(id: string, outputArtifactIds: string[], resultText: string | null): void {
    this.db
      .prepare('UPDATE jobs SET output_artifact_ids = ?, result_text = COALESCE(?, result_text) WHERE id = ?')
      .run(JSON.stringify(outputArtifactIds), resultText, id);
  }

  setAcceptBy(id: string, acceptBy: string): void {
    this.db.prepare('UPDATE jobs SET accept_by = ? WHERE id = ?').run(acceptBy, id);
  }

  private rowToOrder(row: any): Order {
    const parse = <T,>(raw: string | null, fallback: T): T => {
      if (!raw) return fallback;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    };

    return {
      id: row.id,
      user_id: row.user_id ?? null,
      agent_id: row.agent_id,
      agent_url: row.agent_url,
      agent_name: row.agent_name,
      skill_id: row.skill_id,
      task_prompt: row.task_prompt,
      state: (row.state || 'funded') as JobState,
      progress: typeof row.progress === 'number' ? row.progress : 0,
      current_step: row.current_step ?? null,
      steps: parse<string[]>(row.steps_json, []),
      result_view: (row.result_view || 'files') as ResultView,
      data_handling: normalizeDataHandling(parse<unknown>(row.data_handling_json, null)),
      input_artifact_id: row.input_artifact_id ?? null,
      output_artifact_ids: parse<string[]>(row.output_artifact_ids, []),
      params: parse<Record<string, unknown>>(row.params_json, {}),
      price_usdc: row.pricing_amount ?? '0.00',
      currency: row.pricing_currency ?? 'USDC',
      task_hash: row.task_hash ?? null,
      protocol: (row.protocol ?? null) as 'oan' | 'legacy' | null,
      worker_token_hash: row.worker_token_hash ?? null,
      deadline_at: row.deadline_at ?? null,
      dispatched_at: row.dispatched_at ?? null,
      last_heartbeat_at: row.last_heartbeat_at ?? null,
      delivered_at: row.delivered_at ?? null,
      accept_by: row.accept_by ?? null,
      settled_at: row.settled_at ?? null,
      failure_code: row.failure_code ?? null,
      failure_message: row.failure_message ?? null,
      heartbeat_timeout_s: row.heartbeat_timeout_s ?? config.heartbeatTimeoutSeconds,
      result_text: row.result_text ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export const orders = new OrderService();
export { STATE_MESSAGE };
