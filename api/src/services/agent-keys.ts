import { getDb } from './store.js';
import { initProtocolSchema } from './schema.js';
import { generateApiKey, hashSecret } from './tokens.js';

/**
 * Identity for agent owners.
 *
 * An agent is registered by URL, which is enough to receive work but not enough
 * to claim money. A key is issued once at first registration and shown once; it
 * is what proves ownership when withdrawing earnings.
 */
class AgentKeys {
  private get db() {
    initProtocolSchema();
    return getDb();
  }

  /** Issue a key on first registration. Re-registering keeps the existing key. */
  ensure(agentId: number): string | null {
    const row = this.db.prepare('SELECT payout_key_hash FROM agents WHERE id = ?').get(agentId) as any;
    if (row?.payout_key_hash) return null;

    const key = generateApiKey().replace('oan_live_', 'oan_agent_');
    this.db.prepare('UPDATE agents SET payout_key_hash = ? WHERE id = ?').run(hashSecret(key), agentId);
    return key;
  }

  verify(agentId: number, key: string | undefined): boolean {
    if (!key) return false;
    const row = this.db.prepare('SELECT payout_key_hash FROM agents WHERE id = ?').get(agentId) as any;
    return !!row?.payout_key_hash && row.payout_key_hash === hashSecret(key);
  }
}

export const agentKeys = new AgentKeys();
