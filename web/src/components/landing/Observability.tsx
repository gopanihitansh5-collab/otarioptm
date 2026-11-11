"use client";

import { Reveal, CountUp, useLiveGuard, GATEWAY_BASE } from "../../lib/landing/Reveal";

export default function Observability() {
  const live = useLiveGuard();

  return (
    <section id="observability" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <Reveal>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[#B8A98F]">
            OBSERVABILITY
          </p>
          <h2 className="mt-3 max-w-2xl text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[#E9E4DA]">
            The dashboard in the studio, the same numbers as this page.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#A6A197]">
            Everything below is read live from the running gateway in this page
            and in the studio. When the gateway is offline, you see the honest
            offline state instead of a canned screenshot.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Reveal className="panel !transform-none p-6 md:col-span-2" delay={60}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[10px] tracking-[0.2em] text-[#A6A197]">
                REAL-TIME TOKEN USAGE AND COST BY RUN
              </p>
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
              <div className="mt-6 rounded-lg border border-[#34322D] bg-[#111110] p-4 font-mono text-xs leading-6 text-[#A6A197]">
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
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#A6A197]">
              EXECUTION HISTORY AND EXPORTS
            </p>
            <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-[#A6A197]">
              {[
                "WebSocket activity feed as executions happen.",
                "Chain, model, tokens and cost per completed node.",
                "CSV export with totals for finance review.",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#8FA6B7]" />
                  {t}
                </li>
              ))}
            </ul>
            <a
              href={`${GATEWAY_BASE}/api/v1/export`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex h-11 items-center rounded-lg border border-[#34322D] px-4 font-mono text-[11px] tracking-widest text-[#E9E4DA] transition-all duration-200 hover:border-[#B8A98F]/40 hover:text-[#B8A98F] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8A98F]/50"
            >
              EXPORT SPEND CSV
            </a>
          </Reveal>
        </div>

        <Reveal delay={160}>
          <div className="mt-4 panel !transform-none p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[10px] tracking-[0.2em] text-[#A6A197]">
                LATEST ACTIVITY EVENTS
              </p>
              <a
                href={`${GATEWAY_BASE}/api/v1/activity`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[9px] tracking-widest text-[#A6A197] transition-colors duration-200 hover:text-[#B8A98F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8A98F]/50"
              >
                /api/v1/activity ↗
              </a>
            </div>
            {live.events.length > 0 ? (
              <div className="mt-4 space-y-2 font-mono text-[11px] leading-5">
                {live.events.map((e, i) => (
                  <div
                    key={e.id ?? i}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 rounded-lg border border-[#34322D] bg-[#111110] px-4 py-2.5"
                  >
                    <span className="text-[#B8A98F]">{e.event ?? "event"}</span>
                    {e.nodeId && (
                      <span className="text-[#A6A197]">node: {e.nodeId}</span>
                    )}
                    {e.model && (
                      <span className="text-[#A6A197]">model: {e.model}</span>
                    )}
                    {typeof e.cost === "number" && (
                      <span className="text-[#8FA6B7]">
                        ${(e.cost as number).toFixed(4)}
                      </span>
                    )}
                    {e.latencyMs != null && (
                      <span className="text-[#A6A197]">
                        {Math.round(e.latencyMs as number)}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-[#34322D] bg-[#111110] px-4 py-3 font-mono text-[11px] leading-5 text-[#A6A197]">
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
