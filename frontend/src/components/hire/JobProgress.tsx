'use client';

import * as React from 'react';
import type { LiveEvent, Order } from '@/lib/oan';

/**
 * The answer to "is it actually working?".
 *
 * The steps come from the agent's own card, so the rail is complete before the
 * first event arrives — a hirer can see what is meant to happen, not just a
 * spinner. A job that goes quiet says so, because a stalled worker and a busy
 * one must never look the same on a screen holding someone's money.
 */

interface Props {
  order: Order;
  events: LiveEvent[];
}

const QUIET_STATES = new Set(['stalled']);

export function JobProgress({ order, events }: Props) {
  const stepEvents = events.filter((e) => e.type === 'step' && e.step);
  const reached = new Set(stepEvents.map((e) => e.step as string));
  const active = order.current_step ?? stepEvents[stepEvents.length - 1]?.step ?? null;
  const quiet = QUIET_STATES.has(order.state);
  const done = order.state === 'accepted';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {!order.is_final && (
            <span
              className={`h-2 w-2 rounded-full ${
                quiet ? 'bg-[var(--warning)]' : 'animate-pulse bg-[var(--accent-light)]'
              }`}
            />
          )}
          <span className="text-sm font-medium text-[var(--text-primary)]">{order.message}</span>
        </div>
        <span className="font-[family-name:var(--font-geist-mono)] text-xs tabular-nums text-[var(--text-tertiary)]">
          {Math.round((done ? 1 : order.progress) * 100)}%
        </span>
      </div>

      {order.steps.length > 0 ? (
        <ol className="flex flex-col gap-0">
          {order.steps.map((step, index) => {
            const isActive = step === active && !done;
            const isDone = done || (reached.has(step) && step !== active);
            const detail = [...stepEvents].reverse().find((e) => e.step === step)?.note;

            return (
              <li key={step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 ${
                      isDone
                        ? 'border-[var(--success)] bg-[var(--success)]'
                        : isActive
                          ? 'border-[var(--accent-light)] bg-[var(--accent-light)]'
                          : 'border-[var(--border-hover)] bg-transparent'
                    }`}
                  />
                  {index < order.steps.length - 1 && (
                    <span
                      className={`w-px flex-1 ${isDone ? 'bg-[var(--success)]' : 'bg-[var(--border-subtle)]'}`}
                    />
                  )}
                </div>

                <div className="pb-4">
                  <p
                    className={`text-sm ${
                      isActive || isDone ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
                    }`}
                  >
                    {step}
                  </p>
                  {detail && <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{detail}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-[var(--text-tertiary)]">
          This agent does not report progress, so there is nothing to show until it finishes or its
          deadline passes.
        </p>
      )}

      {quiet && (
        <p className="rounded-lg border border-[#854D0E] bg-[var(--warning-bg)] px-4 py-2.5 text-sm text-[var(--warning-text)]">
          The agent has stopped responding. If it does not recover shortly, the job is cancelled and
          you are refunded automatically.
        </p>
      )}

      {events.length > 0 && (
        <details className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-[var(--text-tertiary)]">
            Activity log ({events.length})
          </summary>
          <ol className="max-h-56 overflow-auto border-t border-[var(--border-subtle)] px-4 py-2">
            {events.map((event) => (
              <li
                key={event.seq}
                className="flex gap-3 py-1 font-[family-name:var(--font-geist-mono)] text-[11px] text-[var(--text-tertiary)]"
              >
                <span className="tabular-nums">{String(event.seq).padStart(2, '0')}</span>
                <span className="text-[var(--text-secondary)]">
                  {event.step ?? event.type}
                  {event.note ? ` — ${event.note}` : ''}
                  {event.to ? ` → ${event.to}` : ''}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
