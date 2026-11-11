import type { StepResult } from "./types";

export function stepFailed(step: StepResult): boolean {
  return Boolean(step.consistency?.status === "mismatch" || step.error || step.blocked || step.status === "failed" || step.status === "blocked" || step.status === "skipped");
}
