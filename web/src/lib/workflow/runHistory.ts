import type { StepResult } from "@/lib/types";

export type StoredStep = {
  nodeId: string;
  type?: string;
  blocked?: boolean;
  demo?: boolean;
  error?: string;
  model?: string | null;
  tokens?: number;
  cost?: number;
  latencyMs?: number;
};

export type RunRecord = {
  id: string;
  ts: number;
  status: "completed" | "aborted" | "error" | "blocked";
  nodeCount: number;
  cost: number;
  tokens: number;
  durationMs: number;
  demo: boolean;
  steps?: StoredStep[];
};

export const RUN_HISTORY_KEY = "otarioptm.runs.v1";
export const MAX_RUNS = 20;

function isRunRecord(value: unknown): value is RunRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.ts === "number" &&
    (r.status === "completed" ||
      r.status === "aborted" ||
      r.status === "error" ||
      r.status === "blocked") &&
    typeof r.nodeCount === "number" &&
    typeof r.cost === "number" &&
    typeof r.tokens === "number" &&
    typeof r.durationMs === "number" &&
    // `demo` was added after the first release, older records are read as
    // non-demo rather than discarded.
    (typeof r.demo === "boolean" || r.demo === undefined)
  );
}

/**
 * Derives the honest status of a run from what the gateway actually
 * returned. A run whose nodes failed or were blocked is never stored as
 * "completed".
 */
export function deriveRunStatus(
  steps: StepResult[],
  aborted?: string | null,
): RunRecord["status"] {
  if (aborted) return "aborted";
  if (steps.some((s) => s.blocked)) return "blocked";
  if (steps.some((s) => s.error)) return "error";
  return "completed";
}

export function loadRunHistory(): RunRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RUN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isRunRecord)
      .map((r) => ({ ...r, demo: r.demo === true }))
      .slice(0, MAX_RUNS);
  } catch {
    return [];
  }
}

export function saveRunHistory(runs: RunRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(runs.slice(0, MAX_RUNS)));
  } catch {
    try {
      window.localStorage.setItem(
        RUN_HISTORY_KEY,
        JSON.stringify(runs.slice(0, Math.max(1, Math.floor(MAX_RUNS / 2)))),
      );
    } catch {
      /* storage unavailable — history stays in memory for this session */
    }
  }
}

export function buildRunRecord(options: {
  status: RunRecord["status"];
  nodeCount: number;
  durationMs: number;
  steps: StepResult[];
}): RunRecord {
  const steps: StoredStep[] = options.steps.map((s) => ({
    nodeId: s.nodeId,
    type: s.type,
    blocked: s.blocked || undefined,
    demo: s.demo || undefined,
    error: s.error,
    model: s.model ?? undefined,
    tokens: s.tokens,
    cost: s.cost,
    latencyMs: s.latencyMs,
  }));
  const cost = options.steps.reduce((acc, s) => acc + (s.cost ?? 0), 0);
  const tokens = options.steps.reduce((acc, s) => acc + (s.tokens ?? 0), 0);
  return {
    id: `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
    status: options.status,
    nodeCount: options.nodeCount,
    cost,
    tokens,
    durationMs: options.durationMs,
    demo: options.steps.some((s) => s.demo),
    steps,
  };
}
