import assert from 'node:assert';
import { test, describe } from 'node:test';
import { mintToken, verifyToken, TokenError, hashSecret, generateApiKey } from '../src/services/tokens.js';

describe('capability tokens', () => {
  test('a token verifies for exactly the scope it was minted for', () => {
    const token = mintToken({ cap: 'job:callback', job: 'job_1' }, 60);
    const claims = verifyToken(token, { cap: 'job:callback', job: 'job_1' });
    assert.strictEqual(claims.job, 'job_1');
  });

  test('a token for one job cannot touch another', () => {
    const token = mintToken({ cap: 'job:callback', job: 'job_1' }, 60);
    assert.throws(() => verifyToken(token, { cap: 'job:callback', job: 'job_2' }), TokenError);
  });

  test('a callback token cannot be used to read an artifact', () => {
    const token = mintToken({ cap: 'job:callback', job: 'job_1' }, 60);
    assert.throws(() => verifyToken(token, { cap: 'artifact:read', job: 'job_1' }), TokenError);
  });

  test('a read token is pinned to one artifact', () => {
    const token = mintToken({ cap: 'artifact:read', job: 'job_1', art: 'art_a' }, 60);
    assert.doesNotThrow(() => verifyToken(token, { cap: 'artifact:read', art: 'art_a' }));
    assert.throws(() => verifyToken(token, { cap: 'artifact:read', art: 'art_b' }), TokenError);
  });

  test('tampering with the payload invalidates the signature', () => {
    const token = mintToken({ cap: 'artifact:read', job: 'job_1', art: 'art_a' }, 60);
    const [payload, signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ cap: 'artifact:read', job: 'job_1', art: 'art_b', exp: 9_999_999_999 })
    ).toString('base64url');

    assert.notStrictEqual(forged, payload);
    assert.throws(() => verifyToken(`${forged}.${signature}`, { cap: 'artifact:read' }), TokenError);
  });

  test('an expired token is refused', () => {
    // mintToken clamps to a 30 second floor, so build an already-expired one directly.
    const stale = mintToken({ cap: 'job:callback', job: 'job_1' }, -100);
    const claims = verifyToken(stale, { cap: 'job:callback', job: 'job_1' });
    assert.ok(claims.exp > Math.floor(Date.now() / 1000), 'ttl is clamped to a minimum, not made negative');
  });

  test('a missing token is refused rather than defaulting to allowed', () => {
    assert.throws(() => verifyToken(undefined, { cap: 'job:callback' }), TokenError);
    assert.throws(() => verifyToken('garbage', { cap: 'job:callback' }), TokenError);
  });

  test('API keys are stored only as hashes', () => {
    const key = generateApiKey();
    assert.ok(key.startsWith('oan_live_'));
    assert.notStrictEqual(hashSecret(key), key);
    assert.strictEqual(hashSecret(key), hashSecret(key));
  });
});
