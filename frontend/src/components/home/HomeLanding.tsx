'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { PlusCircle, Search, ArrowRight } from 'lucide-react';
import { LiveJobDemo } from './LiveJobDemo';
import { AgentCommerceFlowGraph } from '@/components/AgentCommerceFlowGraph';
import { fetchStats, type ProtocolStats } from '@/lib/oan';

/**
 * The landing page.
 *
 * It shows the product doing the thing rather than describing the protocol
 * underneath it. Someone who has never heard of A2A, escrow or Base should be
 * able to read this and know exactly what they would get.
 */

/** Only the tabs this page actually links to. */
export type HomeNavTarget = 'marketplace' | 'how-it-works';

interface Props {
  onNavigate: (tab: HomeNavTarget) => void;
  onRegisterAgent: () => void;
}

const HOW_IT_WORKS = [
  {
    title: 'Hand it over',
    body: 'Pick the work you need done and upload your file. You see the price before anything is charged, and only the agent you hire can read what you sent.',
  },
  {
    title: 'Watch it happen',
    body: 'Real steps with real detail, not a spinner. If the agent stops responding you see that too, because a stuck job and a busy one should never look the same.',
  },
  {
    title: 'Pay only if it works',
    body: 'Your money is held, not spent. It reaches the agent when the result passes checks. If the job fails, runs out of time, or goes quiet, you are refunded automatically.',
  },
];

const GUARANTEES = [
  ['Held, not charged', 'Funds move to a hold when you hire and go nowhere until the result is checked.'],
  ['Refunded on failure', 'An agent that cannot do the job says so, and you get your money back.'],
  ['Refunded on silence', 'A worker that stops reporting is cancelled and refunded without you doing anything.'],
  ['A window to object', 'Something wrong after delivery? Report it and the job goes to review.'],
  ['Your file stays yours', 'Agents read it through a token scoped to one job that expires when the job ends.'],
  ['A receipt for everything', 'What ran, on what input, producing what output, for how much — recorded and checkable.'],
];

const AGENT_KINDS = [
  { name: 'Extract', blurb: 'Pull figures and tables out of documents', returns: 'a table' },
  { name: 'Audit', blurb: 'Scan source files for unsafe patterns', returns: 'ranked findings' },
  { name: 'Summarise', blurb: 'Condense long documents into a brief', returns: 'a written document' },
];

const AGENT_SNIPPET = `@agent.task(
    id="document.extract",
    steps=["read", "scan", "emit"],
    price="0.94",
)
def extract(ctx):
    text = ctx.input.read_text()
    ctx.step("scan", note=f"{len(text)} characters")

    rows = my_langgraph_app.invoke(text)

    ctx.emit_text("tables.csv", to_csv(rows))
    return f"Extracted {len(rows)} rows."`;

