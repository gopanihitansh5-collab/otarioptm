"use client";

import { Reveal, CountUp, useLiveGuard } from "../../lib/landing/Reveal";

const PRIMARY =
  "group inline-flex h-12 items-center gap-2 rounded-lg bg-[var(--color-lime)] px-6 text-sm font-semibold text-[var(--color-obsidian)] shadow-[0_0_28px_rgba(184,169,143,0.18)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lime)]/50";
const SECONDARY =
  "inline-flex h-12 items-center gap-2 rounded-lg border border-[var(--color-steel)] px-6 text-sm font-medium text-[var(--color-ice)] transition-all duration-200 hover:border-[var(--color-lime)]/40 hover:text-[var(--color-lime)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lime)]/50";

const NODES = [
  { name: "QWEN-3.5", dx: "72px", dy: "-80px" },
  { name: "GPT-4O-MINI", dx: "72px", dy: "0px" },
  { name: "CLAUDE-SONNET", dx: "72px", dy: "80px" },
];

const CANDIDATES = ["qwen-3.5-35b", "gpt-4o-mini", "claude-sonnet-4-6"];

const PATHS = [70, 150, 230];

export default function Hero() {
  const live = useLiveGuard();

  const status =
    live.status === "live"
      ? live.liveProviders
        ? "ONLINE"
        : "DEMO TIER"
      : live.status === "idle"
        ? "CONNECTING"
        : "OFFLINE";

  return (
    <section id="top" className="relative overflow-hidden pt-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(184,169,143,0.07),transparent)]"
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-10 md:px-6 lg:grid-cols-2 lg:items-center lg:gap-8 lg:pt-14">
        <div className="flex flex-col items-start">
          <Reveal as="span">
            <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-lime)]">
              v0.1 beta · built on the Otari hosted gateway
            </p>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="mt-5 font-display text-[clamp(40px,4.6vw,60px)] font-normal leading-[1.08] tracking-tight text-[var(--color-ice)]">
              Route AI requests by{" "}
              <em className="italic text-[var(--color-lime)]">
                cost, latency and budget.
              </em>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--color-silver)] md:text-lg">
              OtariOptm ranks candidate models by cost and latency for each
              step, reserves budget before execution, and shows the provider,
              tokens and cost of each run as it happens.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/studio" className={PRIMARY}>
                Open Studio
                <span
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </a>
              <a href="#demo" className={SECONDARY}>
                See it route a request
                <span aria-hidden>↓</span>
              </a>
            </div>
          </Reveal>
          <Reveal delay={240}>
            <p className="mt-4 font-mono text-[10px] tracking-[0.2em] text-[var(--color-silver)]">
              OTARI-FIRST · AUTO FALLBACK TO FREE GROQ MODELS
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] tracking-[0.2em] text-[var(--color-silver)]">
              <span>
                GATEWAY: <span className={live.status === "offline" ? "text-[var(--color-fail)]" : "text-[var(--color-lime)]"}>{status}</span>
              </span>
              {live.budget && (
                <span>
                  APP RUN BUDGET ${" "}
                  <CountUp value={live.budget.cap} className="text-[var(--color-ice)]" />
                </span>
              )}
              {live.budget && live.budget.remaining > 0 && (
                <span>
                  REMAINING ${" "}
                  <CountUp
                    value={live.budget.remaining}
                    format={(n) => n.toFixed(3)}
                    className="text-[var(--color-lime)]"
                  />
                </span>
              )}
            </div>
          </Reveal>
        </div>

        <div className="relative mx-auto w-full max-w-[580px]">
          <div className="oo-anim relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[var(--color-steel)] bg-[var(--color-graphite)]">
            <p className="absolute left-4 top-3 z-10 font-mono text-[10px] tracking-[0.2em] text-[var(--color-silver)]">
              Routing trace · illustrative candidates
            </p>
            <svg viewBox="0 0 400 300" className="hero-trace absolute inset-0 h-full w-full" aria-hidden>
              <defs>
                <linearGradient id="ht-hot" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="var(--color-lime)" stopOpacity="0.05" />
                  <stop offset="1" stopColor="var(--color-lime)" />
                </linearGradient>
              </defs>

              <rect x="10" y="138" width="66" height="24" rx="12" fill="var(--color-elevated)" stroke="var(--color-steel)" />
              <text x="43" y="153.5" textAnchor="middle" fill="var(--color-silver)" fontSize="9" fontFamily="ui-monospace, monospace" letterSpacing="1.5">REQUEST</text>

              <path d="M76,150 C110,150 130,150 172,150" fill="none" stroke="var(--color-steel)" strokeWidth="1.5" strokeLinecap="round" />

              <rect x="172" y="122" width="56" height="56" rx="16" fill="var(--color-elevated)" stroke="var(--color-steel)" strokeWidth="1.5" />
              <rect x="172" y="122" width="56" height="56" rx="16" fill="var(--color-lime)" className="oo-fillh" opacity={0.1} />
              <text x="200" y="154" textAnchor="middle" fill="var(--color-lime)" fontSize="10" fontFamily="ui-monospace, monospace" letterSpacing="2">OPTM</text>

              {NODES.map((n, i) => {
                const cy = PATHS[i];
                const d = `M228,150 C262,150 268,${cy} 300,${cy}`;
                return (
                  <g key={n.name}>
                    <path d={d} fill="none" stroke="var(--color-steel)" strokeWidth="1.5" strokeLinecap="round" />
                    <path d={d} fill="none" stroke="url(#ht-hot)" strokeWidth="2" strokeLinecap="round" opacity={0.45} />
                    <rect x="300" y={cy - 13} width="92" height="26" rx="13" fill="var(--color-elevated)" stroke="var(--color-steel)" />
                    <circle cx="313" cy={cy} r="3" fill="var(--color-lime)" opacity={0.85} />
                    <text x="323" y={cy + 3.5} fill="var(--color-ice)" fontSize="8" fontFamily="ui-monospace, monospace" letterSpacing="0.5">
                      {n.name}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div
              className="absolute bottom-3 left-4 z-10 w-64 rounded-lg border border-[var(--color-steel)] bg-[var(--color-obsidian)]/90 px-3 py-2.5"
            >
              <p className="font-mono text-[9px] tracking-[0.2em] text-[var(--color-silver)]">
                FALLBACK CATALOG · ILLUSTRATIVE
              </p>
              <div className="mt-1.5 space-y-1">
                {CANDIDATES.map((model) => (
                  <p
                    key={model}
                    className="font-mono text-[10.5px] text-[var(--color-ice)]"
                  >
                    {model}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
