import { FastifyInstance } from 'fastify';
import { orders, Order, STATE_MESSAGE } from '../services/orders.js';
import { artifacts } from '../services/artifacts.js';
import { jobLog, JobEvent } from '../services/job-log.js';
import { ledger } from '../services/ledger.js';
import { dispatch } from '../services/dispatcher.js';
import { acceptJob, cancelJob, rejectJob } from '../services/settlement.js';
import { currentUser, sendError } from '../services/auth.js';
import { TERMINAL_STATES } from '../services/schema.js';
import { describeDataHandling } from '../services/data-handling.js';

/** What a hirer sees. Internal plumbing (tokens, storage keys, hashes) stays out. */
function toOrderView(order: Order) {
  const input = order.input_artifact_id ? artifacts.get(order.input_artifact_id) : undefined;
  const outputs = artifacts.listForJob(order.id, 'output');
  const downloadable = order.state === 'accepted' || order.state === 'disputed';

  return {
    id: order.id,
    state: order.state,
    message: STATE_MESSAGE[order.state],
    agent: { id: order.agent_id, name: order.agent_name },
    skill_id: order.skill_id,
    instructions: order.task_prompt,
    price_usdc: order.price_usdc,
    currency: order.currency,
    progress: order.progress,
    current_step: order.current_step,
    steps: order.steps,
    result_view: order.result_view,
    data_handling: order.data_handling,
    data_handling_summary: describeDataHandling(order.data_handling),
    input: input ? artifacts.describe(input) : null,
    outputs: downloadable
      ? outputs.map((o) => ({
          ...artifacts.describe(o),
          download_url: `/v1/orders/${order.id}/outputs/${o.id}`,
        }))
      : [],
    result_text: downloadable ? order.result_text : null,
    failure: order.failure_code
      ? { code: order.failure_code, message: order.failure_message }
      : null,
    is_final: TERMINAL_STATES.has(order.state),
    can_report_problem:
      ['delivered', 'verifying', 'accepted'].includes(order.state) &&
      (!order.accept_by || new Date(order.accept_by) > new Date()),
    report_problem_by: order.accept_by,
    deadline_at: order.deadline_at,
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
}

export async function orderRoutes(fastify: FastifyInstance) {
  /**
   * POST /v1/orders
   * Hire an agent. Funds are held, the job is queued, and the response returns
   * immediately — the work happens out of band and is watched over /events.
   */
  fastify.post<{
    Body: {
      agent_id: number;
      skill_id?: string;
      instructions: string;
      input_artifact_id?: string;
      params?: Record<string, unknown>;
      deadline_seconds?: number;
    };
  }>('/v1/orders', async (request, reply) => {
    try {
      const user = currentUser(request);
      const body = request.body ?? ({} as any);

      if (!body.agent_id) {
        return reply.status(400).send({ error: 'invalid_request', message: 'Choose an agent to hire.' });
      }

      const order = orders.create({
        userId: user.id,
        agentId: body.agent_id,
        skillId: body.skill_id,
        instructions: body.instructions,
        inputArtifactId: body.input_artifact_id,
        params: body.params,
        deadlineSeconds: body.deadline_seconds,
      });

      dispatch(order.id);

      return reply.status(202).send({
        order: toOrderView(order),
        events_url: `/v1/orders/${order.id}/events`,
      });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  /** GET /v1/orders — your jobs, newest first. */
  fastify.get('/v1/orders', async (request, reply) => {
    try {
      const user = currentUser(request);
      const list = orders.listForUser(user.id);
      return reply.send({ orders: list.map(toOrderView), total: list.length });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  /** GET /v1/orders/:id — one job. */
  fastify.get<{ Params: { id: string } }>('/v1/orders/:id', async (request, reply) => {
    try {
      const user = currentUser(request);
      return reply.send({ order: toOrderView(orders.getOwned(request.params.id, user.id)) });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  /**
   * GET /v1/orders/:id/events
   * Live progress for one job, as Server-Sent Events. Reconnecting clients send
   * Last-Event-ID and receive everything they missed before the live feed resumes,
   * so a dropped connection never loses a step.
   */
  fastify.get<{ Params: { id: string }; Querystring: { api_key?: string; since?: string } }>(
    '/v1/orders/:id/events',
    async (request, reply) => {
      let order: Order;
      try {
        // EventSource cannot set headers, so allow the key as a query parameter here.
        if (request.query?.api_key && !request.headers.authorization) {
          request.headers.authorization = `Bearer ${request.query.api_key}`;
        }
        const user = currentUser(request);
        order = orders.getOwned(request.params.id, user.id);
      } catch (err) {
        return sendError(reply, err);
      }

      const lastEventId = Number.parseInt(
        String(request.headers['last-event-id'] ?? request.query?.since ?? '0'),
        10
      );
      const since = Number.isFinite(lastEventId) && lastEventId > 0 ? lastEventId : 0;

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      const write = (event: JobEvent) => {
        reply.raw.write(
          `id: ${event.seq}\nevent: ${event.type}\ndata: ${JSON.stringify({
            seq: event.seq,
            type: event.type,
            actor: event.actor,
            at: event.created_at,
            ...event.payload,
          })}\n\n`
        );
      };

      for (const event of jobLog.since(order.id, since)) write(event);

      const snapshot = orders.get(order.id)!;
      if (TERMINAL_STATES.has(snapshot.state)) {
        reply.raw.write(`event: done\ndata: ${JSON.stringify(toOrderView(snapshot))}\n\n`);
        reply.raw.end();
        return reply;
      }

      // Comment frames keep proxies from closing an idle connection.
      const keepAlive = setInterval(() => reply.raw.write(': keep-alive\n\n'), 15_000);
      keepAlive.unref?.();

      let unsubscribe = () => {};
      const cleanup = () => {
        clearInterval(keepAlive);
        unsubscribe();
      };

      unsubscribe = jobLog.subscribe(order.id, (event) => {
        write(event);
        if (event.type === 'state' && TERMINAL_STATES.has((event.payload as any).to)) {
          const final = orders.get(order.id);
          if (final) reply.raw.write(`event: done\ndata: ${JSON.stringify(toOrderView(final))}\n\n`);
          cleanup();
          reply.raw.end();
        }
      });

      request.raw.on('close', cleanup);
      request.raw.on('error', cleanup);

      return reply;
    }
  );

  /** GET /v1/orders/:id/outputs/:artifactId — download a delivered file. */
  fastify.get<{ Params: { id: string; artifactId: string } }>(
    '/v1/orders/:id/outputs/:artifactId',
    async (request, reply) => {
      try {
        const user = currentUser(request);
        const order = orders.getOwned(request.params.id, user.id);

        if (!['accepted', 'disputed'].includes(order.state)) {
          return reply.status(409).send({
            error: 'not_ready',
            message: `This result is not available yet — the job is ${order.state}.`,
          });
        }

        const record = artifacts.get(request.params.artifactId);
        if (!record || record.job_id !== order.id || record.kind !== 'output') {
          return reply.status(404).send({ error: 'not_found', message: 'No such file on this job.' });
        }
        if (record.deleted_at) {
          return reply.status(410).send({
            error: 'expired',
            message: 'This file was deleted under its retention policy.',
          });
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

  /** POST /v1/orders/:id/accept — approve early, before the window closes. */
  fastify.post<{ Params: { id: string } }>('/v1/orders/:id/accept', async (request, reply) => {
    try {
      const user = currentUser(request);
      const order = orders.getOwned(request.params.id, user.id);
      const accepted = acceptJob(order.id, 'user', 'Approved by the hirer');
      return reply.send({ order: toOrderView(accepted ?? order) });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  /** POST /v1/orders/:id/reject — report a problem inside the window. */
  fastify.post<{ Params: { id: string }; Body: { reason?: string } }>(
    '/v1/orders/:id/reject',
    async (request, reply) => {
      try {
        const user = currentUser(request);
        const reason = request.body?.reason?.trim();
        if (!reason) {
          return reply.status(400).send({
            error: 'invalid_request',
            message: 'Tell us what was wrong with the result.',
          });
        }
        return reply.send({ order: toOrderView(rejectJob(request.params.id, user.id, reason)) });
      } catch (err) {
        return sendError(reply, err);
      }
    }
  );

  /** POST /v1/orders/:id/cancel — pull out before the agent starts. */
  fastify.post<{ Params: { id: string } }>('/v1/orders/:id/cancel', async (request, reply) => {
    try {
      const user = currentUser(request);
      return reply.send({ order: toOrderView(cancelJob(request.params.id, user.id)) });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  /**
   * GET /v1/orders/:id/receipt
   * What was run, on what input, producing what output, for how much — plus the
   * head of the event-log hash chain, so the record can be checked later.
   */
  fastify.get<{ Params: { id: string } }>('/v1/orders/:id/receipt', async (request, reply) => {
    try {
      const user = currentUser(request);
      const order = orders.getOwned(request.params.id, user.id);
      const input = order.input_artifact_id ? artifacts.get(order.input_artifact_id) : undefined;
      const chain = jobLog.verifyChain(order.id);
      const head = jobLog.head(order.id);

      return reply.send({
        receipt: {
          job_id: order.id,
          state: order.state,
          agent: { id: order.agent_id, name: order.agent_name, url: order.agent_url },
          skill_id: order.skill_id,
          task_hash: order.task_hash,
          data_handling: order.data_handling,
          input: input ? { filename: input.filename, sha256: input.sha256, size_bytes: input.size_bytes } : null,
          outputs: artifacts
            .listForJob(order.id, 'output')
            .map((o) => ({ filename: o.filename, sha256: o.sha256, size_bytes: o.size_bytes })),
          price_usdc: order.price_usdc,
          currency: order.currency,
          ledger: ledger.entriesFor(order.id).map((e) => ({
            kind: e.kind,
            amount_usdc: e.amount_usdc,
            at: e.created_at,
          })),
          timings: {
            created_at: order.created_at,
            dispatched_at: order.dispatched_at,
            delivered_at: order.delivered_at,
            settled_at: order.settled_at,
          },
          event_log: { entries: head?.seq ?? 0, head_hash: head?.hash ?? null, intact: chain.valid },
        },
      });
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
