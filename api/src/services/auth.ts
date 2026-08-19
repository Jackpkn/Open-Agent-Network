import crypto from 'node:crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { config } from './config.js';
import { users, User } from './users.js';
import { bearerFrom } from './tokens.js';

export class Unauthorized extends Error {
  constructor(message = 'Sign in to continue.') {
    super(message);
    this.name = 'Unauthorized';
  }
}

/**
 * Resolve the caller from their API key.
 *
 * Every route touching a job, an upload or a balance goes through here. Without
 * it a job has no owner, which is how the old `/verify` and `/slash` endpoints
 * ended up callable by anyone who could reach the port.
 */
export function currentUser(request: FastifyRequest): User {
  const key =
    bearerFrom(request.headers.authorization) ??
    (typeof request.headers['x-api-key'] === 'string' ? request.headers['x-api-key'] : undefined);

  if (!key) throw new Unauthorized('Provide your API key as `Authorization: Bearer oan_live_...`.');

  const user = users.findByApiKey(key);
  if (!user) throw new Unauthorized('That API key is not valid.');

  return user;
}

/**
 * Authorise a privileged operator action (arbitration, forced resolution).
 * With no OAN_ADMIN_KEY configured these endpoints stay closed.
 */
export function requireAdmin(request: FastifyRequest): void {
  const configured = config.adminKey;
  if (!configured) {
    throw new Unauthorized('This endpoint is disabled until OAN_ADMIN_KEY is configured.');
  }

  const provided =
    bearerFrom(request.headers.authorization) ??
    (typeof request.headers['x-admin-key'] === 'string' ? request.headers['x-admin-key'] : undefined);

  if (!provided || provided.length !== configured.length) {
    throw new Unauthorized('This action requires the operator key.');
  }
  if (!crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(configured))) {
    throw new Unauthorized('This action requires the operator key.');
  }
}

/** Translate a thrown auth/order error into a clean HTTP response. */
export function sendError(reply: FastifyReply, err: any) {
  if (err instanceof Unauthorized) {
    return reply.status(401).send({ error: 'unauthorized', message: err.message });
  }
  if (err?.name === 'TokenError') {
    return reply.status(401).send({ error: 'invalid_token', message: err.message });
  }
  if (err?.name === 'InsufficientFunds') {
    return reply.status(402).send({ error: 'insufficient_funds', message: err.message });
  }
  if (err?.name === 'ArtifactTooLarge') {
    return reply.status(413).send({ error: 'file_too_large', message: err.message });
  }
  if (err?.name === 'OrderError') {
    return reply.status(err.statusCode ?? 400).send({ error: 'invalid_request', message: err.message });
  }

  request_log(err);
  return reply.status(500).send({
    error: 'internal_error',
    message: 'Something went wrong on our side. The job was not charged.',
  });
}

function request_log(err: unknown) {
  console.error('[api] unhandled error:', err);
}
