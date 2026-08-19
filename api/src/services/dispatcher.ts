import { orders, Order } from './orders.js';
import { jobLog } from './job-log.js';
import { artifacts } from './artifacts.js';
import { store } from './store.js';
import { mintToken } from './tokens.js';
import { config } from './config.js';
import { failJob, runVerificationGate } from './settlement.js';

/**
 * Sending work to a worker, without blocking the hirer's request.
 *
 * The old path called the agent inside the HTTP handler with a two-second
 * timeout, which capped every job at two seconds of work. Dispatch now happens
 * out of band: the hirer's request returns as soon as the job is funded, and the
 * worker reports back over callbacks.
 *
 * Two wire protocols are supported. Agents that advertise `oan/1` get the async
 * envelope. Everything already deployed against A2A `tasks/send` keeps working
 * through the legacy path, which runs the blocking call in the background with a
 * deadline-length budget instead of two seconds.
 */

const OAN_PROTOCOL = 'oan/1';

function supportsOan(order: Order): boolean {
  const agent = store.getAgent(order.agent_id);
  if (!agent) return false;

  const capabilities = agent.agent_card?.capabilities as Record<string, unknown> | undefined;
  if (capabilities?.oanAsync === true) return true;

  const protocols = (agent.agent_card as any)?.protocols;
  return Array.isArray(protocols) && protocols.includes(OAN_PROTOCOL);
}

function remainingMs(order: Order): number {
  if (!order.deadline_at) return config.defaultDeadlineSeconds * 1000;
  return Math.max(5_000, new Date(order.deadline_at).getTime() - Date.now());
}

function buildEnvelope(order: Order) {
  const ttl = Math.ceil(remainingMs(order) / 1000) + 60;
  const callbackToken = mintToken({ cap: 'job:callback', job: order.id }, ttl);
  orders.setWorkerToken(order.id, callbackToken);

  const input = order.input_artifact_id ? artifacts.get(order.input_artifact_id) : undefined;
  const downloadToken = input
    ? mintToken({ cap: 'artifact:read', job: order.id, art: input.id }, ttl)
    : undefined;
  const uploadToken = mintToken({ cap: 'artifact:write', job: order.id }, ttl);

  return {
    protocol: OAN_PROTOCOL,
    job_id: order.id,
    skill_id: order.skill_id,
    instructions: order.task_prompt,
    params: order.params,
    steps: order.steps,
    input: input
      ? {
          ...artifacts.describe(input),
          download_url: `${config.publicUrl}/oan/v1/artifacts/${input.id}?token=${downloadToken}`,
        }
      : null,
    output: {
      upload_url: `${config.publicUrl}/oan/v1/jobs/${order.id}/outputs`,
      upload_token: uploadToken,
    },
    callback: {
      token: callbackToken,
      events_url: `${config.publicUrl}/oan/v1/jobs/${order.id}/events`,
      complete_url: `${config.publicUrl}/oan/v1/jobs/${order.id}/complete`,
      fail_url: `${config.publicUrl}/oan/v1/jobs/${order.id}/fail`,
    },
    budget: { amount_usdc: order.price_usdc, currency: order.currency },
    escrow: { mode: config.escrowMode, task_hash: order.task_hash },
    deadline_at: order.deadline_at,
    heartbeat_interval_s: Math.max(5, Math.floor(order.heartbeat_timeout_s / 3)),
  };
}

/** Kick off dispatch. Never throws into the caller — failures land on the job. */
export function dispatch(jobId: string): void {
  void dispatchNow(jobId).catch((err) => {
    console.warn(`[dispatcher] ${jobId} failed:`, err?.message ?? err);
  });
}

