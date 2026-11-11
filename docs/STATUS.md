# OtariOptm status note (2026-11-11)

Hackathon: Mozilla Otari / DoraHacks "Devs Wilding Online!". Submission deadline
Nov 11, 2026, 22:29 IST. All remaining submission items are
human actions (see blockers below).

## Current state

GitHub:
- Repo live and public: https://github.com/gopanihitansh5-collab/otarioptm
- Branch renamed to `main` on 2026-11-11 and flipped to the repo default;
  keep pushing there (`1b94a06`).
- GitHub access tokens are used one-shot for pushes and are never stored in
  the repo, in `.git/config` or in memory. Provider keys are read from the
  environment only; never committed.

Landed and verified (backend, FastAPI on port 8000 via `python run_server.py`):
- Workflow engine: topological chat / web-search / code-exec / guardrails
  execution, `{{nodeId}}` substitution, activity hub, CSV export with a
  totals row.
- Budget manager: atomic reserve/record under an asyncio lock, default $5.00
  cap from `config/config.yml` `budget.project_cap`, HTTP 402 pre-spend
  block, Resend alert email on cap, and overage tracking when a charge has
  to be clamped to the remaining headroom.
- Router: score = `cost_w * cost_norm + lat_w * latency_norm + health_w *
  (health - 0.5)`, so health is a reward, with per-step weights (chat 0.45
  cost / 0.35 latency / 0.20 health, code 0.30 / 0.25 / 0.45, search 0.40 /
  0.45 / 0.15). The gateway maps a node onto a step type before routing
  (`code-exec` -> code, `web-search` -> search), so the per-step weights
  actually apply. Selection is budget aware: a candidate whose estimated
  per-call cost does not fit the remaining budget is skipped, and the free
  demo tier is used when no paid model is affordable. Demo tier excluded from
  routing when real providers exist. Fallback chain Otari -> Groq -> local
  demo, dynamic Groq catalogue via `/models`, max_tokens cap-retry,
  `fallback_note` diagnostics.
- Exa integration with a DuckDuckGo fallback and real cost recording.
- Vercel multi-service deployment config at the repo root (`vercel.json`):
  service `app` = the FastAPI gateway (root `.`, entrypoint `api/index.py`),
  service `web` = the Next.js frontend (root `web`); rewrites send
  `/api/(.*)` to `app` and `/(.*)` to `web`, and `web` declares a binding to
  `app` exposing `GATEWAY_INTERNAL_URL`. The frontend calls the gateway
  through same-origin relative `/api/v1/...` URLs, with
  `NEXT_PUBLIC_GATEWAY_URL` as the local-dev override. See
  `docs/quickstart.md` ("Deploy on Vercel") and `docs/architecture.md`
  ("Deployment topology (Vercel services)").

Gateway v2 surface (this is what `docs/api.md` now documents):
- `POST /api/v1/chat/completions/stream`: Server-Sent Events with named
  events `delta`, `done` and `error`, plus a `: heartbeat` comment every 15
  seconds of idle. There is no OpenAI-style `choices` chunk format.
- `GET /api/v1/templates` and `GET /api/v1/templates/{template_id}`: four runnable
  starters (`research-then-summarize`, `guarded-chat`, `code-review`,
  `web-fact-check`), each with a full `{nodes, edges}` graph.
- Per-IP plus per-instance global token-bucket rate limiting on `POST` /
  `PUT` / `PATCH` / `DELETE` under `/api/v1/`, HTTP 429 with a `Retry-After`
  header; every `GET` route (including `/api/v1/health`) is exempt.
- Background model-health probes behind a 60 second TTL cache, stamped onto
  every catalog model as `health_probe {value, source, ts}`. The source is
  labeled `catalog` with a live provider and `synthetic-demo` without one.
- `create_app()` app factory (`src/gateway/main.py:1263`) wiring middleware,
  startup/shutdown and every route in one place.
- `config/config.yml` is now the live config file and ships in the image;
  `config/example.yml` remains the template.

Security and correctness hardening pass:
- CORS: the Vercel wildcard is now an `allow_origin_regex`
  (`https://.*\.vercel\.app`) instead of a literal `*` inside a string,
  which Starlette matches exactly. Extra origins come from
  `ALLOWED_ORIGINS`.
