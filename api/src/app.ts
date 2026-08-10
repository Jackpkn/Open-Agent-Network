import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
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

  // Rate Limiting Security Middleware: Max 100 requests per minute per IP address
  fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${context.max} requests per ${context.after} window allowed.`,
    }),
  });

  // Optional API Key Authentication Hook for protected endpoints
  fastify.addHook('onRequest', async (request, reply) => {
    const isProtectedMethod = request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE';
    const isApiKeyRequired = process.env.API_KEY_REQUIRED === 'true';

    if (isApiKeyRequired && isProtectedMethod) {
      const apiKey = request.headers['x-api-key'] || request.headers['authorization'];
      const expectedKey = process.env.API_KEY || 'oan_secret_key_2026';

      if (!apiKey || (apiKey !== expectedKey && apiKey !== `Bearer ${expectedKey}`)) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Valid X-API-Key header or Bearer token is required for this endpoint.',
        });
      }
    }
  });

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
