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

/**
 * Real scoring contract from src/services/router.py:
 *   score = cost_w * cost_norm + lat_w * lat_norm - health_w * (health_norm - 0.5)
 * with per-step-type weights: normal (0.45/0.35), code (0.30/0.25),
 * search (0.40/0.45) and health_w = max(0.05, 1 - cost_w - lat_w).
 * Inputs below are illustrative and labeled; the weights and formula are the
 * shipped router's.
 */
type StepType = "NORMAL" | "CODE" | "SEARCH";

const STEP_TYPES: {
  id: StepType;
  hint: string;
  weights: { cost: number; lat: number; health: number };
}[] = [
  {
    id: "NORMAL",
    hint: "SCORE = 0.45 COST + 0.35 LATENCY - 0.20 (HEALTH - 0.5)",
    weights: { cost: 0.45, lat: 0.35, health: 0.2 },
  },
  {
    id: "CODE",
    hint: "CODE STEPS FAVOR PRECISION: 0.30 COST + 0.25 LATENCY - 0.45 (HEALTH - 0.5)",
    weights: { cost: 0.3, lat: 0.25, health: 0.45 },
  },
  {
    id: "SEARCH",
    hint: "SEARCH STEPS FAVOR SPEED: 0.40 COST + 0.45 LATENCY - 0.15 (HEALTH - 0.5)",
    weights: { cost: 0.4, lat: 0.45, health: 0.15 },
  },
];

const MODELS: {
  name: string;
  tag: string;
  cost: number;
  latency: number;
  health: number;
}[] = [
  { name: "qwen-3.5", tag: "LOW COST", cost: 0.0008, latency: 900, health: 1.0 },
  { name: "gpt-4o-mini", tag: "BALANCED", cost: 0.0012, latency: 600, health: 0.8 },
  { name: "claude-sonnet", tag: "QUALITY", cost: 0.003, latency: 1400, health: 0.9 },
];

const FALLBACK_STEPS = [
  { name: "OTARI HOSTED", state: "PRIMARY PROVIDER" },
  { name: "GROQ FALLBACK", state: "SECOND PROVIDER" },
  { name: "LOCAL DEMO", state: "GUARANTEED RESPONSE" },
];

const fmtScore = (s: number) => `${s < 0 ? "-" : "+"}${Math.abs(s).toFixed(3)}`;

