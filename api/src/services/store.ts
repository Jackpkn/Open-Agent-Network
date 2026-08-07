import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Types (A2A-aligned + ACP Protocol Extensions) ────────────────

export interface A2AAgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities: {
    streaming?: boolean;
    pushNotifications?: boolean;
    stateTransitionHistory?: boolean;
  };
  skills: Array<{
    id: string;
    name: string;
    description: string;
    tags?: string[];
    examples?: string[];
    pricing?: { amount: string; currency: string };
  }>;
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  securitySchemes?: Record<string, unknown>;
}

export interface RegisteredAgent {
  id: number;
  agent_url: string;
  agent_card: A2AAgentCard;
  is_healthy: boolean;
  registered_at: string;
  last_health_check: string | null;
  pricing_amount?: string;
  pricing_currency?: string;
  stake_usdc?: string;
  slashed_usdc?: string;
  slash_reason?: string;
}

export type TaskState =
  | 'submitted'
  | 'working'
  | 'input-required'
  | 'completed'
  | 'disputed'
  | 'failed'
  | 'canceled'
  | 'rejected';

export interface Job {
  id: string;
  agent_id: number;
  agent_url: string;
  agent_name: string;
  skill_id: string;
  task_prompt: string;
  status: TaskState;
  result_text: string | null;
  result_artifacts: string | null; // JSON string of artifacts
  pricing_amount: string;
  pricing_currency: string;
  onchain_tx_hash?: string | null;
  verification_proof?: string | null;
  dispute_reason?: string | null;
  dispute_winner?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── SQLite Store ──────────────────────────────────────────────────

class DataStore {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(__dirname, '..', '..', 'data', 'oan.sqlite');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initTables();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_url TEXT UNIQUE NOT NULL,
        agent_card_json TEXT NOT NULL,
        is_healthy INTEGER DEFAULT 1,
        pricing_amount TEXT DEFAULT '0.00',
        pricing_currency TEXT DEFAULT 'USDC',
        stake_usdc TEXT DEFAULT '0.00',
        registered_at TEXT DEFAULT (datetime('now')),
        last_health_check TEXT
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        agent_id INTEGER NOT NULL,
        agent_url TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        skill_id TEXT NOT NULL,
        task_prompt TEXT NOT NULL,
        status TEXT DEFAULT 'submitted',
        result_text TEXT,
        result_artifacts TEXT,
        pricing_amount TEXT DEFAULT '0.00',
        pricing_currency TEXT DEFAULT 'USDC',
        onchain_tx_hash TEXT,
        verification_proof TEXT,
        dispute_reason TEXT,
        dispute_winner TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      );
    `);

    // Ensure columns exist for existing databases
    try {
      this.db.exec(`ALTER TABLE jobs ADD COLUMN onchain_tx_hash TEXT;`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE jobs ADD COLUMN verification_proof TEXT;`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE jobs ADD COLUMN dispute_reason TEXT;`);
    } catch (e) {}
    try {
      this.db.exec(`ALTER TABLE jobs ADD COLUMN dispute_winner TEXT;`);
    } catch (e) {}
  }

  // ─── Agent Registry ────────────────────────────────────────────

  registerAgent(
    agentUrl: string,
    agentCard: A2AAgentCard,
    pricingAmount?: string,
    pricingCurrency?: string,
    stakeUsdc?: string
  ): RegisteredAgent {
    const stmt = this.db.prepare(`
      INSERT INTO agents (agent_url, agent_card_json, pricing_amount, pricing_currency, stake_usdc)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(agent_url) DO UPDATE SET
        agent_card_json = excluded.agent_card_json,
        pricing_amount = excluded.pricing_amount,
        pricing_currency = excluded.pricing_currency,
        stake_usdc = excluded.stake_usdc,
        is_healthy = 1,
        last_health_check = datetime('now')
    `);

    stmt.run(
      agentUrl,
      JSON.stringify(agentCard),
      pricingAmount || '0.00',
      pricingCurrency || 'USDC',
      stakeUsdc || '0.00'
    );

    return this.getAgentByUrl(agentUrl)!;
  }

  getAgent(id: number): RegisteredAgent | undefined {
    const row = this.db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as any;
    return row ? this.rowToAgent(row) : undefined;
  }

  getAgentByUrl(url: string): RegisteredAgent | undefined {
    const row = this.db.prepare('SELECT * FROM agents WHERE agent_url = ?').get(url) as any;
    return row ? this.rowToAgent(row) : undefined;
  }

  getAllAgents(): RegisteredAgent[] {
    const rows = this.db.prepare('SELECT * FROM agents ORDER BY registered_at DESC').all() as any[];
    return rows.map((r) => this.rowToAgent(r));
  }

  searchAgents(params: { skill?: string; query?: string }): RegisteredAgent[] {
    let agents = this.getAllAgents();

    if (params.skill) {
      const skill = params.skill.toLowerCase();
      agents = agents.filter((a) =>
        a.agent_card.skills.some(
          (s) =>
            s.id.toLowerCase() === skill ||
            s.name.toLowerCase().includes(skill) ||
            (s.tags || []).some((t) => t.toLowerCase().includes(skill))
        )
      );
    }

    if (params.query) {
      const q = params.query.toLowerCase();
      agents = agents.filter(
        (a) =>
          a.agent_card.name.toLowerCase().includes(q) ||
          a.agent_card.description.toLowerCase().includes(q) ||
          a.agent_card.skills.some(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              s.description.toLowerCase().includes(q) ||
              (s.tags || []).some((t) => t.toLowerCase().includes(q))
          )
      );
    }

    return agents;
  }

  updateHealthStatus(id: number, isHealthy: boolean) {
    this.db.prepare(
      'UPDATE agents SET is_healthy = ?, last_health_check = datetime(\'now\') WHERE id = ?'
    ).run(isHealthy ? 1 : 0, id);
  }

  slashAgent(id: number, amount: string = '50.00', reason: string = 'Consecutive health check failures') {
    this.db.prepare(
      'UPDATE agents SET is_healthy = 0, stake_usdc = CAST(MAX(0, CAST(stake_usdc AS REAL) - ?) AS TEXT) WHERE id = ?'
    ).run(parseFloat(amount), id);
  }

  deleteAgent(id: number) {
    this.db.prepare('DELETE FROM agents WHERE id = ?').run(id);
  }

  // ─── Jobs ──────────────────────────────────────────────────────

  createJob(job: Omit<Job, 'created_at' | 'updated_at'>): Job {
    const stmt = this.db.prepare(`
      INSERT INTO jobs (id, agent_id, agent_url, agent_name, skill_id, task_prompt, status, pricing_amount, pricing_currency, onchain_tx_hash, verification_proof)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      job.id,
      job.agent_id,
      job.agent_url,
      job.agent_name,
      job.skill_id,
      job.task_prompt,
      job.status,
      job.pricing_amount,
      job.pricing_currency,
      job.onchain_tx_hash || null,
      job.verification_proof || null
    );

    return this.getJob(job.id)!;
  }

  getJob(id: string): Job | undefined {
    const row = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as any;
    return row ? this.rowToJob(row) : undefined;
  }

  getAllJobs(): Job[] {
    const rows = this.db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all() as any[];
    return rows.map((r) => this.rowToJob(r));
  }

  updateJobStatus(id: string, status: TaskState, resultText?: string, resultArtifacts?: string) {
    this.db.prepare(
      `UPDATE jobs SET status = ?, result_text = COALESCE(?, result_text), result_artifacts = COALESCE(?, result_artifacts), updated_at = datetime('now') WHERE id = ?`
    ).run(status, resultText || null, resultArtifacts || null, id);
  }

  verifyAndCompleteJob(id: string, verificationProof: string, txHash?: string): Job | undefined {
    this.db.prepare(
      `UPDATE jobs SET status = 'completed', verification_proof = ?, onchain_tx_hash = COALESCE(?, onchain_tx_hash), updated_at = datetime('now') WHERE id = ?`
    ).run(verificationProof, txHash || null, id);
    return this.getJob(id);
  }

  disputeJob(id: string, disputeReason: string): Job | undefined {
    this.db.prepare(
      `UPDATE jobs SET status = 'disputed', dispute_reason = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(disputeReason, id);
    return this.getJob(id);
  }

  resolveDispute(id: string, winner: 'hirer' | 'worker'): Job | undefined {
    const nextStatus: TaskState = winner === 'worker' ? 'completed' : 'canceled';
    this.db.prepare(
      `UPDATE jobs SET status = ?, dispute_winner = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(nextStatus, winner, id);
    return this.getJob(id);
  }

  // ─── Private helpers ───────────────────────────────────────────

  private rowToAgent(row: any): RegisteredAgent {
    let card: A2AAgentCard = {
      name: `Agent #${row.id}`,
      description: 'A2A Agent',
      url: row.agent_url || '',
      version: '1.0.0',
      capabilities: {},
      skills: [],
    };
    if (row.agent_card_json) {
      try {
        card = JSON.parse(row.agent_card_json);
      } catch (e) {
        console.warn(`JSON.parse warning for agent #${row.id}:`, e);
      }
    }

    return {
      id: row.id,
      agent_url: row.agent_url,
      agent_card: card,
      is_healthy: !!row.is_healthy,
      registered_at: row.registered_at,
      last_health_check: row.last_health_check,
      pricing_amount: row.pricing_amount,
      pricing_currency: row.pricing_currency,
      stake_usdc: row.stake_usdc,
    };
  }

  private rowToJob(row: any): Job {
    return {
      id: row.id,
      agent_id: row.agent_id,
      agent_url: row.agent_url,
      agent_name: row.agent_name,
      skill_id: row.skill_id,
      task_prompt: row.task_prompt,
      status: row.status,
      result_text: row.result_text,
      result_artifacts: row.result_artifacts,
      pricing_amount: row.pricing_amount,
      pricing_currency: row.pricing_currency,
      onchain_tx_hash: row.onchain_tx_hash,
      verification_proof: row.verification_proof,
      dispute_reason: row.dispute_reason,
      dispute_winner: row.dispute_winner,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export const store = new DataStore();
