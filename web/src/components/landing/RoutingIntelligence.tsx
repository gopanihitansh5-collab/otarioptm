"use client";

import { useState } from "react";
import { Reveal } from "../../lib/landing/Reveal";

const SIM_CSS = `
@keyframes oo-route {
  0% { left: 0; opacity: 1; }
  80% { left: calc(100% - 6px); opacity: 1; }
  100% { left: calc(100% - 6px); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .oo-sim-dot { animation: none !important; }
}
`;

type Policy = "ECONOMY" | "BALANCED" | "QUALITY";

const POLICIES: { id: Policy; hint: string }[] = [
  { id: "ECONOMY", hint: "SCORING: COST FIRST / HEALTH STABLE REQUIRED" },
  { id: "BALANCED", hint: "SCORING: 0.45 COST + 0.35 LATENCY - 0.20 HEALTH" },
  { id: "QUALITY", hint: "SCORING: CAPABILITY FIRST / BUDGET CEILING APPLIED" },
];

const MODELS: {
  name: string;
  tag: string;
  cost: string;
  latency: string;
  policy: Policy;
}[] = [
  { name: "qwen-3.5", tag: "LOW COST", cost: "$0.0008", latency: "900 MS", policy: "ECONOMY" },
  { name: "gpt-4o-mini", tag: "BALANCED", cost: "$0.0012", latency: "600 MS", policy: "BALANCED" },
  { name: "claude-sonnet", tag: "QUALITY", cost: "$0.0030", latency: "1400 MS", policy: "QUALITY" },
];

const FALLBACK_STEPS = [
  { name: "OTARI HOSTED", state: "PRIMARY PROVIDER" },
  { name: "GROQ FALLBACK", state: "SECOND PROVIDER" },
  { name: "LOCAL DEMO", state: "GUARANTEED RESPONSE" },
];

