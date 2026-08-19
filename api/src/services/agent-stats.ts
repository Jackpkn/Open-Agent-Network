import { getDb } from './store.js';
import { initProtocolSchema } from './schema.js';

export interface AgentStats {
  jobs_completed: number;
  jobs_failed: number;
  jobs_stalled: number;
  success_rate: number | null;
  typical_seconds: number | null;
}

/**
 * What a hirer needs before choosing an agent.
 *
 * "Usually 9 seconds, 99% success, 1 stall in 400" answers the question better
 * than any live view can. It is also the signal that de-lists a bad agent.
 */
export function agentStats(agentId: number): AgentStats {
  initProtocolSchema();
  const db = getDb();

  const counts = db
    .prepare(
      `SELECT
         SUM(CASE WHEN state = 'accepted' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN state IN ('failed','expired') THEN 1 ELSE 0 END) AS failed,
         SUM(CASE WHEN state = 'stalled' THEN 1 ELSE 0 END) AS stalled
       FROM jobs WHERE agent_id = ?`
    )
    .get(agentId) as any;

  const completed = counts?.completed ?? 0;
  const failed = counts?.failed ?? 0;
  const stalled = counts?.stalled ?? 0;
  const finished = completed + failed;

  // Median duration over recent completed jobs, so one slow outlier does not skew it.
  const durations = db
    .prepare(
      `SELECT (julianday(settled_at) - julianday(dispatched_at)) * 86400 AS seconds
       FROM jobs
       WHERE agent_id = ? AND state = 'accepted' AND dispatched_at IS NOT NULL AND settled_at IS NOT NULL
       ORDER BY created_at DESC LIMIT 50`
    )
    .all(agentId) as Array<{ seconds: number }>;

  const sorted = durations.map((d) => d.seconds).filter((s) => s >= 0).sort((a, b) => a - b);
  const typical = sorted.length ? Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10 : null;

  return {
    jobs_completed: completed,
    jobs_failed: failed,
    jobs_stalled: stalled,
    success_rate: finished > 0 ? Math.round((completed / finished) * 1000) / 1000 : null,
    typical_seconds: typical,
  };
}
