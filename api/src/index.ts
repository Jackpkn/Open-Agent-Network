import { buildApp } from './app.js';
import { healthMonitor } from './services/health-monitor.js';
import { watchdog } from './services/watchdog.js';
import { diagnose } from './services/config.js';

const app = buildApp();
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
  console.log(`🚀 Open Agent Network API running at ${address}`);

  // Say out loud what this process actually thinks its configuration is, and
  // name anything that will fail quietly.
  const diagnostics = diagnose();
  for (const [key, value] of Object.entries(diagnostics.summary)) {
    console.log(`   ${key.padEnd(20)} ${value}`);
  }
  for (const warning of diagnostics.warnings) {
    console.warn(`\n⚠️  ${warning}`);
  }

  // Background agent health monitor (listing only — it does not touch collateral).
  healthMonitor.start(15000);

  // Stalled, expired and stuck jobs are found and refunded here.
  watchdog.start();
});