export default function RoutingIntelligence() {
  const [policy, setPolicy] = useState<Policy>("BALANCED");
  const selected = MODELS.find((m) => m.policy === policy) ?? MODELS[1];
  const hint = POLICIES.find((p) => p.id === policy)?.hint ?? "";

  return (
    <section id="routing" className="scroll-mt-24">
      <style dangerouslySetInnerHTML={{ __html: SIM_CSS }} />
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <Reveal>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B]">
            INTELLIGENT ROUTING
          </p>
          <h2 className="mt-3 max-w-2xl text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[#F3F5F2]">
            Discovery, comparison and selection, every single call.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <Reveal className="panel p-6" delay={0}>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#C6F36B]">
              01 / MODEL DISCOVERY
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#929DA5]">
              The gateway lists every available model across Otari, Groq and the
              local tier, with live credentials and health states attached before
              scoring starts.
            </p>
          </Reveal>
          <Reveal className="panel p-6" delay={70}>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#C6F36B]">
              02 / COST VS QUALITY
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#929DA5]">
              Each candidate carries its published price per 1M tokens, measured
              latency and a provider health factor. The score, straight from the
              router: 0.45 cost + 0.35 latency - 0.20 health.
            </p>
          </Reveal>
          <Reveal className="panel p-6" delay={140}>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#C6F36B]">
              03 / AUTO SELECTION
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#929DA5]">
              Lowest score wins. If a provider fails or runs dark, the circuit
              breaker trips and the next tier takes the route automatically.
            </p>
          </Reveal>
        </div>

        <Reveal delay={100}>
          <div className="mt-12 panel p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-mono text-[10px] tracking-[0.2em] text-[#929DA5]">
                  LIVE ROUTING SIMULATOR
                </p>
                <span className="rounded border border-[#293239] px-2 py-0.5 font-mono text-[9px] tracking-widest text-[#929DA5]">
                  DEMO MODE
                </span>
              </div>
              <div className="flex rounded-lg border border-[#293239] bg-[#090B0D] p-1">
                {POLICIES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPolicy(p.id)}
                    aria-pressed={policy === p.id}
                    className={`rounded-md px-4 py-2 font-mono text-[11px] tracking-widest transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F36B]/50 ${
                      policy === p.id
                        ? "bg-[#C6F36B] font-semibold text-[#10140A]"
                        : "text-[#929DA5] hover:text-[#F3F5F2]"
                    }`}
                  >
                    {p.id}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-[#929DA5]">
              {hint}
            </p>

            <div className="mt-6 flex items-center gap-3 rounded-lg border border-[#293239] bg-[#090B0D] px-4 py-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#C6F36B] motion-safe:animate-pulse" />
              <span className="shrink-0 font-mono text-[10px] tracking-widest text-[#929DA5]">
                REQUEST ADMITTED
              </span>
              <div className="relative mx-2 h-px min-w-6 flex-1 overflow-visible bg-[#293239]">
                <span
                  key={policy}
                  className="oo-sim-dot absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#65C9E8]"
                  style={{
                    animation:
                      "oo-route 0.9s cubic-bezier(0.22, 0.61, 0.36, 1) 0.05s both",
                  }}
                />
              </div>
              <span className="shrink-0 font-mono text-[10px] tracking-widest text-[#C6F36B]">
                ROUTED / {selected.name.toUpperCase()}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {MODELS.map((m) => {
                const isSel = m.policy === policy;
                return (
                  <div
                    key={m.name}
                    className={`relative rounded-xl border bg-[#171D22] p-5 transition-all duration-200 ${
                      isSel
                        ? "border-[#C6F36B]"
                        : "border-[#293239] hover:-translate-y-[3px] hover:border-[#C6F36B]/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    }`}
                  >
                    {isSel && (
                      <span className="absolute -top-3 right-4 rounded bg-[#C6F36B] px-2 py-0.5 font-mono text-[9px] font-semibold tracking-widest text-[#10140A]">
                        SELECTED
                      </span>
                    )}
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium text-[#F3F5F2]">
                        {m.name}
                      </p>
                      <span className="shrink-0 rounded border border-[#293239] px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-[#929DA5]">
                        {m.tag}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="font-mono text-[9px] tracking-widest text-[#929DA5]">
                          EST COST
                        </p>
                        <p
                          className={`mt-1 font-mono text-sm ${
                            isSel ? "text-[#C6F36B]" : "text-[#F3F5F2]"
                          }`}
                        >
                          {m.cost}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] tracking-widest text-[#929DA5]">
                          LATENCY
                        </p>
                        <p
                          className={`mt-1 font-mono text-sm ${
                            isSel ? "text-[#C6F36B]" : "text-[#F3F5F2]"
                          }`}
                        >
                          {m.latency}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`mt-4 flex items-center gap-2 font-mono text-[9px] tracking-widest transition-colors duration-200 ${
                        isSel ? "text-[#C6F36B]" : "text-[#929DA5]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSel ? "bg-[#C6F36B]" : "bg-[#293239]"
                        }`}
                      />
                      {isSel ? "ROUTE ACTIVATED" : "CANDIDATE"}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 font-mono text-[9px] tracking-[0.2em] text-[#293239]">
              ILLUSTRATIVE VALUES ONLY. PRODUCTION ROUTING USES THE LIVE MODEL
              CATALOGUE, REAL PRICES AND MEASURED PERFORMANCE.
            </p>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="mt-8 panel p-6 md:p-8">
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#929DA5]">
              FALLBACK AND CIRCUIT BREAKER
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {FALLBACK_STEPS.map((s, i) => (
                <div
                  key={s.name}
                  className="flex items-center gap-3 rounded-xl border border-[#293239] bg-[#171D22] p-4"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#C6F36B]/40 font-mono text-[10px] text-[#C6F36B]">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#F3F5F2]">
                      {s.name}
                    </p>
                    <p className="font-mono text-[9px] tracking-widest text-[#929DA5]">
                      {s.state}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#929DA5]">
              When a tier fails, the next one takes the call and the response
              carries a diagnostic note with the reason from each failed
              provider, surfaced in the activity feed. Every run returns real
              output, even when the providers are dark.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
