import { FastifyInstance } from 'fastify';
import { orders } from '../services/orders.js';
import { artifacts } from '../services/artifacts.js';
import { jobLog } from '../services/job-log.js';
import { verifyToken, bearerFrom, hashSecret } from '../services/tokens.js';
import { config } from '../services/config.js';
import { sendError } from '../services/auth.js';
import { bodyAsBuffer } from '../services/request-body.js';
import { failJob, runVerificationGate } from '../services/settlement.js';

/**
 * The worker-facing plane.
 *
 * Every route here is authorised by a capability token minted at dispatch and
 * scoped to a single job. There is no standing worker credential, so a token
 * that leaks cannot touch a second job and stops working at the deadline.
 */

function authorizeJob(request: any, jobId: string, cap: 'job:callback' | 'artifact:write') {
  const token =
    bearerFrom(request.headers.authorization) ??
    (typeof request.query?.token === 'string' ? request.query.token : undefined);

  verifyToken(token, { cap, job: jobId });

  const order = orders.get(jobId);
  if (!order) {
    const err: any = new Error(`No job ${jobId}`);
    err.name = 'OrderError';
    err.statusCode = 404;
    throw err;
  }

  // The dispatched token is the one recorded on the job; a superseded token is dead.
  if (cap === 'job:callback' && order.worker_token_hash && token) {
    if (order.worker_token_hash !== hashSecret(token)) {
      const err: any = new Error('This callback token has been superseded.');
      err.name = 'TokenError';
      throw err;
    }
  }

  return order;
}

