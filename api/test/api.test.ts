import assert from 'node:assert';
import { test, describe } from 'node:test';
import { buildApp } from '../src/app.js';
import { store } from '../src/services/store.js';

describe('Fastify REST API Integration Test Suite', () => {
  const app = buildApp();

  const testCard = {
    name: 'TestCodeReviewer',
    description: 'Test agent for CI runner',
    url: 'http://localhost:8001',
    version: '1.0.0',
    capabilities: { streaming: true },
    skills: [{ id: 'code-review', name: 'Code Review', description: 'Reviews code' }],
  };

  test('GET /health returns status ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.status, 'ok');
  });

  test('GET /api/v1/agents/search returns registered agents', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/agents/search',
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.ok(Array.isArray(body.agents));
  });

  test('POST /api/v1/agents/register validates input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/agents/register',
      payload: {},
    });

    // Should return 400 when agent_url is missing
    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.payload);
    assert.ok(body.error);
  });

  test('POST /api/v1/jobs creates job contract', async () => {
    // Ensure at least 1 agent exists in SQLite store before posting job
    let existingAgents = store.getAllAgents();
    let targetAgent = existingAgents[0];

    if (!targetAgent) {
      targetAgent = store.registerAgent(
        'http://localhost:8001',
        testCard,
        '25.00',
        'USDC',
        '100.00'
      );
    }

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      payload: {
        agent_id: targetAgent.id,
        skill_id: 'code-review',
        task_prompt: 'Audit Python API for security flaws',
      },
    });

    assert.strictEqual(response.statusCode, 201);
    const body = JSON.parse(response.payload);
    assert.ok(body.job);
    assert.strictEqual(body.job.agent_id, targetAgent.id);
  });
});
