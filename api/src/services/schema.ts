import { getDb } from './store.js';

/**
 * Schema for the hiring layer: who owns a job, what files it carries, and an
 * append-only log of everything that happened to it.
 *
 * Additive only. The original `agents`, `jobs` and `chat_messages` tables keep
 * working unchanged so the existing dashboard and example agents are unaffected.
 */

/** The full job lifecycle. `status` on the jobs table remains a legacy projection of this. */
export type JobState =
  | 'funded'      // money held, not yet sent to a worker
  | 'dispatched'  // sent, awaiting first sign of life
  | 'working'     // worker is emitting progress
  | 'stalled'     // heartbeat missed
  | 'delivered'   // worker submitted output
  | 'verifying'   // gate running
  | 'accepted'    // released to the worker
  | 'rejected'    // hirer objected inside the window
  | 'disputed'    // awaiting arbitration
  | 'failed'      // worker reported failure
  | 'expired'     // deadline passed with no delivery
  | 'canceled'    // withdrawn before dispatch
  | 'refunded';   // money returned

export const TERMINAL_STATES: ReadonlySet<JobState> = new Set<JobState>([
  'accepted',
  'refunded',
  'canceled',
  'expired',
  'failed',
]);

export const ACTIVE_STATES: ReadonlySet<JobState> = new Set<JobState>([
  'funded',
  'dispatched',
  'working',
  'stalled',
]);

/**
 * Legacy `status` values the existing dashboard and routes already understand.
 * Every new state projects onto one of them so nothing downstream breaks.
 */
export function legacyStatusFor(state: JobState): string {
  switch (state) {
    case 'funded':
    case 'dispatched':
      return 'submitted';
    case 'working':
    case 'stalled':
    case 'delivered':
    case 'verifying':
      return 'working';
    case 'accepted':
      return 'completed';
    case 'rejected':
    case 'disputed':
      return 'disputed';
    case 'failed':
      return 'failed';
    case 'expired':
    case 'canceled':
    case 'refunded':
      return 'canceled';
  }
}

function addColumn(table: string, definition: string) {
  try {
    getDb().exec(`ALTER TABLE ${table} ADD COLUMN ${definition};`);
  } catch {
    // Column already present — SQLite has no ADD COLUMN IF NOT EXISTS.
  }
}

let initialized = false;

export function initProtocolSchema() {
  if (initialized) return;
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE,
      display_name  TEXT,
      api_key_hash  TEXT UNIQUE NOT NULL,
      balance_usdc  TEXT NOT NULL DEFAULT '0.00',
      held_usdc     TEXT NOT NULL DEFAULT '0.00',
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id            TEXT PRIMARY KEY,
      owner_user_id TEXT,
      job_id        TEXT,
      kind          TEXT NOT NULL CHECK(kind IN ('input','output')),
      filename      TEXT NOT NULL,
      mime          TEXT NOT NULL,
      size_bytes    INTEGER NOT NULL,
      sha256        TEXT NOT NULL,
      storage_key   TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      expires_at    TEXT,
      deleted_at    TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_artifacts_job   ON artifacts(job_id);
    CREATE INDEX IF NOT EXISTS idx_artifacts_owner ON artifacts(owner_user_id);
    CREATE INDEX IF NOT EXISTS idx_artifacts_expiry ON artifacts(expires_at) WHERE deleted_at IS NULL;

    CREATE TABLE IF NOT EXISTS job_events (
      job_id      TEXT NOT NULL,
      seq         INTEGER NOT NULL,
      type        TEXT NOT NULL,
      actor       TEXT NOT NULL CHECK(actor IN ('hub','worker','user','watchdog')),
      payload_json TEXT NOT NULL,
      prev_hash   TEXT,
      hash        TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      PRIMARY KEY (job_id, seq)
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id          TEXT PRIMARY KEY,
      user_id     TEXT,
      agent_id    INTEGER,
      job_id      TEXT,
      kind        TEXT NOT NULL,
      amount_usdc TEXT NOT NULL,
      memo        TEXT,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_ledger_job  ON ledger_entries(job_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_entries(user_id);

    CREATE TABLE IF NOT EXISTS agent_earnings (
      agent_id       INTEGER PRIMARY KEY,
      claimable_usdc TEXT NOT NULL DEFAULT '0.00',
      lifetime_usdc  TEXT NOT NULL DEFAULT '0.00',
      updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
  `);

  // Hiring-layer columns on the existing jobs table.
  addColumn('jobs', "user_id TEXT");
  addColumn('jobs', "state TEXT NOT NULL DEFAULT 'funded'");
  addColumn('jobs', "input_artifact_id TEXT");
  addColumn('jobs', "output_artifact_ids TEXT");
  addColumn('jobs', "params_json TEXT");
  addColumn('jobs', "steps_json TEXT");
  addColumn('jobs', "current_step TEXT");
  addColumn('jobs', "progress REAL NOT NULL DEFAULT 0");
  addColumn('jobs', "worker_token_hash TEXT");
  addColumn('jobs', "protocol TEXT");
  addColumn('jobs', "deadline_at TEXT");
  addColumn('jobs', "dispatched_at TEXT");
  addColumn('jobs', "last_heartbeat_at TEXT");
  addColumn('jobs', "delivered_at TEXT");
  addColumn('jobs', "accept_by TEXT");
  addColumn('jobs', "settled_at TEXT");
  addColumn('jobs', "failure_code TEXT");
  addColumn('jobs', "failure_message TEXT");
  addColumn('jobs', "heartbeat_timeout_s INTEGER");
  addColumn('jobs', "escrow_mode TEXT");
  addColumn('jobs', "task_hash TEXT");
  addColumn('jobs', "result_view TEXT");
  addColumn('jobs', "data_handling_json TEXT");

  addColumn('agents', 'payout_key_hash TEXT');

  getDb().exec(`CREATE TABLE IF NOT EXISTS payouts (
    id          TEXT PRIMARY KEY,
    agent_id    INTEGER NOT NULL,
    amount_usdc TEXT NOT NULL,
    destination TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'recorded',
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );`);

  getDb().exec(`CREATE INDEX IF NOT EXISTS idx_jobs_user  ON jobs(user_id);`);
  getDb().exec(`CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state);`);

  // Existing rows predate the hiring layer; give them a coherent state.
  db.exec(`
    UPDATE jobs SET state = CASE
      WHEN status = 'completed' THEN 'accepted'
      WHEN status = 'disputed'  THEN 'disputed'
      WHEN status = 'failed'    THEN 'failed'
      WHEN status = 'canceled'  THEN 'canceled'
      WHEN status = 'working'   THEN 'working'
      ELSE 'funded'
    END
    WHERE state IS NULL OR state = '';
  `);

  initialized = true;
}
