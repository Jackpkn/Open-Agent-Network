import assert from 'node:assert';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { test, describe, before, after } from 'node:test';

// A throwaway database and blob root per run, set before any module reads them.
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'oan-test-'));
process.env.OAN_DB_PATH = path.join(scratch, 'test.sqlite');
process.env.OAN_BLOB_ROOT = path.join(scratch, 'blobs');
process.env.OAN_TOKEN_SECRET = 'test-secret-that-is-long-enough-to-pass-validation';
process.env.OAN_HEARTBEAT_TIMEOUT_S = '30';
process.env.OAN_STALLED_GRACE_S = '60';

const { buildApp } = await import('../src/app.js');
const { config } = await import('../src/services/config.js');
const { watchdog } = await import('../src/services/watchdog.js');
const { users } = await import('../src/services/users.js');
const { ledger } = await import('../src/services/ledger.js');
const { parseUsdc, formatUsdc } = await import('../src/services/money.js');

type WorkerBehavior = 'completes' | 'goes-silent' | 'fails';

interface Worker {
  url: string;
  close: () => Promise<void>;
}

/** A minimal agent implementing the async protocol, standing in for a real one. */
async function startWorker(
  name: string,
  behavior: WorkerBehavior,
  dataHandling?: unknown
): Promise<Worker> {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (url.pathname === '/.well-known/agent-card.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          name,
          description: 'Test worker',
          url: `http://127.0.0.1:${(server.address() as any).port}`,
          version: '1.0.0',
          capabilities: { streaming: true, oanAsync: true },
          ...(dataHandling === undefined ? {} : { data_handling: dataHandling }),
          skills: [
            {
              id: 'document.extract',
              name: 'Extract tables',
              description: 'Pulls tables out of a document',
              steps: ['fetch', 'parse', 'emit'],
            },
          ],
        })
      );
      return;
    }

    if (url.pathname === '/oan/v1/tasks' && req.method === 'POST') {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ accepted: true }));

        const envelope = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (behavior !== 'goes-silent') void runTask(envelope, behavior);
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as any).port;

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/** What a real SDK would do on the worker's behalf. */
async function runTask(envelope: any, behavior: WorkerBehavior) {
  const auth = { Authorization: `Bearer ${envelope.callback.token}` };

  await fetch(envelope.callback.events_url, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'step', step: 'fetch', progress: 0.2 }),
  });

  if (behavior === 'fails') {
    await fetch(envelope.callback.fail_url, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'bad_input', message: 'That file is not a document I can read.' }),
    });
    return;
  }

  // Read the input through the scoped token, exactly as a worker would.
  const inputResponse = await fetch(envelope.input.download_url);
  const inputText = await inputResponse.text();

  await fetch(envelope.callback.events_url, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'step', step: 'parse', progress: 0.7, note: `${inputText.length} bytes read` }),
  });

  const upload = await fetch(`${envelope.output.upload_url}?token=${envelope.output.upload_token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv', 'X-Filename': 'tables.csv' },
    body: `row,value\n1,${inputText.trim()}\n`,
  });
  const uploaded: any = await upload.json();

  await fetch(envelope.callback.complete_url, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      output_artifact_ids: [uploaded.artifact.id],
      result_text: 'Extracted 1 table.',
      summary: 'done',
    }),
  });
}

describe('hiring an agent end to end', () => {
  const app = buildApp();
  let hubUrl = '';
  const workers: Worker[] = [];

  before(async () => {
    const address = await app.listen({ port: 0, host: '127.0.0.1' });
    hubUrl = address;
    config.publicUrl = address;
  });

  after(async () => {
    await app.close();
    await Promise.all(workers.map((w) => w.close()));
    fs.rmSync(scratch, { recursive: true, force: true });
  });

  const payoutKeys = new Map<number, string>();

  async function registerWorker(
    name: string,
    behavior: WorkerBehavior,
    price: string,
    dataHandling?: unknown
  ) {
    const worker = await startWorker(name, behavior, dataHandling);
    workers.push(worker);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/agents/register',
      payload: { agent_url: worker.url, pricing_amount: price },
    });
    assert.strictEqual(response.statusCode, 201, response.payload);

    const body = JSON.parse(response.payload);
    if (body.payout_key) payoutKeys.set(body.agent.id, body.payout_key);
    return body.agent.id as number;
  }

  async function createHirer(balance: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/users',
      payload: { display_name: 'Test hirer', opening_balance_usdc: balance },
    });
    assert.strictEqual(response.statusCode, 201, response.payload);
    const body = JSON.parse(response.payload);
    return { id: body.user.id as string, apiKey: body.api_key as string };
  }

  async function upload(apiKey: string, content: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/uploads',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'text/plain',
        'x-filename': 'contract.txt',
      },
      payload: content,
    });
    assert.strictEqual(response.statusCode, 201, response.payload);
    return JSON.parse(response.payload).artifact;
  }

  async function waitForState(apiKey: string, orderId: string, states: string[], timeoutMs = 10_000) {
    const deadline = Date.now() + timeoutMs;
    let last: any;

    while (Date.now() < deadline) {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/orders/${orderId}`,
        headers: { authorization: `Bearer ${apiKey}` },
      });
      last = JSON.parse(response.payload).order;
      if (states.includes(last.state)) return last;
      await new Promise((r) => setTimeout(r, 50));
    }

    throw new Error(`Order stayed in "${last?.state}" instead of reaching ${states.join(' or ')}`);
  }

  test('a person uploads a file, watches it run, and the worker gets paid', async () => {
    const agentId = await registerWorker('Table Extractor', 'completes', '0.94');
    const hirer = await createHirer('10.00');
    const artifact = await upload(hirer.apiKey, 'quarterly revenue 4200');

    const created = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: `Bearer ${hirer.apiKey}` },
      payload: {
        agent_id: agentId,
        skill_id: 'document.extract',
        instructions: 'Pull every table out as CSV',
        input_artifact_id: artifact.id,
      },
    });

    // The hirer's request returns immediately — it does not wait for the work.
    assert.strictEqual(created.statusCode, 202, created.payload);
    const order = JSON.parse(created.payload).order;
    assert.strictEqual(order.state, 'funded');
    assert.strictEqual(order.input.sha256, artifact.sha256);

    // Money is held, not yet spent.
    const duringWork = users.get(hirer.id)!;
    assert.strictEqual(duringWork.balance_usdc, '9.06');
    assert.strictEqual(duringWork.held_usdc, '0.94');

    const settled = await waitForState(hirer.apiKey, order.id, ['accepted']);
    assert.strictEqual(settled.state, 'accepted');
    assert.strictEqual(settled.outputs.length, 1);
    assert.strictEqual(settled.outputs[0].filename, 'tables.csv');

    // The hirer paid once, and the worker was credited less the 1% fee.
    const after = users.get(hirer.id)!;
    assert.strictEqual(after.balance_usdc, '9.06');
    assert.strictEqual(after.held_usdc, '0.00');
    assert.strictEqual(formatUsdc(ledger.claimable(agentId)), '0.9306');

    // The result is downloadable and is what the worker actually produced.
    const download = await app.inject({
      method: 'GET',
      url: settled.outputs[0].download_url,
      headers: { authorization: `Bearer ${hirer.apiKey}` },
    });
    assert.strictEqual(download.statusCode, 200);
    assert.match(download.payload, /quarterly revenue 4200/);
  });

  test('progress is streamed to the hirer as the work happens', async () => {
    const agentId = await registerWorker('Streaming Extractor', 'completes', '1.00');
    const hirer = await createHirer('5.00');
    const artifact = await upload(hirer.apiKey, 'some rows');

    const created = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: `Bearer ${hirer.apiKey}` },
      payload: { agent_id: agentId, instructions: 'Extract', input_artifact_id: artifact.id },
    });
    const order = JSON.parse(created.payload).order;
    await waitForState(hirer.apiKey, order.id, ['accepted']);

    // Replay the same feed a browser would have watched live.
    const stream = await fetch(`${hubUrl}/v1/orders/${order.id}/events?api_key=${hirer.apiKey}`);
    const body = await stream.text();

    assert.match(body, /event: state/);
    assert.match(body, /event: step/);
    assert.match(body, /"step":"parse"/);
    assert.match(body, /event: done/);
    // Steps carry real detail, not just a spinner.
    assert.match(body, /bytes read/);
  });

  test('a worker that goes silent stalls, then refunds the hirer', async () => {
    const agentId = await registerWorker('Silent Agent', 'goes-silent', '2.00');
    const hirer = await createHirer('5.00');

    const created = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: `Bearer ${hirer.apiKey}` },
      payload: { agent_id: agentId, instructions: 'Do something', deadline_seconds: 3600 },
    });
    const order = JSON.parse(created.payload).order;
    await waitForState(hirer.apiKey, order.id, ['dispatched', 'working']);

    assert.strictEqual(users.get(hirer.id)!.held_usdc, '2.00');

    // Past the heartbeat timeout: the hirer sees the job has gone quiet.
    await watchdog.sweep(new Date(Date.now() + 40_000));
    const stalled = await waitForState(hirer.apiKey, order.id, ['stalled']);
    assert.strictEqual(stalled.message, 'The agent has gone quiet');

    // Past the grace period: cancelled and refunded without anyone intervening.
    await watchdog.sweep(new Date(Date.now() + 200_000));
    const expired = await waitForState(hirer.apiKey, order.id, ['expired']);
    assert.strictEqual(expired.is_final, true);

    const after = users.get(hirer.id)!;
    assert.strictEqual(after.balance_usdc, '5.00');
    assert.strictEqual(after.held_usdc, '0.00');
    assert.strictEqual(formatUsdc(ledger.claimable(agentId)), '0.00');
  });

  test('a worker that reports failure refunds the hirer and earns nothing', async () => {
    const agentId = await registerWorker('Honest Failer', 'fails', '3.00');
    const hirer = await createHirer('5.00');

    const created = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: `Bearer ${hirer.apiKey}` },
      payload: { agent_id: agentId, instructions: 'Read this' },
    });
    const order = JSON.parse(created.payload).order;

    const failed = await waitForState(hirer.apiKey, order.id, ['failed']);
    assert.strictEqual(failed.failure.code, 'bad_input');
    assert.match(failed.failure.message, /not a document/);

    assert.strictEqual(users.get(hirer.id)!.balance_usdc, '5.00');
    assert.strictEqual(formatUsdc(ledger.claimable(agentId)), '0.00');
  });

  test('a hirer cannot be charged more than their balance', async () => {
    const agentId = await registerWorker('Expensive Agent', 'completes', '99.00');
    const hirer = await createHirer('1.00');

    const response = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: `Bearer ${hirer.apiKey}` },
      payload: { agent_id: agentId, instructions: 'Too expensive' },
    });

    assert.strictEqual(response.statusCode, 402);
    assert.match(JSON.parse(response.payload).message, /Not enough balance/);
    assert.strictEqual(users.get(hirer.id)!.balance_usdc, '1.00');
  });

  test('one hirer cannot see or touch another hirer\'s job', async () => {
    const agentId = await registerWorker('Shared Agent', 'completes', '0.50');
    const owner = await createHirer('5.00');
    const stranger = await createHirer('5.00');
    const artifact = await upload(owner.apiKey, 'private contents');

    const created = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: `Bearer ${owner.apiKey}` },
      payload: { agent_id: agentId, instructions: 'Extract', input_artifact_id: artifact.id },
    });
    const order = JSON.parse(created.payload).order;

    for (const url of [`/v1/orders/${order.id}`, `/v1/orders/${order.id}/receipt`]) {
      const response = await app.inject({
        method: 'GET',
        url,
        headers: { authorization: `Bearer ${stranger.apiKey}` },
      });
      assert.strictEqual(response.statusCode, 404, `${url} leaked to a stranger`);
    }

    const cancel = await app.inject({
      method: 'POST',
      url: `/v1/orders/${order.id}/cancel`,
      headers: { authorization: `Bearer ${stranger.apiKey}` },
    });
    assert.strictEqual(cancel.statusCode, 404);

    const anonymous = await app.inject({ method: 'GET', url: `/v1/orders/${order.id}` });
    assert.strictEqual(anonymous.statusCode, 401);
  });

  test('an agent can claim what it earned, and nobody else can', async () => {
    const agentId = await registerWorker('Paid Agent', 'completes', '2.00');
    const hirer = await createHirer('5.00');
    const artifact = await upload(hirer.apiKey, 'some rows');

    const created = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: `Bearer ${hirer.apiKey}` },
      payload: { agent_id: agentId, instructions: 'Extract', input_artifact_id: artifact.id },
    });
    await waitForState(hirer.apiKey, JSON.parse(created.payload).order.id, ['accepted']);
    assert.strictEqual(formatUsdc(ledger.claimable(agentId)), '1.98');

    // Earnings are not claimable by anyone who can reach the port.
    const anonymous = await app.inject({
      method: 'POST',
      url: `/v1/agents/${agentId}/withdraw`,
      payload: { destination: '0xattacker' },
    });
    assert.strictEqual(anonymous.statusCode, 401);

    const payoutKey = payoutKeys.get(agentId)!;
    assert.ok(payoutKey, 'registration issues a payout key once');

    const withdrawn = await app.inject({
      method: 'POST',
      url: `/v1/agents/${agentId}/withdraw`,
      headers: { authorization: `Bearer ${payoutKey}` },
      payload: { destination: '0xWorkerWallet' },
    });
    assert.strictEqual(withdrawn.statusCode, 201, withdrawn.payload);
    assert.strictEqual(JSON.parse(withdrawn.payload).payout.amount_usdc, '1.98');
    assert.strictEqual(formatUsdc(ledger.claimable(agentId)), '0.00');

    // A repeated claim pays nothing a second time.
    const again = await app.inject({
      method: 'POST',
      url: `/v1/agents/${agentId}/withdraw`,
      headers: { authorization: `Bearer ${payoutKey}` },
      payload: { destination: '0xWorkerWallet' },
    });
    assert.strictEqual(again.statusCode, 409);
  });

  test('an agent\'s data-handling claim is published, frozen on the job, and on the receipt', async () => {
    const agentId = await registerWorker('Careful Agent', 'completes', '1.00', {
      retention: 'delete-on-completion',
      training: 'never',
      processors: ['anthropic'],
      region: 'us',
    });

    // A hirer can see the claim before choosing.
    const listing = await app.inject({ method: 'GET', url: '/v1/agents' });
    const listed = JSON.parse(listing.payload).agents.find((a: any) => a.id === agentId);
    assert.strictEqual(listed.data_handling.retention, 'delete-on-completion');
    assert.strictEqual(listed.data_handling.training, 'never');
    assert.match(listed.data_handling_summary, /deletes your file when the job ends/);

    const hirer = await createHirer('5.00');
    const artifact = await upload(hirer.apiKey, 'sensitive rows');
    const created = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: `Bearer ${hirer.apiKey}` },
      payload: { agent_id: agentId, instructions: 'Extract', input_artifact_id: artifact.id },
    });

    const order = JSON.parse(created.payload).order;
    assert.strictEqual(order.data_handling.retention, 'delete-on-completion');
    await waitForState(hirer.apiKey, order.id, ['accepted']);

    const receipt = await app.inject({
      method: 'GET',
      url: `/v1/orders/${order.id}/receipt`,
      headers: { authorization: `Bearer ${hirer.apiKey}` },
    });
    const recorded = JSON.parse(receipt.payload).receipt.data_handling;
    assert.strictEqual(recorded.retention, 'delete-on-completion');
    assert.deepStrictEqual(recorded.processors, ['anthropic']);
  });

  test('a card claiming nonsense is shown as undeclared, not passed through', async () => {
    const agentId = await registerWorker('Sloppy Agent', 'completes', '1.00', {
      retention: 'we-pinky-promise',
      training: true,
      processors: 'not-an-array',
      region: { nope: 1 },
    });

    const listing = await app.inject({ method: 'GET', url: '/v1/agents' });
    const listed = JSON.parse(listing.payload).agents.find((a: any) => a.id === agentId);

    assert.strictEqual(listed.data_handling.retention, 'undeclared');
    assert.strictEqual(listed.data_handling.training, 'undeclared');
    assert.deepStrictEqual(listed.data_handling.processors, []);
    assert.strictEqual(listed.data_handling.region, null);
    assert.match(listed.data_handling_summary, /has not said/i);
  });

  test('an agent that declares nothing is shown as not stated', async () => {
    const agentId = await registerWorker('Quiet Agent', 'completes', '1.00');
    const listing = await app.inject({ method: 'GET', url: '/v1/agents' });
    const listed = JSON.parse(listing.payload).agents.find((a: any) => a.id === agentId);
    assert.strictEqual(listed.data_handling.retention, 'undeclared');
  });

  test('the receipt records the hashes and an intact event log', async () => {
    const agentId = await registerWorker('Receipt Agent', 'completes', '1.50');
    const hirer = await createHirer('5.00');
    const artifact = await upload(hirer.apiKey, 'auditable input');

    const created = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { authorization: `Bearer ${hirer.apiKey}` },
      payload: { agent_id: agentId, instructions: 'Extract', input_artifact_id: artifact.id },
    });
    const order = JSON.parse(created.payload).order;
    await waitForState(hirer.apiKey, order.id, ['accepted']);

    const response = await app.inject({
      method: 'GET',
      url: `/v1/orders/${order.id}/receipt`,
      headers: { authorization: `Bearer ${hirer.apiKey}` },
    });
    const { receipt } = JSON.parse(response.payload);

    assert.strictEqual(receipt.input.sha256, artifact.sha256);
    assert.strictEqual(receipt.outputs.length, 1);
    assert.ok(receipt.task_hash, 'the job is bound to a task hash');
    assert.strictEqual(receipt.event_log.intact, true);
    assert.ok(receipt.event_log.entries > 3);
    assert.deepStrictEqual(
      receipt.ledger.map((e: any) => e.kind).sort(),
      ['fee', 'hold', 'release']
    );
  });
});

describe('worker callbacks are scoped to one job', () => {
  test('a token from one job is refused on another', async () => {
    const { mintToken } = await import('../src/services/tokens.js');
    const forged = mintToken({ cap: 'job:callback', job: 'job_someone_else' }, 60);
    const app = buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/oan/v1/jobs/job_mine/events',
      headers: { authorization: `Bearer ${forged}` },
      payload: { type: 'step', step: 'pretend' },
    });

    assert.strictEqual(response.statusCode, 401);
    await app.close();
  });
});
