import {
  NODE_LABELS,
  type NodeType,
  type WorkflowEdge,
  type WorkflowNode,
  type WorkflowNodeData,
} from "@/lib/types";

export const NODE_TYPE_VALUES: NodeType[] = [
  "chat",
  "web-search",
  "code-exec",
  "guardrails",
];

export type WorkflowGraph = { nodes: WorkflowNode[]; edges: WorkflowEdge[] };

export type GraphValidation =
  | { ok: true; graph: WorkflowGraph }
  | { ok: false; errors: string[] };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coerceNode(
  raw: Record<string, unknown>,
  index: number,
  seenIds: Set<string>,
  errors: string[],
): WorkflowNode | null {
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : null;
  if (!id) {
    errors.push(`Node #${index + 1} is missing an id.`);
    return null;
  }
  if (seenIds.has(id)) {
    errors.push(`Duplicate node id "${id}".`);
    return null;
  }
  const type =
    typeof raw.type === "string"
      ? (NODE_TYPE_VALUES.find((t) => t === raw.type) as NodeType | undefined)
      : undefined;
  if (!type) {
    errors.push(`Node "${id}" has an unknown type (expected chat, web-search, code-exec or guardrails).`);
    return null;
  }
  const rawPos = isRecord(raw.position) ? raw.position : null;
  let position: { x: number; y: number };
  if (rawPos && typeof rawPos.x === "number" && typeof rawPos.y === "number") {
    position = { x: rawPos.x, y: rawPos.y };
  } else if (rawPos) {
    errors.push(`Node "${id}" has an invalid position (x and y must be numbers).`);
    return null;
  } else {
    position = { x: 80 + seenIds.size * 340, y: 120 + (seenIds.size % 2) * 140 };
  }
  seenIds.add(id);
  const data = isRecord(raw.data) ? raw.data : {};
  const label =
    typeof data.label === "string" && data.label ? data.label : NODE_LABELS[type];
  return {
    id,
    type,
    position,
    data: { ...data, label } as WorkflowNodeData,
  };
}

export function validateWorkflowInput(raw: unknown): GraphValidation {
  const errors: string[] = [];
  if (!isRecord(raw)) {
    return { ok: false, errors: ["Expected a JSON object with nodes and edges."] };
  }
  const graph = isRecord(raw.graph) ? raw.graph : raw;
  if (!Array.isArray(graph.nodes)) {
    return { ok: false, errors: ["Missing a 'nodes' array."] };
  }
  if (!Array.isArray(graph.edges)) {
    return { ok: false, errors: ["Missing an 'edges' array."] };
  }

  const nodes: WorkflowNode[] = [];
  const seenNodeIds = new Set<string>();
  graph.nodes.forEach((entry, index) => {
    if (!isRecord(entry)) {
      errors.push(`Node #${index + 1} is not an object.`);
      return;
    }
    const node = coerceNode(entry, index, seenNodeIds, errors);
    if (node) nodes.push(node);
  });
  if (errors.length > 0) return { ok: false, errors };

  const edges: WorkflowEdge[] = [];
  const seenEdgeIds = new Set<string>();
  graph.edges.forEach((entry, index) => {
    if (!isRecord(entry)) {
      errors.push(`Edge #${index + 1} is not an object.`);
      return;
    }
    const source = typeof entry.source === "string" ? entry.source : null;
    const target = typeof entry.target === "string" ? entry.target : null;
    if (!source || !target) {
      errors.push(`Edge #${index + 1} is missing source or target.`);
      return;
    }
    if (!seenNodeIds.has(source)) {
      errors.push(`Edge #${index + 1} points at missing node "${source}".`);
      return;
    }
    if (!seenNodeIds.has(target)) {
      errors.push(`Edge #${index + 1} points at missing node "${target}".`);
      return;
    }
    const id =
      typeof entry.id === "string" && entry.id.trim()
        ? entry.id.trim()
        : `e-${source}-${target}`;
    if (seenEdgeIds.has(id)) {
      errors.push(`Duplicate edge id "${id}".`);
      return;
    }
    seenEdgeIds.add(id);
    edges.push({ id, source, target });
  });
  if (errors.length > 0) return { ok: false, errors };

  return { ok: true, graph: { nodes, edges } };
}

export function validateWorkflowJson(text: string): GraphValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["File is not valid JSON."] };
  }
  return validateWorkflowInput(parsed);
}
