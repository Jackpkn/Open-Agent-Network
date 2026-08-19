'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/**
 * The hero: a job running.
 *
 * Every frame here is a recording of a real run against the three example
 * agents — the same steps, notes, figures and payouts they actually produced.
 * It is a product demonstration, not a live feed, so nothing on it claims to be
 * live and no statistic is invented.
 */

type View = 'table' | 'findings' | 'document';

interface Step {
  name: string;
  note: string;
}

interface Scenario {
  id: string;
  label: string;
  file: string;
  agent: string;
  price: string;
  payout: string;
  view: View;
  steps: Step[];
  summary: string;
  table?: { header: string[]; rows: string[][] };
  findings?: Array<{ severity: string; title: string; location: string }>;
  document?: string[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 'extract',
    label: 'Extract tables',
    file: 'report.txt',
    agent: 'Ledger Extract',
    price: '0.94',
    payout: '0.93',
    view: 'table',
    steps: [
      { name: 'read', note: 'report.txt · 263 bytes' },
      { name: 'scan', note: 'scanning 9 lines' },
      { name: 'emit', note: 'writing 2 rows' },
    ],
    summary: 'Extracted 2 rows from report.txt.',
    table: {
      header: ['line', 'label', 'value'],
      rows: [
        ['2', 'Revenue', '4201338.00'],
        ['3', 'Net income', '1328783.25'],
      ],
    },
  },
  {
    id: 'audit',
    label: 'Audit code',
    file: 'service.py',
    agent: 'Static Auditor',
    price: '1.80',
    payout: '1.78',
    view: 'findings',
    steps: [
      { name: 'read', note: 'service.py' },
      { name: 'scan', note: '7 lines against 9 rules' },
      { name: 'rank', note: '5 findings' },
    ],
    summary: '5 findings in service.py, worst severity: critical.',
    findings: [
      { severity: 'critical', title: 'Hardcoded credential', location: 'service.py:2' },
      { severity: 'critical', title: 'Use of eval()', location: 'service.py:5' },
      { severity: 'high', title: 'Shell invocation', location: 'service.py:4' },
      { severity: 'medium', title: 'TLS verification disabled', location: 'service.py:6' },
    ],
  },
  {
    id: 'brief',
    label: 'Summarise',
    file: 'notes.txt',
    agent: 'Brief',
    price: '0.40',
    payout: '0.39',
    view: 'document',
    steps: [
      { name: 'read', note: 'notes.txt' },
      { name: 'rank', note: '7 sentences' },
      { name: 'write', note: 'writing 3 key points' },
    ],
    summary: 'Condensed 7 sentences into 3 key points.',
    document: [
      'The protocol separates the person hiring from the developer building.',
      'Money is held at the moment of hire, never before.',
      'A worker that goes silent is refunded automatically after a grace period.',
    ],
  },
];

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'border-[#7F1D1D] bg-[#3B0D0D] text-[#FCA5A5]',
  high: 'border-[#854D0E] bg-[var(--warning-bg)] text-[var(--warning-text)]',
  medium: 'border-[#1E3A8A] bg-[var(--accent-bg)] text-[var(--accent-light)]',
  low: 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]',
};

/** Frames: one per step, then the result, then settlement. */
type Phase = { kind: 'step'; index: number } | { kind: 'result' } | { kind: 'settled' };

function framesFor(scenario: Scenario): Phase[] {
  return [
    ...scenario.steps.map((_, index) => ({ kind: 'step' as const, index })),
    { kind: 'result' as const },
    { kind: 'settled' as const },
  ];
}

const FRAME_MS = 900;
const RESULT_MS = 1600;
const SETTLED_MS = 2200;

