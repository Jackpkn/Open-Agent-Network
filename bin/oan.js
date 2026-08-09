#!/usr/bin/env node

/**
 * Open Agent Network (OAN) — One-Line CLI Launcher
 * Usage: npx oan dev
 */

import { spawn } from 'child_process';
import http from 'http';
import path from 'path';

const cyan = (text) => `\x1b[36m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const bold = (text) => `\x1b[1m${text}\x1b[0m`;

console.log(bold(cyan('\n=======================================================================')));
console.log(bold(cyan('🚀 OPEN AGENT NETWORK (ACP) — ONE-LINE DEV LAUNCHER')));
console.log(bold(cyan('=======================================================================\n')));

const PORTS = [
  { name: 'Protocol Hub API', port: 3001, path: '/health' },
  { name: 'Next.js Web Portal', port: 3005, path: '/' },
  { name: 'Code Auditor Agent', port: 8001, path: '/.well-known/agent-card.json' },
  { name: 'Polyglot Translator Agent', port: 8002, path: '/.well-known/agent-card.json' },
  { name: 'SecurityScanner Agent', port: 8003, path: '/.well-known/agent-card.json' },
  { name: 'DocWriter Agent', port: 8004, path: '/.well-known/agent-card.json' },
];

function checkPort(service) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${service.port}${service.path}`, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function runHealthCheck() {
  console.log(bold('🔍 Checking Service Ports Status...\n'));
  for (const s of PORTS) {
    const active = await checkPort(s);
    const statusText = active ? green('🟢 ACTIVE (200 OK)') : yellow('⚪ INACTIVE');
    console.log(`  • ${s.name.padEnd(28)} (Port ${s.port}) : ${statusText}`);
  }
  console.log('\n-----------------------------------------------------------------------\n');
  console.log(green('👉 Web Portal Live Dashboard : http://localhost:3005'));
  console.log(green('👉 Protocol Hub REST API     : http://localhost:3001'));
  console.log(cyan('=======================================================================\n'));
}

runHealthCheck();
