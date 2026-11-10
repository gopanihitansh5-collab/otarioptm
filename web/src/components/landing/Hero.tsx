"use client";

import type { CSSProperties } from "react";

const PRIMARY =
  "group inline-flex h-12 items-center gap-2 rounded-lg bg-[#C6F36B] px-6 text-sm font-semibold text-[#10140A] transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F36B]/50";
const SECONDARY =
  "inline-flex h-12 items-center gap-2 rounded-lg border border-[#293239] px-6 text-sm font-medium text-[#F3F5F2] transition-all duration-200 hover:border-[#C6F36B]/40 hover:text-[#C6F36B] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F36B]/50";

const NODES = [
  { name: "QWEN", sub: "v3.5", dx: "62px", dy: "-80px", cost: "$0.0008", lat: "900 MS" },
  { name: "GPT-4O-MINI", sub: "OPENAI", dx: "84px", dy: "0px", cost: "$0.0012", lat: "600 MS" },
  { name: "CLAUDE", sub: "SONNET", dx: "62px", dy: "80px", cost: "$0.0030", lat: "1400 MS" },
];

const HEX = "234,150 217,179.4 183,179.4 166,150 183,120.6 217,120.6";

const CSS = `
@keyframes oo-in {
  0%, 4% { opacity: 0; transform: translateX(0px); }
  6% { opacity: 1; }
  21% { opacity: 1; transform: translateX(150px); }
  23%, 100% { opacity: 0; transform: translateX(150px); }
}
@keyframes oo-scan {
  0%, 21% { opacity: 0; transform: scale(0.4); }
  24% { opacity: 0.9; }
  38% { opacity: 0; transform: scale(1.9); }
  100% { opacity: 0; transform: scale(1.9); }
}
@keyframes oo-fill {
  0%, 21% { opacity: 0.12; }
  24% { opacity: 0.55; }
  40% { opacity: 0.12; }
  100% { opacity: 0.12; }
}
@keyframes oo-out {
  0%, 9% { opacity: 0; transform: translate(0px, 0px); }
  9.5% { opacity: 1; }
  16% { opacity: 1; transform: translate(var(--dx), var(--dy)); }
  30%, 100% { opacity: 0; transform: translate(var(--dx), var(--dy)); }
}
@keyframes oo-line {
  0%, 9.5% { opacity: 0; }
  13% { opacity: 1; }
  16% { opacity: 0.5; }
  30%, 100% { opacity: 0; }
}
@keyframes oo-chip {
  0%, 15.9% { opacity: 0; }
  16% { opacity: 1; }
  30%, 100% { opacity: 0; }
}
@keyframes oo-read {
  0%, 17% { opacity: 0.35; }
  18.5% { opacity: 1; }
  30%, 100% { opacity: 0.35; }
}
.oo-in { animation: oo-in 4.2s linear infinite; }
.oo-scan { animation: oo-scan 4.2s linear infinite; }
.oo-fillh { animation: oo-fill 4.2s linear infinite; }
.oo-out { animation: oo-out 12.6s linear infinite; }
.oo-line { animation: oo-line 12.6s linear infinite; }
.oo-chip { animation: oo-chip 12.6s linear infinite; }
.oo-read { animation: oo-read 12.6s linear infinite; }
.oo-p1 { animation-delay: 4.2s; }
.oo-p2 { animation-delay: 8.4s; }
@media (prefers-reduced-motion: reduce) {
  .oo-anim, .oo-anim * { animation: none !important; }
}
`;

