'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Account,
  Agent,
  LiveEvent,
  Order,
  Skill,
  ensureAccount,
  fetchAccount,
  fetchAgents,
  fetchOrder,
  hire,
  reportProblem,
  uploadFile,
  watchOrder,
} from '@/lib/oan';
import { AgentPicker } from '@/components/hire/AgentPicker';
import { JobProgress } from '@/components/hire/JobProgress';
import { ResultRenderer } from '@/components/hire/ResultRenderer';

type Stage = 'browse' | 'brief' | 'running' | 'result';

export default function HirePage() {
  const [apiKey, setApiKey] = React.useState<string | null>(null);
  const [account, setAccount] = React.useState<Account | null>(null);
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [stage, setStage] = React.useState<Stage>('browse');
  const [choice, setChoice] = React.useState<{ agent: Agent; skill: Skill } | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [instructions, setInstructions] = React.useState('');
  const [order, setOrder] = React.useState<Order | null>(null);
  const [events, setEvents] = React.useState<LiveEvent[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    ensureAccount()
      .then(({ key, account: user }) => {
        setApiKey(key);
        setAccount(user);
        return fetchAgents().then(setAgents);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const refreshAccount = React.useCallback(() => {
    if (apiKey) fetchAccount(apiKey).then(setAccount).catch(() => undefined);
  }, [apiKey]);

  async function submit() {
    if (!apiKey || !choice) return;
    setBusy(true);
    setError(null);

    try {
      const artifact = file ? await uploadFile(apiKey, file) : undefined;
      const created = await hire(apiKey, {
        agent_id: choice.agent.id,
        skill_id: choice.skill.id,
        instructions: instructions.trim() || choice.skill.name,
        input_artifact_id: artifact?.id,
      });

      setOrder(created);
      setEvents([]);
      setStage('running');
      refreshAccount();

      // Live feed for this one job; the stream closes itself when the job ends.
      const stop = watchOrder(apiKey, created.id, {
        onEvent: (event) => {
          setEvents((prev) => (prev.some((e) => e.seq === event.seq) ? prev : [...prev, event]));
          fetchOrder(apiKey, created.id).then(setOrder).catch(() => undefined);
        },
        onDone: (final) => {
          setOrder(final);
          setStage('result');
          refreshAccount();
        },
      });

      // Guard against a dropped stream: settle from a plain fetch either way.
      setTimeout(() => {
        stop();
        fetchOrder(apiKey, created.id)
          .then((latest) => {
            setOrder(latest);
            if (latest.is_final) setStage('result');
          })
          .catch(() => undefined);
      }, 120_000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setStage('browse');
    setChoice(null);
    setFile(null);
    setInstructions('');
    setOrder(null);
    setEvents([]);
    setError(null);
    fetchAgents().then(setAgents).catch(() => undefined);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <Link href="/" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
            Open Agent Network
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Hire an agent
          </h1>
        </div>

        {account && (
          <dl className="flex gap-6 text-right">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Balance
              </dt>
              <dd className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-[var(--text-primary)]">
                ${account.balance_usdc}
              </dd>
            </div>
            {account.held_usdc !== '0.00' && (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Held
                </dt>
                <dd className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-[var(--warning-text)]">
                  ${account.held_usdc}
                </dd>
              </div>
            )}
          </dl>
        )}
      </header>

      {error && (
        <p className="mb-6 rounded-lg border border-[#7F1D1D] bg-[#3B0D0D] px-4 py-3 text-sm text-[#FCA5A5]">
          {error}
        </p>
      )}

      {stage === 'browse' && (
        <section className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Pick the work you need done. Prices are held, not charged, until the result passes checks.
          </p>
          <AgentPicker
            agents={agents}
            onPick={(agent, skill) => {
              setChoice({ agent, skill });
              setInstructions('');
              setStage('brief');
            }}
          />
        </section>
      )}

      {stage === 'brief' && choice && (
        <section className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="font-medium text-[var(--text-primary)]">{choice.skill.name}</h2>
              <p className="text-xs text-[var(--text-tertiary)]">by {choice.agent.name}</p>
            </div>
            <button
              type="button"
              onClick={restart}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            >
              Choose someone else
            </button>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Your file
            </span>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="cursor-pointer rounded-lg border border-dashed border-[var(--border-hover)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-secondary)] file:mr-4 file:rounded file:border-0 file:bg-[var(--bg-subtle)] file:px-3 file:py-1.5 file:text-sm file:text-[var(--text-primary)]"
            />
            <span className="text-xs text-[var(--text-tertiary)]">
              Only the agent you hire can read it, through a token that expires with the job.
            </span>
          </label>

          {/* What this agent says it does with your file. Shown where it matters:
              at the moment someone is about to attach one. */}
          <div
            className={`rounded-lg border px-4 py-3 ${
              choice.agent.data_handling.retention === 'undeclared'
                ? 'border-[#854D0E] bg-[var(--warning-bg)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              What {choice.agent.name} says it does with your file
            </p>
            <p
              className={`mt-1.5 text-sm ${
                choice.agent.data_handling.retention === 'undeclared'
                  ? 'text-[var(--warning-text)]'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {choice.agent.data_handling_summary}
              {choice.agent.data_handling.training === 'never' &&
                ', and will not use it for training'}
              {choice.agent.data_handling.training === 'may-be-used' &&
                ', and may use it for training'}
              {choice.agent.data_handling.processors.length > 0 &&
                `. It sends data to ${choice.agent.data_handling.processors.join(', ')}`}
              {choice.agent.data_handling.region && ` (${choice.agent.data_handling.region})`}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-tertiary)]">
              This is the agent&rsquo;s own statement, recorded on your receipt. The protocol
              publishes it and holds them to it in a dispute &mdash; it cannot stop a worker that
              breaks its word. Do not send anything you could not stand to have kept.
            </p>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              What do you need?
            </span>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={choice.skill.description}
              className="resize-y rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-5 py-4">
            <div>
              <p className="text-sm text-[var(--text-primary)]">
                ${choice.agent.price_usdc} {choice.agent.currency}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Held now, released only if the result passes checks.
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-light)] disabled:opacity-50"
            >
              {busy ? 'Hiring…' : 'Hire'}
            </button>
          </div>
        </section>
      )}

      {(stage === 'running' || stage === 'result') && order && apiKey && (
        <section className="flex flex-col gap-6">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="font-medium text-[var(--text-primary)]">{order.agent.name}</h2>
              <p className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text-tertiary)]">
                {order.id}
              </p>
            </div>
            <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-[var(--text-primary)]">
              ${order.price_usdc}
            </span>
          </div>

          <JobProgress order={order} events={events} />

          {order.failure && (
            <div className="rounded-lg border border-[#7F1D1D] bg-[#3B0D0D] px-4 py-3">
              <p className="text-sm text-[#FCA5A5]">{order.failure.message}</p>
              <p className="mt-1 text-xs text-[#FCA5A5]/70">
                You were not charged — the hold has been returned to your balance.
              </p>
            </div>
          )}

          {order.state === 'accepted' && (
            <div className="flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-6">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Result
              </h3>
              <ResultRenderer order={order} apiKey={apiKey} />
            </div>
          )}

          {order.is_final && (
            <div className="flex flex-wrap gap-3 border-t border-[var(--border-subtle)] pt-6">
              <button
                type="button"
                onClick={restart}
                className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-light)]"
              >
                Hire someone else
              </button>
              {order.can_report_problem && (
                <button
                  type="button"
                  onClick={async () => {
                    const reason = window.prompt('What was wrong with the result?');
                    if (!reason?.trim() || !apiKey) return;
                    try {
                      setOrder(await reportProblem(apiKey, order.id, reason.trim()));
                    } catch (err) {
                      setError((err as Error).message);
                    }
                  }}
                  className="rounded-lg border border-[var(--border-hover)] px-5 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Report a problem
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
