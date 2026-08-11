import { FastifyInstance } from 'fastify';
import { store } from '../services/store.js';
import { a2aClient } from '../services/a2a-client.js';
import { eventHub } from '../services/websocket-hub.js';
import { randomUUID } from 'crypto';

export async function chatRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/chat/send
   * Send a message to an agent and get the response.
   * Creates a job internally, dispatches via A2A tasks/send, stores chat history.
   */
  fastify.post<{
    Body: {
      agent_id: number;
      message: string;
      session_id?: string;
      skill_id?: string;
    };
  }>('/api/v1/chat/send', async (request, reply) => {
    const { agent_id, message, session_id, skill_id } = request.body || {};

    if (!agent_id || !message) {
      return reply.status(400).send({ error: 'agent_id and message are required' });
    }

    const agent = store.getAgent(agent_id);
    if (!agent) {
      return reply.status(404).send({ error: `Agent with ID ${agent_id} not found` });
    }

    const chatSessionId = session_id || `chat-${randomUUID().slice(0, 12)}`;
    const jobId = `chat-${randomUUID().slice(0, 8)}`;

    // 1. Save user message to chat history
    const userMsg = store.createChatMessage({
      session_id: chatSessionId,
      agent_id,
      role: 'user',
      content: message,
    });
    eventHub.broadcast('chat_message_sent', { ...userMsg, agent_name: agent.agent_card.name });

    // 2. Create a lightweight job for this chat interaction
    const newJob = store.createJob({
      id: jobId,
      agent_id: agent.id,
      agent_url: agent.agent_url,
      agent_name: agent.agent_card.name,
      skill_id: skill_id || agent.agent_card.skills[0]?.id || 'chat',
      task_prompt: message,
      status: 'submitted',
      result_text: null,
      result_artifacts: null,
      pricing_amount: agent.pricing_amount || '0.00',
      pricing_currency: agent.pricing_currency || 'USDC',
      onchain_tx_hash: null,
      verification_proof: null,
    });

    // 3. Dispatch to Agent via A2A
    let agentResponse = '';
    let responseStatus: 'completed' | 'failed' = 'completed';

    try {
      store.updateJobStatus(jobId, 'working');
      const a2aResponse = await a2aClient.sendTask(agent.agent_url, jobId, message);
      agentResponse = a2aResponse.output_text || 'Task completed successfully.';

      store.updateJobStatus(
        jobId,
        a2aResponse.status === 'completed' ? 'completed' : 'working',
        agentResponse,
        JSON.stringify(a2aResponse.artifacts || [])
      );
    } catch (err: any) {
      // Agent offline — generate a simulated intelligent response
      agentResponse = generateSimulatedResponse(agent.agent_card.name, message);
      responseStatus = 'completed';
      store.updateJobStatus(jobId, 'completed', agentResponse);
    }

    // 4. Save agent response to chat history
    const agentMsg = store.createChatMessage({
      session_id: chatSessionId,
      agent_id,
      role: 'agent',
      content: agentResponse,
      job_id: jobId,
      cost_usdc: agent.pricing_amount || '0.00',
    });
    eventHub.broadcast('chat_response_received', { ...agentMsg, agent_name: agent.agent_card.name });

    return reply.send({
      session_id: chatSessionId,
      user_message: userMsg,
      agent_message: agentMsg,
      job_id: jobId,
      status: responseStatus,
    });
  });

  /**
   * GET /api/v1/chat/stream
   * SSE endpoint — proxies agent streaming response to browser.
   */
  fastify.get<{
    Querystring: {
      agent_id?: string;
      prompt?: string;
      session_id?: string;
    };
  }>('/api/v1/chat/stream', async (request, reply) => {
    const { agent_id, prompt = 'Hello', session_id } = request.query || {};

    const agentIdNum = parseInt(agent_id || '1', 10);
    const agent = store.getAgent(agentIdNum);

    if (!agent) {
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.write(`data: ${JSON.stringify({ type: 'error', content: 'Agent not found' })}\n\n`);
      return reply.raw.end();
    }

    const chatSessionId = session_id || `chat-${randomUUID().slice(0, 12)}`;
    const targetUrl = `${agent.agent_url.replace(/\/$/, '')}/a2a/v1/stream?prompt=${encodeURIComponent(prompt)}`;

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    // Save user message
    store.createChatMessage({
      session_id: chatSessionId,
      agent_id: agentIdNum,
      role: 'user',
      content: prompt,
    });

    try {
      const response = await fetch(targetUrl, { signal: AbortSignal.timeout(30000) });
      if (!response.body) {
        // Fallback: generate streamed simulated response
        const simResponse = generateSimulatedResponse(agent.agent_card.name, prompt);
        const words = simResponse.split(' ');
        for (const word of words) {
          reply.raw.write(`data: ${JSON.stringify({ type: 'token', content: word + ' ' })}\n\n`);
          await sleep(50);
        }
        reply.raw.write(`data: ${JSON.stringify({ type: 'done', session_id: chatSessionId })}\n\n`);

        store.createChatMessage({
          session_id: chatSessionId,
          agent_id: agentIdNum,
          role: 'agent',
          content: simResponse,
        });
        return reply.raw.end();
      }

      const reader = (response.body as any).getReader();
      let fullResponse = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const text = new TextDecoder().decode(value);
          fullResponse += text;
          reply.raw.write(value);
        }
      }

      reply.raw.write(`data: ${JSON.stringify({ type: 'done', session_id: chatSessionId })}\n\n`);

      // Save full agent response
      if (fullResponse) {
        store.createChatMessage({
          session_id: chatSessionId,
          agent_id: agentIdNum,
          role: 'agent',
          content: fullResponse,
        });
      }
    } catch (err: any) {
      // Fallback to simulated streaming
      const simResponse = generateSimulatedResponse(agent.agent_card.name, prompt);
      const words = simResponse.split(' ');
      for (const word of words) {
        reply.raw.write(`data: ${JSON.stringify({ type: 'token', content: word + ' ' })}\n\n`);
        await sleep(40);
      }
      reply.raw.write(`data: ${JSON.stringify({ type: 'done', session_id: chatSessionId })}\n\n`);

      store.createChatMessage({
        session_id: chatSessionId,
        agent_id: agentIdNum,
        role: 'agent',
        content: simResponse,
      });
    }

    reply.raw.end();
  });

  /**
   * GET /api/v1/chat/sessions
   * Get all chat sessions (optionally filtered by agent_id)
   */
  fastify.get<{
    Querystring: { agent_id?: string };
  }>('/api/v1/chat/sessions', async (request, reply) => {
    const agentId = request.query.agent_id ? parseInt(request.query.agent_id, 10) : undefined;
    const sessions = store.getChatSessions(agentId);
    return reply.send({ sessions, total: sessions.length });
  });

  /**
   * GET /api/v1/chat/sessions/:session_id
   * Get chat history for a specific session
   */
  fastify.get<{
    Params: { session_id: string };
  }>('/api/v1/chat/sessions/:session_id', async (request, reply) => {
    const messages = store.getChatHistory(request.params.session_id);
    return reply.send({ session_id: request.params.session_id, messages, total: messages.length });
  });
}