export function LiveJobDemo() {
  const reduceMotion = useReducedMotion();
  const [scenarioIndex, setScenarioIndex] = React.useState(0);
  const [frameIndex, setFrameIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  const scenario = SCENARIOS[scenarioIndex];
  const frames = React.useMemo(() => framesFor(scenario), [scenario]);
  const frame = frames[Math.min(frameIndex, frames.length - 1)];

  // With reduced motion the job is shown already finished, and only advances
  // when someone picks a different job.
  React.useEffect(() => {
    if (reduceMotion) {
      setFrameIndex(frames.length - 1);
      return;
    }
    if (paused) return;

    const delay =
      frame.kind === 'settled' ? SETTLED_MS : frame.kind === 'result' ? RESULT_MS : FRAME_MS;

    const timer = setTimeout(() => {
      if (frameIndex < frames.length - 1) {
        setFrameIndex(frameIndex + 1);
      } else {
        setScenarioIndex((scenarioIndex + 1) % SCENARIOS.length);
        setFrameIndex(0);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [frame.kind, frameIndex, frames.length, paused, reduceMotion, scenarioIndex]);

  function pick(index: number) {
    setScenarioIndex(index);
    setFrameIndex(reduceMotion ? framesFor(SCENARIOS[index]).length - 1 : 0);
  }

  const activeStep = frame.kind === 'step' ? frame.index : scenario.steps.length;
  const settled = frame.kind === 'settled';
  const showResult = frame.kind === 'result' || settled;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]"
    >
      {/* job header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="font-[family-name:var(--font-geist-mono)] text-sm text-[var(--text-primary)]">
            {scenario.file}
          </span>
          <span className="text-[var(--text-tertiary)]">&rarr;</span>
          <span className="text-sm text-[var(--text-secondary)]">{scenario.agent}</span>
        </div>

        <span
          className={`font-[family-name:var(--font-geist-mono)] text-sm tabular-nums transition-colors ${
            settled ? 'text-[var(--success-text)]' : 'text-[var(--text-secondary)]'
          }`}
        >
          {settled ? `paid $${scenario.price}` : `$${scenario.price} held`}
        </span>
      </div>

      <div className="grid gap-0 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
        {/* step rail */}
        <ol className="border-b border-[var(--border-subtle)] px-5 py-4 md:border-b-0 md:border-r">
          {scenario.steps.map((step, index) => {
            const done = index < activeStep;
            const running = index === activeStep && !showResult;

            return (
              <li key={step.name} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full transition-colors ${
                      done
                        ? 'bg-[var(--success)]'
                        : running
                          ? 'bg-[var(--accent-light)]'
                          : 'bg-[var(--border-hover)]'
                    }`}
                  />
                  {index < scenario.steps.length - 1 && (
                    <span
                      className={`w-px flex-1 transition-colors ${
                        done ? 'bg-[var(--success)]' : 'bg-[var(--border-subtle)]'
                      }`}
                    />
                  )}
                </div>

                <div className="pb-4">
                  <p
                    className={`text-sm transition-colors ${
                      done || running ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
                    }`}
                  >
                    {step.name}
                  </p>
                  {(done || running) && (
                    <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-tertiary)]">
                      {step.note}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* result panel */}
        <div className="min-h-[188px] px-5 py-4">
          <AnimatePresence mode="wait">
            {showResult ? (
              <motion.div
                key={`${scenario.id}-result`}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                <Result scenario={scenario} />
              </motion.div>
            ) : (
              <motion.p
                key={`${scenario.id}-waiting`}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                className="pt-1 text-sm text-[var(--text-tertiary)]"
              >
                {scenario.steps[Math.min(activeStep, scenario.steps.length - 1)].note}
                <span className="ml-0.5 animate-pulse">…</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* settlement + job switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-5 py-3">
        <p className="text-xs text-[var(--text-tertiary)]">
          {settled ? (
            <span className="text-[var(--success-text)]">
              Checks passed · ${scenario.payout} to {scenario.agent}, ${
                (Number(scenario.price) - Number(scenario.payout)).toFixed(2)
              } protocol fee
            </span>
          ) : (
            'Money is held, not charged, until the result passes checks.'
          )}
        </p>

        <div className="flex gap-1.5">
          {SCENARIOS.map((option, index) => (
            <button
              key={option.id}
              type="button"
              onClick={() => pick(index)}
              aria-pressed={index === scenarioIndex}
              className={`rounded px-2.5 py-1 text-[11px] transition-colors ${
                index === scenarioIndex
                  ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Result({ scenario }: { scenario: Scenario }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--text-secondary)]">{scenario.summary}</p>

      {scenario.view === 'table' && scenario.table && (
        <table className="w-full text-xs tabular-nums">
          <thead>
            <tr>
              {scenario.table.header.map((cell) => (
                <th
                  key={cell}
                  className="pb-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scenario.table.rows.map((row) => (
              <tr key={row[0]} className="border-t border-[var(--border-subtle)]">
                {row.map((cell, i) => (
                  <td key={i} className="py-1.5 pr-4 text-[var(--text-primary)]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {scenario.view === 'findings' && scenario.findings && (
        <ul className="flex flex-col gap-1.5">
          {scenario.findings.map((finding) => (
            <li key={finding.location} className="flex flex-wrap items-baseline gap-2">
              <span
                className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  SEVERITY_STYLE[finding.severity]
                }`}
              >
                {finding.severity}
              </span>
              <span className="text-xs text-[var(--text-primary)]">{finding.title}</span>
              <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--text-tertiary)]">
                {finding.location}
              </span>
            </li>
          ))}
        </ul>
      )}

      {scenario.view === 'document' && scenario.document && (
        <ol className="flex list-decimal flex-col gap-1.5 pl-4">
          {scenario.document.map((point) => (
            <li key={point} className="text-xs leading-relaxed text-[var(--text-secondary)]">
              {point}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
