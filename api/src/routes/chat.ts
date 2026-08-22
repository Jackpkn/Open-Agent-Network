import { FastifyInstance } from 'fastify';
import { store } from '../services/store.js';
import { a2aClient } from '../services/a2a-client.js';
import { eventHub } from '../services/websocket-hub.js';
import { randomUUID } from 'crypto';
import { sendError } from '../services/auth.js';
import {
  authorizeLegacyWork,
  holdForLegacyWork,
  settleLegacyWork,
} from '../services/legacy-access.js';

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

    // Sending a message makes the agent do work, so it needs an account to bill.
    let caller;
    try {
      caller = authorizeLegacyWork(request);
    } catch (err) {
      return sendError(reply, err);
    }

    const agent = store.getAgent(agent_id);
    if (!agent) {
      return reply.status(404).send({ error: `Agent with ID ${agent_id} not found` });
    }

    const chatSessionId = session_id || `chat-${randomUUID().slice(0, 12)}`;
    const jobId = `chat-${randomUUID().slice(0, 8)}`;

    try {
      holdForLegacyWork(caller, jobId, agent.pricing_amount || '0.00');
    } catch (err) {
      return sendError(reply, err);
    }

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
      user_id: caller?.id ?? null,
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
      // The agent did not answer. Say so, and charge nothing — this used to
      // fabricate a plausible reply and record a cost against it.
      store.updateJobStatus(jobId, 'failed', `Agent unreachable: ${err.message}`);
      settleLegacyWork(caller, jobId, agent.id, false, 'Refunded: the agent could not be reached');

      return reply.status(502).send({
        error: 'agent_unreachable',
        message: `${agent.agent_card.name} did not respond. You have not been charged.`,
        session_id: chatSessionId,
        job_id: jobId,
      });
    }

    settleLegacyWork(caller, jobId, agent.id, true, 'Agent replied');

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

    try {
      authorizeLegacyWork(request);
    } catch (err) {
      return sendError(reply, err);
    }

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
        reply.raw.write(
          `data: ${JSON.stringify({
            type: 'error',
            content: `${agent.agent_card.name} returned no response stream.`,
          })}\n\n`
        );
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
      // An unreachable agent is reported as unreachable, not impersonated.
      reply.raw.write(
        `data: ${JSON.stringify({
          type: 'error',
          content: `${agent.agent_card.name} did not respond: ${err.message}`,
        })}\n\n`
      );
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
