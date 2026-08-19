import crypto from 'node:crypto';
import { config } from './config.js';

/**
 * Capability tokens.
 *
 * A worker never receives standing credentials. At dispatch it is handed narrow,
 * short-lived tokens: read this one input, write outputs for this one job, post
 * callbacks for this one job. Everything expires with the job deadline, so a
 * leaked token is worthless within minutes and cannot reach a second job.
 */

export type Capability = 'artifact:read' | 'artifact:write' | 'job:callback';

export interface TokenClaims {
  /** Capability being granted. */
  cap: Capability;
  /** Job this token is scoped to. */
  job: string;
  /** Artifact this token is scoped to (artifact:read only). */
  art?: string;
  /** Expiry, seconds since epoch. */
  exp: number;
}

export class TokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenError';
  }
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function sign(payload: string): string {
  return b64url(crypto.createHmac('sha256', config.tokenSecret).update(payload).digest());
}

/** Issue a capability token. `ttlSeconds` is clamped so nothing outlives its job by much. */
export function mintToken(claims: Omit<TokenClaims, 'exp'>, ttlSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + Math.max(30, Math.min(ttlSeconds, 86400));
  const payload = b64url(Buffer.from(JSON.stringify({ ...claims, exp })));
  return `${payload}.${sign(payload)}`;
}

/**
 * Verify a token and assert it grants exactly what the caller expects.
 * Throws TokenError on a bad signature, expiry, or scope mismatch — never
 * returns a partially-trusted result.
 */
export function verifyToken(
  token: string | undefined,
  expected: { cap: Capability; job?: string; art?: string }
): TokenClaims {
  if (!token) throw new TokenError('Missing capability token');

  const dot = token.lastIndexOf('.');
  if (dot <= 0) throw new TokenError('Malformed capability token');

  const payload = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = sign(payload);

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new TokenError('Invalid capability token signature');
  }

  let claims: TokenClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    throw new TokenError('Unreadable capability token payload');
  }

  if (typeof claims.exp !== 'number' || claims.exp < Math.floor(Date.now() / 1000)) {
    throw new TokenError('Capability token has expired');
  }
  if (claims.cap !== expected.cap) {
    throw new TokenError(`Capability token grants ${claims.cap}, not ${expected.cap}`);
  }
  if (expected.job && claims.job !== expected.job) {
    throw new TokenError('Capability token is scoped to a different job');
  }
  if (expected.art && claims.art !== expected.art) {
    throw new TokenError('Capability token is scoped to a different artifact');
  }

  return claims;
}

/** Extract a bearer token from an Authorization header. */
export function bearerFrom(header: string | string[] | undefined): string | undefined {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match ? match[1] : undefined;
}

/** Hash an API key for storage. Keys are never persisted in the clear. */
export function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

/** Generate a user-facing API key. Shown once, stored only as a hash. */
export function generateApiKey(): string {
  return `oan_live_${crypto.randomBytes(24).toString('base64url')}`;
}

/** Prefixed, sortable-enough identifiers. */
export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(9).toString('base64url')}`;
}
