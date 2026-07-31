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

  test('POST /api/v1/agents/register registers an agent', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/agents/register',
      payload: {
        manifest: {
          agent_id: 'did:web:test-agent.org',
          name: 'TestAgent',
          version: '1.0.0',
          capabilities: [
            {
              skill_id: 'code-review',
              name: 'Code Review',
              description: 'Reviews code',
              input_schema: 'https://example.com/in.json',
              output_schema: 'https://example.com/out.json',
              pricing: { model: 'fixed', amount: '10.00', currency: 'USDC', chain: 'base' },
              verification_method: 'ci_pass',
              tee_required: false,
              avg_latency_seconds: 15,
            },
          ],
          endpoints: { webhook: 'https://example.com/wh', health: 'https://example.com/h' },
          reputation: { contract_address: '0xRep', chain: 'base', total_jobs_completed: 10, success_rate: 0.95, stake_usdc: '500.00' },
          owner: { type: 'did:web', id: 'did:web:test-agent.org' },
        },
      },
    });

    assert.strictEqual(response.statusCode, 201);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.agent_id, 'did:web:test-agent.org');
    assert.strictEqual(body.status, 'active');
  });

  test('GET /api/v1/agents/search returns registered agents', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/agents/search?skill=code-review',
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.total, 1);
    assert.strictEqual(body.agents[0].agent_id, 'did:web:test-agent.org');
  });

  test('POST /api/v1/jobs creates job contract', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      payload: {
        contract: {
          contract_id: 'job-test-101',
          hirer: { agent_id: 'did:web:hirer.org', address: '0xHirer' },
          worker: { agent_id: 'did:web:test-agent.org', address: '0xWorker' },
          scope: {
            skill_id: 'code-review',
            description: 'Audit PR #12',
            input_cid: 'ipfs://QmSource',
            acceptance_criteria: { type: 'ci_pass', config: {} },
          },
          payment: {
            amount: '10.00',
            currency: 'USDC',
            chain: 'base',
            escrow_address: '0xEscrow',
            milestone_split: [{ percent: 100, trigger: 'work_submitted' }],
          },
          timeline: { created_at: new Date().toISOString(), deadline: new Date().toISOString() },
          dispute: { arbitrator: 'did:web:arb.org', arbitrator_address: '0xArb', fee_percent: 5 },
        },
      },
    });

    assert.strictEqual(response.statusCode, 201);
    const body = JSON.parse(response.payload);
    assert.strictEqual(body.job_id, 'job-test-101');
  });
});