type DotStyle = CSSProperties & Record<"--dx" | "--dy", string>;

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(198,243,107,0.07),transparent)]"
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 md:px-6 lg:min-h-[92vh] lg:grid-cols-2 lg:items-center lg:gap-8 lg:pt-20">
        <div className="flex flex-col items-start">
          <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B]">
            v0.1 BETA — AI ORCHESTRATION, OPTIMIZED
          </p>
          <h1 className="mt-5 text-[clamp(40px,6vw,72px)] font-semibold leading-[1.05] tracking-tight text-[#F3F5F2]">
            Every AI request deserves a{" "}
            <span className="text-[#C6F36B]">smarter route</span>.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-[#929DA5] md:text-lg">
            Route every workload to the right model. Control spending. Monitor
            every execution. All through one unified gateway built on Otari.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/studio" className={PRIMARY}>
              Open Studio
              <span
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                →
              </span>
            </a>
            <a href="#routing" className={SECONDARY}>
              See the routing engine
              <span aria-hidden>↓</span>
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            {[
              ["01", "SMART ROUTING"],
              ["02", "BUDGET CONTROL"],
              ["03", "LIVE OBSERVABILITY"],
            ].map(([n, label]) => (
              <span
                key={label}
                className="rounded-md border border-[#293239] bg-[#111519] px-3 py-2 font-mono text-[10px] tracking-widest text-[#929DA5]"
              >
                <span className="text-[#C6F36B]">{n}</span> {label}
              </span>
            ))}
          </div>
        </div>

        <div className="oo-anim relative mx-auto aspect-[4/3] w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#293239] bg-[#111519]">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(101,201,232,0.08),transparent)]"
          />
          <p className="absolute left-4 top-3 z-10 font-mono text-[10px] tracking-[0.2em] text-[#929DA5]">
            GATEWAY — LIVE TRACE (DEMO)
          </p>
          <p className="absolute bottom-3 right-4 z-10 font-mono text-[10px] tracking-[0.2em] text-[#293239]">
            LOOP 4.2S
          </p>

          <svg
            viewBox="0 0 400 300"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            <line x1="16" y1="150" x2="166" y2="150" stroke="#293239" strokeWidth="1" />
            <text x="52" y="136" fill="#929DA5" fontSize="9" fontFamily="ui-monospace, monospace" letterSpacing="2">
              REQUEST
            </text>

            <line x1="234" y1="150" x2="296" y2="70" stroke="#293239" strokeWidth="1" />
            <line x1="234" y1="150" x2="318" y2="150" stroke="#293239" strokeWidth="1" />
            <line x1="234" y1="150" x2="296" y2="230" stroke="#293239" strokeWidth="1" />
            <line x1="234" y1="150" x2="296" y2="70" stroke="#65C9E8" strokeWidth="1.5" className="oo-line" />
            <line x1="234" y1="150" x2="318" y2="150" stroke="#65C9E8" strokeWidth="1.5" className="oo-line oo-p1" style={{ opacity: 0 }} />
            <line x1="234" y1="150" x2="296" y2="230" stroke="#65C9E8" strokeWidth="1.5" className="oo-line oo-p2" style={{ opacity: 0 }} />

            <polygon points={HEX} fill="none" stroke="#293239" strokeWidth="1.5" />
            <polygon points={HEX} fill="#C6F36B" className="oo-fillh" />
            <circle cx="200" cy="150" r="40" fill="none" stroke="#65C9E8" strokeWidth="1" className="oo-scan" />
            <text x="200" y="154" textAnchor="middle" fill="#C6F36B" fontSize="10" fontFamily="ui-monospace, monospace" letterSpacing="2">
              OPTM
            </text>

            <circle cx="16" cy="150" r="4" fill="#65C9E8" className="oo-in" style={{ opacity: 0 }} />
            {NODES.map((n, i) => (
              <g key={n.name}>
                <circle
                  cx="234"
                  cy="150"
                  r="4"
                  fill="#C6F36B"
                  className={`oo-out${i === 1 ? " oo-p1" : i === 2 ? " oo-p2" : ""}`}
                  style={{ "--dx": n.dx, "--dy": n.dy, opacity: 0 } as DotStyle}
                />
                <circle
                  cx={i === 1 ? 350 : 328}
                  cy={i === 0 ? 70 : i === 1 ? 150 : 230}
                  r="10"
                  fill="none"
                  stroke="#C6F36B"
                  className={`oo-chip${i === 1 ? " oo-p1" : i === 2 ? " oo-p2" : ""}`}
                  style={{ opacity: 0 }}
                />
                <rect
                  x={i === 1 ? 318 : 296}
                  y={i === 0 ? 59 : i === 1 ? 139 : 219}
                  width="64"
                  height="22"
                  rx="6"
                  fill="#171D22"
                  stroke="#293239"
                />
                <text
                  x={i === 1 ? 350 : 328}
                  y={i === 0 ? 74 : i === 1 ? 154 : 234}
                  textAnchor="middle"
                  fill="#929DA5"
                  fontSize="8"
                  fontFamily="ui-monospace, monospace"
                  letterSpacing="1"
                >
                  {n.name}
                </text>
              </g>
            ))}
          </svg>

          <div className="absolute bottom-3 left-4 z-10 w-48 rounded-lg border border-[#293239] bg-[#090B0D]/90 px-3 py-2.5">
            <p className="font-mono text-[9px] tracking-[0.2em] text-[#929DA5]">
              ROUTED — EST. CALL
            </p>
            {NODES.map((n, i) => (
              <div
                key={n.name}
                className={`oo-read${i === 1 ? " oo-p1" : i === 2 ? " oo-p2" : ""} flex items-baseline justify-between pt-1.5 font-mono text-[9px] text-[#929DA5]`}
                style={{ opacity: 0.35 }}
              >
                <span>{n.sub === "OPENAI" ? "GPT-4O-MI" : n.name}</span>
                <span>
                  {n.cost} · {n.lat}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
