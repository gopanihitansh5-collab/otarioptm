# OtariOptm Demo Pack

Reproducible demo scenarios for the deployed product and local stack.
Every scenario runs free against the demo tier (no provider keys) and is
validated against the real API. Nothing here fabricates provider responses,
savings, token counts, or latency.

- `scenarios/` - one YAML per scenario: purpose, inputs, config, expected
  results, steps, validation, cleanup. Statuses recorded in
  `reports/last-run.md` after each rehearsal.
- `fixtures/` - workflow JSON used by the scenarios (loadable in the studio
  import box).
- `scripts/` - API-level scenario drivers (curl-based, no secrets).
- `reports/`, `screenshots/` - evidence captured during rehearsals.

Honesty rule (applies to every scenario): if a feature is missing or
partial, the scenario says so and either demonstrates the real partial
behavior or is labeled planned. See docs/demo-gap-analysis.md.

| Scenario | File | Feature status |
| --- | --- | --- |
| A. Intelligent model routing | scenarios/intelligent-routing.yaml | Partial (demo tier in production) |
| B. Multi-step AI workflow | scenarios/workflow-execution.yaml | Verified |
| C. Budget limit enforcement | scenarios/budget-enforcement.yaml | Verified |
| D. Model failure and fallback | scenarios/model-fallback.yaml | Partial (config-driven, no live provider) |
| E. Real-time observability | scenarios/observability.yaml | Partial (poll on serverless, WS local) |
