import { A2AAgentCard } from './store.js';

export interface A2AMessagePart {
  text?: string;
  media_type?: string;
  data?: unknown;
}

export interface A2AMessage {
  role: 'user' | 'agent';
  parts: A2AMessagePart[];
}

export interface A2ATaskResponse {
  id: string;
  status: 'submitted' | 'working' | 'completed' | 'failed' | 'canceled';
  message?: A2AMessage;
  output_text?: string;
  artifacts?: Array<{
    name?: string;
    parts: A2AMessagePart[];
  }>;
}

export class A2AClient {
  /**
   * Discovers and validates an agent's A2A Agent Card from standard /.well-known/agent-card.json
   */
  async fetchAgentCard(agentUrl: string): Promise<A2AAgentCard> {
    const cleanUrl = agentUrl.replace(/\/$/, '');
    const cardUrl = `${cleanUrl}/.well-known/agent-card.json`;

    const res = await fetch(cardUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Agent Card from ${cardUrl}: HTTP status ${res.status}`);
    }

    const card = (await res.json()) as A2AAgentCard;

    if (!card.name || !card.url || !Array.isArray(card.skills)) {
      throw new Error(`Invalid A2A Agent Card format from ${cardUrl}`);
    }

    return card;
  }

  /**
   * Checks health status of a remote agent server
   */
  async pingHealth(agentUrl: string): Promise<boolean> {
    try {
      const card = await this.fetchAgentCard(agentUrl);
      return !!card.name;
    } catch {
      return false;
    }
  }

  /**
   * Executes a task on a remote agent via JSON-RPC 2.0 method `tasks/send`.
   *
   * The default budget is a minute, not two seconds. The old two-second timeout
   * meant any agent doing real work was reported as offline.
   */
  async sendTask(
    agentUrl: string,
    taskId: string,
    prompt: string,
    timeoutMs = 60_000
  ): Promise<A2ATaskResponse> {
    const cleanUrl = agentUrl.replace(/\/$/, '');
    const rpcEndpoint = `${cleanUrl}/a2a/v1/rpc`;

    const body = {
      jsonrpc: '2.0',
      method: 'tasks/send',
      params: {
        id: taskId,
        message: {
          role: 'user',
          parts: [{ text: prompt, media_type: 'text/plain' }],
        },
      },
      id: 1,
    };

    const res = await fetch(rpcEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      throw new Error(`A2A JSON-RPC failed (${rpcEndpoint}): HTTP status ${res.status}`);
    }

    const rpcRes: any = await res.json();
    if (rpcRes.error) {
      throw new Error(`A2A JSON-RPC error: ${rpcRes.error.message || JSON.stringify(rpcRes.error)}`);
    }

    const result = rpcRes.result || {};
    return {
      id: result.id || taskId,
      status: result.status || 'completed',
      output_text: result.output_text || result.message?.parts?.[0]?.text || '',
      artifacts: result.artifacts || [],
    };
  }

  /**
   * Queries task status from remote agent via JSON-RPC 2.0 method `tasks/get`
   */
  async getTaskStatus(agentUrl: string, taskId: string): Promise<A2ATaskResponse> {
    const cleanUrl = agentUrl.replace(/\/$/, '');
    const rpcEndpoint = `${cleanUrl}/a2a/v1/rpc`;

    const body = {
      jsonrpc: '2.0',
      method: 'tasks/get',
      params: { id: taskId },
      id: 2,
    };

    const res = await fetch(rpcEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`A2A tasks/get failed: HTTP status ${res.status}`);
    }

    const rpcRes: any = await res.json();
    const result = rpcRes.result || {};
    return {
      id: result.id || taskId,
      status: result.status || 'working',
      output_text: result.output_text || result.message?.parts?.[0]?.text || '',
      artifacts: result.artifacts || [],
    };
  }
}

export const a2aClient = new A2AClient();
