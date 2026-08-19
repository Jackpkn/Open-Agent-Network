'use client';

export const OAN_API = process.env.NEXT_PUBLIC_OAN_API || 'http://localhost:3001';

/** How an agent's output should be rendered. Declared by the skill, not hardcoded per agent. */
export type ResultView = 'table' | 'findings' | 'document' | 'text' | 'files';

export interface Skill {
  id: string;
  name: string;
  description: string;
  tags: string[];
  steps: string[];
  result_view: ResultView;
}

export interface AgentStats {
  jobs_completed: number;
  jobs_failed: number;
  jobs_stalled: number;
  success_rate: number | null;
  typical_seconds: number | null;
}

/** An agent's own claim about what it does with your file. Not enforced by the protocol. */
export interface DataHandling {
  retention: 'delete-on-completion' | '24h' | '30d' | 'indefinite' | 'undeclared';
  training: 'never' | 'may-be-used' | 'undeclared';
  processors: string[];
  region: string | null;
}

export interface Agent {
  id: number;
  name: string;
  description: string;
  available: boolean;
  price_usdc: string;
  currency: string;
  reports_progress: boolean;
  data_handling: DataHandling;
  data_handling_summary: string;
  skills: Skill[];
  stats: AgentStats;
}

export interface OutputFile {
  id: string;
  filename: string;
  mime: string;
  size_bytes: number;
  sha256: string;
  download_url: string;
}

export interface Order {
  id: string;
  state: string;
  message: string;
  agent: { id: number; name: string };
  skill_id: string;
  instructions: string;
  price_usdc: string;
  progress: number;
  current_step: string | null;
  steps: string[];
  result_view: ResultView;
  data_handling: DataHandling;
  data_handling_summary: string;
  input: { id: string; filename: string; size_bytes: number } | null;
  outputs: OutputFile[];
  result_text: string | null;
  failure: { code: string; message: string } | null;
  is_final: boolean;
  can_report_problem: boolean;
  created_at: string;
}

export interface ProtocolStats {
  agents_registered: number;
  agents_available: number;
  jobs_completed: number;
  settled_volume_usdc: string;
  success_rate: number | null;
  settlement: string;
}

export async function fetchStats(): Promise<ProtocolStats> {
  const response = await fetch(`${OAN_API}/v1/stats`);
  if (!response.ok) throw new Error('Stats unavailable');
  return response.json();
}

export interface Account {
  id: string;
  display_name: string | null;
  balance_usdc: string;
  held_usdc: string;
}

const KEY_STORAGE = 'oan_api_key';

export function storedKey(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(KEY_STORAGE);
}

async function json<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((body as { message?: string }).message || `Request failed (${response.status})`);
  }
  return body as T;
}

function authHeaders(key: string): HeadersInit {
  return { Authorization: `Bearer ${key}` };
}

/**
 * Get or create an account.
 *
 * There is no sign-in yet, so the first visit provisions an account with a
 * demo balance and keeps the key in this browser.
 */
export async function ensureAccount(): Promise<{ key: string; account: Account }> {
  const existing = storedKey();

  if (existing) {
    try {
      const { user } = await json<{ user: Account }>(
        await fetch(`${OAN_API}/v1/me`, { headers: authHeaders(existing) })
      );
      return { key: existing, account: user };
    } catch {
      window.localStorage.removeItem(KEY_STORAGE);
    }
  }

  const created = await json<{ user: Account; api_key: string }>(
    await fetch(`${OAN_API}/v1/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: 'You', opening_balance_usdc: '25.00' }),
    })
  );

  window.localStorage.setItem(KEY_STORAGE, created.api_key);
  return { key: created.api_key, account: created.user };
}

export async function fetchAccount(key: string): Promise<Account> {
  const { user } = await json<{ user: Account }>(
    await fetch(`${OAN_API}/v1/me`, { headers: authHeaders(key) })
  );
  return user;
}

export async function fetchAgents(): Promise<Agent[]> {
  const { agents } = await json<{ agents: Agent[] }>(await fetch(`${OAN_API}/v1/agents`));
  return agents;
}

export async function uploadFile(key: string, file: File): Promise<{ id: string; filename: string }> {
  const { artifact } = await json<{ artifact: { id: string; filename: string } }>(
    await fetch(`${OAN_API}/v1/uploads`, {
      method: 'POST',
      headers: {
        ...authHeaders(key),
        'Content-Type': file.type || 'application/octet-stream',
        'X-Filename': file.name,
      },
      body: file,
    })
  );
  return artifact;
}

export async function hire(
  key: string,
  input: { agent_id: number; skill_id: string; instructions: string; input_artifact_id?: string }
): Promise<Order> {
  const { order } = await json<{ order: Order }>(
    await fetch(`${OAN_API}/v1/orders`, {
      method: 'POST',
      headers: { ...authHeaders(key), 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  );
  return order;
}

export async function fetchOrder(key: string, id: string): Promise<Order> {
  const { order } = await json<{ order: Order }>(
    await fetch(`${OAN_API}/v1/orders/${id}`, { headers: authHeaders(key) })
  );
  return order;
}

export async function reportProblem(key: string, id: string, reason: string): Promise<Order> {
  const { order } = await json<{ order: Order }>(
    await fetch(`${OAN_API}/v1/orders/${id}/reject`, {
      method: 'POST',
      headers: { ...authHeaders(key), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
  );
  return order;
}

export function downloadUrl(key: string, order: Order, file: OutputFile): string {
  return `${OAN_API}${file.download_url}?api_key=${encodeURIComponent(key)}`;
}

/** Fetch a delivered file's contents so it can be rendered inline. */
export async function readOutput(key: string, file: OutputFile): Promise<string> {
  const response = await fetch(`${OAN_API}${file.download_url}`, { headers: authHeaders(key) });
  if (!response.ok) throw new Error('That file could not be opened.');
  return response.text();
}

export interface LiveEvent {
  seq: number;
  type: string;
  step?: string;
  progress?: number;
  note?: string;
  to?: string;
  message?: string;
}

/** Subscribe to one job's live feed. Returns a close function. */
export function watchOrder(
  key: string,
  orderId: string,
  handlers: { onEvent: (event: LiveEvent) => void; onDone: (order: Order) => void }
): () => void {
  const source = new EventSource(
    `${OAN_API}/v1/orders/${orderId}/events?api_key=${encodeURIComponent(key)}`
  );

  const forward = (event: MessageEvent) => {
    try {
      handlers.onEvent(JSON.parse(event.data));
    } catch {
      /* a malformed frame must not break the stream */
    }
  };

  for (const type of ['created', 'state', 'step', 'log', 'verification', 'settled', 'refunded', 'stalled']) {
    source.addEventListener(type, forward);
  }

  source.addEventListener('done', (event) => {
    try {
      handlers.onDone(JSON.parse((event as MessageEvent).data));
    } catch {
      /* the caller refetches anyway */
    }
    source.close();
  });

  return () => source.close();
}
