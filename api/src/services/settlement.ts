import { orders, Order, OrderError } from './orders.js';
import { jobLog, EventActor } from './job-log.js';
import { ledger } from './ledger.js';
import { artifacts } from './artifacts.js';
import { verifyDelivery } from './verification.js';
import { eventHub } from './websocket-hub.js';
import { config } from './config.js';

/**
 * Every path a job can end on, and the money that moves when it does.
 *
 * Concentrated in one module on purpose: if refunds and releases are scattered
 * across routes, one forgotten path is a job that holds someone's money forever.
 */

/** Run the verification gate on a delivered job, then release or refund. */
export async function runVerificationGate(jobId: string): Promise<Order | undefined> {
  const delivered = orders.transition(jobId, 'verifying', {
    actor: 'hub',
    reason: 'Checking the delivered result',
  });
  if (!delivered) return undefined;

  const result = await verifyDelivery(delivered);

  jobLog.append(jobId, {
    type: 'verification',
    actor: 'hub',
    payload: { tier: result.tier, passed: result.passed, checks: result.checks },
  });

  if (!result.passed) {
    return failJob(jobId, 'verification_failed', result.failureReason ?? 'The result did not pass checks.', 'hub');
  }

  // Passed the automated gate. Open the acceptance window and settle immediately:
  // the hirer keeps the right to object for the length of the window.
  const acceptBy = new Date(Date.now() + config.acceptanceWindowSeconds * 1000).toISOString();
  orders.setAcceptBy(jobId, acceptBy);

  return acceptJob(jobId, 'hub', 'Passed automated checks');
}

/** Release held funds to the worker. Idempotent at the ledger. */
export function acceptJob(jobId: string, actor: EventActor, reason: string): Order | undefined {
  const order = orders.get(jobId);
  if (!order) return undefined;

  const accepted = orders.transition(jobId, 'accepted', { actor, reason });
  if (!accepted) return orders.get(jobId);

  if (accepted.user_id) {
    const payout = ledger.release(jobId, accepted.user_id, accepted.agent_id);
    if (payout) {
      jobLog.append(jobId, {
        type: 'settled',
        actor: 'hub',
        payload: { worker_usdc: payout.worker, protocol_fee_usdc: payout.fee, mode: config.escrowMode },
      });
      eventHub.broadcast('job_verified', { ...accepted, payout } as unknown as Record<string, unknown>);
    }
  }

  return orders.get(jobId);
}

/** The worker could not do the job, or the gate rejected it. Money goes back. */
export function failJob(
  jobId: string,
  code: string,
  message: string,
  actor: EventActor
): Order | undefined {
  const failed = orders.transition(jobId, 'failed', {
    actor,
    reason: message,
    extra: { failure_code: code, failure_message: message },
  });
  if (!failed) return orders.get(jobId);

  refundHeldFunds(failed, `Refunded: ${message}`);
  return orders.get(jobId);
}

/** Deadline passed with nothing delivered. */
export function expireJob(jobId: string, reason: string): Order | undefined {
  const expired = orders.transition(jobId, 'expired', { actor: 'watchdog', reason });
  if (!expired) return orders.get(jobId);

  refundHeldFunds(expired, `Refunded: ${reason}`);
  return orders.get(jobId);
}

/** The hirer pulled out before a worker started. */
export function cancelJob(jobId: string, userId: string): Order {
  const order = orders.getOwned(jobId, userId);

  if (order.state !== 'funded') {
    throw new OrderError(
      `This job is already ${order.state}. You can only cancel before the agent starts work.`,
      409
    );
  }

  const canceled = orders.transition(jobId, 'canceled', { actor: 'user', reason: 'Canceled by hirer' });
  if (!canceled) throw new OrderError('Could not cancel this job', 409);

  refundHeldFunds(canceled, 'Refunded: canceled before dispatch');
  return orders.get(jobId)!;
}

/** The hirer objected inside the acceptance window. */
export function rejectJob(jobId: string, userId: string, reason: string): Order {
  const order = orders.getOwned(jobId, userId);

  if (order.state === 'accepted' && order.accept_by && new Date(order.accept_by) < new Date()) {
    throw new OrderError('The window to report a problem with this job has closed.', 409);
  }
  if (!['delivered', 'verifying', 'accepted'].includes(order.state)) {
    throw new OrderError(`There is nothing to report a problem with yet — this job is ${order.state}.`, 409);
  }

  jobLog.append(jobId, { type: 'rejected', actor: 'user', payload: { reason } });

  // An already-released job goes straight to arbitration rather than silently reversing.
  const next = orders.transition(jobId, 'rejected', { actor: 'user', reason });
  if (!next) {
    jobLog.append(jobId, {
      type: 'dispute_opened',
      actor: 'user',
      payload: { reason, note: 'Raised after settlement' },
    });
    eventHub.broadcast('dispute_raised', { job_id: jobId, reason });
    return orders.get(jobId)!;
  }

  const disputed = orders.transition(jobId, 'disputed', { actor: 'hub', reason: 'Sent for review' });
  eventHub.broadcast('dispute_raised', { job_id: jobId, reason });
  return disputed ?? orders.get(jobId)!;
}

/** Arbitration outcome. The only path that can slash, and the only way out of `disputed`. */
export function resolveDispute(jobId: string, winner: 'hirer' | 'worker', note: string): Order | undefined {
  const order = orders.get(jobId);
  if (!order) return undefined;
  if (order.state !== 'disputed') {
    throw new OrderError(`Job ${jobId} is ${order.state}, not under review.`, 409);
  }

  if (winner === 'worker') {
    const resolved = acceptJob(jobId, 'hub', `Dispute resolved for the worker: ${note}`);
    eventHub.broadcast('dispute_resolved', { job_id: jobId, winner, note });
    return resolved;
  }

  const refunded = orders.transition(jobId, 'refunded', {
    actor: 'hub',
    reason: `Dispute resolved for the hirer: ${note}`,
  });
  if (refunded) refundHeldFunds(refunded, `Refunded after review: ${note}`);

  eventHub.broadcast('dispute_resolved', { job_id: jobId, winner, note });
  return orders.get(jobId);
}

function refundHeldFunds(order: Order, memo: string) {
  if (!order.user_id) return;

  const amount = ledger.refund(order.id, order.user_id, memo);
  if (amount) {
    jobLog.append(order.id, {
      type: 'refunded',
      actor: 'hub',
      payload: { amount_usdc: amount, memo },
    });
  }
  artifacts.scheduleExpiry(order.id);
}
