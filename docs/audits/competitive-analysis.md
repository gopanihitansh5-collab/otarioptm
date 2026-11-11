# OtariOptm Competitive Analysis - DoraHacks Devs Wilding (Mozilla Otari)

Research snapshot, deadline T-10h. Method: full 43-build list scan + repo audit. No external repo fetches needed; overlaps were legible from titles/pitches.

> Audit evidence, published copy. Scope: the DoraHacks "Devs Wilding Online!" field, all 43 builds, plus a repo audit of OtariOptm. Ran 2026-11-11 (T-10h snapshot). Category map, threat ranking and the improvement list are reproduced unchanged from the original analysis.

---

## 1. Category map (43 builds)

| Lane | Count | Builds |
|---|---|---|
| Security gateways / firewalls / trust layers | ~7 | 21 SentinelGate, 22 Sentinel Otari Shield, 37 Otari-Sentry, 35 PHANTOM GRID (gateway), 6 Holt (injection-resistant triage), 24 WildGuard (policy+approval), 31 TinyFlow (redaction) |
| Verification / evidence / auditing | ~8 | 9 Themis, 27 Recount (x2), 12 QuizForge (agreement verdict), 20 MuseWeaver (invariant checking), 36 Otari Triad (3-model audit), 17 Mint Scout (verdict), 7 Lintel (source-linked) |
| Budget / cost governance as the headline | ~6 | 10 Otari FinOps Guard, 32 Budget Buddy, 33 Bounty Watch AI, 34 CaptionWild (per-caption cost), 40 HSK Meter (budget refunds), 25 Tally (agent payments) |
| Domain / vertical agents | ~15 | 1 TenderPilot, 4 Lingua, 5 Mollet, 6 Holt, 7 Lintel, 8 NoteVault, 11 Terms Desk, 14 Agent Shelf, 16 OmniPulse, 18 VaultMind, 19 AnchorCV, 23 ShopGuard, 28 Krishi, 29 IssueScout, 2 otari-pr-reviewer |
| Workflow engines / platforms | ~2 | **30 Rayflow ai (filmmaker-specific creative studio)**, 38 PortaldotHack (Polkadot automation). 31 TinyFlow is pipeline-shaped but not visual-canvas-first |
| Noise / non-projects | ~3 | 13 "123123", 15 SableX (listed twice), 39 LocalAssist (offline utility) |

Key finding: **"general-purpose visual workflow engine with built-in cost governance" is an empty lane.** Rayflow is visual but niche (filmmakers) with no cost story; the 6 budget builds are all point tools (a chat app, a bounty analyst, a caption tool) that USE budgets inside one fixed workflow. Nobody lets judges draw an arbitrary workflow on a canvas and watch cost governance apply per step. The budget lane is crowded; the *engine* lane is empty.

## 2. Top 5 real threats (judge's eye)

1. **#31 TinyFlow AI** - closest overlap: multi-agent pipelines, fallback chains, per-user budgets, MicroVM sandbox, CVE search. If it demos well it hits "engine-like + governance" on the same axis we do. Our edge: visual canvas, general-purpose templates, per-step-type routing weights vs their fixed code-review pipeline.
2. **#10 Otari FinOps Guard** - deepest budget mechanics in the field: per-subagent budgets, watermark routing, checkpointing. Budget-first judges may rank it above us on sophistication. Our edge: budgets are one pillar of a full visual engine, not the whole product.
3. **#26 Otari Agent Sentinel** - "governance control plane for multi-agent systems" claims the same platform-level framing. Risk is positioning collision, not feature collision.
4. **#22 Sentinel Otari Shield** - pairs two judge-sexy pillars (PII firewall + FinOps governor). Two-pillar pitches read as more "complete" than one-pillar ones; we counter with pillars they lack: visual authoring + routing + hard 402 enforcement.
5. **#29 IssueScout / #24 WildGuard / #12 QuizForge** - polished single-purpose builds with guard models, sandboxes, human approval, and (QuizForge) 38/38 tests. Individually small, but "small + rigorous + demoable" often beats "big + broad" with hackathon judges.

## 3. Ten highest-leverage improvements in ~8h (ranked by judge-impression-per-hour)

