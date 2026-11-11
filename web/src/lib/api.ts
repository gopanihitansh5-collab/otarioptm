import type {
  HealthResponse,
  RunResponse,
  CatalogModel,
  WorkflowEdge,
  WorkflowNode,
} from "./types";

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8000";

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
  return `${GATEWAY_URL.replace(/^http/, "ws")}/api/v1/activity`;
}

export const CSV_EXPORT_URL = `${GATEWAY_URL}/api/v1/export`;

export const GATEWAY_BASE = GATEWAY_URL;
