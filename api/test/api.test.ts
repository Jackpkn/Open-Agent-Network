import assert from 'node:assert';
import { test, describe } from 'node:test';
import { buildApp } from '../src/app.js';
import { store } from '../src/services/store.js';
import { config } from '../src/services/config.js';

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

    // Legacy job creation now needs an account; open mode is for local demos.
    config.allowAnonymousLegacy = true;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      payload: {
        agent_id: targetAgent.id,
        skill_id: 'code-review',
        task_prompt: 'Audit Python API for security flaws',
      },
    });

    // The example agent is not running here, so the honest answer is 502.
    assert.strictEqual(response.statusCode, 502);
    const body = JSON.parse(response.payload);
    assert.ok(body.job);
    assert.strictEqual(body.job.agent_id, targetAgent.id);
    config.allowAnonymousLegacy = false;

    const jobId = body.job.id;

    // These used to be open to anyone who could reach the port.
    const anonymousDispute = await app.inject({
      method: 'POST',
      url: `/api/v1/jobs/${jobId}/dispute`,
      payload: { dispute_reason: 'Code review missed reentrancy flaw' },
    });
    assert.strictEqual(anonymousDispute.statusCode, 401);

    const anonymousResolve = await app.inject({
      method: 'POST',
      url: `/api/v1/jobs/${jobId}/resolve-dispute`,
      payload: { winner: 'hirer' },
    });
    assert.strictEqual(anonymousResolve.statusCode, 401);

    // An operator with the key can still act on an ownerless legacy job.
    config.adminKey = 'test-operator-key-0123456789';

    const disputeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/jobs/${jobId}/dispute`,
      headers: { 'x-admin-key': config.adminKey },
      payload: { dispute_reason: 'Code review missed reentrancy flaw' },
    });
    assert.strictEqual(disputeRes.statusCode, 200);

    const resolveRes = await app.inject({
      method: 'POST',
      url: `/api/v1/jobs/${jobId}/resolve-dispute`,
      headers: { 'x-admin-key': config.adminKey },
      payload: { winner: 'hirer' },
    });
    assert.strictEqual(resolveRes.statusCode, 200);
    const resolveBody = JSON.parse(resolveRes.payload);
    assert.strictEqual(resolveBody.job.status, 'canceled');

    config.adminKey = null;
  });

  test('agent collateral cannot be slashed over HTTP any more', async () => {
    const agent = store.getAllAgents()[0];
    if (!agent) return;

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/agents/${agent.id}/slash`,
      payload: { amount: '50.00', reason: 'should not be possible' },
    });

    assert.strictEqual(response.statusCode, 404, 'the slash endpoint should no longer exist');
  });
});
