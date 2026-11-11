import type { StepResult } from "./types";

export function costLabel(step: Pick<StepResult, "cost" | "costSource">): string {
  if (step.costSource === "catalog-zero") return "catalog $0 (actual charge unverified)";
  return step.cost === undefined ? "cost not reported" : `$${step.cost.toFixed(6)} (${step.costSource || "source not reported"})`;
}
