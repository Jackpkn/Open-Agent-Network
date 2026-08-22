import assert from 'node:assert';
import { test, describe, after } from 'node:test';
import { buildApp } from '../src/app.js';
import { config } from '../src/services/config.js';
import { store } from '../src/services/store.js';
import { users } from '../src/services/users.js';

/**
 * The legacy agent-to-agent endpoints make registered agents perform work.
 * Once one of those agents calls a paid model API, an open endpoint is a way to
 * spend the operator's budget. These tests pin the endpoints closed.
 */
describe('legacy endpoints do not give away free compute', () => {
  const app = buildApp();

  const card = {
    name: 'LegacyAccessTestAgent',
    description: 'Unreachable on purpose',
    url: 'http://127.0.0.1:59999',
    version: '1.0.0',
    capabilities: {},
    skills: [{ id: 'code-review', name: 'Review', description: 'Reviews' }],
  };

  const agent = store.registerAgent('http://127.0.0.1:59999', card, '5.00', 'USDC', '0.00');

  after(async () => {
    config.allowAnonymousLegacy = false;
    await app.close();
  });

  test('creating a job anonymously is refused', async () => {
    config.allowAnonymousLegacy = false;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      payload: { agent_id: agent.id, skill_id: 'code-review', task_prompt: 'do work for free' },
    });

    assert.strictEqual(response.statusCode, 401);
    assert.match(JSON.parse(response.payload).message, /need an account/);
  });

  test('sending a chat message anonymously is refused', async () => {
    config.allowAnonymousLegacy = false;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat/send',
      payload: { agent_id: agent.id, message: 'do work for free' },
    });

    assert.strictEqual(response.statusCode, 401);
  });

  test('streaming a chat anonymously is refused', async () => {
    config.allowAnonymousLegacy = false;

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/chat/stream?agent_id=${agent.id}&prompt=free+work`,
    });

    assert.strictEqual(response.statusCode, 401);
  });

  test('an unreachable agent is reported, not impersonated, and nothing is charged', async () => {
    config.allowAnonymousLegacy = false;
    const { user, apiKey } = users.create({ opening_balance_usdc: '20.00' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/chat/send',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: { agent_id: agent.id, message: 'hello' },
    });

    // This used to return 200 with a fabricated reply and a recorded cost.
    assert.strictEqual(response.statusCode, 502);
    assert.match(JSON.parse(response.payload).message, /did not respond/);
    assert.match(JSON.parse(response.payload).message, /not been charged/);

    const after = users.get(user.id)!;
    assert.strictEqual(after.balance_usdc, '20.00', 'the hold must have been returned');
    assert.strictEqual(after.held_usdc, '0.00');
  });

  test('a caller who cannot afford the agent is refused before it is dispatched', async () => {
    config.allowAnonymousLegacy = false;
    const { apiKey } = users.create({ opening_balance_usdc: '1.00' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      headers: { authorization: `Bearer ${apiKey}` },
      payload: { agent_id: agent.id, task_prompt: 'expensive' },
    });

    assert.strictEqual(response.statusCode, 402);
  });

  test('the open mode still exists for local demos, and is opt-in', async () => {
    config.allowAnonymousLegacy = true;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      payload: { agent_id: agent.id, task_prompt: 'local demo' },
    });

    // Allowed through, then honestly reported as unreachable.
    assert.strictEqual(response.statusCode, 502);
    assert.strictEqual(JSON.parse(response.payload).error, 'agent_unreachable');
  });
});
