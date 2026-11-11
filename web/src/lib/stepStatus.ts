import type { StepResult } from "./types";

export function stepFailed(step: StepResult): boolean {
  return Boolean(step.error || step.blocked || step.status === "failed" || step.status === "blocked" || step.status === "skipped");
}
