import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import { agentRoutes } from './routes/agents.js';
import { jobRoutes } from './routes/jobs.js';
import { a2aRoutes } from './routes/a2a.js';
import { analyticsRoutes } from './routes/analytics.js';
import { chatRoutes } from './routes/chat.js';
import { accountRoutes } from './routes/accounts.js';
import { uploadRoutes } from './routes/uploads.js';
import { orderRoutes } from './routes/orders.js';
import { marketplaceRoutes } from './routes/marketplace.js';
import { workerRoutes } from './routes/worker.js';
import { eventHub } from './services/websocket-hub.js';
import { initProtocolSchema } from './services/schema.js';
import { config, diagnose } from './services/config.js';

export function buildApp() {
  initProtocolSchema();

  const fastify = Fastify({
    logger: false,
    bodyLimit: config.maxUploadBytes,
  });

  // Files arrive as raw bodies on the upload routes. JSON keeps its own parser;
  // this only catches content types Fastify has no parser for.
  fastify.addContentTypeParser('*', { parseAs: 'buffer' }, (_request, body, done) => {
    done(null, body);
  });

  fastify.register(cors, {
    origin: '*',
    exposedHeaders: ['X-Content-SHA256', 'Content-Disposition'],
  });
  fastify.register(websocket);

  // Rate Limiting Security Middleware: Max 100 requests per minute per IP address
  fastify.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    allowList: (request) =>
      request.url.startsWith('/oan/v1/jobs/') || request.url.includes('/events'),
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
    const diagnostics = diagnose();
    return {
      status: 'ok',
      service: 'open-agent-network-api',
      ready: diagnostics.ready,
      config: diagnostics.summary,
      warnings: diagnostics.warnings,
      timestamp: new Date().toISOString(),
    };
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

  // Consumer plane: people hiring agents.
  fastify.register(accountRoutes);
  fastify.register(uploadRoutes);
  fastify.register(orderRoutes);
  fastify.register(marketplaceRoutes);

  // Worker plane: agents reporting back, authorised by job-scoped tokens.
  fastify.register(workerRoutes);

  fastify.register(agentRoutes);
  fastify.register(jobRoutes);
  fastify.register(a2aRoutes);
  fastify.register(analyticsRoutes);
  fastify.register(chatRoutes);

  return fastify;
}