- Code execution sandbox: untrusted code runs ONLY in a freshly spawned
  interpreter (`python -I sandbox_runner.py`) with an empty environment -
  never forked, never in-process - so no server memory, module globals or
  env keys exist in the child at all. Inside the child: AST validation
  (imports refused, dunder access refused except a tiny allowlist,
  interpreter-internals builtins refused by name, frame/object-model
  attributes like `gi_frame`/`cr_frame`/`f_globals` refused, `str.format` /
  `format_map` attribute paths refused), a minimal builtins set, and hard
  RLIMIT_CPU / RLIMIT_AS limits (the child refuses to run if either limit
  cannot be applied); the parent enforces a wall-clock kill.
  Fail closed: if the isolated process cannot start or dies without a
  well-formed result, the step fails with an explanatory error - there is
  no in-process fallback. Non-root container user.
  **Gate:** the code-exec node stays REFUSED (CODE_EXEC_DISABLED) until
  untrusted execution runs behind a genuine isolation boundary (separate
  container/user, no shared filesystem or network). The isolated-runner
  mitigation does not stop same-UID filesystem/network escapes, so a benign
  spawn smoke test is NOT a re-enable criterion. All other workflow nodes
  stay public.
- Budget reservations are settled exactly once: `record` charges and closes,
  `release` closes without charging, and a failed step releases what it
  reserved.
- Inbound payload caps answer 400 instead of 500: 100 nodes, 300 edges, 50
  messages, 8000 characters per prompt or system or query, 8000 characters
  per code snippet, `max_tokens` clamped into 1..4096.
- Cycle detection in the topological sort: a graph with a cycle is rejected
  with HTTP 400 naming the nodes involved, instead of producing a silently
  wrong execution order.
- Rate limiter with a bounded IP table (10,000 entries) so a flood of
  spoofed IPs cannot grow memory without limit.

Frontend token pass:
- Shared canvas node tokens live in `web/src/components/nodes/theme.ts`
  (accent, fail, surface, status chips, status dots, per-type top rule),
  taken from `MASTER.md` and applied to the four node cards, so the node
  chrome no longer hardcodes hex values per component.
- Run status is rendered as a chip plus a dot on every node, so a judge can
  see which step ran, was skipped or failed without opening the sidebar.

Studio logic fixes:
- Run lock: a ref-based lock (`web/src/app/studio/page.tsx`) makes a second
  Run Workflow click while a run is in flight a no-op, so a double click
  cannot fire two runs and double-spend the budget.
- Persisted workflow snapshot is validated on load with the shared validator
  (`web/src/lib/workflow/snapshot.ts`) and migrated when the shape changed;
  a corrupt or unknown snapshot is discarded instead of crashing the studio.
- Mobile path: below the `md` breakpoint the palette and the inspector move
  into drawers (`web/src/components/studio/MobileDrawer.tsx`), so the studio
  is usable on a phone.

Web (Next.js 16.4.5, React 19.3, Tailwind 4.3.5, @xyflow/react 12.12.1,
port 3000): `/studio` React Flow editor (custom nodes, undo/redo, keyboard
shortcuts, localStorage persistence `otarioptm.workflow.v1`, live WS
activity sidebar, budget meter, CSV export), a templates gallery that loads
the gateway templates and falls back to a local copy, run history (last 20
runs in localStorage `otarioptm.runs.v1`), workflow JSON export/import with
validation, and a clearly labeled local overspend demo for the HTTP 402
moment. Landing page shipped at `/` (`web/src/app/page.tsx` plus the
components under `web/src/components/landing/`). `MASTER.md` at repo root is
the design-system source of truth.

Tests and CI:
- 75 pytest tests in `tests/` (budget, router, API, gateway features), all
  passing when last run locally on 2026-11-11.
- GitHub Actions CI (`.github/workflows/ci.yml`) with three jobs: `backend`
  (config truth check against `DEFAULT_CONFIG`, then `pytest` with a
  post-mortem step and a failure artifact), `web` (`npm ci`, `tsc --noEmit`,
  `npm run lint`, `npm run build`) and `summary` (always runs, needs
  backend and web, fails the workflow if either failed). No job reads a
  secret, so CI passes on a clean checkout with no API keys.

Audits:
- Four read-only audits were run against the repo on 2026-11-11 and their
  evidence is published under `docs/audits/`: backend, frontend,
  integration cross-verify and competitive analysis. See
  `docs/audits/README.md` for the index and the headline numbers.

Docker:
- `Dockerfile` (gateway) and `web/Dockerfile` (frontend), plus
  `docker-compose.yml`. The gateway image runs as the non-root `appuser`
  user and ships `config/config.yml`; `OTARIOPTM_CONFIG` points at
  `/app/config/config.yml` in the container. `NEXT_PUBLIC_GATEWAY_URL` is
  passed as a build arg because Next.js inlines `NEXT_PUBLIC_*` at build
  time. `.dockerignore` excludes `.env`, `.git`, `.github` and `.bunshin`.
