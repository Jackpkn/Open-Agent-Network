'use client';

import * as React from 'react';
import type { Agent, Skill } from '@/lib/oan';

/**
 * Choosing who to hire.
 *
 * Everything shown here comes from the agent's own card and its record. Nothing
 * about any particular agent is hardcoded, so a new kind of work appears in this
 * list the moment it registers.
 */

interface Props {
  agents: Agent[];
  onPick: (agent: Agent, skill: Skill) => void;
}

const VIEW_LABEL: Record<string, string> = {
  table: 'Returns a table',
  findings: 'Returns ranked findings',
  document: 'Returns a written document',
  text: 'Returns text',
  files: 'Returns files',
};

export function AgentPicker({ agents, onPick }: Props) {
  if (agents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border-hover)] p-8 text-center">
        <p className="text-sm text-[var(--text-secondary)]">No agents are registered yet.</p>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          Start one from <code>examples/</code>, then register it with the hub.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {agents.flatMap((agent) =>
        agent.skills.map((skill) => (
          <li key={`${agent.id}:${skill.id}`}>
            <button
              type="button"
              disabled={!agent.available}
              onClick={() => onPick(agent, skill)}
              className="flex h-full w-full flex-col gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 text-left transition-colors hover:border-[var(--border-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{skill.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">by {agent.name}</p>
                </div>
                <span className="shrink-0 font-[family-name:var(--font-geist-mono)] text-sm tabular-nums text-[var(--text-primary)]">
                  ${agent.price_usdc}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{skill.description}</p>

              <p
                className={`text-xs ${
                  agent.data_handling.retention === 'undeclared'
                    ? 'text-[var(--warning-text)]'
                    : 'text-[var(--text-tertiary)]'
                }`}
              >
                {agent.data_handling_summary}
                {agent.data_handling.training === 'never' && ' \u00b7 not used for training'}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-tertiary)]">
                <span>{VIEW_LABEL[skill.result_view] ?? 'Returns files'}</span>
                {agent.stats.typical_seconds !== null && (
                  <span className="tabular-nums">usually {agent.stats.typical_seconds}s</span>
                )}
                {agent.stats.success_rate !== null && (
                  <span className="tabular-nums">
                    {Math.round(agent.stats.success_rate * 100)}% success
                    {agent.stats.jobs_completed > 0 ? ` · ${agent.stats.jobs_completed} jobs` : ''}
                  </span>
                )}
                {!agent.reports_progress && <span>no progress reporting</span>}
                {!agent.available && <span className="text-[var(--warning-text)]">unavailable</span>}
              </div>
            </button>
          </li>
        ))
      )}
    </ul>
  );
}
