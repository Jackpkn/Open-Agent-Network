import { store } from './store.js';
import { a2aClient } from './a2a-client.js';
import { eventHub } from './websocket-hub.js';

export class HealthMonitorService {
  private intervalId: NodeJS.Timeout | null = null;
  private failureCounts: Map<number, number> = new Map();

  /**
   * Starts periodic health check monitor for registered agents (every 15 seconds)
   */
  start(intervalMs = 15000) {
    if (this.intervalId) return;

    this.intervalId = setInterval(async () => {
      await this.runHealthChecks();
    }, intervalMs);

    // Initial run on startup
    this.runHealthChecks().catch((err) =>
      console.warn('Initial health check failed:', err.message)
    );
  }

  /**
   * Stops the health monitor background service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Pings all registered agents, tracks consecutive failures, and slashes collateral stake on 3 consecutive failures
   */
  async runHealthChecks() {
    const agents = store.getAllAgents();
    for (const agent of agents) {
      try {
        const isHealthy = await a2aClient.pingHealth(agent.agent_url);
        if (isHealthy) {
          this.failureCounts.set(agent.id, 0);
          store.updateHealthStatus(agent.id, true);
        } else {
          await this.handleHealthFailure(agent);
        }
      } catch (e) {
        await this.handleHealthFailure(agent);
      }
    }
  }

  private async handleHealthFailure(agent: any) {
    const currentFailures = (this.failureCounts.get(agent.id) || 0) + 1;
    this.failureCounts.set(agent.id, currentFailures);
    store.updateHealthStatus(agent.id, false);

    if (currentFailures === 3) {
      const slashAmount = '50.00';
      const reason = `Agent offline / un-responsive for 3 consecutive health checks (${agent.agent_url})`;
      store.slashAgent(agent.id, slashAmount, reason);

      eventHub.broadcast('agent_slashed', {
        agentId: agent.id,
        agentName: agent.agent_card?.name,
        slashedUsdc: slashAmount,
        reason,
        message: `⚠️ Agent #${agent.id} '${agent.agent_card?.name}' slashed $${slashAmount} USDC collateral for downtime!`,
      });
    }
  }
}

export const healthMonitor = new HealthMonitorService();