- Statically validated plus a clean-room proxy run (fresh venv boots the
  gateway in demo mode; fresh `npm ci` + build passes); no container runtime
  exists in this environment, so images were not actually built here.

Secrets:
- In `.env` (gitignored, verified): OTARI_API_KEY, EXA_API_KEY,
  RESEND_API_KEY, GROQ_API_KEY, BUDGET_ALERT_EMAIL. Never printed or
  committed. `.env.example` documents every key as optional.

## Submission blockers (owner: human, all of them)

- [ ] Demo video, rubric 3-5 min (script in `docs/submission.md`, target
      4:00, includes the templates gallery beat and the 402 block); record,
      upload to YouTube/Loom, paste link into the form.
- [ ] Feedback recording (talking-head or narrated screen capture).
- [ ] Open 1-2 issues/PRs on https://github.com/mozilla-ai/otari (drafts
      ready in `docs/submission.md`; review, then post yourself).
- [ ] Submit the DoraHacks form before Nov 11, 22:29 IST (paste-ready
      template plus a 4 command judge kit in `docs/submission.md`).

## Docs sync (2026-11-11)

- `docs/api.md` rewritten against the live code: the SSE section now
  documents the real named-event contract (`delta`, `done`, `error`, 15s
  heartbeat) with a `curl -N` example, the templates section lists the four
  real ids with their full `graph`, the `web-search` node documents both
  `query` and `objective`, and there is now a status-code table with every
  size cap and its constant, plus the activity event list and the WebSocket
  `pong` frame.
- `docs/architecture.md`: added the three missing routes (SSE stream and the
  two templates routes), the `create_app()` factory, the rate-limit
  middleware, the 60s health-probe TTL cache, the real routing formula with
  its per-step weights, and the landing page is described as shipped rather
  than in progress.
- `docs/features.md`: added the new features (SSE streaming, starter
  templates and the studio gallery, run history, workflow JSON
  export/import, rate limiting, health probes, the 402 overdraft demo
  control) and corrected the routing description to the real formula.
- `docs/quickstart.md`: `config/config.yml` is now documented as the live
  config file with the one-level-deep merge rule, all `.env` keys are
  documented as optional, and the templates gallery, history, JSON
  export/import and overspend demo are described.
- `docs/submission.md`: paste-ready form template kept, demo script retimed
  to 4:00 with an explicit templates gallery beat and an explicit 402 beat,
  and a judge kit with 4 copy-paste commands (health, models, templates, a
  workflow run).
- `docs/STATUS.md`: refreshed to the state above.
- `docs/quickstart.md`: added a "Deploy on Vercel" section (the two
  services, the rewrite table, the service binding, the environment
  variables to set in the Vercel project, `vercel dev` for local
  multi-service testing, and the WebSocket caveat).
- `docs/architecture.md`: added a "Deployment topology (Vercel services)"
  subsection with the two services, the rewrite split, the binding and a
  pointer to the WebSocket caveat.
- `docs/audits/`: the four read-only audits (backend, frontend,
  integration cross-verify, competitive analysis) published with a
  `README.md` index carrying the headline numbers and the fix categories.
- `docs/phase-2-core-nodes-routing.md` and
  `docs/phase-3-optimization-polish.md`: banner at the top marking them as
  historical planning documents, not the current API. The live contract is
  `docs/api.md`.
- `docs/mvp-feature-plan.md`: the landing page is now marked as shipped, not
  in progress.
- House style: no em dash (U+2014) anywhere in `docs/**`; no dangling
  placeholder anchors.

## Known limits

- Otari 402 on the hosted gateway reads "No credential is configured for
  provider 'openai'": fine for the demo narrative (the fallback chain
  shines), but re-check before recording the demo video.
- Budget state is in-process; it resets on gateway restart (documented
  MVP limitation).
- Code exec sandbox is process-isolated (fresh empty-environment
  interpreter per run, OS resource limits, fail-closed) but still not a
  hardened multi-tenant boundary: no syscall filtering, no network
  namespace, no cgroup accounting. Suitable for a public demo; not for
  mutually hostile workloads.
- The SSE endpoint has no frontend consumer yet: there is no `EventSource`
  anywhere in `web/src` (grep: 0 hits). It is a real, tested API, but the
  studio does not read it.
- On a Vercel deploy the live activity socket may not connect: Vercel's
  Python runtime does not support WebSocket upgrades. The REST API and the
  SSE stream still work; the studio shows its honest offline card instead of
  the live feed. Run the gateway locally or in Docker for the live feed.
