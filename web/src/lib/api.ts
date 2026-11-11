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
  planner: { provider: "otari" | "groq"; chain: string[]; cost: number; costSource: string };
};

export function planWorkflow(task: string): Promise<PlanResponse> {
  return request<PlanResponse>("/api/v1/workflow/plan", { method: "POST", body: JSON.stringify({ task }) });
}
