import { orders, Order } from './orders.js';
import { jobLog } from './job-log.js';
import { artifacts } from './artifacts.js';
import { config } from './config.js';
import { expireJob, runVerificationGate } from './settlement.js';

/**
 * The clock that stops a job holding someone's money forever.
 *
 * Nothing else in the system notices a worker that simply stops answering. This
 * sweep does: a missed heartbeat becomes a visible `stalled` state within one
 * interval, and a job that never recovers is cancelled and refunded rather than
 * sitting open. Every non-terminal state has an exit here.
 */
class Watchdog {
  private timer: NodeJS.Timeout | null = null;
  private sweeping = false;
  private lastPurge = 0;

  start(intervalMs = config.watchdogIntervalMs) {
    if (this.timer) return;
    this.timer = setInterval(() => void this.sweep(), intervalMs);
    this.timer.unref?.();
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  /** One pass. Safe to call directly from tests. */
  async sweep(now = new Date()): Promise<void> {
    if (this.sweeping) return;
    this.sweeping = true;

    try {
      for (const order of orders.listByStates(['dispatched', 'working'])) {
        this.checkHeartbeat(order, now);
      }
      for (const order of orders.listByStates(['stalled'])) {
        this.checkStallGrace(order, now);
      }
      for (const order of orders.listByStates(['funded', 'dispatched', 'working', 'stalled'])) {
        this.checkDeadline(order, now);
      }
      for (const order of orders.listByStates(['delivered', 'verifying'])) {
        await this.checkStuckVerification(order, now);
      }

      await this.purgeArtifactsOccasionally(now);
    } catch (err) {
      console.warn('[watchdog] sweep failed:', err);
    } finally {
      this.sweeping = false;
    }
  }

  /** Silence from a running worker becomes a visible state, not a hang. */
  private checkHeartbeat(order: Order, now: Date) {
    // Legacy agents cannot report progress, so only the deadline applies to them.
    if (order.protocol !== 'oan') return;

    const last = order.last_heartbeat_at ?? order.dispatched_at;
    if (!last) return;

    const silentMs = now.getTime() - new Date(last).getTime();
    if (silentMs < order.heartbeat_timeout_s * 1000) return;

    const stalled = orders.transition(order.id, 'stalled', {
      actor: 'watchdog',
      reason: `No word from the agent for ${Math.round(silentMs / 1000)} seconds`,
    });

    if (stalled) {
      jobLog.append(order.id, {
        type: 'stalled',
        actor: 'watchdog',
        payload: {
          silent_seconds: Math.round(silentMs / 1000),
          refund_in_seconds: config.stalledGraceSeconds,
        },
      });
    }
  }

  private checkStallGrace(order: Order, now: Date) {
    const last = order.last_heartbeat_at ?? order.dispatched_at;
    if (!last) return;

    const silentMs = now.getTime() - new Date(last).getTime();
    const limitMs = (order.heartbeat_timeout_s + config.stalledGraceSeconds) * 1000;
    if (silentMs < limitMs) return;

    expireJob(order.id, 'The agent stopped responding and did not recover.');
  }

  private checkDeadline(order: Order, now: Date) {
    if (!order.deadline_at) return;
    if (new Date(order.deadline_at).getTime() > now.getTime()) return;

    expireJob(order.id, 'The job ran past its deadline without a result.');
  }

  /**
   * A gate that crashed mid-run would leave a job holding funds with no exit.
   * Re-run it once the delivery is more than a minute old.
   */
  private async checkStuckVerification(order: Order, now: Date) {
    const since = order.delivered_at ?? order.updated_at;
    if (!since) return;
    if (now.getTime() - new Date(since).getTime() < 60_000) return;

    await runVerificationGate(order.id);
  }

  private async purgeArtifactsOccasionally(now: Date) {
    if (now.getTime() - this.lastPurge < 3_600_000) return;
    this.lastPurge = now.getTime();

    const purged = await artifacts.purgeExpired(now);
    if (purged > 0) console.log(`[watchdog] deleted ${purged} artifact(s) past their retention date`);
  }
}

export const watchdog = new Watchdog();