- With `NEXT_PUBLIC_GATEWAY_URL` left empty (the production setting), the
  landing page's live-status poll (`web/src/lib/landing/Reveal.tsx`) falls
  back to `http://localhost:8000`, so on a Vercel deploy the landing hero
  shows its honest "GATEWAY OFFLINE" badge instead of live numbers. The
  studio client (`web/src/lib/api.ts`) does use the same-origin path and is
  unaffected.
- Health probes are synthetic in demo mode and say so
  (`health_probe.source = "synthetic-demo"`).
- `config/config.yml` carries four sections the code does not read yet
  (`otari.base_url`, `otari.auth_token`, `models.*`, `budget.per_user`,
  `profiles.*`). The file says so inline; they document intent, they are
  not wired.
- No container runtime in this environment: Docker images were never built
  here, only statically validated plus a clean-room proxy run.
- Registry stubs in this environment: @next/swc-win32-x64-msvc binary
  corrupt (webpack only), @tailwindcss/postcss vendored manually.
- Optional future: Framer Motion if ever wanted (not installed, by design).

## Earlier sessions (history)

### 2026-11-11 hardening, audit and deployment pass

- Security and correctness hardening landed: process-isolated code exec
  (fresh spawned interpreter with an empty environment, AST validation,
  minimal builtins, RLIMIT_CPU/RLIMIT_AS, wall-clock kill, fail-closed on
  spawn or limit failure, non-root container user), budget
  exactly-once settlement, inbound input size caps that answer 400 instead
  of 500, cycle detection in the topological sort, the CORS origin regex and
  the bounded per-IP rate limiter.
- The router was corrected: health is a reward, health is normalized from
  any scale, per-step weights are applied by mapping the node onto a step
  type before routing, and selection is budget aware.
- Frontend token pass plus studio logic fixes: shared node tokens, a run
  lock, a validated persisted snapshot with migration, and mobile drawers.
- 75 pytest tests, a 3-job CI workflow, Docker hardening, and
  `config/config.yml` shipped as the live config.
- Four read-only audits (backend, frontend, integration, competitive) were
  run and published under `docs/audits/` with a `README.md` index.
- A Vercel multi-service `vercel.json` was added at the repo root and
  documented in `docs/quickstart.md` and `docs/architecture.md`.

### 2026-11-11 gateway v2 and studio v2

- Gateway v2 landed: SSE streaming, the templates gallery endpoints, per-IP
  rate limiting, the background health-probe cache, the `create_app()`
  factory, the payload caps and the sandbox hardening described above.
- Studio v2 landed: templates gallery with a local fallback, run history,
  workflow JSON export/import, the node status chips and the overspend demo.
- CI hardened with the config truth check, the pytest post-mortem step and
  the summary job.

### 2026-11-10 evening pass (pre-submission completion)

- Regenerated `web/package-lock.json`: the committed lockfile carried a
  corrupt nested entry (`eslint-plugin-react-hooks/node_modules/zod` with no
  version) that broke fresh `npm install` / `npm ci`. Fresh install and
  `npm run build` (exit 0) verified after regeneration.
- Em-dash sweep: zero U+2014 in `web/src`; the earlier build-output flag is
  resolved in source.
- Added `Dockerfile` + `.dockerignore` + `docker-compose.yml` (gateway) and
  `web/Dockerfile` + `web/.dockerignore` (frontend). Statically validated
  only: no Docker daemon in this environment, so images were not built here.
- Added `docs/api.md` endpoint reference, verified against
  `src/gateway/main.py`; README quickstart made cross-platform, Docker
  section added; Apache 2.0 `LICENSE` file added; `.env.example`
  Resend/BUDGET_ALERT_EMAIL comments corrected to match the wired alert path.
- Landing page audited against the design brief checklist: all 14 sections
  present; desktop 1440px and mobile 390px screenshots inspected. Deliberate
  deviation: studio keeps its indigo node-identity accents instead of the
  landing's lime system.
- End-to-end re-verified: backend health/budget/models, demo-mode workflow
  run with `{{nodeId}}` substitution, landing 200, studio 200.
- Studio UX fix: newly added nodes cascaded at 30px offsets and stacked under
  each other; they now place on a 560x300 grid so every added node is visible.
  Verified in a real browser run (positions 80/640 grid, run completes,
  activity feed + budget meter live).
- Lint cleanup: all 16 errors and 2 warnings resolved. `npm run lint` reports
  0 problems and the production build passes; landing and studio re-verified
  in a real browser after the refactor.

### Session 2 (2026-11-10, evening)

