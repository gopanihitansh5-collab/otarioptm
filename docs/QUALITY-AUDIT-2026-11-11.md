# Quality audit - 2026-11-11 (production c65a5b0+)

Itemized status of the OtariOptm public product against the anti-AI-slop
design brief and the functional requirements. Every row was verified on the
live deployment (https://otarioptm.vercel.app) with screenshots or direct
calls, or is explicitly marked code-verified / unverified. Test count: 130
backend tests green (was 115 before the sandbox hardening suite).

## Security

| # | Item | Status | Evidence |
|---|------|--------|----------|
| S1 | Code-exec sandbox escape (str.format attribute path, frame walks) | MITIGATED - node DISABLED publicly | Live refusal: POST /api/v1/workflow/run code-exec returns "code-exec unavailable: sandbox hardening in progress", status failed. Verified 16:39, 16:42, 16:44 IST |
| S2 | CPU/thread DoS via sandbox | MITIGATED - node DISABLED | Same refusal path; no execution happens |
| S3 | Isolation runner (fresh `python -I` interpreter, empty env, RLIMIT fail-closed, canary tests) | INTEGRATED BEHIND GATE (CODE_EXEC_DISABLED=True) | 130 tests green incl. canary/spawn-failure/frame-walk; NOT a re-enable candidate: child shares gateway UID/filesystem/network |
| S4 | Re-enable criterion | DOCUMENTED: genuine boundary required (separate container/user/filesystem); benign spawn smoke is NOT sufficient | docs/STATUS.md gate note; src/gateway/main.py kill-switch comment |
| S5 | Provider key handling | AUDITED (grep of logging/error paths): no key values printed or returned; key-shaped strings redacted by guardrail pattern | Trust card states audit scope, not blanket claim |

## Truthful labeling (copy)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| C1 | Code-exec unavailable before click | LIVE | Studio palette: amber TEMPORARILY UNAVAILABLE badge + disabled add button; templates with code-exec show warning + disabled "Load and run" |
| C2 | Trust card | LIVE | "Sandbox isolation / TEMPORARILY UNAVAILABLE" with reason and unaffected nodes |
| C3 | FAQ code-exec answer | LIVE | "Not right now... returns only behind a genuine isolation boundary" |
| C4 | Gateway badge | LIVE | "Otari connected" (was "Otari live") with tooltip: reachability/config, not answer proof |
| C5 | Demo tier honesty | LIVE | LOCAL DEMO chip reads "DETERMINISTIC DEMO" (was "GUARANTEED RESPONSE"); routing copy "Every run returns an output, labeled by tier" |
| C6 | Cost provenance | LIVE | Activity feed/CSV/UI label "provider-reported" vs "estimate" vs "free"; CSV header includes cost_source |
| C7 | Hero catalog figures | REMOVED | Box now lists model names only, titled "FALLBACK CATALOG - ILLUSTRATIVE" |
| C8 | Pricing per-user caps | FIXED 9b2e969 | Now "Per-project caps; per-user caps need a service key and are not built" |
| C9 | CTA universal claim | FIXED 9b2e969 | "let the gateway account for every token" replaced with per-run reporting wording |
| C10 | Routing disclaimer | FIXED 9b2e969 | No longer claims "real prices and measured performance"; names provider catalog vs labeled static fallback |
| C11 | Budget cap durability | LIVE | Trust card: in-memory per instance, no cross-instance guarantee, post-dispatch failures can be billed, spend labeled by source |

## Design / themes

| # | Item | Status | Evidence |
|---|------|--------|----------|
| D1 | Dark full-page pass | DONE (screenshots, all sections) | Hero, problem, demo, routing, budget, architecture, DX, BuiltDifferent, trust, use cases, pricing, FAQ, CTA, footer |
| D2 | Light full-page pass | DONE (screenshots, all sections) | Same sections in light theme |
| D3 | .panel dark-on-dark in light theme | FIXED 3c626e3 | Worked-example table rows invisible before; dark tokens scoped inside [data-theme=light] .panel; pixel-verified |
| D4 | 9px disclaimers steel-on-dark | FIXED c65a5b0 | Routing basis + budget defaults now silver; pixel-verified |
| D5 | Hero node-chip labels | FIXED 9b2e969 | fill #E9E4DA, fontSize 8 |
| D6 | FAQ-to-CTA whitespace | FIXED 9b2e969 | CTA top padding reduced |
| D7 | Section compositions distinct | VERIFIED | Split comparison, steps+panel, cards+worked-example, numbered process, layered diagram, tabs, comparison rows, grid, accordion - not repeated heading+3-cards |
| D8 | No gradient text / typewriter / purple-blue AI palette / em-dash copy | VERIFIED in copy sweep | - |

## Interactions (production, non-paid)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| I1 | Templates panel | WORKING | 4 templates from GET /api/v1/templates with provenance line |
| I2 | Run history panel | WORKING | Honest empty state "0 runs - stored in this browser" |
| I3 | Keyboard shortcuts modal | WORKING | Full list incl. Esc close, macOS note |
| I4 | Node select -> inspector | WORKING | Inspector shows node id, status, remove |
| I5 | Delete key / Undo button | WORKING | Node removed, restored |
| I6 | Export CSV | WORKING | Live CSV with cost_source column, totals row |
| I7 | Import | WORKING (tested 16:56 via injected file) | Valid export-shaped JSON loads onto canvas; invalid JSON shows "Import failed: File is not valid JSON." |
| I8 | Export JSON | CODE-VERIFIED | buildWorkflowExport serializes {app, version, nodes, edges}; blob download (headless cannot inspect the download) |
| I9 | Nav dropdown anchors | CODE-VERIFIED | All resolve to real section ids |
| I10 | Synthetic Ctrl+Z | INCONCLUSIVE | Synthetic keyboard events partly untrusted; Undo button path verified instead |

## Open functional requirements (gates, not polish)

| # | Item | Blocker |
|---|------|---------|
| G1 | Usable live model answer (Otari or Groq) end-to-end proof | Requires a chargeable provider call - prohibited. Groq free-plan confirmation pending from user; even then, a live run must be user-triggered, not agent-triggered |
| G2 | Durable cross-instance budget/activity ledger | Serverless in-memory state; needs a store decision (no authorized free resource exists) - user/main decision |
| G3 | Per-user budgets | Needs Otari service key - user decision |
| G4 | Code-exec re-enable | Needs genuine isolation boundary (container/user/filesystem separation); current public posture: unavailable |
| G5 | Demo video (3-5 min) | Screen recording + user's own voice, no AI voice; shot list in docs/VIDEO-SHOTLIST.md |
| G6 | Native window.confirm (Clear, template replace) | Works; a11y nit - replace with in-app modal when next touching studio UI |
| G7 | Mobile pass | Deferred by user instruction |

## Not applied (deliberately)

- Worker sandbox v3/v4 cumulative patches: superseded by direction - no more
  AST-hardening churn; their extras (process-group kill, additional tests)
  remain available groundwork behind the gate.
