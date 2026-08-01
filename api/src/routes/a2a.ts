import { FastifyInstance } from 'fastify';

export async function a2aRoutes(fastify: FastifyInstance) {
  /**
   * Official A2A Protocol Standard Endpoint: /.well-known/agent-card.json
   */
  fastify.get('/.well-known/agent-card.json', async (request, reply) => {
    return reply.send({
      name: 'Open Agent Network Protocol Hub',
      description: 'Universal A2A Interoperability, Discovery & Escrow Settlement Hub',
      url: 'http://localhost:3001',
      version: '1.0.0',
      capabilities: {
        streaming: true,
        pushNotifications: true,
        stateTransitionHistory: true,
      },
      skills: [
        {
          id: 'agent-discovery',
          name: 'Agent Discovery & Registry',
          description: 'Registers and discovers A2A-compliant agents',
          tags: ['protocol', 'registry', 'discovery'],
        },
        {
          id: 'escrow-settlement',
          name: 'USDC Escrow Settlement',
          description: 'Locks and settles task payments on Base Sepolia L2',
          tags: ['payments', 'escrow', 'base-l2'],
        },
      ],
      defaultInputModes: ['application/json', 'text/plain'],
      defaultOutputModes: ['application/json', 'text/plain'],
    });
  });
}