- Studio fit-view: the one-time `fitView` over-zoomed to 2.5x after the
  first node add, pushing nodes offscreen. Now refits on node-count change
  with `maxZoom: 1.1`; complete 4-node workflow readable at 1440x900,
  browser-verified.
- Studio persistence bug: `useWorkflowState` read localStorage in the lazy
  `useState` initializer, so SSR rendered an empty canvas and React kept
  the SSR `disabled` attribute on Run Workflow after hydration - a real
  production bug. Fixed by hydrating from localStorage in an effect.
- Landing nav rebuilt per the brief: Product/Solutions/Developers hover +
  focus dropdowns, flat Pricing link, disabled Sign-in per the brief's
  disabled-button spec; `#use-cases` anchor added.
- `/privacy` and `/terms` pages (marked draft pending owner review) with
  content verified against the implementation (localStorage-only studio
  persistence, in-memory gateway activity, env-only keys, web-search
  node's keyless DuckDuckGo traffic disclosed); footer gained Legal and
  Developers link columns.
- Gateway test suite in `tests/`, all passing; `requirements-dev.txt` added.
- GitHub Actions CI (`.github/workflows/ci.yml`): gateway pytest job and
  web lint+build job, green on every push including the latest commit.
- Hero centerpiece: React Three Fiber routing sphere - wireframe engine
  sphere, labeled provider nodes in orbit (QWEN / GPT-4O-MINI / CLAUDE),
  lime pulse traveling ingress -> engine -> selected provider on a 6s
  loop, 4-stage request indicator synced to it. three.js is code-split
  via `next/dynamic`; dpr capped, low-power GL, deterministic seeded
  particle field. Fallbacks browser-verified: reduced-motion, no WebGL,
  or viewport <768px all keep the static SVG trace.
- Honest status badges: hero and observability now distinguish DEMO TIER
  (gateway up, no provider keys) from LIVE (otari/groq configured),
  reading `/api/v1/health`.
- Clean-room Docker proxy (no container runtime available anywhere in
  scope, so images remain unbuilt): from a pristine `git archive` copy,
  fresh venv + `pip install -r requirements.txt` boots the gateway and
  serves health/workflow/export in demo mode; fresh `npm ci` from the
  regenerated lockfile (388 packages) + `npm run build` passes. This
  exercises each Dockerfile's build steps short of the daemon.

Still outstanding from those sessions: live-provider verification (awaiting
key scope approval), actual `docker build`/`docker compose up` (no Docker
runtime available in the build environment).

---

## 2026-11-11 - Pre-deploy state map (verified same day)

Verified against main @ 8dae360 by the integration lane on 2026-11-11 IST:

Done and tested:
- Backend: 87/87 pytest pass; gateway boots on port 8000; all 4 starter
  templates run end-to-end in demo mode (including real DuckDuckGo search in
  the web-search node); SSE stream works; rate limit returns 429 after burst;
  CSV export works; /api/v1/health, /models, /templates, /budget all 200.
- Frontend: npm ci clean; lint clean; production build clean.
- Landing page: all 14 checklist sections implemented per MASTER.md (the
  graphite/lime/cyan infrastructure brief); studio templates panel loads live
  from the gateway; load-and-run works with an explicit "Demo mode" state.
- CI green on latest commit.

Known gaps / in flight (do not claim as done):
- Vercel: multi-service deploy (FastAPI via api/index.py + Next.js web/) is
  being validated; the Python entrypoint on Vercel's runtime is not yet
  confirmed.
- /api/v1/activity: the WebSocket transport does not fit Vercel serverless.
  The deployed activity feed uses the existing GET /api/v1/activity snapshot
  polling path instead (backend branch feat/backend-hardening72e0c8d adds
  truthful runtime/activity transport metadata; 91 backend tests pass there).
- Budgets and activity are held in memory, so on serverless they are
  per-invocation, not durable shared state: the hosted deployment does not
  provide durable cross-invocation budget enforcement or activity history.
  Local/self-hosted runs keep full in-process enforcement.
- Live-provider verification still awaits provider key scope approval; demo
  mode is the honest default.
- docker build / docker compose up remain unrun (no container runtime in the
  build environment).
- The hackathon-2026-nov branch no longer exists on the remote; main @
  8dae360 is the base of record. Active work sits on short-lived feature
  branches (integration, backend hardening, docs) merged back via the
  integration lane.

README architecture diagram is now a pre-rendered SVG (brand/architecture.svg,
portrait, brand palette) so it renders on GitHub mobile where Mermaid code
blocks show as raw text; the Mermaid source is kept in docs/assets/architecture.mmd
and in a details block under the diagram.
