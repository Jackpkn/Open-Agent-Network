import { store } from './store.js';
import { a2aClient } from './a2a-client.js';

export class HealthMonitorService {
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Starts periodic health check monitor for registered agents (every 30 seconds)
   */
  start(intervalMs = 30000) {
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
   * Pings all registered agents and updates their is_healthy status in SQLite
   */
  async runHealthChecks() {
    const agents = store.getAllAgents();
    for (const agent of agents) {
      try {
        const isHealthy = await a2aClient.pingHealth(agent.agent_url);
        store.updateHealthStatus(agent.id, isHealthy);
      } catch (e) {
        store.updateHealthStatus(agent.id, false);
      }
    }
  }
}

export const healthMonitor = new HealthMonitorService();
