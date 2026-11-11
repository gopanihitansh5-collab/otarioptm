import type { StepResult } from "./types";

export function stepFailed(step: StepResult): boolean {
  return Boolean(["mismatch", "contradiction"].includes(step.consistency?.status ?? "") || step.error || step.blocked || step.status === "failed" || step.status === "blocked" || step.status === "skipped");
}
