/**
 * What an agent says it does with the hirer's file.
 *
 * This is a declaration, not a guarantee. Once a worker downloads a document it
 * can do whatever it likes with the bytes, and no protocol can prevent that.
 * What this does provide:
 *
 *   1. the claim is published before anyone hires, so hirers can choose on it;
 *   2. the claim in force at hire time is copied onto the job, so an agent that
 *      later edits its card cannot rewrite what it promised on past work;
 *   3. it lands on the receipt, which is what makes a broken promise arguable.
 *
 * Agent cards are fetched from third-party servers, so nothing here is trusted:
 * unknown values normalise to "undeclared" rather than being passed through.
 */

export type Retention = 'delete-on-completion' | '24h' | '30d' | 'indefinite' | 'undeclared';
export type TrainingUse = 'never' | 'may-be-used' | 'undeclared';

export interface DataHandling {
  retention: Retention;
  training: TrainingUse;
  processors: string[];
  region: string | null;
}

const RETENTION: ReadonlySet<string> = new Set([
  'delete-on-completion',
  '24h',
  '30d',
  'indefinite',
  'undeclared',
]);

const TRAINING: ReadonlySet<string> = new Set(['never', 'may-be-used', 'undeclared']);

export const UNDECLARED: DataHandling = {
  retention: 'undeclared',
  training: 'undeclared',
  processors: [],
  region: null,
};

/** Coerce whatever an agent card claims into something safe to store and show. */
export function normalizeDataHandling(raw: unknown): DataHandling {
  if (!raw || typeof raw !== 'object') return { ...UNDECLARED };

  const value = raw as Record<string, unknown>;
  const retention = typeof value.retention === 'string' && RETENTION.has(value.retention)
    ? (value.retention as Retention)
    : 'undeclared';
  const training = typeof value.training === 'string' && TRAINING.has(value.training)
    ? (value.training as TrainingUse)
    : 'undeclared';

  const processors = Array.isArray(value.processors)
    ? value.processors
        .filter((p): p is string => typeof p === 'string')
        .map((p) => p.slice(0, 60))
        .slice(0, 10)
    : [];

  const region = typeof value.region === 'string' && value.region.trim()
    ? value.region.trim().slice(0, 40)
    : null;

  return { retention, training, processors, region };
}

/** Plain-language summary for a hirer, always phrased as the agent's own claim. */
export function describeDataHandling(handling: DataHandling): string {
  switch (handling.retention) {
    case 'delete-on-completion':
      return 'Says it deletes your file when the job ends';
    case '24h':
      return 'Says it keeps your file for up to 24 hours';
    case '30d':
      return 'Says it keeps your file for up to 30 days';
    case 'indefinite':
      return 'Says it keeps your file indefinitely';
    default:
      return 'Has not said what it does with your file';
  }
}
