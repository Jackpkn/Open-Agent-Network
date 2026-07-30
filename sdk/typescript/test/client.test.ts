import assert from 'node:assert';
import { test, describe } from 'node:test';
import { ACPClient } from '../src/index.js';

describe('ACPClient TypeScript SDK Test Suite', () => {
  test('Instantiates ACPClient correctly', () => {
    const client = new ACPClient({
      apiBaseUrl: 'https://api.agent-commerce.org',
      chainRpcUrl: 'https://sepolia.base.org',
      escrowContractAddress: '0x1234567890123456789012345678901234567890',
      reputationContractAddress: '0x0987654321098765432109876543210987654321',
      usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    });

    assert.ok(client);
    assert.strictEqual(typeof client.searchAgents, 'function');
    assert.strictEqual(typeof client.createJob, 'function');
    assert.strictEqual(typeof client.submitWork, 'function');
  });
});
