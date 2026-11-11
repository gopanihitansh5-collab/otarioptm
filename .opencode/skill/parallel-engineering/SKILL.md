---
name: parallel-engineering
description: Use when a task has multiple independent workstreams and should be delegated to OpenCode specialist subagents, especially when background execution can let the parent continue working.
compatibility: opencode
---

# Parallel engineering workflow

1. Inspect the repo and current git status.
2. Define deliverables, acceptance criteria and dependencies.
3. Split work by domain and file ownership. Prefer independent read-only investigations first.
4. Launch independent specialists with the native subagent tool using `background: true`. Each prompt must be self-contained and specify scope, output, constraints and checks.
5. While children run, do parent-owned work that does not overlap their files.
6. Track child session IDs and status. Do not start duplicate work for an active assignment.
7. Collect all required results. Inspect changed files and diffs; do not trust a summary alone.
8. Resolve interface conflicts centrally. Never merge incompatible API assumptions without verification.
9. Run relevant tests, lint, typecheck, build and `git diff --check`.
10. Report results accurately, including failures and skipped checks.

## Background means

A background child session is an independent delegated task that returns control to the parent immediately and reports back when complete. It is not an indefinitely running daemon. If a task needs ongoing monitoring, design a separate explicit scheduled/worker mechanism and obtain approval before adding infrastructure.

## Safe parallelism

- One writer per file or tightly coupled component.
- Multiple agents may investigate the same area read-only.
- A reviewer should not edit the implementation it is reviewing.
- Keep API/schema ownership explicit.
- Never deploy or use paid external resources without approval.
