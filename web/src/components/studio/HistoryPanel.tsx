"use client";

import { useState } from "react";
import { Drawer } from "./Drawer";
import { CLOSE_BTN, FOCUS_RING } from "./ui";
import type { RunRecord, StoredStep } from "@/lib/workflow/runHistory";

type HistoryPanelProps = {
  open: boolean;
  onClose: () => void;
  runs: RunRecord[];
  onClear: () => void;
};

const STATUS_CHIP: Record<RunRecord["status"], string> = {
  completed: "border-lime/50 bg-lime/10 text-lime",
  aborted: "border-amber/50 bg-amber/10 text-amber",
  error: "border-fail/50 bg-fail/10 text-fail",
  blocked: "border-fail bg-fail/25 text-fail",
};

function formatClock(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryPanel({ open, onClose, runs, onClear }: HistoryPanelProps) {
  return (
    <Drawer open={open} onClose={onClose} side="right" label="Run history" panelId="history-panel">
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-start justify-between gap-2 border-b border-steel px-4 pb-3 pt-4">
          <div className="min-w-0">
            <div className="mono-label">Run history</div>
            <p className="mt-1 font-mono text-[10px] tracking-wide text-silver">
              {runs.length} {runs.length === 1 ? "run" : "runs"} · stored in this browser
            </p>
          </div>
          <div className="flex shrink-0 items-center">
            {runs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Clear all run history?")) onClear();
                }}
                className="flex h-11 shrink-0 items-center justify-center rounded-lg px-2 text-xs text-silver transition-colors duration-150 hover:text-fail"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              data-autofocus
              onClick={onClose}
              aria-label="Close run history panel"
              className={CLOSE_BTN}
            >
              ×
            </button>
          </div>
        </header>
        {runs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-xs font-medium text-ice">No runs yet</p>
            <p className="text-[11px] leading-relaxed text-silver">
              Run a workflow to record it here with its cost, duration and
              per-node events.
            </p>
          </div>
        ) : (
          <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto">
            {runs.map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </ul>
        )}
      </div>
    </Drawer>
  );
}

function RunRow({ run }: { run: RunRecord }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="border-b border-steel-dim last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={`flex w-full flex-col items-start gap-1.5 px-4 py-3 text-left transition-colors duration-150 hover:bg-elevated focus-visible:ring-inset ${FOCUS_RING}`}
      >
        <span className="flex w-full items-center gap-2">
          <span
            className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${STATUS_CHIP[run.status]}`}
          >
            {run.status}
          </span>
          {run.demo && (
            <span className="rounded border border-steel px-1 py-0.5 font-mono text-[8px] uppercase tracking-widest text-silver">
              demo
            </span>
          )}
          <span className="ml-auto font-mono text-[10px] text-silver">{formatClock(run.ts)}</span>
        </span>
        <span className="font-mono text-[10px] text-silver">
          {run.nodeCount} nodes · ${run.cost.toFixed(4)} · {run.tokens} tok ·{" "}
          {(run.durationMs / 1000).toFixed(1)}s
        </span>
      </button>
      {expanded && <RunDetails steps={run.steps} />}
    </li>
  );
}

function RunDetails({ steps }: { steps?: StoredStep[] }) {
  if (!steps || steps.length === 0) {
    return (
      <p className="px-4 pb-3 text-[10px] leading-relaxed text-silver">
        Per-node events were not stored for this run.
      </p>
    );
  }
  return (
    <div className="px-4 pb-3">
      <div className="font-mono text-[9px] uppercase tracking-widest text-silver">
        per-node events
      </div>
      <ul className="mt-1.5 space-y-1.5">
        {steps.map((step, index) => (
          <li
            key={`${step.nodeId}-${index}`}
            className="rounded-md border border-steel-dim bg-obsidian/60 px-2 py-1.5"
          >
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-ice">
                {step.nodeId}
              </span>
              <span
                className={`shrink-0 font-mono text-[9px] uppercase tracking-widest ${
                  step.error ? "text-fail" : step.blocked ? "text-amber" : "text-lime"
                }`}
              >
                {step.error ? "error" : step.blocked ? "blocked" : "ok"}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] text-silver">
              {step.model && <span className="min-w-0 flex-1 truncate">{step.model}</span>}
              <span className="ml-auto shrink-0">
                {step.tokens ?? 0} tok · ${(step.cost ?? 0).toFixed(4)} · {step.latencyMs ?? 0} ms
              </span>
            </div>
            {step.error && (
              <div className="mt-0.5 truncate text-[9px] text-fail" title={step.error}>
                {step.error}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
