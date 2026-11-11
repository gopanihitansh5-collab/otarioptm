import type { WorkflowEdge, WorkflowNode } from "@/lib/types";

export const EXPORT_FILENAME = "otarioptm-workflow.json";

export function buildWorkflowExport(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): string {
  return JSON.stringify(
    {
      app: "otarioptm",
      version: 1,
      exportedAt: new Date().toISOString(),
      nodes,
      edges,
    },
    null,
    2,
  );
}

export function downloadWorkflowJson(json: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = EXPORT_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
