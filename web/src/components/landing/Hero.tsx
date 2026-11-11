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

const CSS = `
@keyframes oo-in { 0%,4% { opacity:0; transform:translateX(0); } 6% { opacity:1; } 21% { opacity:1; transform:translateX(150px); } 23%,100% { opacity:0; transform:translateX(150px); } }
@keyframes oo-scan { 0%,21% { opacity:0; transform:scale(0.4); } 24% { opacity:0.9; } 38% { opacity:0; transform:scale(1.9); } 100% { opacity:0; transform:scale(1.9); } }
@keyframes oo-fillh { 0%,21% { opacity:0.12; } 24% { opacity:0.55; } 40% { opacity:0.12; } 100% { opacity:0.12; } }
@keyframes oo-out { 0%,9% { opacity:0; transform:translate(0,0); } 9.5% { opacity:1; } 16% { opacity:1; transform:translate(var(--dx),var(--dy)); } 30%,100% { opacity:0; transform:translate(var(--dx),var(--dy)); } }
@keyframes oo-line { 0%,9.5% { opacity:0; } 13% { opacity:1; } 16% { opacity:0.5; } 30%,100% { opacity:0; } }
@keyframes oo-chip { 0%,15.9% { opacity:0; } 16% { opacity:1; } 30%,100% { opacity:0; } }
@keyframes oo-read { 0%,17% { opacity:0.35; } 18.5% { opacity:1; } 30%,100% { opacity:0.35; } }
.oo-in { animation: oo-in 4.2s linear infinite; }
.oo-scan { animation: oo-scan 4.2s linear infinite; }
.oo-fillh { animation: oo-fillh 4.2s linear infinite; }
.oo-out { animation: oo-out 12.6s linear infinite; }
.oo-line { animation: oo-line 12.6s linear infinite; }
.oo-chip { animation: oo-chip 12.6s linear infinite; }
.oo-read { animation: oo-read 12.6s linear infinite; }
.oo-p1 { animation-delay: 4.2s; }
.oo-p2 { animation-delay: 8.4s; }
@media (prefers-reduced-motion: reduce) { .oo-anim, .oo-anim * { animation: none !important; } }
@keyframes oo-stage { 0%,100% { opacity: 0.35; } }
.oo-stage { animation: oo-stage 6s linear infinite; }
.oo-st0 { animation-name: oo-st0; } @keyframes oo-st0 { 0%,23% { opacity: 1; color: #B8A98F; } 23.1%,100% { opacity: 0.35; } }
.oo-st1 { animation-name: oo-st1; } @keyframes oo-st1 { 0%,23% { opacity: 0.35; } 23%,40% { opacity: 1; color: #B8A98F; } 40.1%,100% { opacity: 0.35; } }
.oo-st2 { animation-name: oo-st2; } @keyframes oo-st2 { 0%,40% { opacity: 0.35; } 40%,67% { opacity: 1; color: #B8A98F; } 67.1%,100% { opacity: 0.35; } }
.oo-st3 { animation-name: oo-st3; } @keyframes oo-st3 { 0%,67% { opacity: 0.35; } 67%,93% { opacity: 1; color: #B8A98F; } 93.1%,100% { opacity: 0.35; } }
`;

type DotStyle = React.CSSProperties & Record<"--dx" | "--dy", string>;

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
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
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
                  RUN BUDGET ${" "}
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
              <circle cx="80" cy="150" r="3.5" fill="var(--color-lime)" className="oo-in" opacity={0} />

              <rect x="172" y="122" width="56" height="56" rx="16" fill="var(--color-elevated)" stroke="var(--color-steel)" strokeWidth="1.5" />
              <rect x="172" y="122" width="56" height="56" rx="16" fill="var(--color-lime)" className="oo-fillh" opacity={0.1} />
              <circle cx="200" cy="150" r="44" fill="none" stroke="var(--color-lime)" strokeWidth="1" className="oo-scan" opacity={0} />
              <text x="200" y="154" textAnchor="middle" fill="var(--color-lime)" fontSize="10" fontFamily="ui-monospace, monospace" letterSpacing="2">OPTM</text>

              {NODES.map((n, i) => {
                const cy = PATHS[i];
                const cls = i === 1 ? " oo-p1" : i === 2 ? " oo-p2" : "";
                const d = `M228,150 C262,150 268,${cy} 300,${cy}`;
                return (
                  <g key={n.name}>
                    <path d={d} fill="none" stroke="var(--color-steel)" strokeWidth="1.5" strokeLinecap="round" />
                    <path d={d} fill="none" stroke="url(#ht-hot)" strokeWidth="2" strokeLinecap="round" className={`oo-line${cls}`} opacity={0} />
                    <circle
                      cx="228"
                      cy="150"
                      r="3.5"
                      fill="var(--color-lime)"
                      className={`oo-out${cls}`}
                      style={{ "--dx": n.dx, "--dy": n.dy, opacity: 0 } as DotStyle}
                    />
                    <circle cx="300" cy={cy} r="6" fill="none" stroke="var(--color-lime)" className={`oo-chip${cls}`} opacity={0} />
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