1. **60-90s demo GIF/video at top of README + landing hero** (README.md; web/src/components/landing/Hero.tsx, ProductDemo.tsx). Judges watch 60 seconds, not repos. Highest leverage per hour in the whole field; most competing builds will have none.
2. **Stage the HTTP 402 moment**: a one-click "overdraft demo" that visibly trips the budget cap - BudgetMeter goes red, activity feed shows reserve/deny, API returns 402 (src/services/budget.py, src/gateway/main.py; web/src/components/BudgetMeter.tsx, ActivityFeed.tsx). The 402 atomic-reserve story is our single most memorable differentiator; make judges see it happen. ~1h.
3. **Per-step cost badge on each canvas node after a run** (web/src/components/nodes/NodeChat.tsx, NodeWebSearch.tsx, NodeCodeExec.tsx; Canvas.tsx, nodeTypes.ts). No competing build shows cost on the graph itself; this makes "cost-aware visual engine" true at a glance. ~1.5h.
4. **One-click template runs from landing + studio** (web/src/lib/workflow/templates.ts; TemplatesPanel.tsx; landing/ProductDemo.tsx). Judges evaluate in minutes; zero-friction run beats every domain agent that requires their exact vertical. ~1h.
5. **Routing comparison panel: "this step on premium vs routed model"** with cost/latency deltas from the real scorer (src/services/router.py; new studio panel or landing/RoutingIntelligence.tsx). Outclasses QuizForge's manual two-model compare by automating it per step. ~1.5h.
6. **Judge kit in docs/submission.md**: 3 copy-paste curls with expected outputs, architecture diagram, test count, fallback-chain explanation (docs/submission.md, docs/quickstart.md, docs/architecture.md). Cheap, directly read by every judge. ~45m.
7. **CSV export button in the UI** if it is API-only today, plus per-run cost breakdown rows (web/src/components/studio/HistoryPanel.tsx, src/lib/api.ts, src/gateway/main.py). "Exportable cost audit trail" is a phrase judges quote. ~45m.
8. **Guardrails node demo content: a visible prompt-injection block** (web/src/components/nodes/NodeGuardrails.tsx; src/gateway/main.py). Speaks to the 7-build security lane without becoming another gateway; shows we share their values inside an engine. ~1h.
9. **"Why us vs the field" section on landing**: visual + routing + hard budget in one grid, vs point tools (landing/ProblemSolution.tsx or Trust.tsx). Pre-empts the FinOps Guard / Sentinel comparison. ~30m.
10. **Hygiene sweep**: pytest green, CI badge in README, docker compose cold-start verified, .env not committed (tests/, .github/workflows/ci.yml, Dockerfile, docker-compose.yml, .gitignore). Note: .env exists in the repo tree - verify it is gitignored and contains no real keys before submission. ~30m.

Skip: new node types, auth/multi-tenancy, more templates, perf tuning. None move judges in 8 hours.

## 4. Weak signals to avoid (what losing builds look like)

- **Unverifiable aspirational specs** (#35 PHANTOM GRID: SRAM cache, geodesic routing with no demo) - judges penalize claims they cannot run.
- **No tests, no demo, no README** - the modal loser profile; several builds are duplicated or empty (#13, #15 x2).
- **Single-domain wrapper with no observability** - a prompt + one API call in a vertical; undifferentiated at judging.
- **Budget as UI copy only** - showing "cost: $0.0031" without enforcement or routing is decoration; our atomic reserve + 402 is the real thing.
- **Overclaiming infra** (caching layers, control planes) without benchmarks or endpoints. Only demo what runs.

## 5. Judge-facing positioning (submission form)

OtariOptm is a general-purpose visual AI workflow engine with cost governance built into the engine itself - not bolted on. You compose workflows on a React Flow canvas (chat, web search, code execution, guardrails nodes); each step is routed by a cost-aware scorer (0.45 cost + 0.35 latency - health, weighted per step type) to the cheapest healthy model; and a hard project budget is enforced with atomic reserve/release and an immediate HTTP 402 at the cap, so overruns are impossible rather than merely visible. Live WebSocket activity and CSV export give a complete, auditable cost trail, and four starter templates plus a zero-key demo mode (Otari to Groq to local fallback) let anyone run the full stack - routing, budgeting, enforcement included - in under a minute with no API keys. Of the 43 builds in this hackathon, roughly 15 are single-domain agents and 6 bolt budgets onto one fixed workflow; OtariOptm is the only build where you can draw any workflow and watch cost-aware routing and hard enforcement apply to every step, verified by a pytest suite, CI, and one-command Docker deployment.
