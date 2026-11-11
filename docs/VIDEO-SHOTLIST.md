# Demo video shot list (3-5 min target)

Constraint: real screen recording of the production deployment, user's own
voiceover, no AI voice. No chargeable provider calls in any shot: model
steps must use the labeled demo tier or pre-recorded (user-run) footage.

1. (0:00-0:20) Landing hero: headline + routing trace; scroll through
   problem/solution. VO: what OtariOptm is, who it is for.
2. (0:20-0:50) Routing simulator section: candidate cards, worked-example
   table, fallback chain. VO: cost/latency/health scoring, honest labels.
3. (0:50-1:30) Studio: open a template (Research then summarize), inspect a
   node, show the budget meter ($5 cap) and empty activity feed.
4. (1:30-2:30) Run the workflow (demo tier or user-run live call if the user
   chooses): activity feed fills, per-node provider/tokens/cost with
   cost-source labels, budget meter decrements.
5. (2:30-3:00) Failure honesty: show a failed node carrying its explicit
   error note; show code-exec refusing with the unavailable message.
6. (3:00-3:30) Budget governance: overspend demo toggle, HTTP 402 refusal,
   CSV export with cost_source column.
7. (3:30-4:00) Trust & limits section: what is hardened, what is beta. VO:
   honest known limits (in-memory budgets, localStorage persistence).
8. (4:00-4:30) Close: Open Studio CTA, repo link, DoraHacks context.
