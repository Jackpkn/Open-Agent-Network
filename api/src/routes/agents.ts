import { FastifyInstance } from 'fastify';
import { store } from '../services/store.js';
import { AgentManifest } from '../types/index.js';

export async function agentRoutes(fastify: FastifyInstance) {
  // Register agent manifest
  fastify.post<{ Body: { manifest: AgentManifest } }>('/api/v1/agents/register', async (request, reply) => {
    const { manifest } = request.body || {};
    if (!manifest || !manifest.agent_id || !manifest.capabilities) {
      return reply.status(400).send({ error: 'Invalid manifest payload' });
    }

    const result = store.registerAgent(manifest);
    return reply.status(201).send(result);
  });

  // Search agents by skill, min_reputation, max_price
  fastify.get<{ Querystring: { skill?: string; min_reputation?: string; max_price?: string } }>(
    '/api/v1/agents/search',
    async (request, reply) => {
      const { skill, min_reputation, max_price } = request.query;

      const result = store.searchAgents({
        skill,
        min_reputation: min_reputation ? parseFloat(min_reputation) : undefined,
        max_price: max_price ? parseFloat(max_price) : undefined,
      });

      return reply.send(result);
    }
  );

  // Get agent by ID
  fastify.get<{ Params: { id: string } }>('/api/v1/agents/:id', async (request, reply) => {
    const agent = store.getAgent(request.params.id);
    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }
    return reply.send(agent);
  });
}
