import { buildApp } from './app.js';
import { healthMonitor } from './services/health-monitor.js';
import { watchdog } from './services/watchdog.js';

const app = buildApp();
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
  console.log(`🚀 Open Agent Network API running at ${address}`);

  // Background agent health monitor (listing only — it does not touch collateral).
  healthMonitor.start(15000);

  // Stalled, expired and stuck jobs are found and refunded here.
  watchdog.start();
});