export async function workerRoutes(fastify: FastifyInstance) {
  /**
   * POST /oan/v1/jobs/:id/events
   * Progress from the worker. Each call is also a heartbeat, which is what keeps
   * the job out of `stalled`.
   */
  fastify.post<{
    Params: { id: string };
    Body: { type?: string; step?: string; progress?: number; note?: string };
  }>('/oan/v1/jobs/:id/events', async (request, reply) => {
    try {
      const order = authorizeJob(request, request.params.id, 'job:callback');
      const body = request.body ?? {};
      const type = body.type || 'step';

      if (!['step', 'log', 'heartbeat', 'partial', 'accepted'].includes(type)) {
        return reply.status(400).send({
          error: 'invalid_request',
          message: `"${type}" is not a valid event type.`,
        });
      }

      if (order.state === 'delivered' || order.state === 'verifying' || order.state === 'accepted') {
        return reply.status(409).send({
          error: 'already_delivered',
          message: 'This job has already been delivered.',
        });
      }

      const updated = orders.recordProgress(order.id, {
        step: body.step,
        progress: body.progress,
        note: body.note,
      });

      if (type !== 'heartbeat') {
        jobLog.append(order.id, {
          type,
          actor: 'worker',
          payload: {
            step: body.step ?? null,
            progress: updated?.progress ?? null,
            note: body.note ?? null,
          },
        });
      }

      return reply.send({
        ok: true,
        state: updated?.state,
        heartbeat_interval_s: Math.max(5, Math.floor(order.heartbeat_timeout_s / 3)),
      });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  /**
   * POST /oan/v1/jobs/:id/outputs
   * Upload a result file. Body is the raw bytes; name it with X-Filename.
   */
  fastify.post<{ Params: { id: string }; Querystring: { token?: string } }>(
    '/oan/v1/jobs/:id/outputs',
    { bodyLimit: config.maxUploadBytes },
    async (request, reply) => {
      try {
        const order = authorizeJob(request, request.params.id, 'artifact:write');

        const body = bodyAsBuffer(request.body);
        if (!body) {
          return reply.status(400).send({
            error: 'invalid_request',
            message: 'Send the file as the raw request body.',
          });
        }
        if (['accepted', 'refunded', 'expired', 'failed', 'canceled'].includes(order.state)) {
          return reply.status(409).send({
            error: 'job_closed',
            message: `This job is ${order.state} and no longer accepts uploads.`,
          });
        }

        const filenameHeader = request.headers['x-filename'];
        const record = await artifacts.create({
          data: body,
          filename: typeof filenameHeader === 'string' ? filenameHeader : 'output',
          mime: request.headers['content-type'] || 'application/octet-stream',
          kind: 'output',
          jobId: order.id,
        });

        return reply.status(201).send({ artifact: artifacts.describe(record) });
      } catch (err) {
        return sendError(reply, err);
      }
    }
  );

  /**
   * POST /oan/v1/jobs/:id/complete
   * The worker is done. This hands the job to the verification gate — it does not
   * release money on its own.
   */
  fastify.post<{
    Params: { id: string };
    Body: { output_artifact_ids?: string[]; result_text?: string; summary?: string };
  }>('/oan/v1/jobs/:id/complete', async (request, reply) => {
    try {
      const order = authorizeJob(request, request.params.id, 'job:callback');
      const body = request.body ?? {};

      if (['accepted', 'refunded', 'expired', 'failed', 'canceled'].includes(order.state)) {
        return reply.status(409).send({
          error: 'job_closed',
          message: `This job is already ${order.state}.`,
        });
      }

      // Only files actually uploaded against this job count as deliverables.
      const uploaded = artifacts.listForJob(order.id, 'output');
      const claimed = new Set(body.output_artifact_ids ?? uploaded.map((a) => a.id));
      const outputIds = uploaded.filter((a) => claimed.has(a.id)).map((a) => a.id);

      orders.recordDelivery(order.id, outputIds, body.result_text ?? null);

      const delivered = orders.transition(order.id, 'delivered', {
        actor: 'worker',
        reason: body.summary || 'Worker reported completion',
        extra: { outputs: outputIds.length },
      });
      if (!delivered) {
        return reply.status(409).send({
          error: 'invalid_state',
          message: `Cannot deliver a job that is ${order.state}.`,
        });
      }

      const settled = await runVerificationGate(order.id);
      return reply.send({ ok: true, state: settled?.state ?? 'verifying' });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  /**
   * POST /oan/v1/jobs/:id/fail
   * The worker cannot do the job. Reporting honestly refunds the hirer; going
   * silent instead is what the stall watchdog is for.
   */
  fastify.post<{ Params: { id: string }; Body: { code?: string; message?: string } }>(
    '/oan/v1/jobs/:id/fail',
    async (request, reply) => {
      try {
        const order = authorizeJob(request, request.params.id, 'job:callback');
        const code = request.body?.code || 'agent_error';
        const message = request.body?.message || 'The agent could not complete this job.';

        const failed = failJob(order.id, code, message, 'worker');
        return reply.send({ ok: true, state: failed?.state });
      } catch (err) {
        return sendError(reply, err);
      }
    }
  );

  /**
   * GET /oan/v1/artifacts/:id?token=...
   * Download the job input. The token is scoped to this one artifact and expires
   * with the job, so it grants nothing else and not for long.
   */
  fastify.get<{ Params: { id: string }; Querystring: { token?: string } }>(
    '/oan/v1/artifacts/:id',
    async (request, reply) => {
      try {
        const token = bearerFrom(request.headers.authorization) ?? request.query?.token;
        const claims = verifyToken(token, { cap: 'artifact:read', art: request.params.id });

        const record = artifacts.get(request.params.id);
        if (!record || record.job_id !== claims.job) {
          return reply.status(404).send({ error: 'not_found', message: 'No such file on this job.' });
        }
        if (record.deleted_at) {
          return reply.status(410).send({ error: 'expired', message: 'This file has been deleted.' });
        }

        const { data } = await artifacts.read(record.id);
        return reply
          .header('Content-Type', record.mime)
          .header('Content-Disposition', `attachment; filename="${record.filename}"`)
          .header('X-Content-SHA256', record.sha256)
          .send(data);
      } catch (err) {
        return sendError(reply, err);
      }
    }
  );
}
