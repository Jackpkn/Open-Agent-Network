'use client';

import * as React from 'react';
import type { Order, OutputFile, ResultView } from '@/lib/oan';
import { readOutput, downloadUrl } from '@/lib/oan';

/**
 * Renders any agent's output.
 *
 * A table extractor, a code auditor and a summariser hand back completely
 * different things. Rather than the interface knowing about each agent, the
 * skill declares which shape its output takes and we keep one renderer per
 * shape. A new kind of agent needs no changes here.
 */

interface Props {
  order: Order;
  apiKey: string;
}

export function ResultRenderer({ order, apiKey }: Props) {
  const primary = order.outputs[0];
  const [content, setContent] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const needsContent: ResultView[] = ['table', 'findings', 'document', 'text'];

  React.useEffect(() => {
    if (!primary || !needsContent.includes(order.result_view)) return;
    let cancelled = false;

    readOutput(apiKey, primary)
      .then((text) => !cancelled && setContent(text))
      .catch((err: Error) => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
    };
  }, [primary?.id, order.result_view, apiKey]);

  if (!order.outputs.length && !order.result_text) {
    return <p className="text-sm text-[var(--text-tertiary)]">This job produced no files.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {order.result_text && (
        <p className="text-sm text-[var(--text-secondary)]">{order.result_text}</p>
      )}

      {error && <Notice tone="danger">{error}</Notice>}

      {content !== null && order.result_view === 'table' && <TableView csv={content} />}
      {content !== null && order.result_view === 'findings' && <FindingsView json={content} />}
      {content !== null && order.result_view === 'document' && <DocumentView markdown={content} />}
      {content !== null && order.result_view === 'text' && <PlainView text={content} />}

      <FileList order={order} apiKey={apiKey} />
    </div>
  );
}

/* ── table ──────────────────────────────────────────────────────── */

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else current += char;
  }

  cells.push(current);
  return cells;
}

function TableView({ csv }: { csv: string }) {
  const rows = csv.trim().split(/\r?\n/).filter(Boolean).map(splitCsvLine);
  if (rows.length === 0) return null;

  const [header, ...body] = rows;

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
      <table className="w-full min-w-[420px] text-sm tabular-nums">
        <thead>
          <tr className="bg-[var(--bg-subtle)]">
            {header.map((cell, i) => (
              <th
                key={i}
                className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r} className="border-t border-[var(--border-subtle)]">
              {row.map((cell, c) => (
                <td key={c} className="px-4 py-2.5 text-[var(--text-primary)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-[var(--border-subtle)] px-4 py-2 text-xs text-[var(--text-tertiary)]">
        {body.length} rows
      </p>
    </div>
  );
}

/* ── findings ───────────────────────────────────────────────────── */

interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  detail?: string;
  location?: string;
  snippet?: string;
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-[#3B0D0D] text-[#FCA5A5] border-[#7F1D1D]',
  high: 'bg-[var(--warning-bg)] text-[var(--warning-text)] border-[#854D0E]',
  medium: 'bg-[var(--accent-bg)] text-[var(--accent-light)] border-[#1E3A8A]',
  low: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
};

function FindingsView({ json }: { json: string }) {
  let findings: Finding[] = [];
  try {
    const parsed = JSON.parse(json);
    findings = Array.isArray(parsed) ? parsed : [];
  } catch {
    return <PlainView text={json} />;
  }

  if (findings.length === 0) {
    return <Notice tone="success">Nothing flagged.</Notice>;
  }

  const counts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {(['critical', 'high', 'medium', 'low'] as const)
          .filter((s) => counts[s])
          .map((s) => (
            <span
              key={s}
              className={`rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${SEVERITY_STYLE[s]}`}
            >
              {counts[s]} {s}
            </span>
          ))}
      </div>

      <ul className="flex flex-col gap-2">
        {findings.map((finding, i) => (
          <li
            key={i}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  SEVERITY_STYLE[finding.severity] ?? SEVERITY_STYLE.low
                }`}
              >
                {finding.severity}
              </span>
              <span className="font-medium text-[var(--text-primary)]">{finding.title}</span>
              {finding.location && (
                <span className="font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text-tertiary)]">
                  {finding.location}
                </span>
              )}
            </div>
            {finding.detail && (
              <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{finding.detail}</p>
            )}
            {finding.snippet && (
              <pre className="mt-2 overflow-x-auto rounded bg-[var(--bg-input)] px-3 py-2 font-[family-name:var(--font-geist-mono)] text-xs text-[var(--text-secondary)]">
                {finding.snippet}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── document ───────────────────────────────────────────────────── */

function DocumentView({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n{2,}/).filter((b) => b.trim());

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
      {blocks.map((block, i) => {
        const trimmed = block.trim();

        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={i} className="mt-1 text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              {trimmed.slice(3)}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={i} className="text-lg font-semibold text-[var(--text-primary)]">
              {trimmed.slice(2)}
            </h2>
          );
        }
        if (/^\d+\.\s/m.test(trimmed)) {
          return (
            <ol key={i} className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-[var(--text-secondary)]">
              {trimmed.split('\n').map((line, j) => (
                <li key={j}>{line.replace(/^\d+\.\s*/, '')}</li>
              ))}
            </ol>
          );
        }
        if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
          return (
            <p key={i} className="text-sm italic text-[var(--text-tertiary)]">
              {trimmed.replace(/^\*|\*$/g, '')}
            </p>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed text-[var(--text-secondary)]">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

/* ── plain text and files ───────────────────────────────────────── */

function PlainView({ text }: { text: string }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] p-4 font-[family-name:var(--font-geist-mono)] text-xs leading-relaxed text-[var(--text-secondary)]">
      {text}
    </pre>
  );
}

function FileList({ order, apiKey }: Props) {
  if (!order.outputs.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {order.outputs.map((file: OutputFile) => (
        <a
          key={file.id}
          href={downloadUrl(apiKey, order, file)}
          download={file.filename}
          className="group flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2.5 transition-colors hover:border-[var(--border-hover)]"
        >
          <span className="text-sm font-medium text-[var(--text-primary)]">{file.filename}</span>
          <span className="text-xs text-[var(--text-tertiary)]">
            {(file.size_bytes / 1024).toFixed(1)} KB
          </span>
          <span className="text-xs font-medium text-[var(--accent-light)] group-hover:underline">
            Download
          </span>
        </a>
      ))}
    </div>
  );
}

function Notice({ tone, children }: { tone: 'success' | 'danger'; children: React.ReactNode }) {
  const styles =
    tone === 'success'
      ? 'border-[#166534] bg-[var(--success-pill-bg)] text-[var(--success-text)]'
      : 'border-[#7F1D1D] bg-[#3B0D0D] text-[#FCA5A5]';

  return <p className={`rounded-lg border px-4 py-2.5 text-sm ${styles}`}>{children}</p>;
}
