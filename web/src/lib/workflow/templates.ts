import { getTemplates, type WorkflowTemplate } from "@/lib/api";
import { NODE_LABELS, type NodeType, type WorkflowEdge, type WorkflowNode, type WorkflowNodeData } from "@/lib/types";
import { validateWorkflowInput } from "./validate";

export type { WorkflowTemplate };

export type TemplateSource = "gateway" | "local";

function node(
  id: string,
  type: NodeType,
  x: number,
  y: number,
  data: Partial<WorkflowNodeData> = {},
): WorkflowNode {
  return {
    id,
    type,
    position: { x, y },
    data: { label: NODE_LABELS[type], ...data },
  };
}

function edge(source: string, target: string): WorkflowEdge {
  return { id: `e-${source}-${target}`, source, target };
}

export const LOCAL_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "research-then-summarize",
    name: "Research then summarize",
    description: "Pull live web context, then distill it into a short, citation-friendly brief.",
    graph: {
      nodes: [
        node("search-1", "web-search", 40, 140, {
          query: "latest research on mixture-of-experts model routing",
        }),
        node("summarize-1", "chat", 360, 140, {
          system: "You are a precise research assistant. Be concise and concrete.",
          prompt: "Summarize these research findings into five bullet points:\n\n{{search-1}}",
        }),
      ],
      edges: [edge("search-1", "summarize-1")],
    },
  },
  {
    id: "guarded-chat",
    name: "Guarded chat",
    description: "Draft copy with a model, then screen the reply against banned-claim guardrails before it ships.",
    graph: {
      nodes: [
        node("chat-1", "chat", 40, 140, {
          system: "You are a concise product copywriter.",
          prompt: "Draft a two-sentence launch announcement for a cost-aware AI workflow engine.",
        }),
        node("guard-1", "guardrails", 360, 140, {
          banned: ["guaranteed", "risk-free", "unlimited"],
          stop_on_block: true,
        }),
      ],
      edges: [edge("chat-1", "guard-1")],
    },
  },
  {
    id: "code-review",
    name: "Code review",
    description: "Review a Python snippet for bugs and edge cases, then rewrite it with the fixes applied.",
    graph: {
      nodes: [
        node("review-1", "chat", 40, 140, {
          system: "You are a senior code reviewer. List every issue with a one-line fix.",
          prompt:
            "Review this Python snippet for bugs, edge cases and style:\n\n```python\nsums = {}\nfor k, v in items:\n    sums[k] += v\n```",
        }),
        node("rewrite-1", "chat", 360, 140, {
          system: "You output corrected Python only.",
          prompt: "Rewrite the snippet applying these fixes:\n\n{{review-1}}",
        }),
      ],
      edges: [edge("review-1", "rewrite-1")],
    },
  },
  {
    id: "web-fact-check",
    name: "Web fact check",
    description: "Search the web, extract verifiable claims, then check each one against the retrieved sources.",
    graph: {
      nodes: [
        node("search-1", "web-search", 20, 160, {
          query: "Mozilla Otari gateway announcement",
        }),
        node("claims-1", "chat", 340, 120, {
          system: "You extract distinct, verifiable factual claims.",
          prompt: "From these search results, extract up to five distinct factual claims:\n\n{{search-1}}",
        }),
        node("verdict-1", "chat", 660, 160, {
          system: "You fact-check claims strictly against the provided sources.",
          prompt:
            "For each claim below, answer supported or unsupported and cite the source line:\n\n{{claims-1}}",
        }),
      ],
      edges: [edge("search-1", "claims-1"), edge("claims-1", "verdict-1")],
    },
  },
];

export async function fetchTemplates(): Promise<{
  templates: WorkflowTemplate[];
  source: TemplateSource;
}> {
  try {
    const list = await getTemplates();
    if (!Array.isArray(list) || list.length === 0)
      throw new Error("no templates in response");
    const parsed: WorkflowTemplate[] = [];
    for (const item of list) {
      if (typeof item.id !== "string" || typeof item.name !== "string") continue;
      const graph = validateWorkflowInput(item.graph);
      if (!graph.ok) continue;
      parsed.push({
        id: item.id,
        name: item.name,
        description: typeof item.description === "string" ? item.description : "",
        graph: graph.graph,
      });
    }
    if (parsed.length === 0) throw new Error("no valid templates in response");
    return { templates: parsed, source: "gateway" };
  } catch {
    return { templates: LOCAL_TEMPLATES, source: "local" };
  }
}