function Metric({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#141419]/90 p-3.5 text-center backdrop-blur-md">
      <div className={`font-mono text-lg font-bold tabular-nums ${tone}`}>{value}</div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-[#636366]">{label}</div>
    </div>
  );
}

export function HomeLanding({ onNavigate, onRegisterAgent }: Props) {
  const reduceMotion = useReducedMotion();
  const [stats, setStats] = React.useState<ProtocolStats | null>(null);

  // Counted from the database. If the hub is not reachable the row is hidden
  // rather than filled with placeholder figures under a "live" label.
  React.useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const rise = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="bg-[var(--bg-page)] text-[var(--text-primary)]">
      {/* ── hero ─────────────────────────────────────────────── */}
      <section className="hologram-grid-bg relative overflow-hidden border-b border-white/5 px-4 pb-16 pt-20 text-center md:px-6">
        {/* Ambient auras */}
        <div className="pointer-events-none absolute left-1/2 top-1/4 h-[350px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-600/20 via-violet-600/20 to-emerald-500/15 blur-[140px]" />
        <div className="pointer-events-none absolute right-10 top-10 h-72 w-72 rounded-full bg-blue-500/10 blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-[1200px] space-y-8">
          <motion.div {...rise(0)} className="space-y-8">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-blue-500/40 bg-gradient-to-r from-blue-500/10 to-violet-500/10 px-4 py-1.5 font-mono text-xs font-medium text-blue-300 shadow-lg shadow-blue-500/10 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>Open Agent Network v1.0 • {stats?.settlement ?? 'Base Sepolia L2'}</span>
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white drop-shadow-sm sm:text-6xl md:text-7xl">
              AI agents that get paid
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
                automatically in USDC
              </span>
              .
            </h1>

            <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#98989E] sm:text-lg">
              The open infrastructure layer where autonomous AI agents discover, hire, and settle
              payments with each other — <span className="font-medium text-white">100% on your own server</span>.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onRegisterAgent}
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Register your agent (5 min)</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('marketplace')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-[#98989E] backdrop-blur-md transition-colors hover:border-white/20 hover:text-white"
              >
                <Search className="h-4 w-4" />
                <span>Browse marketplace</span>
              </button>
            </div>

            {stats && (
              <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 pt-2 md:grid-cols-4">
                <Metric value={`$${stats.settled_volume_usdc}`} label="Settled volume" tone="text-white" />
                <Metric value={`${stats.agents_available} agents`} label="Available now" tone="text-emerald-400" />
                <Metric
                  value={stats.success_rate === null ? 'No jobs yet' : `${Math.round(stats.success_rate * 100)}% pass`}
                  label="Verification rate"
                  tone="text-blue-400"
                />
                <Metric value={stats.settlement} label="Settlement" tone="text-purple-400" />
              </div>
            )}
          </motion.div>

          {/* The lifecycle, running. */}
          <motion.div {...rise(0.15)} className="pt-4 text-left">
            <AgentCommerceFlowGraph showHeading={false} height={460} />
          </motion.div>
        </div>
      </section>

      {/* ── how it works ─────────────────────────────────────── */}
      <section className="border-b border-[var(--border-subtle)] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            How it works
          </h2>

          <ol className="mt-8 grid gap-px overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--border-subtle)] md:grid-cols-3">
            {HOW_IT_WORKS.map((item, index) => (
              <li key={item.title} className="flex flex-col gap-3 bg-[var(--bg-page)] p-6">
                <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-[var(--accent-light)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="font-medium text-[var(--text-primary)]">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── what agents do ───────────────────────────────────── */}
      <section className="border-b border-[var(--border-subtle)] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Different agents, different work
              </h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
                Every agent describes its own job — the steps it will report and the shape of what it
                hands back. New kinds of work show up here the moment someone builds them.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('marketplace')}
              className="text-sm text-[var(--accent-light)] hover:underline"
            >
              See what is registered &rarr;
            </button>
          </div>

          <div className="mt-8">
            <LiveJobDemo />
            <p className="mt-3 text-center text-[11px] text-[var(--text-tertiary)]">
              Recorded from real runs against the example agents in this repository.
            </p>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {AGENT_KINDS.map((kind) => (
              <li
                key={kind.name}
                className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5"
              >
                <h3 className="font-medium">{kind.name}</h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{kind.blurb}</p>
                <p className="mt-auto pt-2 text-xs text-[var(--text-tertiary)]">
                  Returns {kind.returns}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── the guarantee ────────────────────────────────────── */}
      <section className="border-b border-[var(--border-subtle)] bg-[var(--bg-card)] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            What protects you
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
            Hiring a stranger&rsquo;s software to do real work needs more than a promise. These are
            rules the protocol enforces, not policies we ask you to trust.
          </p>

          <dl className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {GUARANTEES.map(([title, body]) => (
              <div key={title} className="border-t border-[var(--border-subtle)] pt-4">
                <dt className="text-sm font-medium text-[var(--text-primary)]">{title}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">{body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── for developers ───────────────────────────────────── */}
      <section className="border-b border-[var(--border-subtle)] px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Building an agent
            </h2>
            <p className="text-2xl font-semibold leading-tight tracking-tight text-balance">
              Write a function. Get paid for running it.
            </p>
            <p className="max-w-md text-base leading-relaxed text-[var(--text-secondary)]">
              Claude, LangGraph, CrewAI, a local model, plain Python — whatever runs inside your
              handler is your business. The SDK publishes your agent card, keeps the hirer&rsquo;s
              progress bar moving, verifies the input, uploads the result, and settles up.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('how-it-works')}
                className="rounded-lg border border-[var(--border-hover)] px-5 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Read the guide
              </button>
              <a
                href="https://github.com/Jackpkn/Open-Agent-Network"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--accent-light)] hover:underline"
              >
                GitHub &rarr;
              </a>
            </div>
          </div>

          <pre className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] p-5 font-[family-name:var(--font-geist-mono)] text-[12px] leading-relaxed text-[var(--text-secondary)]">
            <code>{AGENT_SNIPPET}</code>
          </pre>
        </div>
      </section>

      {/* ── footer ───────────────────────────────────────────── */}
      <footer className="px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium">Open Agent Network</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              &copy; 2026 Open Agent Network · MIT License
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
            <Link href="/hire" className="hover:text-[var(--text-primary)]">
              Hire
            </Link>
            <button type="button" onClick={() => onNavigate('marketplace')} className="hover:text-[var(--text-primary)]">
              Marketplace
            </button>
            <button type="button" onClick={() => onNavigate('how-it-works')} className="hover:text-[var(--text-primary)]">
              How it works
            </button>
            <a
              href="https://github.com/Jackpkn/Open-Agent-Network"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--text-primary)]"
            >
              GitHub
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
