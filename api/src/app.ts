import Fastify from 'fastify';
import cors from '@fastify/cors';
import { agentRoutes } from './routes/agents.js';
import { jobRoutes } from './routes/jobs.js';

export function buildApp() {
  const fastify = Fastify({
    logger: false,
  });

  fastify.register(cors, { origin: '*' });

  fastify.get('/health', async () => {
    return { status: 'ok', service: 'open-agent-network-api', timestamp: new Date().toISOString() };
  });

  fastify.register(agentRoutes);
  fastify.register(jobRoutes);

  return fastify;
}
