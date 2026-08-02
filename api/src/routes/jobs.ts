import { FastifyInstance } from 'fastify';
import { store, Job } from '../services/store.js';
import { a2aClient } from '../services/a2a-client.js';
import { randomUUID } from 'crypto';

export async function jobRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/jobs
   * Get all active and completed jobs from SQLite
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
    };
  }>('/api/v1/jobs', async (request, reply) => {
    const { agent_id, skill_id, task_prompt } = request.body || {};

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
    });

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
      return reply.status(201).send({
        message: 'Job dispatched and processed over A2A protocol',
        job: updatedJob,
      });
    } catch (err: any) {
      store.updateJobStatus(jobId, 'failed', `A2A Execution Error: ${err.message}`);
      const failedJob = store.getJob(jobId);
      return reply.status(500).send({
        error: `A2A Dispatch failed: ${err.message}`,
        job: failedJob,
      });
    }
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
}
