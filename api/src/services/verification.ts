import crypto from 'node:crypto';
import { artifacts } from './artifacts.js';
import { blobStorage } from './blob-storage.js';
import { Order } from './orders.js';

export interface VerificationResult {
  passed: boolean;
  tier: 'T0' | 'T1';
  checks: Array<{ name: string; passed: boolean; detail?: string }>;
  failureReason?: string;
}

/**
 * The gate between "the worker says it is done" and "the worker gets paid".
 *
 * Only the two free tiers are implemented here. T0 asks whether anything
 * coherent came back at all; T1 runs the assertions a skill declares about its
 * own output. A model judge (T2) and a second-agent consensus run (T3) plug in
 * at the same seam and are worth their cost only on larger jobs.
 */
export async function verifyDelivery(order: Order): Promise<VerificationResult> {
  const checks: VerificationResult['checks'] = [];

  // ── T0: is there a deliverable at all? ────────────────────────────
  const outputs = artifacts.listForJob(order.id, 'output');
  const hasText = !!order.result_text && order.result_text.trim().length > 0;
  const hasSomething = outputs.length > 0 || hasText;

  checks.push({
    name: 'delivered_something',
    passed: hasSomething,
    detail: `${outputs.length} file(s), ${hasText ? 'plus text' : 'no text'}`,
  });

  if (!hasSomething) {
    return {
      passed: false,
      tier: 'T0',
      checks,
      failureReason: 'The agent finished without returning any result.',
    };
  }

  // ── T0: do the bytes still hash to what was recorded? ─────────────
  for (const record of outputs) {
    let intact = false;
    let detail = 'missing from storage';

    try {
      const data = await blobStorage.get(record.storage_key);
      const actual = crypto.createHash('sha256').update(data).digest('hex');
      intact = actual === record.sha256 && data.length > 0;
      detail = intact ? `${data.length} bytes verified` : 'content hash mismatch';
    } catch {
      intact = false;
    }

    checks.push({ name: `output_intact:${record.filename}`, passed: intact, detail });

    if (!intact) {
      return {
        passed: false,
        tier: 'T0',
        checks,
        failureReason: `The delivered file "${record.filename}" could not be verified.`,
      };
    }
  }

  // ── T1: assertions the skill declares about its own output ────────
  const declaredOutputs = order.params?.expect_outputs;
  if (typeof declaredOutputs === 'number' && declaredOutputs > 0) {
    const enough = outputs.length >= declaredOutputs;
    checks.push({
      name: 'expected_output_count',
      passed: enough,
      detail: `expected at least ${declaredOutputs}, got ${outputs.length}`,
    });
    if (!enough) {
      return {
        passed: false,
        tier: 'T1',
        checks,
        failureReason: `The agent returned ${outputs.length} file(s) but this job expected at least ${declaredOutputs}.`,
      };
    }
  }

  const expectMime = order.params?.expect_mime;
  if (typeof expectMime === 'string' && outputs.length > 0) {
    const matching = outputs.filter((o) => o.mime.startsWith(expectMime));
    const ok = matching.length > 0;
    checks.push({
      name: 'expected_output_type',
      passed: ok,
      detail: `wanted ${expectMime}, got ${outputs.map((o) => o.mime).join(', ')}`,
    });
    if (!ok) {
      return {
        passed: false,
        tier: 'T1',
        checks,
        failureReason: `This job asked for ${expectMime} and the agent returned something else.`,
      };
    }
  }

  return { passed: true, tier: 'T1', checks };
}
