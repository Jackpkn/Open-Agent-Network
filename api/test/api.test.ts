import assert from 'node:assert';
import { test, describe } from 'node:test';
import { buildApp } from '../src/app.js';

describe('Fastify REST API Integration Test Suite', () => {
  const app = buildApp();

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
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      payload: {
        agent_id: 1,
        skill_id: 'code-review',
        task_prompt: 'Audit Python API for security flaws',
      },
    });

    assert.strictEqual(response.statusCode, 201);
    const body = JSON.parse(response.payload);
    assert.ok(body.job);
    assert.strictEqual(body.job.skill_id, 'code-review');
  });
});