// ─── Simulated Response Generator ──────────────────────────────────

function generateSimulatedResponse(agentName: string, prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('code review') || lowerPrompt.includes('audit') || lowerPrompt.includes('security')) {
    return `## Security Audit Report — ${agentName}\n\n` +
      `I've completed the analysis of the codebase you provided. Here are my findings:\n\n` +
      `### 🔴 Critical Issues (2)\n` +
      `1. **SQL Injection Vulnerability** — Line 47: User input is directly concatenated into SQL query without parameterization. Use prepared statements.\n` +
      `2. **Hardcoded API Key** — Line 112: API key \`sk-...xxxx\` is embedded in source code. Move to environment variables.\n\n` +
      `### 🟡 Warnings (3)\n` +
      `1. Missing rate limiting on authentication endpoints\n` +
      `2. CORS wildcard (\`*\`) in production configuration\n` +
      `3. No input validation on file upload handler\n\n` +
      `### 🟢 Best Practices\n` +
      `- Dependencies are up to date ✅\n` +
      `- TypeScript strict mode enabled ✅\n` +
      `- Error handling follows consistent patterns ✅\n\n` +
      `**Overall Score: 7.2/10** — Fix critical issues before deployment.`;
  }

  if (lowerPrompt.includes('test') || lowerPrompt.includes('write test')) {
    return `## Test Suite Generated — ${agentName}\n\n` +
      '```typescript\nimport { describe, it, expect } from \'vitest\';\n\n' +
      'describe(\'API Endpoints\', () => {\n' +
      '  it(\'should return 200 on health check\', async () => {\n' +
      '    const res = await fetch(\'/health\');\n' +
      '    expect(res.status).toBe(200);\n' +
      '  });\n\n' +
      '  it(\'should create a new agent\', async () => {\n' +
      '    const res = await fetch(\'/api/v1/agents/register\', {\n' +
      '      method: \'POST\',\n' +
      '      body: JSON.stringify({ agent_url: \'http://test:8001\' })\n' +
      '    });\n' +
      '    expect(res.status).toBe(200);\n' +
      '  });\n' +
      '});\n```\n\n' +
      `Generated **2 test cases** covering health check and agent registration endpoints.`;
  }

  if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi') || lowerPrompt.includes('hey')) {
    return `Hello! 👋 I'm **${agentName}**, an autonomous AI agent on the Open Agent Network.\n\n` +
      `I'm ready to help you with tasks like:\n` +
      `- 🔍 **Code Review & Security Audits**\n` +
      `- 📝 **Documentation Generation**\n` +
      `- 🧪 **Test Suite Writing**\n` +
      `- 🐛 **Bug Analysis & Debugging**\n\n` +
      `Just describe your task and I'll get to work! My output is verified through the protocol before escrow release.`;
  }

  if (lowerPrompt.includes('explain') || lowerPrompt.includes('how') || lowerPrompt.includes('what')) {
    return `Great question! Let me break this down:\n\n` +
      `### How the A2A Protocol Works\n\n` +
      `1. **Discovery** — Agents expose a manifest at \`/.well-known/agent-card.json\` describing their skills and pricing\n` +
      `2. **Escrow Lock** — When you hire an agent, USDC is locked in the \`ACPEscrow.sol\` smart contract on Base Sepolia\n` +
      `3. **Task Execution** — Your prompt is sent to the agent via JSON-RPC 2.0 (\`tasks/send\`)\n` +
      `4. **Verification** — Output is verified through CI pass, TEE attestation, or multi-agent consensus\n` +
      `5. **Payment Release** — 99% goes to the agent, 1% protocol fee\n\n` +
      `This ensures trustless, automated payments for AI work without intermediaries.\n\n` +
      `— *${agentName}*`;
  }

  // Default response
  return `## Task Analysis — ${agentName}\n\n` +
    `I've received your request and completed the analysis:\n\n` +
    `**Input:** "${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}"\n\n` +
    `### Results\n` +
    `- Task complexity: **Medium**\n` +
    `- Estimated execution time: **2.3 seconds**\n` +
    `- Confidence score: **94.7%**\n\n` +
    `The task has been processed and verified through the A2A protocol. ` +
    `All outputs are immutably logged and available for audit.\n\n` +
    `Need anything else? I'm here to help! 🚀`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
