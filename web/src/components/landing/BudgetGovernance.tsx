"use client";

import {
  Reveal,
  CountUp,
  useLiveGuard,
  GATEWAY_BASE,
} from "../../lib/landing/Reveal";

const CHAIN = [
  {
    step: "REQUEST",
    body: "Workflow node asks the router for a model call.",
  },
  {
    step: "RESERVE",
    body: "Estimated cost is reserved atomically against the project cap before any provider call.",
  },
  {
    step: "ROUTE",
    body: "Scored selection across Otari, Groq and the local demo tier.",
  },
  {
    step: "RECORD",
    body: "Actual spend replaces the estimate, latency and tokens are logged to the activity feed.",
  },
  {
    step: "BLOCK OR ALERT",
    body: "Over-budget calls return HTTP 402 before a token is spent, and an alert email leaves via Resend.",
  },
];

export default function BudgetGovernance() {
  const live = useLiveGuard();

  return (
    <section id="budget" className="scroll-mt-24 border-y border-[#34322D] bg-[#171715]">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div>
            <Reveal>
              <p className="font-mono text-[10px] tracking-[0.25em] text-[#B8A98F]">
                BUDGET GOVERNANCE
              </p>
              <h2 className="mt-3 text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[#E9E4DA]">
                Every token accounted for before it is spent.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#A6A197]">
                A project cap sits in front of every model call. The gateway
                reserves the estimated cost, commits actual spend after the
                response, and refuses the call outright when the reservation no
                longer fits. There is no invoice surprise because nothing bills
                outside the reservation.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className="mt-8 space-y-3">
                {CHAIN.map((c, i) => (
                  <div
                    key={c.step}
                    className="flex items-start gap-4 rounded-xl border border-[#34322D] bg-[#111110] p-4"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#B8A98F]/40 font-mono text-[10px] text-[#B8A98F]">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.2em] text-[#B8A98F]">
                        {c.step}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-[#A6A197]">
                        {c.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <div className="space-y-4">
            <Reveal delay={80}>
              <div className="panel !transform-none p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-[#A6A197]">
                    BUDGET SNAPSHOT
                  </p>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded border px-2 py-0.5 font-mono text-[9px] tracking-widest ${
                        live.status === "live"
                          ? "border-[#B8A98F]/50 text-[#B8A98F]"
                          : live.status === "offline"
                            ? "border-[#C68179]/50 text-[#C68179]"
                            : "border-[#34322D] text-[#A6A197]"
                      }`}
                    >
                      {live.status === "live"
                        ? live.liveProviders
                          ? "GATEWAY LIVE"
                          : "GATEWAY LIVE - DEMO TIER"
                        : live.status === "offline"
                          ? "GATEWAY OFFLINE"
                          : "CONNECTING"}
                    </span>
                    <a
                      href={`${GATEWAY_BASE}/api/v1/budget`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[9px] tracking-widest text-[#A6A197] transition-colors duration-200 hover:text-[#B8A98F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8A98F]/50"
                    >
                      /api/v1/budget ↗
                    </a>
                  </div>
                </div>

                {live.budget ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    {[
                      {
                        label: "PROJECT CAP",
                        node: (
                          <CountUp
                            value={live.budget.cap}
                            format={(n) => `$${n.toFixed(2)}`}
                            className="text-[#E9E4DA]"
                          />
                        ),
                      },
                      {
                        label: "COMMITTED SPEND",
                        node: (
                          <CountUp
                            value={live.budget.committed}
                            format={(n) => `$${n.toFixed(3)}`}
                            className="text-[#B8A98F]"
                          />
                        ),
                      },
                      {
                        label: "REMAINING",
                        node: (
                          <CountUp
                            value={live.budget.remaining}
                            format={(n) => `$${n.toFixed(3)}`}
                            className="text-[#8FA6B7]"
                          />
                        ),
                      },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="rounded-lg border border-[#34322D] bg-[#111110] p-4"
                      >
                        <p className="font-mono text-[9px] tracking-widest text-[#A6A197]">
                          {m.label}
                        </p>
                        <p className="mt-2 font-mono text-xl tracking-tight">
                          {m.node}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-lg border border-[#34322D] bg-[#111110] p-4 font-mono text-xs leading-6 text-[#A6A197]">
                    <p>
                      {live.status === "idle"
                        ? "CONNECTING TO GATEWAY..."
                        : `GATEWAY NOT REACHABLE AT ${GATEWAY_BASE}. START THE BACKEND: python run_server.py`}
                    </p>
                    <p className="mt-2 text-[#34322D]">
                      DEFAULTS: PROJECT CAP $5.00, OVER-BUDGET CALLS REFUSED
                      WITH HTTP 402, ALERT EMAIL VIA RESEND.
                    </p>
                  </div>
                )}

                <div className="mt-5 border-t border-[#292823] pt-4">
                  <ul className="space-y-2 font-mono text-[10px] tracking-wider text-[#A6A197]">
                    {[
                      "ORDER: RESERVE > ROUTE > RECORD",
                      "RESERVATIONS RELEASED IF A NODE ABORTS",
                      "ACTUAL SPEND REPLACES THE ESTIMATE ON COMPLETION",
                    ].map((t) => (
                      <li key={t} className="flex gap-2.5">
                        <span
                          aria-hidden
                          className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#B8A98F]"
                        />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div className="panel !transform-none p-6">
                <p className="font-mono text-[10px] tracking-[0.2em] text-[#A6A197]">
                  WHAT THE CAP PROTECTS
                </p>
                <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-[#A6A197]">
                  {[
                    "Per-run reservations, released if a node aborts.",
                    "Committed spend accumulates only on completed work.",
                    "The remaining balance is visible on every health poll and in the studio meter.",
                    "Demo-mode responses cost nothing, so the cap never blocks learning.",
                  ].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#B8A98F]" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
