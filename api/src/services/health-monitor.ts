import { store } from './store.js';
import { a2aClient } from './a2a-client.js';
import { eventHub } from './websocket-hub.js';

/** Consecutive failed pings before an agent is hidden from search results. */
const UNHEALTHY_AFTER_FAILURES = 3;

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

  /**
   * An unreachable agent stops being offered to hirers. It does not lose money.
   *
   * This used to burn $50 of collateral after three missed pings, which prices a
   * network blip as fraud — nobody posts a stake under that rule. Downtime is a
   * listing problem; only arbitration touches a stake.
   */
  private async handleHealthFailure(agent: any) {
    const consecutiveFailures = (this.failureCounts.get(agent.id) || 0) + 1;
    this.failureCounts.set(agent.id, consecutiveFailures);
    store.updateHealthStatus(agent.id, false);

    if (consecutiveFailures === UNHEALTHY_AFTER_FAILURES) {
      eventHub.broadcast('agent_status_changed', {
        agentId: agent.id,
        agentName: agent.agent_card?.name,
        healthy: false,
        consecutiveFailures,
        message: `Agent #${agent.id} '${agent.agent_card?.name}' is unreachable and has been hidden from search.`,
      });
    }
  }
}

export const healthMonitor = new HealthMonitorService();
