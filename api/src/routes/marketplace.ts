import { FastifyInstance } from 'fastify';
import { store } from '../services/store.js';
import { agentStats } from '../services/agent-stats.js';
import { resultViewFor } from '../services/orders.js';
import { describeDataHandling, normalizeDataHandling } from '../services/data-handling.js';
import { getDb } from '../services/store.js';
import { initProtocolSchema } from '../services/schema.js';
import { formatUsdc, parseUsdc } from '../services/money.js';
import { config } from '../services/config.js';

/**
 * Browsing, from the hirer's side.
 *
 * Each agent describes its own work: what it does, the steps it will report, and
 * the shape of what it hands back. A client renders any agent from this without
 * knowing anything about it in advance.
 */
export async function marketplaceRoutes(fastify: FastifyInstance) {
  /**
   * GET /v1/stats
   * Headline numbers for the site. Everything here is counted from the database,
   * so nothing shown as live is a placeholder.
   */
  fastify.get('/v1/stats', async (_request, reply) => {
    initProtocolSchema();
    const db = getDb();

    const agents = db.prepare('SELECT COUNT(*) AS n FROM agents').get() as any;
    const healthy = db.prepare('SELECT COUNT(*) AS n FROM agents WHERE is_healthy = 1').get() as any;

    const jobs = db
      .prepare(
        `SELECT
           SUM(CASE WHEN state = 'accepted' THEN 1 ELSE 0 END) AS completed,
           SUM(CASE WHEN state IN ('failed','expired') THEN 1 ELSE 0 END) AS failed
         FROM jobs`
      )
      .get() as any;

    const settled = db
      .prepare(`SELECT amount_usdc FROM ledger_entries WHERE kind IN ('release','fee')`)
      .all() as Array<{ amount_usdc: string }>;

    const volume = settled.reduce((total, row) => total + parseUsdc(row.amount_usdc), 0);
    const completed = jobs?.completed ?? 0;
    const failed = jobs?.failed ?? 0;
    const finished = completed + failed;

    return reply.send({
      agents_registered: agents?.n ?? 0,
      agents_available: healthy?.n ?? 0,
      jobs_completed: completed,
      settled_volume_usdc: formatUsdc(volume),
      success_rate: finished > 0 ? Math.round((completed / finished) * 1000) / 1000 : null,
      settlement: config.escrowMode === 'onchain' ? 'Base Sepolia' : 'Internal ledger',
    });
  });

  fastify.get<{ Querystring: { skill?: string; query?: string } }>(
    '/v1/agents',
    async (request, reply) => {
      const agents = store.searchAgents({ skill: request.query?.skill, query: request.query?.query });

      return reply.send({
        agents: agents.map((agent) => ({
          id: agent.id,
          name: agent.agent_card.name,
          description: agent.agent_card.description,
          available: agent.is_healthy,
          price_usdc: agent.pricing_amount ?? '0.00',
          currency: agent.pricing_currency ?? 'USDC',
          reports_progress: agent.agent_card.capabilities?.oanAsync === true,
          data_handling: normalizeDataHandling(agent.agent_card.data_handling),
          data_handling_summary: describeDataHandling(
            normalizeDataHandling(agent.agent_card.data_handling)
          ),
          skills: (agent.agent_card.skills ?? []).map((skill) => ({
            id: skill.id,
            name: skill.name,
            description: skill.description,
            tags: skill.tags ?? [],
            steps: Array.isArray((skill as any).steps) ? (skill as any).steps : [],
            result_view: resultViewFor(skill as unknown as Record<string, unknown>),
          })),
          stats: agentStats(agent.id),
        })),
        total: agents.length,
      });
    }
  );
}
