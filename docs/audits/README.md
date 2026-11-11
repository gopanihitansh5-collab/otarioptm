# Audit evidence

Four read-only audits were run against OtariOptm on 2026-11-11, the same day
the hackathon submission was prepared. They are published here verbatim so a
judge can read the original findings, the severity counts and the reasoning
without taking the word of the README.

Each file carries a one-line header stating what it covered and when it ran.
Nothing inside an audit was rewritten: the findings, counts and recommended
fixes are the original text.

The audits are point-in-time snapshots taken before the fixes landed, so the
file and line references inside them describe the code as it was on
2026-11-11. Some paths they cite have since moved or been removed (for
example `src/services/groq_fallback.py`, which was dead code and was deleted
as part of the fix pass). Read a path in an audit as "this was here on
2026-11-11", not as a link to the current tree.

| Audit | File | Scope |
|---|---|---|
| Backend | [audit-backend.md](audit-backend.md) | The FastAPI gateway (`src/gateway/**`), its services, the config files, the test suite, `run_server.py`, `Dockerfile`, `docker-compose.yml` and CI |
| Frontend | [audit-frontend.md](audit-frontend.md) | Every file under `web/src/**` plus `MASTER.md` and `.bunshin/PRODUCT.md` as the design and honesty contract |
| Integration | [audit-integration.md](audit-integration.md) | Cross-verify between the gateway, the web app, the docs, the config, CI and Docker: 36 rows, each verified against code and not against docs |
| Competitive | [competitive-analysis.md](competitive-analysis.md) | The DoraHacks "Devs Wilding Online!" field: all 43 builds, plus a repo audit of OtariOptm |

## Headline numbers

Backend audit severity tally:

| Severity | Count |
|---|---|
| critical | 4 |
| major | 18 |
| minor | 22 |
| test-gap findings | 12 (plus 5 fake or misleading tests) |
| dead-code findings | 7 |

Frontend audit severity summary:

| Severity | Count |
|---|---|
| Critical | 6 |
| Major | 20 |
| Minor | 25 |
| Total | 51 |

Integration audit status tally across its 36 rows:

| Status | Count |
|---|---|
| BROKEN (the contract actually fails at runtime) | 10 |
| DRIFT (both sides work but disagree, or the doc lies) | 17 |
| OK (verified aligned) | 8 |

Competitive analysis: 43 builds scanned, mapped into 6 lanes. The audit's
headline conclusion is that "general-purpose visual workflow engine with
built-in cost governance" was an empty lane: roughly 15 of the builds are
single-domain agents, about 6 bolt a budget onto one fixed workflow, and only
2 are workflow-shaped at all. It also names the 5 real competitive threats and
ranks 10 improvements by judge impact per hour.

## Fix outcomes

The findings above were fixed in the same session. The fix categories:

- **Code-execution sandbox.** AST validation before `exec`, imports refused,
  dunder attribute access refused, interpreter-internal builtins refused by
  name, 5 second timeout enforced, non-root container user.
- **Budget settlement.** Reservations are settled exactly once: `record`
  charges and closes, `release` closes without charging, a failed step
  releases what it reserved, and a settled reservation is never charged
  twice.
- **Input size caps.** 100 nodes, 300 edges, 50 messages, 8000 characters per
  prompt, system or query, 8000 characters per code snippet, `max_tokens`
  clamped into 1..4096. Oversized payloads answer 400, not 500.
- **Cycle detection.** A cyclic graph is rejected with HTTP 400 naming the
  nodes involved, instead of silently producing a wrong execution order.
- **CORS.** The Vercel wildcard is an `allow_origin_regex`
  (`https://.*\.vercel\.app`), not a literal `*` inside a string, which
  Starlette matches exactly. Extra origins come from `ALLOWED_ORIGINS`.
- **Rate limiting.** Per-IP token bucket with a bounded IP table (10,000
  entries) so a flood of spoofed IPs cannot grow memory without limit.
- **Router correction.** Health is a reward, not a penalty. Health is
  normalized from any scale (0 to 1 used as-is, 1 to 5 divided by 5, 0 to 100
  divided by 100). Per-step weights are applied by mapping the node onto a
  step type before routing. Selection is budget aware: a candidate whose
  estimated per-call cost does not fit the remaining budget is skipped.
- **Frontend token pass.** Shared canvas node tokens in
  `web/src/components/nodes/theme.ts` replace per-component hex values on the
  four node cards; the budget meter and activity feed use the same palette as
  the landing page.
- **Studio logic fixes.** Run lock so a double click cannot fire two runs, a
  validated persisted snapshot with migration, and mobile drawers for the
  palette and inspector.
- **Docs truth.** `docs/api.md` rewritten against the live code, the missing
  routes added to `docs/architecture.md`, the landing page documented as
  shipped, and `config/config.yml` shipped as the live config file.
- **Deployment.** A Vercel multi-service `vercel.json` (gateway service +
  Next.js service, rewrite split, service binding) and a non-root gateway
  image that ships the live config.

Test coverage grew alongside the fixes: 75 pytest tests, and a CI workflow
with three jobs (backend, web, summary) that reads no secret.

The audits are evidence of what was found, not a claim that nothing is left.
The remaining honest limits are listed in `docs/STATUS.md` (section "Known
limits"), and the code-exec sandbox is explicitly still an MVP sandbox and
not a security boundary.
