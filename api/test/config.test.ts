import assert from 'node:assert';
import { test, describe } from 'node:test';
import { config, diagnose } from '../src/services/config.js';

/** A configuration with nothing wrong with it, to vary one field at a time. */
function healthy() {
  return { ...config, publicUrl: 'https://hub.example.com', escrowMode: 'off' as const };
}

describe('startup diagnostics', () => {
  test('a fully configured hub reports ready', () => {
    const result = diagnose({ HOST: '0.0.0.0' }, healthy(), false);
    assert.strictEqual(result.ready, true);
    assert.deepStrictEqual(result.warnings, []);
  });

  test('an ephemeral signing key is called out', () => {
    const result = diagnose({ HOST: '0.0.0.0' }, healthy(), true);
    assert.strictEqual(result.ready, false);
    assert.match(result.warnings.join(' '), /OAN_TOKEN_SECRET is not set/);
    assert.strictEqual(result.summary.signing_key, 'ephemeral (development)');
  });

  test('a localhost callback address on a publicly bound hub is called out', () => {
    // The failure this catches: workers are told to report progress to
    // localhost, which from their own host or container is themselves. Every
    // job would stall and refund with nothing in the logs to explain it.
    const result = diagnose(
      { HOST: '0.0.0.0' },
      { ...healthy(), publicUrl: 'http://localhost:3001' },
      false
    );
    assert.strictEqual(result.ready, false);
    assert.match(result.warnings.join(' '), /OAN_PUBLIC_URL is http:\/\/localhost:3001/);
    assert.match(result.warnings.join(' '), /points back at them/);
  });

  test('localhost is fine when the hub is only bound locally', () => {
    const result = diagnose(
      { HOST: '127.0.0.1' },
      { ...healthy(), publicUrl: 'http://localhost:3001' },
      false
    );
    assert.strictEqual(result.ready, true);
  });

  test('every loopback spelling is recognised', () => {
    for (const url of ['http://127.0.0.1:3001', 'http://0.0.0.0:3001', 'https://localhost']) {
      const result = diagnose({ HOST: '0.0.0.0' }, { ...healthy(), publicUrl: url }, false);
      assert.strictEqual(result.ready, false, `${url} should be flagged`);
    }
  });

  test('a real hostname containing "localhost" is not flagged', () => {
    const result = diagnose(
      { HOST: '0.0.0.0' },
      { ...healthy(), publicUrl: 'https://localhost-shim.example.com' },
      false
    );
    assert.strictEqual(result.ready, true);
  });

  test('claiming on-chain settlement is called out as not implemented', () => {
    const result = diagnose({ HOST: '0.0.0.0' }, { ...healthy(), escrowMode: 'onchain' }, false);
    assert.match(result.warnings.join(' '), /on-chain settlement is not implemented/);
  });

  test('the summary never contains a secret', () => {
    const values = JSON.stringify(diagnose({ HOST: '0.0.0.0' }, healthy(), false).summary);
    assert.ok(!values.includes(config.tokenSecret), 'the signing key must never be reported');
  });
});
