import { FastifyInstance } from 'fastify';
import { store, Job } from '../services/store.js';
import { a2aClient } from '../services/a2a-client.js';
import { eventHub } from '../services/websocket-hub.js';
import { consensusOracle } from '../services/consensus-oracle.js';
import { randomUUID } from 'crypto';

export async function jobRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/jobs
   * Get all active, completed, and disputed jobs from SQLite
   */
  fastify.get('/api/v1/jobs', async (request, reply) => {
    const jobs = store.getAllJobs();
    return reply.send({ jobs, total: jobs.length });
  });

  /**
   * POST /api/v1/jobs
   * Create a job and dispatch to target agent over A2A JSON-RPC tasks/send protocol
   */
  fastify.post<{
    Body: {
      agent_id: number;
      skill_id: string;
      task_prompt: string;
      onchain_tx_hash?: string;
    };
  }>('/api/v1/jobs', async (request, reply) => {
    const { agent_id, skill_id, task_prompt, onchain_tx_hash } = request.body || {};

    if (!agent_id || !task_prompt) {
      return reply.status(400).send({ error: 'agent_id and task_prompt are required' });
    }

    const agent = store.getAgent(agent_id);
    if (!agent) {
      return reply.status(404).send({ error: `Agent with ID ${agent_id} not found` });
    }

    const jobId = `job-${randomUUID().slice(0, 8)}`;

    // 1. Save Job in SQLite DB with status 'submitted'
    const newJob: Job = store.createJob({
      id: jobId,
      agent_id: agent.id,
      agent_url: agent.agent_url,
      agent_name: agent.agent_card.name,
      skill_id: skill_id || agent.agent_card.skills[0]?.id || 'general',
      task_prompt: task_prompt,
      status: 'submitted',
      result_text: null,
      result_artifacts: null,
      pricing_amount: agent.pricing_amount || '25.00',
      pricing_currency: agent.pricing_currency || 'USDC',
      onchain_tx_hash: onchain_tx_hash || null,
      verification_proof: null,
    });

    eventHub.broadcast('job_created', newJob);

    // 2. Dispatch task to Agent Server over A2A JSON-RPC 2.0 tasks/send
    try {
      store.updateJobStatus(jobId, 'working');

      const a2aResponse = await a2aClient.sendTask(agent.agent_url, jobId, task_prompt);

      store.updateJobStatus(
        jobId,
        a2aResponse.status === 'completed' ? 'completed' : 'working',
        a2aResponse.output_text,
        JSON.stringify(a2aResponse.artifacts || [])
      );

      const updatedJob = store.getJob(jobId);
      eventHub.broadcast('job_status_updated', updatedJob || {});

      return reply.status(201).send({
        message: 'Job dispatched and processed over A2A protocol',
        job: updatedJob,
      });
    } catch (err: any) {
      store.updateJobStatus(jobId, 'submitted', `A2A Execution Warning: ${err.message}`);
      const savedJob = store.getJob(jobId);
      return reply.status(201).send({
        message: 'Job created in escrow (Agent offline or async execution)',
        job: savedJob,
      });
    }
  });

  /**
   * POST /api/v1/jobs/:id/verify
   * Submit verification proof (CI test pass, TEE attestation, LLM consensus) and release escrow
   */
  fastify.post<{
    Params: { id: string };
    Body: { verification_proof: string; onchain_tx_hash?: string };
  }>('/api/v1/jobs/:id/verify', async (request, reply) => {
    const { id } = request.params;
    const { verification_proof, onchain_tx_hash } = request.body || {};

    if (!verification_proof) {
      return reply.status(400).send({ error: 'verification_proof is required' });
    }

    const job = store.getJob(id);
    if (!job) {
      return reply.status(404).send({ error: `Job with ID ${id} not found` });
    }

    const completedJob = store.verifyAndCompleteJob(id, verification_proof, onchain_tx_hash);
    eventHub.broadcast('job_verified', completedJob || {});

    return reply.send({
      message: 'Proof verified! Escrow payment released to agent.',
      job: completedJob,
    });
  });

  /**
   * POST /api/v1/jobs/:id/dispute
   * Raise a dispute for unsatisfactory work or deadline failure
   */
  fastify.post<{
    Params: { id: string };
    Body: { dispute_reason: string };
  }>('/api/v1/jobs/:id/dispute', async (request, reply) => {
    const { id } = request.params;
    const { dispute_reason } = request.body || {};

    if (!dispute_reason) {
      return reply.status(400).send({ error: 'dispute_reason is required' });
    }

    const job = store.getJob(id);
    if (!job) {
      return reply.status(404).send({ error: `Job with ID ${id} not found` });
    }

    const disputedJob = store.disputeJob(id, dispute_reason);
    eventHub.broadcast('job_status_updated', disputedJob || {});
    return reply.send({
      message: 'Dispute raised. Arbitrator notified.',
      job: disputedJob,
    });
  });

  /**
   * POST /api/v1/jobs/:id/resolve-dispute
   * Arbitrator resolves dispute between hirer and worker agent
   */
  fastify.post<{
    Params: { id: string };
    Body: { winner: 'hirer' | 'worker' };
  }>('/api/v1/jobs/:id/resolve-dispute', async (request, reply) => {
    const { id } = request.params;
    const { winner } = request.body || {};

    if (!winner || (winner !== 'hirer' && winner !== 'worker')) {
      return reply.status(400).send({ error: "winner must be 'hirer' or 'worker'" });
    }

    const job = store.getJob(id);
    if (!job) {
      return reply.status(404).send({ error: `Job with ID ${id} not found` });
    }

    const resolvedJob = store.resolveDispute(id, winner);
    eventHub.broadcast('job_status_updated', resolvedJob || {});
    return reply.send({
      message: `Dispute resolved in favor of ${winner}.`,
      job: resolvedJob,
    });
  });

  /**
   * POST /api/v1/jobs/:id/cancel
   * Cancel job due to deadline timeout or agent failure and trigger USDC escrow refund
   */
  fastify.post<{ Params: { id: string } }>('/api/v1/jobs/:id/cancel', async (request, reply) => {
    const { id } = request.params;
    const job = store.getJob(id);

    if (!job) {
      return reply.status(404).send({ error: `Job with ID ${id} not found` });
    }

    store.updateJobStatus(id, 'canceled', 'Canceled due to timeout or agent server crash');
    const canceledJob = store.getJob(id);

    return reply.send({
      message: 'Job canceled. Escrow funds refunded to hirer.',
      job: canceledJob,
    });
  });

  /**
   * GET /api/v1/jobs/stream-proxy
   * Proxy SSE stream directly from agent target URL to browser client
   */
  fastify.get<{
    Querystring: {
      agentUrl?: string;
      prompt?: string;
    };
  }>('/api/v1/jobs/stream-proxy', async (request, reply) => {
    const { agentUrl = 'http://localhost:8001', prompt = 'Audit code' } = request.query || {};

    const targetUrl = `${agentUrl.replace(/\/$/, '')}/a2a/v1/stream?prompt=${encodeURIComponent(prompt)}`;

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    try {
      const response = await fetch(targetUrl);
      if (!response.body) {
        reply.raw.write(`data: ${JSON.stringify({ message: 'Error: No response stream body from agent' })}\n\n`);
        return reply.raw.end();
      }

      const reader = (response.body as any).getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          reply.raw.write(value);
        }
      }
    } catch (err: any) {
      reply.raw.write(`data: ${JSON.stringify({ message: `Stream proxy error: ${err.message}` })}\n\n`);
    }

    reply.raw.end();
  });

  /**
   * GET /api/v1/jobs/:id
   * Get job status and output by ID
   */
  fastify.get<{ Params: { id: string } }>('/api/v1/jobs/:id', async (request, reply) => {
    const job = store.getJob(request.params.id);
    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }
    return reply.send(job);
  });

  /**
   * POST /api/v1/jobs/:id/verify-consensus
   * Trigger Multi-Agent Voting Consensus Oracle evaluation for escrow release
   */
  fastify.post<{ Params: { id: string } }>('/api/v1/jobs/:id/verify-consensus', async (request, reply) => {
    const job = store.getJob(request.params.id);
    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }

    const consensusResult = await consensusOracle.evaluateConsensus(job);
    return reply.send(consensusResult);
  });
}
