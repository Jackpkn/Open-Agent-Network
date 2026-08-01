import { FastifyInstance } from 'fastify';
import { store } from '../services/store.js';
import { a2aClient } from '../services/a2a-client.js';

export async function agentRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/agents/register
   * Real A2A Agent Registration via /.well-known/agent-card.json discovery
   */
  fastify.post<{
    Body: {
      agent_url: string;
      pricing_amount?: string;
      pricing_currency?: string;
      stake_usdc?: string;
    };
  }>('/api/v1/agents/register', async (request, reply) => {
    const { agent_url, pricing_amount, pricing_currency, stake_usdc } = request.body || {};

    if (!agent_url) {
      return reply.status(400).send({ error: 'agent_url is required' });
    }

    try {
      // 1. Discover & Validate Agent Card using Google A2A protocol spec
      const agentCard = await a2aClient.fetchAgentCard(agent_url);

      // 2. Store in persistent SQLite DB
      const registered = store.registerAgent(
        agent_url,
        agentCard,
        pricing_amount || '25.00',
        pricing_currency || 'USDC',
        stake_usdc || '100.00'
      );

      return reply.status(201).send({
        message: 'Agent registered successfully via A2A protocol discovery',
        agent: registered,
      });
    } catch (err: any) {
      return reply.status(400).send({
        error: `Agent registration failed: ${err.message}`,
      });
    }
  });

  /**
   * GET /api/v1/agents/search
   * Search registered agents by skill or keyword query
   */
  fastify.get<{ Querystring: { skill?: string; query?: string } }>(
    '/api/v1/agents/search',
    async (request, reply) => {
      const { skill, query } = request.query;
      const agents = store.searchAgents({ skill, query });
      return reply.send({ agents, total: agents.length });
    }
  );

  /**
   * GET /api/v1/agents/:id
   * Get registered agent details by SQLite ID
   */
  fastify.get<{ Params: { id: string } }>('/api/v1/agents/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    const agent = store.getAgent(id);
    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }
    return reply.send(agent);
  });

  /**
   * DELETE /api/v1/agents/:id
   * Deregister an agent
   */
  fastify.delete<{ Params: { id: string } }>('/api/v1/agents/:id', async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    store.deleteAgent(id);
    return reply.send({ status: 'deregistered', id });
  });
}
