import { FastifyRequest } from 'fastify';
import { config } from './config.js';
import { currentUser, Unauthorized } from './auth.js';
import { ledger } from './ledger.js';
import { User } from './users.js';

/**
 * Access control for the legacy agent-to-agent endpoints.
 *
 * `POST /api/v1/jobs` and the chat endpoints make a registered agent do work.
 * That was harmless when every agent was a deterministic example; once one of
 * them calls a paid model API it becomes a way for anyone who can reach the port
 * to spend the operator's budget, in a loop, at whatever the rate limiter allows.
 *
 * These endpoints therefore need an account by default. Work done through them
 * is charged against that account exactly like the hiring plane, so an
 * authenticated caller cannot get free compute either.
 */
export function authorizeLegacyWork(request: FastifyRequest): User | null {
  try {
    return currentUser(request);
  } catch (err) {
    if (config.allowAnonymousLegacy) return null;
    if (err instanceof Unauthorized) {
      throw new Unauthorized(
        'These endpoints make agents perform paid work, so they need an account. ' +
          'Create one at POST /v1/users, or set OAN_ALLOW_ANONYMOUS_LEGACY=true for a local demo.'
      );
    }
    throw err;
  }
}

/** Hold the agent's price before dispatching. No-op for an anonymous demo caller. */
export function holdForLegacyWork(user: User | null, jobId: string, amountUsdc: string): void {
  if (!user) return;
  const amount = Number.parseFloat(amountUsdc || '0');
  if (!Number.isFinite(amount) || amount <= 0) return;

  ledger.hold(user.id, jobId, amountUsdc);
}

/**
 * Settle a held amount once the agent has answered — released on success,
 * returned on failure. Charging for work that did not happen is the thing this
 * exists to prevent.
 */
export function settleLegacyWork(
  user: User | null,
  jobId: string,
  agentId: number,
  succeeded: boolean,
  reason: string
): void {
  if (!user) return;

  if (succeeded) {
    ledger.release(jobId, user.id, agentId);
  } else {
    ledger.refund(jobId, user.id, reason);
  }
}
