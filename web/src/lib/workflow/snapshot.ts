import {
  NODE_LABELS,
  type NodeRunStatus,
  type StepResult,
  type WorkflowEdge,
  type WorkflowNode,
  type WorkflowNodeData,
} from "@/lib/types";
import { isRecord, validateWorkflowInput } from "./validate";

/**
 * Persisted workflow snapshot handling.
 *
 * The studio keeps the current graph in localStorage so a reload does not lose
 * the user's work. The stored payload is untrusted input: it can be written by
 * an older build, truncated by a quota error or edited by hand. It is therefore
 * parsed, validated with the shared workflow validator and shape-checked before
 * it is handed to React Flow.
 */

export const WORKFLOW_STORAGE_KEY = "otarioptm.workflow.v2";
export const LEGACY_WORKFLOW_STORAGE_KEY = "otarioptm.workflow.v1";
export const WORKFLOW_SNAPSHOT_VERSION = 2;

const NODE_STATUSES: NodeRunStatus[] = [
  "idle",
  "running",
  "done",
  "error",
  "skipped",
];

export type SnapshotLoadResult =
  | {
      status: "empty";
      nodes: WorkflowNode[];
      edges: WorkflowEdge[];
    }
  | {
      status: "loaded";
      nodes: WorkflowNode[];
      edges: WorkflowEdge[];
      migrated: boolean;
    }
  | { status: "invalid"; reason: string }
  | { status: "unavailable"; reason: string };

export function serializeWorkflowSnapshot(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): string {
  return JSON.stringify({
    version: WORKFLOW_SNAPSHOT_VERSION,
    nodes,
    edges,
  });
}

function readItem(key: string): { ok: true; raw: string | null } | { ok: false } {
  if (typeof window === "undefined") return { ok: true, raw: null };
  try {
    return { ok: true, raw: window.localStorage.getItem(key) };
  } catch {
    return { ok: false };
  }
}

function writeItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function parseJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

function sanitizeStep(raw: unknown): StepResult | null {
  if (!isRecord(raw)) return null;
  const step: StepResult = {
    nodeId: typeof raw.nodeId === "string" ? raw.nodeId : "",
  };
  if (typeof raw.output === "string") step.output = raw.output;
  if (typeof raw.model === "string" || raw.model === null) step.model = raw.model;
  if (Array.isArray(raw.chain)) {
    step.chain = raw.chain.filter((c): c is string => typeof c === "string");
  }
  if (typeof raw.tokens === "number") step.tokens = raw.tokens;
  if (typeof raw.cost === "number") step.cost = raw.cost;
  if (typeof raw.latencyMs === "number") step.latencyMs = raw.latencyMs;
  if (typeof raw.routing === "string") step.routing = raw.routing;
  if (typeof raw.demo === "boolean") step.demo = raw.demo;
  if (typeof raw.blocked === "boolean") step.blocked = raw.blocked;
  if (typeof raw.error === "string") step.error = raw.error;
  if (Array.isArray(raw.violations)) {
    step.violations = raw.violations
      .filter(isRecord)
      .map((v) => ({
        rule: typeof v.rule === "string" ? v.rule : "rule",
        sample: typeof v.sample === "string" ? v.sample : "",
      }));
  }
  return step;
}

function sanitizeData(raw: unknown, type: WorkflowNode["type"]): WorkflowNodeData {
  const src = isRecord(raw) ? raw : {};
  const data: WorkflowNodeData = {
    label:
      typeof src.label === "string" && src.label ? src.label : NODE_LABELS[type],
  };
  if (typeof src.system === "string") data.system = src.system;
  if (typeof src.prompt === "string") data.prompt = src.prompt;
  if (typeof src.query === "string") data.query = src.query;
  if (typeof src.code === "string") data.code = src.code;
  if (Array.isArray(src.banned)) {
    data.banned = src.banned.filter((b): b is string => typeof b === "string");
  }
  if (typeof src.stop_on_block === "boolean") data.stop_on_block = src.stop_on_block;
  if (
    typeof src.status === "string" &&
    (NODE_STATUSES as string[]).includes(src.status)
  ) {
    data.status = src.status as NodeRunStatus;
  }
  const step = sanitizeStep(src.statusInfo);
  if (step) data.statusInfo = step;
  return data;
}

function sanitizeGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: { x: node.position.x, y: node.position.y },
      data: sanitizeData(node.data, node.type),
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    })),
  };
}

function validatePayload(payload: unknown):
  | { ok: true; nodes: WorkflowNode[]; edges: WorkflowEdge[] }
  | { ok: false; reason: string } {
  const result = validateWorkflowInput(payload);
  if (!result.ok) {
    return {
      ok: false,
      reason: result.errors[0] ?? "the stored graph did not match the workflow schema.",
    };
  }
  const graph = sanitizeGraph(result.graph.nodes, result.graph.edges);
  return { ok: true, nodes: graph.nodes, edges: graph.edges };
}

/**
 * Reads the persisted workflow. A missing snapshot is an empty canvas, an
 * unreadable one is reported instead of being silently thrown away, and the
 * stored copy is never deleted by this function.
 */
export function loadWorkflowSnapshot(): SnapshotLoadResult {
  const current = readItem(WORKFLOW_STORAGE_KEY);
  if (!current.ok) {
    return {
      status: "unavailable",
      reason:
        "Browser storage is unavailable, so this session cannot be saved locally.",
    };
  }
  if (current.raw) {
    const parsed = parseJson(current.raw);
    if (!parsed.ok) {
      return {
        status: "invalid",
        reason: "the stored draft is not valid JSON.",
      };
    }
    const validated = validatePayload(parsed.value);
    if (!validated.ok) {
      return {
        status: "invalid",
        reason: validated.reason,
      };
    }
    return {
      status: "loaded",
      nodes: validated.nodes,
      edges: validated.edges,
      migrated: false,
    };
  }

  const legacy = readItem(LEGACY_WORKFLOW_STORAGE_KEY);
  if (!legacy.ok) {
    return {
      status: "unavailable",
      reason:
        "Browser storage is unavailable, so this session cannot be saved locally.",
    };
  }
  if (legacy.raw) {
    const parsed = parseJson(legacy.raw);
    if (!parsed.ok) {
      return {
        status: "invalid",
        reason: "the stored draft is not valid JSON.",
      };
    }
    const validated = validatePayload(parsed.value);
    if (!validated.ok) {
      return {
        status: "invalid",
        reason: validated.reason,
      };
    }
    writeItem(
      WORKFLOW_STORAGE_KEY,
      serializeWorkflowSnapshot(validated.nodes, validated.edges),
    );
    return {
      status: "loaded",
      nodes: validated.nodes,
      edges: validated.edges,
      migrated: true,
    };
  }

  return { status: "empty", nodes: [], edges: [] };
}
