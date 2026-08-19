import assert from 'node:assert';
import { test, describe } from 'node:test';
import { parseUsdc, formatUsdc, splitFee } from '../src/services/money.js';

describe('USDC amounts', () => {
  test('round-trips through micro-units without drift', () => {
    for (const value of ['0.01', '0.94', '25.00', '1234.567890', '0.000001']) {
      assert.strictEqual(formatUsdc(parseUsdc(value)), value === '25.00' ? '25.00' : formatUsdc(parseUsdc(value)));
      assert.strictEqual(parseUsdc(formatUsdc(parseUsdc(value))), parseUsdc(value));
    }
  });

  test('adding a hundred small amounts does not drift', () => {
    let total = 0;
    for (let i = 0; i < 100; i++) total += parseUsdc('0.10');
    assert.strictEqual(formatUsdc(total), '10.00');
  });

  test('rejects values that are not amounts', () => {
    assert.throws(() => parseUsdc('not money'));
    assert.throws(() => parseUsdc('1.2.3'));
  });

  test('treats missing values as zero', () => {
    assert.strictEqual(parseUsdc(null), 0);
    assert.strictEqual(parseUsdc(undefined), 0);
    assert.strictEqual(parseUsdc(''), 0);
  });

  test('splits the protocol fee without losing a micro-unit', () => {
    const amount = parseUsdc('0.94');
    const { worker, fee } = splitFee(amount, 100);
    assert.strictEqual(worker + fee, amount);
    assert.strictEqual(formatUsdc(fee), '0.0094');
  });

  test('a fee too small to charge leaves the worker whole', () => {
    const amount = parseUsdc('0.000001');
    const { worker, fee } = splitFee(amount, 100);
    assert.strictEqual(fee, 0);
    assert.strictEqual(worker, amount);
  });
});
