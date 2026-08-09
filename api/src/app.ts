import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { agentRoutes } from './routes/agents.js';
import { jobRoutes } from './routes/jobs.js';
import { a2aRoutes } from './routes/a2a.js';
import { analyticsRoutes } from './routes/analytics.js';
import { eventHub } from './services/websocket-hub.js';

export function buildApp() {
  const fastify = Fastify({
    logger: false,
  });

  fastify.register(cors, { origin: '*' });
  fastify.register(websocket);

  fastify.get('/health', async () => {
    return { status: 'ok', service: 'open-agent-network-api', timestamp: new Date().toISOString() };
  });

  // WebSocket endpoint for real-time protocol event stream
  fastify.register(async (fastifyApp) => {
    fastifyApp.get('/ws/events', { websocket: true }, (connection: any) => {
      const ws = connection.socket || connection;
      eventHub.addSocket(ws);
      ws.send(
        JSON.stringify({
          type: 'connected',
          timestamp: new Date().toISOString(),
          data: { message: 'Connected to Open Agent Network Event Stream' },
        })
      );
    });
  });

  fastify.register(agentRoutes);
  fastify.register(jobRoutes);
  fastify.register(a2aRoutes);
  fastify.register(analyticsRoutes);

  return fastify;
}
