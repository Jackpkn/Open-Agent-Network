import { getDb } from './store.js';
import { initProtocolSchema } from './schema.js';
import { generateApiKey, hashSecret, newId } from './tokens.js';
import { formatUsdc, parseUsdc } from './money.js';

export interface User {
  id: string;
  email: string | null;
  display_name: string | null;
  balance_usdc: string;
  held_usdc: string;
  created_at: string;
}

function rowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    balance_usdc: row.balance_usdc,
    held_usdc: row.held_usdc,
    created_at: row.created_at,
  };
}

/**
 * Accounts for the people doing the hiring.
 *
 * API keys are shown once at creation and stored only as a SHA-256 hash, so a
 * database leak does not hand over the ability to spend anyone's balance.
 */
class UserStore {
  private get db() {
    initProtocolSchema();
    return getDb();
  }

  /** Create a user. The returned `apiKey` is the only time it is ever readable. */
  create(input: { email?: string; display_name?: string; opening_balance_usdc?: string }): {
    user: User;
    apiKey: string;
  } {
    const apiKey = generateApiKey();
    const id = newId('usr');
    const opening = formatUsdc(parseUsdc(input.opening_balance_usdc ?? '0.00'));

    this.db
      .prepare(
        `INSERT INTO users (id, email, display_name, api_key_hash, balance_usdc)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, input.email ?? null, input.display_name ?? null, hashSecret(apiKey), opening);

    return { user: this.get(id)!, apiKey };
  }

  get(id: string): User | undefined {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    return row ? rowToUser(row) : undefined;
  }

  findByApiKey(apiKey: string): User | undefined {
    const row = this.db
      .prepare('SELECT * FROM users WHERE api_key_hash = ?')
      .get(hashSecret(apiKey)) as any;
    return row ? rowToUser(row) : undefined;
  }

  /** Top up a balance. Stands in for a card charge until a payment provider is wired in. */
  credit(userId: string, amountUsdc: string): User | undefined {
    const micros = parseUsdc(amountUsdc);
    if (micros <= 0) throw new Error('Credit amount must be positive');

    const user = this.get(userId);
    if (!user) return undefined;

    this.db
      .prepare('UPDATE users SET balance_usdc = ? WHERE id = ?')
      .run(formatUsdc(parseUsdc(user.balance_usdc) + micros), userId);

    return this.get(userId);
  }
}

export const users = new UserStore();
