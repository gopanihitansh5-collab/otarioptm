# Demo Gap Analysis

What a full product-demo story wants versus what the system actually does
today, with the demo strategy for each gap. The rule: never fabricate. Gaps
are labeled planned/simulated, never presented as real.

| Demo story element | Reality today | Demo strategy |
| --- | --- | --- |
| Sign-in / demo account | **Missing.** No authentication exists. | Skip sign-in; open the studio directly. Present multi-user auth as planned roadmap, not simulated. |
| Per-user budgets | **Missing** (config key reserved, not enforced). | Demonstrate the project-level budget only; describe per-user budgets as planned. |
| Per-project budgets | **Implemented.** Single default project budget. | This is the budget demo. "Per-project" naming on the dashboard refers to the one project scope that exists today. |
| Intelligent model routing (best model per task) | **Partial.** Deterministic policy routes task -> provider tier; with no provider keys it resolves to the demo tier. | Show the routing decision and its trace; state plainly that live provider routing needs OTARI_API_KEY / GROQ_API_KEY. |
| Budget enforcement (stop overspending workflows) | **Verified.** Reserve/settle with 402 overspend cap. | Core scenario C. Fully real. |
| Model failure and fallback | **Partial.** Chain exists (Otari -> Groq -> demo) and is unit-tested; production has no keys, so the "failure" path is simulated by configuration, not induced. | Demonstrate via config: run with no keys and show the labeled demo tier kick in. Do not claim a live provider failed. |
| Real-time observability | **Partial.** WebSocket live locally; serverless poll fallback labeled in `/api/v1/health`. | Local demo: WebSocket. Production demo: activity feed polling. Label each transport honestly. |
| Cost / token tracking | **Verified for demo tier** ($0.0000 demo runs recorded); provider-tier cost math is implemented but unverified without keys. | Show recorded runs; explain provider-tier numbers appear once keys are set. |
| Workflow history | **Partial.** In-memory; production resets per serverless instance. | Export CSV during the demo to show persistence-as-download; say durable storage is planned. |
| API integration (OpenAI-compatible gateway) | **Verified** shape (`/api/v1/chat/completions`); demo tier only in production. | Live `curl` in the runbook. |
| Savings claims | Never claim without provider-tier data. | Landing already avoids fake pricing. Keep it that way. |

## Not demoable, do not simulate

- Authentication, sign-in, accounts, sessions.
- API key generation or onboarding.
- Cross-instance durable state (budget carry-over, history) on the current deployment.
- Live third-party provider routing/fallback without configured keys.
