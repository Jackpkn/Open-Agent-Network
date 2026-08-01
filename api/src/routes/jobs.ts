import { FastifyInstance } from 'fastify';
import { store } from '../services/store.js';
import { JobContract } from '../types/index.js';

export async function jobRoutes(fastify: FastifyInstance) {
  // Get all jobs
  fastify.get('/api/v1/jobs', async (request, reply) => {
    const jobs = store.getAllJobs();
    return reply.send({ jobs, total: jobs.length });
  });

  // Create job contract off-chain index
  fastify.post<{ Body: { contract: JobContract } }>('/api/v1/jobs', async (request, reply) => {
    const { contract } = request.body || {};
    if (!contract || !contract.contract_id || !contract.payment) {
      return reply.status(400).send({ error: 'Invalid job contract payload' });
    }

    const result = store.createJob(contract);
    return reply.status(201).send(result);
  });

  // Get job contract by ID
  fastify.get<{ Params: { id: string } }>('/api/v1/jobs/:id', async (request, reply) => {
    const job = store.getJob(request.params.id);
    if (!job) {
      return reply.status(404).send({ error: 'Job not found' });
    }
    return reply.send(job);
  });

  // Submit work outcome
  fastify.post<{ Params: { id: string }; Body: { output_cid: string; verification_proof: string } }>(
    '/api/v1/jobs/:id/submit',
    async (request, reply) => {
      const { output_cid, verification_proof } = request.body || {};
      if (!output_cid || !verification_proof) {
        return reply.status(400).send({ error: 'Missing output_cid or verification_proof' });
      }

      try {
        const result = store.submitWork(request.params.id, output_cid, verification_proof);
        return reply.send(result);
      } catch (err: any) {
        return reply.status(404).send({ error: err.message });
      }
    }
  );

  // Verification trigger
  fastify.post<{ Params: { id: string }; Body: { passed: boolean; quality_score?: number } }>(
    '/api/v1/jobs/:id/verify',
    async (request, reply) => {
      const { passed, quality_score } = request.body || {};
      const submission = store.getSubmission(request.params.id);

      if (!submission) {
        return reply.status(404).send({ error: 'Submission not found for this job' });
      }

      return reply.send({
        job_id: request.params.id,
        verified: passed,
        quality_score: quality_score || 5.0,
        tx_hash: '0x' + '1234567890abcdef'.repeat(4),
        status: passed ? 'completed' : 'disputed',
      });
    }
  );
}