export async function dispatchNow(jobId: string): Promise<void> {
  const funded = orders.get(jobId);
  if (!funded || funded.state !== 'funded') return;

  const order = orders.transition(jobId, 'dispatched', {
    actor: 'hub',
    reason: 'Sent to the agent',
  });
  if (!order) return;

  const envelope = buildEnvelope(order);
  const useOan = supportsOan(order);
  orders.setProtocol(jobId, useOan ? 'oan' : 'legacy');

  try {
    if (useOan) {
      await dispatchOan(order, envelope);
    } else {
      await dispatchLegacy(order, envelope);
    }
  } catch (err: any) {
    const message = err?.name === 'TimeoutError'
      ? 'The agent did not respond before the deadline.'
      : `Could not reach the agent: ${err?.message ?? 'unknown error'}`;
    failJob(jobId, 'dispatch_failed', message, 'hub');
  }
}

/** Async protocol: the agent acknowledges, then reports progress over callbacks. */
async function dispatchOan(order: Order, envelope: ReturnType<typeof buildEnvelope>): Promise<void> {
  const endpoint = `${order.agent_url.replace(/\/$/, '')}/oan/v1/tasks`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Agent rejected the task (HTTP ${response.status})`);
  }

  jobLog.append(order.id, {
    type: 'accepted',
    actor: 'worker',
    payload: { protocol: OAN_PROTOCOL, endpoint },
  });
}

/**
 * Legacy A2A path for agents that predate the async protocol.
 *
 * The blocking call now runs in the background with the job's full deadline, so
 * a sixty-second job completes instead of being cut off at two seconds.
 */
async function dispatchLegacy(order: Order, envelope: ReturnType<typeof buildEnvelope>): Promise<void> {
  const endpoint = `${order.agent_url.replace(/\/$/, '')}/a2a/v1/rpc`;

  jobLog.append(order.id, {
    type: 'accepted',
    actor: 'hub',
    payload: { protocol: 'a2a/tasks.send', endpoint, note: 'Agent does not support progress reporting' },
  });

  // Legacy agents emit no heartbeats, so keep the watchdog from stalling the job.
  orders.recordProgress(order.id, { step: 'working', progress: 0.1, note: 'Agent is running' });

  const prompt = envelope.input
    ? `${order.task_prompt}\n\n[input file: ${envelope.input.filename} (${envelope.input.mime}, ${envelope.input.size_bytes} bytes)]\n[download: ${envelope.input.download_url}]`
    : order.task_prompt;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tasks/send',
      params: { id: order.id, message: { role: 'user', parts: [{ text: prompt, media_type: 'text/plain' }] } },
      id: 1,
    }),
    signal: AbortSignal.timeout(remainingMs(order)),
  });

  if (!response.ok) throw new Error(`Agent returned HTTP ${response.status}`);

  const body: any = await response.json();
  if (body?.error) throw new Error(body.error.message || 'Agent returned a JSON-RPC error');

  const result = body?.result ?? {};
  const outputText: string =
    result.output_text || result.message?.parts?.[0]?.text || '';

  if (result.status === 'failed') {
    failJob(order.id, 'agent_error', outputText || 'The agent reported a failure.', 'worker');
    return;
  }

  // Convert whatever the legacy agent returned into a real output artifact.
  const outputIds: string[] = [];
  const parts: any[] = Array.isArray(result.artifacts) ? result.artifacts : [];

  for (const [index, artifact] of parts.entries()) {
    const text = artifact?.parts?.map((p: any) => p?.text).filter(Boolean).join('\n') ?? '';
    if (!text) continue;
    const record = await artifacts.create({
      data: Buffer.from(text, 'utf8'),
      filename: artifact?.name || `output-${index + 1}.txt`,
      mime: 'text/plain',
      kind: 'output',
      jobId: order.id,
    });
    outputIds.push(record.id);
  }

  if (outputIds.length === 0 && outputText) {
    const record = await artifacts.create({
      data: Buffer.from(outputText, 'utf8'),
      filename: 'result.txt',
      mime: 'text/plain',
      kind: 'output',
      jobId: order.id,
    });
    outputIds.push(record.id);
  }

  orders.recordDelivery(order.id, outputIds, outputText || null);
  orders.transition(order.id, 'delivered', { actor: 'worker', reason: 'Agent returned a result' });
  await runVerificationGate(order.id);
}
