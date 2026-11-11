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
    body: "A catalog-based estimate is reserved atomically against the app cap. The bound depends on available pricing.",
  },
  {
    step: "ROUTE",
    body: "Scored selection across Otari, Groq and the local demo tier.",
  },
  {
    step: "RECORD",
    body: "Reported USD cost replaces the estimate when available. Latency and tokens are logged; missing prices remain unverified.",
  },
  {
    step: "BLOCK OR ALERT",
    body: "A reservation that exceeds the app cap is refused with HTTP 402. Alerts depend on configured delivery.",
  },
];

export default function BudgetGovernance() {
  const live = useLiveGuard();

  return (
    <section id="budget" className="scroll-mt-24 border-y border-[var(--color-steel)] bg-[var(--color-graphite)]">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div>
            <Reveal>
              <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-lime)]">
                BUDGET GOVERNANCE
              </p>
              <h2 className="mt-3 text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[var(--color-ice)]">
                Reserve priced steps. Keep billing limits visible.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-silver)]">
                A project cap sits in front of every model call. The gateway
                reserves a catalog-based estimate and records reported cost when
                available. Calls are refused when the reservation does not fit
                the app cap. Missing prices, zero catalog rates, and timeout
                charges can leave actual billing unverified. The provider wallet
                remains the billing source of truth.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <div className="mt-8 space-y-3">
                {CHAIN.map((c, i) => (
                  <div
                    key={c.step}
                    className="flex items-start gap-4 rounded-xl border border-[var(--color-steel)] bg-[var(--color-obsidian)] p-4"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--color-lime)]/40 font-mono text-[10px] text-[var(--color-lime)]">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-lime)]">
                        {c.step}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--color-silver)]">
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
                  <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-silver)]">
                    BUDGET SNAPSHOT
                  </p>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded border px-2 py-0.5 font-mono text-[9px] tracking-widest ${
                        live.status === "live"
                          ? "border-[var(--color-lime)]/50 text-[var(--color-lime)]"
                          : live.status === "offline"
                            ? "border-[var(--color-fail)]/50 text-[var(--color-fail)]"
                            : "border-[var(--color-steel)] text-[var(--color-silver)]"
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
                      className="font-mono text-[9px] tracking-widest text-[var(--color-silver)] transition-colors duration-200 hover:text-[var(--color-lime)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lime)]/50"
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
                            className="text-[var(--color-ice)]"
                          />
                        ),
                      },
                      {
                        label: "COMMITTED SPEND",
                        node: (
                          <CountUp
                            value={live.budget.committed}
                            format={(n) => `$${n.toFixed(3)}`}
                            className="text-[var(--color-lime)]"
                          />
                        ),
                      },
                      {
                        label: "REMAINING",
                        node: (
                          <CountUp
                            value={live.budget.remaining}
                            format={(n) => `$${n.toFixed(3)}`}
                            className="text-[var(--color-signal)]"
                          />
                        ),
                      },
                    ].map((m) => (
                      <div
                        key={m.label}
                        className="rounded-lg border border-[var(--color-steel)] bg-[var(--color-obsidian)] p-4"
                      >
                        <p className="font-mono text-[9px] tracking-widest text-[var(--color-silver)]">
                          {m.label}
                        </p>
                        <p className="mt-2 font-mono text-xl tracking-tight">
                          {m.node}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-lg border border-[var(--color-steel)] bg-[var(--color-obsidian)] p-4 font-mono text-xs leading-6 text-[var(--color-silver)]">
                    <p>
                      {live.status === "idle"
                        ? "CONNECTING TO GATEWAY..."
                        : `GATEWAY NOT REACHABLE AT ${GATEWAY_BASE}. START THE BACKEND: python run_server.py`}
                    </p>
                    <p className="mt-2 text-[var(--color-silver)]">
                      DEFAULTS: PROJECT CAP $5.00, OVER-BUDGET CALLS REFUSED
                      WITH HTTP 402, ALERT EMAIL VIA RESEND.
                    </p>
                  </div>
                )}

                <div className="mt-5 border-t border-[var(--color-steel-dim)] pt-4">
                  <ul className="space-y-2 font-mono text-[10px] tracking-wider text-[var(--color-silver)]">
                    {[
                      "ORDER: RESERVE > ROUTE > RECORD",
                      "RESERVATIONS RELEASED IF A NODE ABORTS",
                      "ACTUAL SPEND REPLACES THE ESTIMATE ON COMPLETION",
                    ].map((t) => (
                      <li key={t} className="flex gap-2.5">
                        <span
                          aria-hidden
                          className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-lime)]"
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
                <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-silver)]">
                  WHAT THE CAP PROTECTS
                </p>
                <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-[var(--color-silver)]">
                  {[
                    "Per-run reservations, released if a node aborts.",
                    "Committed spend accumulates only on completed work.",
                    "The remaining balance is visible on every health poll and in the studio meter.",
                    "Demo-mode responses cost nothing, so the cap never blocks learning.",
                  ].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--color-lime)]" />
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
