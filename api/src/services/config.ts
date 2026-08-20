import crypto from 'node:crypto';

/**
 * Central runtime configuration.
 *
 * Secrets are validated at startup: in production a weak or missing secret is a
 * hard failure, because capability tokens signed with a guessable key would let
 * anyone read another user's uploads or complete someone else's job.
 */

const MIN_SECRET_LENGTH = 32;

function readSecret(name: string): string {
  const value = process.env[name];

  if (value && value.length >= MIN_SECRET_LENGTH) return value;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${name} must be set to a random string of at least ${MIN_SECRET_LENGTH} characters. ` +
        `Generate one with: openssl rand -hex 32`
    );
  }

  if (value) {
    console.warn(`[config] ${name} is shorter than ${MIN_SECRET_LENGTH} characters. Fine for local dev, fatal in production.`);
    return value;
  }

  console.warn(`[config] ${name} is not set. Using an ephemeral development secret — issued tokens will stop working when this process restarts.`);
  return crypto.randomBytes(32).toString('hex');
}

/** True when the process is generating an ephemeral signing key. */
const usingEphemeralSecret = !process.env.OAN_TOKEN_SECRET;

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(`[config] ${name}="${raw}" is not a positive integer. Falling back to ${fallback}.`);
    return fallback;
  }
  return parsed;
}

export const config = {
  /** Signs capability tokens (artifact read/write, worker callbacks). */
  tokenSecret: readSecret('OAN_TOKEN_SECRET'),

  /** Largest single upload the hub will accept. */
  maxUploadBytes: readInt('OAN_MAX_UPLOAD_BYTES', 25 * 1024 * 1024),

  /** Silence from a running worker for this long moves the job to `stalled`. */
  heartbeatTimeoutSeconds: readInt('OAN_HEARTBEAT_TIMEOUT_S', 30),

  /** How long a job may stay `stalled` before it is cancelled and refunded. */
  stalledGraceSeconds: readInt('OAN_STALLED_GRACE_S', 60),

  /** Default wall-clock budget for a job, from dispatch to delivery. */
  defaultDeadlineSeconds: readInt('OAN_DEFAULT_DEADLINE_S', 600),

  /**
   * After delivery passes verification the hirer has this long to object.
   * When it closes with no complaint, release becomes automatic — a hirer who
   * downloads their file and closes the tab must still pay the worker.
   */
  acceptanceWindowSeconds: readInt('OAN_ACCEPTANCE_WINDOW_S', 86400),

  /** Uploaded inputs and delivered outputs are deleted this long after the job ends. */
  artifactTtlSeconds: readInt('OAN_ARTIFACT_TTL_S', 7 * 86400),

  /** How often the watchdog sweeps for stalled, expired and auto-releasable jobs. */
  watchdogIntervalMs: readInt('OAN_WATCHDOG_INTERVAL_MS', 5000),

  /** On-chain escrow is opt-in. Default settlement is the internal ledger. */
  escrowMode: (process.env.OAN_ESCROW_MODE === 'onchain' ? 'onchain' : 'off') as 'off' | 'onchain',

  /** Protocol fee retained on release, in basis points. Matches ACPEscrow.sol. */
  protocolFeeBps: readInt('OAN_PROTOCOL_FEE_BPS', 100),

  /**
   * Operator key for arbitration and other privileged actions. When unset, those
   * endpoints are closed rather than open — a missing key must never mean "allow".
   */
  adminKey: (process.env.OAN_ADMIN_KEY || null) as string | null,

  /** Base URL workers call back on. Must be reachable from the agent's network. */
  publicUrl: (process.env.OAN_PUBLIC_URL || 'http://localhost:3001').replace(/\/$/, ''),
};


// ─── Startup diagnostics ────────────────────────────────────────────

export interface Diagnostics {
  ready: boolean;
  warnings: string[];
  summary: Record<string, string | number | boolean>;
}

const LOCAL_HOSTS = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i;

/**
 * Check the configuration for the mistakes that fail silently.
 *
 * Kept pure and exported so it can be tested and surfaced on /health. The
 * callback-address check is the important one: if the hub binds every interface
 * but tells agents to call back to localhost, then from inside an agent's
 * container or host that address is the agent itself. Every callback is dropped,
 * every job stalls, and every hirer is refunded — with nothing in the logs to
 * say why.
 */
export function diagnose(
  env: NodeJS.ProcessEnv = process.env,
  settings = config,
  ephemeralSecret = usingEphemeralSecret
): Diagnostics {
  const warnings: string[] = [];
  const host = env.HOST || '0.0.0.0';
  const publicIsLocal = LOCAL_HOSTS.test(settings.publicUrl);
  const boundEverywhere = host === '0.0.0.0' || host === '::';

  if (ephemeralSecret) {
    warnings.push(
      'OAN_TOKEN_SECRET is not set. Capability tokens are signed with a key that changes on every restart, ' +
        'so in-flight jobs break when this process restarts. Generate one with: openssl rand -hex 32'
    );
  }

  if (boundEverywhere && publicIsLocal) {
    warnings.push(
      `OAN_PUBLIC_URL is ${settings.publicUrl} but the hub is listening on ${host}. Workers are told to send ` +
        'their progress and results to that address, and from another host or container it points back at them. ' +
        'Set OAN_PUBLIC_URL to an address your agents can actually reach.'
    );
  }

  if (settings.escrowMode === 'onchain') {
    warnings.push(
      'OAN_ESCROW_MODE=onchain is set, but on-chain settlement is not implemented. Jobs will settle on the ' +
        'internal ledger regardless.'
    );
  }

  return {
    ready: warnings.length === 0,
    warnings,
    summary: {
      public_url: settings.publicUrl,
      listening_on: host,
      signing_key: ephemeralSecret ? 'ephemeral (development)' : 'configured',
      arbitration: settings.adminKey ? 'enabled' : 'disabled (no OAN_ADMIN_KEY)',
      settlement: settings.escrowMode === 'onchain' ? 'onchain (not implemented)' : 'internal ledger',
      max_upload_mb: Math.round(settings.maxUploadBytes / 1048576),
      heartbeat_timeout_s: settings.heartbeatTimeoutSeconds,
      acceptance_window_s: settings.acceptanceWindowSeconds,
    },
  };
}
