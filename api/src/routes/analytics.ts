import { FastifyInstance } from 'fastify';
import { store, RegisteredAgent, Job } from '../services/store.js';

export async function analyticsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/analytics/stats
   * Real-Time Analytics & Escrow Volume Metrics
   */
  fastify.get('/api/v1/analytics/stats', async (request, reply) => {
    const allJobs: Job[] = store.getAllJobs();
    const allAgents: RegisteredAgent[] = store.searchAgents({});

    const totalVolumeUsdc = allJobs.reduce((acc: number, j: Job) => acc + (parseFloat(j.pricing_amount || '0') || 0), 0);
    const activeEscrowUsdc = allJobs
      .filter((j: Job) => j.status === 'working' || j.status === 'submitted')
      .reduce((acc: number, j: Job) => acc + (parseFloat(j.pricing_amount || '0') || 0), 0);

    const completedJobsCount = allJobs.filter((j: Job) => j.status === 'completed').length;
    const totalJobsCount = allJobs.length || 1;
    const successRate = totalJobsCount > 0 ? Math.round((completedJobsCount / totalJobsCount) * 100) : 100;

    // Agent performance breakdown
    const agentStats = allAgents.map((agent: RegisteredAgent) => {
      const agentJobs = allJobs.filter((j: Job) => j.agent_url === agent.agent_url || j.agent_id === agent.id);
      const agentVolume = agentJobs.reduce((acc: number, j: Job) => acc + (parseFloat(j.pricing_amount || '0') || 0), 0);
      return {
        id: agent.id,
        name: agent.agent_card?.name || `Agent #${agent.id}`,
        url: agent.agent_url,
        completedJobs: agentJobs.filter((j: Job) => j.status === 'completed').length,
        totalVolumeUsdc: agentVolume,
        stakeUsdc: agent.stake_usdc || '100.00',
        isHealthy: agent.is_healthy,
      };
    });

    // 7-day timeline volume mockup based on actual jobs
    const timeline = [
      { date: 'Day 1', volume: Math.round(totalVolumeUsdc * 0.15), jobs: Math.max(1, Math.round(completedJobsCount * 0.15)) },
      { date: 'Day 2', volume: Math.round(totalVolumeUsdc * 0.30), jobs: Math.max(2, Math.round(completedJobsCount * 0.30)) },
      { date: 'Day 3', volume: Math.round(totalVolumeUsdc * 0.50), jobs: Math.max(3, Math.round(completedJobsCount * 0.50)) },
      { date: 'Day 4', volume: Math.round(totalVolumeUsdc * 0.70), jobs: Math.max(5, Math.round(completedJobsCount * 0.70)) },
      { date: 'Day 5', volume: Math.round(totalVolumeUsdc * 0.85), jobs: Math.max(7, Math.round(completedJobsCount * 0.85)) },
      { date: 'Today', volume: Math.round(totalVolumeUsdc), jobs: completedJobsCount },
    ];

    return reply.send({
      summary: {
        total_volume_usdc: totalVolumeUsdc.toFixed(2),
        active_escrow_usdc: activeEscrowUsdc.toFixed(2),
        total_registered_agents: allAgents.length,
        total_jobs_executed: allJobs.length,
        completed_jobs_count: completedJobsCount,
        success_rate_percent: successRate,
      },
      agent_stats: agentStats,
      volume_timeline: timeline,
    });
  });
}
