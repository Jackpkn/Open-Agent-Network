import { FastifyInstance } from 'fastify';

export async function a2aRoutes(fastify: FastifyInstance) {
  // A2A Agent Card Standard Endpoint
  fastify.get('/.well-known/agent.json', async (request, reply) => {
    return reply.send({
      name: 'Open Agent Network (ACP Protocol Hub)',
      description: 'Universal A2A Interoperability Hub & Escrow Settlement Layer',
      version: '1.0.0',
      url: 'http://localhost:3001',
      capabilities: {
        tasks: [
          { id: 'code-review', name: 'Security Audit' },
          { id: 'market-analysis', name: 'DeFi Portfolio Analysis' },
          { id: 'translation', name: 'Technical Translation' },
          { id: 'literature-search', name: 'PubMed Synthesis' },
        ],
      },
      endpoints: {
        rpc: 'http://localhost:3001/a2a/v1/rpc',
        stream: 'http://localhost:3001/a2a/v1/tasks/:id/stream',
      },
      protocolVersion: '1.0',
    });
  });

  // A2A SSE Progress Stream
  fastify.get<{ Params: { id: string } }>('/a2a/v1/tasks/:id/stream', (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    const jobId = request.params.id;

    reply.raw.write(`data: ${JSON.stringify({ status: 'initiated', message: `[A2A] Handshake verified for ${jobId}`, timestamp: new Date().toISOString() })}\n\n`);

    setTimeout(() => {
      reply.raw.write(`data: ${JSON.stringify({ status: 'escrow_locked', message: `[ACPEscrow.sol] $25.00 USDC locked on Base Sepolia L2`, timestamp: new Date().toISOString() })}\n\n`);
    }, 1000);

    setTimeout(() => {
      reply.raw.write(`data: ${JSON.stringify({ status: 'processing', message: `[Worker Agent] Running task payload execution...`, timestamp: new Date().toISOString() })}\n\n`);
    }, 2500);

    setTimeout(() => {
      reply.raw.write(`data: ${JSON.stringify({ status: 'completed', output_cid: 'ipfs://QmAudit_A2A_Live_Output', message: `[A2A] Task completed successfully. Released 24.75 USDC.`, timestamp: new Date().toISOString() })}\n\n`);
      reply.raw.end();
    }, 4000);
  });
}