export default function RoutingIntelligence() {
  const [stepType, setStepType] = useState<StepType>("NORMAL");
  const active = STEP_TYPES.find((t) => t.id === stepType) ?? STEP_TYPES[0];
  const { cost: cw, lat: lw, health: hw } = active.weights;

  // Mirror of router.py: normalize each axis across the candidate set.
  const costLow = Math.min(...MODELS.map((m) => m.cost));
  const costHigh = Math.max(...MODELS.map((m) => m.cost));
  const latLow = Math.min(...MODELS.map((m) => m.latency));
  const latHigh = Math.max(...MODELS.map((m) => m.latency));
  const norm = (v: number, low: number, high: number) =>
    high <= low ? 0 : Math.min(1, Math.max(0, (v - low) / (high - low)));

  const scored = MODELS.map((m) => {
    const costN = norm(m.cost, costLow, costHigh);
    const latN = norm(m.latency, latLow, latHigh);
    return {
      ...m,
      costN,
      latN,
      score: cw * costN + lw * latN - hw * (m.health - 0.5),
    };
  });
  const winner = scored.reduce((a, b) => (b.score < a.score ? b : a));

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
              Each candidate carries its price per token, measured latency and a
              provider health factor. The score, straight from the router:
              cost, latency and health each normalized to 0-1 across the
              candidates, then weighted per step type.
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
                {STEP_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setStepType(t.id)}
                    aria-pressed={stepType === t.id}
                    className={`min-h-[44px] rounded-md px-4 font-mono text-[11px] tracking-widest transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F36B]/50 ${
                      stepType === t.id
                        ? "bg-[#C6F36B] font-semibold text-[#10140A]"
                        : "text-[#929DA5] hover:text-[#F3F5F2]"
                    }`}
                  >
                    {t.id}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-[#929DA5]">
              {active.hint}
            </p>

            <div className="mt-6 flex items-center gap-3 rounded-lg border border-[#293239] bg-[#090B0D] px-4 py-3">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#C6F36B] motion-safe:animate-pulse" />
              <span className="shrink-0 font-mono text-[10px] tracking-widest text-[#929DA5]">
                REQUEST ADMITTED
              </span>
              <div className="relative mx-2 h-px min-w-6 flex-1 overflow-visible bg-[#293239]">
                <span
                  key={stepType}
                  className="oo-sim-dot absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#65C9E8]"
                  style={{
                    animation:
                      "oo-route 0.9s cubic-bezier(0.22, 0.61, 0.36, 1) 0.05s both",
                  }}
                />
              </div>
              <span className="shrink-0 font-mono text-[10px] tracking-widest text-[#C6F36B]">
                ROUTED / {winner.name.toUpperCase()}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {scored.map((m) => {
                const isWinner = m === winner;
                return (
                  <div
                    key={m.name}
                    className={`relative rounded-xl border bg-[#171D22] p-5 transition-all duration-200 ${
                      isWinner
                        ? "border-[#C6F36B]"
                        : "border-[#293239] hover:-translate-y-[3px] hover:border-[#C6F36B]/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    }`}
                  >
                    {isWinner && (
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
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div>
                        <p className="font-mono text-[9px] tracking-widest text-[#929DA5]">
                          EST COST
                        </p>
                        <p
                          className={`mt-1 font-mono text-sm ${
                            isWinner ? "text-[#C6F36B]" : "text-[#F3F5F2]"
                          }`}
                        >
                          ${m.cost.toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] tracking-widest text-[#929DA5]">
                          LATENCY
                        </p>
                        <p
                          className={`mt-1 font-mono text-sm ${
                            isWinner ? "text-[#C6F36B]" : "text-[#F3F5F2]"
                          }`}
                        >
                          {m.latency} MS
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] tracking-widest text-[#929DA5]">
                          HEALTH
                        </p>
                        <p
                          className={`mt-1 font-mono text-sm ${
                            isWinner ? "text-[#C6F36B]" : "text-[#F3F5F2]"
                          }`}
                        >
                          {m.health.toFixed(1)}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`mt-4 flex items-center gap-2 font-mono text-[9px] tracking-widest transition-colors duration-200 ${
                        isWinner ? "text-[#C6F36B]" : "text-[#929DA5]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isWinner ? "bg-[#C6F36B]" : "bg-[#293239]"
                        }`}
                      />
                      {isWinner ? "ROUTE ACTIVATED" : "CANDIDATE"}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 border-t border-[#1C2429] pt-6">
              <p className="font-mono text-[10px] tracking-[0.2em] text-[#929DA5]">
                WORKED EXAMPLE / {stepType} STEP
              </p>
              <div className="scroll-thin mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-y border-[#293239] text-left text-[9px] tracking-[0.2em] text-[#929DA5]">
                      <th className="py-2 pr-4 font-medium">MODEL</th>
                      <th className="py-2 pr-4 font-medium">COST NORM</th>
                      <th className="py-2 pr-4 font-medium">LATENCY NORM</th>
                      <th className="py-2 pr-4 font-medium">HEALTH</th>
                      <th className="py-2 pr-4 text-right font-medium">SCORE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scored.map((m) => {
                      const isWinner = m === winner;
                      return (
                        <tr
                          key={m.name}
                          className="border-b border-[#1C2429] last:border-b-0"
                        >
                          <td className="py-2.5 pr-4 text-[#F3F5F2]">
                            <span className={isWinner ? "text-[#C6F36B]" : ""}>
                              {m.name}
                            </span>
                            {isWinner && (
                              <span className="ml-2 text-[9px] tracking-widest text-[#C6F36B]">
                                LOWEST SCORE
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-[#929DA5]">
                            {m.costN.toFixed(2)}
                          </td>
                          <td className="py-2.5 pr-4 text-[#929DA5]">
                            {m.latN.toFixed(2)}
                          </td>
                          <td className="py-2.5 pr-4 text-[#929DA5]">
                            {m.health.toFixed(1)}
                          </td>
                          <td
                            className={`py-2.5 pr-4 text-right ${
                              isWinner ? "text-[#C6F36B]" : "text-[#F3F5F2]"
                            }`}
                          >
                            {fmtScore(m.score)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[#929DA5]">
                Health above 0.5 acts as a bonus, below it as a penalty, so a
                stable mid-priced model can beat a cheaper flaky one. The
                selected route must also fit the remaining budget, and free
                demo-tier calls always pass.
              </p>
            </div>

            <p className="mt-6 font-mono text-[9px] tracking-[0.2em] text-[#293239]">
              WEIGHTS AND FORMULA FROM src/services/router.py. INPUT VALUES ARE
              ILLUSTRATIVE; PRODUCTION ROUTING USES THE LIVE MODEL CATALOGUE,
              REAL PRICES AND MEASURED PERFORMANCE.
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
