"use client";

import { Reveal, CountUp, useLiveGuard, GATEWAY_BASE } from "../../lib/landing/Reveal";

export default function Observability() {
  const live = useLiveGuard();

  return (
    <section id="observability" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <Reveal>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-lime)]">
            OBSERVABILITY
          </p>
          <h2 className="mt-3 max-w-2xl text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[var(--color-ice)]">
            The dashboard in the studio, the same numbers as this page.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-silver)]">
            Everything below is read live from the running gateway in this page
            and in the studio. When the gateway is offline, you see the honest
            offline state instead of a canned screenshot.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Reveal className="panel !transform-none p-6 md:col-span-2" delay={60}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-silver)]">
                REAL-TIME TOKEN USAGE AND COST BY RUN
              </p>
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
            </div>

            {live.budget ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
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
              <div className="mt-6 rounded-lg border border-[var(--color-steel)] bg-[var(--color-obsidian)] p-4 font-mono text-xs leading-6 text-[var(--color-silver)]">
                <p>
                  {live.status === "idle"
                    ? "CONNECTING TO GATEWAY..."
                    : "GATEWAY NOT REACHABLE AT " +
                      GATEWAY_BASE +
                      ". START THE BACKEND: python run_server.py"}
                </p>
              </div>
            )}
          </Reveal>

          <Reveal className="panel !transform-none p-6" delay={120}>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-silver)]">
              EXECUTION HISTORY AND EXPORTS
            </p>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-[var(--color-silver)]">
              {[
                "WebSocket activity feed as executions happen.",
                "Chain, model, tokens and cost per completed node.",
                "CSV export with totals for finance review.",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--color-signal)]" />
                  {t}
                </li>
              ))}
            </ul>
            <a
              href={`${GATEWAY_BASE}/api/v1/export`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex h-11 items-center rounded-lg border border-[var(--color-steel)] px-4 font-mono text-[11px] tracking-widest text-[var(--color-ice)] transition-all duration-200 hover:border-[var(--color-lime)]/40 hover:text-[var(--color-lime)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lime)]/50"
            >
              EXPORT SPEND CSV
            </a>
          </Reveal>
        </div>

        <Reveal delay={160}>
          <div className="mt-4 panel !transform-none p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-silver)]">
                LATEST ACTIVITY EVENTS
              </p>
              <a
                href={`${GATEWAY_BASE}/api/v1/activity`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[9px] tracking-widest text-[var(--color-silver)] transition-colors duration-200 hover:text-[var(--color-lime)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lime)]/50"
              >
                /api/v1/activity ↗
              </a>
            </div>
            {live.events.length > 0 ? (
              <div className="mt-4 space-y-2 font-mono text-[11px] leading-5">
                {live.events.map((e, i) => (
                  <div
                    key={e.id ?? i}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 rounded-lg border border-[var(--color-steel)] bg-[var(--color-obsidian)] px-4 py-2.5"
                  >
                    <span className="text-[var(--color-lime)]">{e.event ?? "event"}</span>
                    {e.nodeId && (
                      <span className="text-[var(--color-silver)]">node: {e.nodeId}</span>
                    )}
                    {e.model && (
                      <span className="text-[var(--color-silver)]">model: {e.model}</span>
                    )}
                    {typeof e.cost === "number" && (
                      <span className="text-[var(--color-signal)]">
                        {e.costSource === "estimate"
                          ? `~$${(e.cost as number).toFixed(4)} est`
                          : e.costSource === "provider-reported+estimate"
                            ? `$${(e.cost as number).toFixed(4)} part-est`
                            : `$${(e.cost as number).toFixed(4)}`}
                      </span>
                    )}
                    {e.latencyMs != null && (
                      <span className="text-[var(--color-silver)]">
                        {Math.round(e.latencyMs as number)}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-[var(--color-steel)] bg-[var(--color-obsidian)] px-4 py-3 font-mono text-[11px] leading-5 text-[var(--color-silver)]">
                {live.status === "live"
                  ? "NO EVENTS YET. RUN A WORKFLOW IN THE STUDIO TO POPULATE THE FEED."
                  : "EVENTS APPEAR HERE ONCE THE GATEWAY IS RUNNING."}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
