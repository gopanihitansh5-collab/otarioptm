import type { WorkflowNode } from "@/lib/types";

/** Local, clearly-labeled demo cap used only by the client to demonstrate the
 * HTTP 402 pre-spend block. The real gateway cap is never touched. */
export const DEMO_CAP = 0.001;

/**
 * Conservative floor estimate for a single billable provider call (model chat
 * or web search). Used when no billed run history exists yet; real estimates
 * come from the last billed run's recorded cost.
 */
export const BILLABLE_FLOOR_ESTIMATE = 0.005;

export type OverdraftEstimate = {
  estimated: number;
  remaining: number;
  billable: boolean;
};

/**
 * Honest client-side pre-spend estimate for the demo cap. Only model chat and
 * web-search nodes cost money (guardrails and code-exec are $0 on the
 * gateway), so a graph with no billable nodes can never overspend. The
 * estimate prefers the cost of the last billed run; without history it falls
 * back to a conservative single-call floor, clearly surfaced as an estimate.
 */
export function estimateOverdraft(
  nodes: WorkflowNode[],
  lastBilledCost: number,
  demoCap: number,
): OverdraftEstimate {
  const billable = nodes.some((n) => n.type === "chat" || n.type === "web-search");
  const fromHistory = billable ? lastBilledCost : 0;
  const estimated = billable ? Math.max(fromHistory, BILLABLE_FLOOR_ESTIMATE) : 0;
  return { estimated, remaining: demoCap, billable };
}
