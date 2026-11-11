import type {
  BudgetSnapshot,
  HealthResponse,
  RunResponse,
  CatalogModel,
  WorkflowEdge,
  WorkflowNode,
} from "./types";

// Empty base = same-origin relative requests. On Vercel the /api/(.*) rewrite
// routes them to the FastAPI service; locally .env points at :8000.
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/v1/health");
}

export type ActivitySnapshotResponse = {
  events: Array<Record<string, unknown>>;
  budget: BudgetSnapshot;
  runtime?: string;
  activity_transport?: string;
  activity_snapshot_path?: string;
};

/** Serverless-compatible activity feed (no WebSocket required). */
export function getActivitySnapshot(): Promise<ActivitySnapshotResponse> {
  return request<ActivitySnapshotResponse>("/api/v1/activity");
}

export function getModels(): Promise<CatalogModel[]> {
  return request<CatalogModel[]>("/api/v1/models");
}

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  nodeCount?: number;
  graph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
};

export function getTemplates(): Promise<WorkflowTemplate[]> {
  return request<WorkflowTemplate[]>("/api/v1/templates");
}

export function runWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): Promise<RunResponse> {
  return request<RunResponse>("/api/v1/workflow/run", {
    method: "POST",
    body: JSON.stringify({
      nodes: nodes.map((n) => ({ id: n.id, type: n.type, data: n.data })),
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
    }),
  });
}

export function activityWebSocketUrl(): string {
  const base =
    GATEWAY_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base.replace(/^http/, "ws")}/api/v1/activity`;
}

export const CSV_EXPORT_URL = `${GATEWAY_URL}/api/v1/export`;

export const GATEWAY_BASE = GATEWAY_URL;

export type PlanResponse = {
  graph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
  summary: string | null;
  warnings: string[];
  source: "live-planner";
  stages?: Record<string, { provider?: string; chain?: string[]; cost?: number; costSource?: string; assigned?: unknown; enhancedNodes?: string[] }>;
  planner: { provider: "otari" | "groq"; chain: string[]; cost: number; costSource: string };
};

export function planWorkflow(task: string): Promise<PlanResponse> {
  return request<PlanResponse>("/api/v1/workflow/plan", { method: "POST", body: JSON.stringify({ task }) });
}

export type WorkflowStreamEvent = { event: string; nodeId?: string; type?: import("./types").NodeType; error?: string; blocked?: boolean; budget?: BudgetSnapshot; aborted?: string | null; partial?: boolean; failedNodes?: string[] } & Partial<import("./types").StepResult>;

/** One POST only. Never retry a partially executed workflow on stream failure. */
export async function streamWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[], onEvent: (event: WorkflowStreamEvent) => void): Promise<RunResponse> {
  const res = await fetch(`${GATEWAY_URL}/api/v1/workflow/run/stream`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data })), edges: edges.map(e => ({ source: e.source, target: e.target })) }),
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try { detail = JSON.parse(text).detail || text; } catch { /* plain response */ }
    throw new Error(`${res.status}: ${detail}`);
  }
  if (!res.body) throw new Error("No execution stream returned. Do not retry automatically.");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const steps: import("./types").StepResult[] = [];
  let finished: RunResponse | null = null;
  const consume = (frame: string) => {
    const lines = frame.split("\n");
    const eventName = lines.find(l => l.startsWith("event:"))?.slice(6).trim();
    const data = lines.filter(l => l.startsWith("data:")).map(l => l.slice(5).trim()).join("\n");
    if (!data) return;
    const ev = JSON.parse(data) as WorkflowStreamEvent;
    if (eventName === "error") throw new Error(ev.error || "Execution stream failed. Some nodes may have run.");
    if (eventName === "done") return;
    if (ev.event === "node.completed" && ev.nodeId) steps.push(ev as import("./types").StepResult);
    if (ev.event === "workflow.finished" && ev.budget) finished = { steps, budget: ev.budget, aborted: ev.aborted ?? null, partial: ev.partial, failedNodes: ev.failedNodes };
    onEvent(ev);
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      let split;
      while ((split = buffer.indexOf("\n\n")) >= 0) { consume(buffer.slice(0, split)); buffer = buffer.slice(split + 2); }
      if (done) break;
    }
    if (!finished) throw new Error("Execution connection ended before confirmation. Some nodes may have run; inspect activity before retrying.");
    return finished;
  } finally { reader.releaseLock(); }
}
