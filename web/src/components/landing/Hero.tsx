"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Reveal, CountUp, useLiveGuard } from "../../lib/landing/Reveal";

// The 3D routing sphere loads only on the client, after hydration, so the
// three.js bundle never blocks the first paint.
const RoutingScene = dynamic(() => import("./RoutingScene"), { ssr: false });

function useRoutingSphere(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      try {
        const c = document.createElement("canvas");
        if (c.getContext("webgl2") || c.getContext("webgl")) setEnabled(true);
      } catch {
        /* no WebGL: keep the SVG fallback */
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
  return enabled;
}

const PRIMARY =
  "group inline-flex h-12 items-center gap-2 rounded-lg bg-[#C6F36B] px-6 text-sm font-semibold text-[#10140A] transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F36B]/50";
const SECONDARY =
  "inline-flex h-12 items-center gap-2 rounded-lg border border-[#293239] px-6 text-sm font-medium text-[#F3F5F2] transition-all duration-200 hover:border-[#C6F36B]/40 hover:text-[#C6F36B] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F36B]/50";

const NODES = [
  { name: "QWEN", sub: "v3.5", dx: "62px", dy: "-80px", cost: "$0.0008", lat: "900 MS" },
  { name: "GPT-4O-MINI", sub: "OPENAI", dx: "84px", dy: "0px", cost: "$0.0012", lat: "600 MS" },
  { name: "CLAUDE", sub: "SONNET", dx: "62px", dy: "80px", cost: "$0.0030", lat: "1400 MS" },
];

const PRESETS = [
  { label: "economy", model: "qwen-3.5", cost: "$0.0008", lat: "900" },
  { label: "balanced", model: "gpt-4o-mini", cost: "$0.0012", lat: "600" },
  { label: "quality", model: "claude-sonnet", cost: "$0.0030", lat: "1400" },
];

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
`;

type DotStyle = React.CSSProperties & Record<"--dx" | "--dy", string>;

const HEX = "234,150 217,179.4 183,179.4 166,150 183,120.6 217,120.6";

export default function Hero() {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const live = useLiveGuard();
  const sphere = useRoutingSphere();

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = panelRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `translate(${px * -6}px, ${py * -6}px)`;
  };
  const onLeave = () => {
    const el = panelRef.current;
    if (el) el.style.transform = "translate(0px, 0px)";
  };

  const status = live.status === "live" ? "LIVE" : live.status === "idle" ? "CONNECTING" : "OFFLINE";

  return (
    <section id="top" className="relative overflow-hidden pt-6">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(198,243,107,0.07),transparent)]"
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 md:px-6 lg:min-h-[88vh] lg:grid-cols-2 lg:items-center lg:gap-8 lg:pt-20">
        <div className="flex flex-col items-start">
          <Reveal as="span">
            <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B]">
              V0.1 BETA / AI ORCHESTRATION, OPTIMIZED
            </p>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="mt-5 text-[clamp(42px,6vw,74px)] font-semibold leading-[1.04] tracking-tight text-[#F3F5F2]">
              Every AI request deserves a{" "}
              <span className="text-[#C6F36B]">smarter route</span>.
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-5 text-lg font-medium text-[#C6F36B]/90">
              Less cost. More intelligence.
            </p>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-[#929DA5] md:text-lg">
              Route every workload to the right model. Control spending.
              Monitor every execution. One unified gateway built on the Otari
              hosted gateway.
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
            <div className="mt-10 flex flex-wrap gap-3">
              {[
                "01 SMART ROUTING",
                "02 BUDGET CONTROL",
                "03 LIVE OBSERVABILITY",
              ].map((chip) => (
                <span
                  key={chip}
                  className="rounded-md border border-[#293239] bg-[#111519] px-3 py-2 font-mono text-[10px] tracking-[0.2em] text-[#929DA5]"
                >
                  <span className="text-[#C6F36B]">{chip.slice(0, 2)}</span>{" "}
                  {chip.slice(3)}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] tracking-[0.2em] text-[#929DA5]">
              <span>
                GATEWAY: <span className={live.status === "offline" ? "text-[#E05353]" : "text-[#C6F36B]"}>{status}</span>
              </span>
              {live.budget && (
                <span>
                  BUDGET CAP ${" "}
                  <CountUp value={live.budget.cap} className="text-[#F3F5F2]" />
                </span>
              )}
              {live.budget && live.budget.remaining > 0 && (
                <span>
                  REMAINING ${" "}
                  <CountUp
                    value={live.budget.remaining}
                    format={(n) => n.toFixed(3)}
                    className="text-[#C6F36B]"
                  />
                </span>
              )}
            </div>
          </Reveal>
        </div>

        <div
          className="relative mx-auto w-full max-w-[580px]"
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          style={{ willChange: "transform" }}
        >
          <div ref={panelRef} className="oo-anim relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#293239] bg-[#111519] transition-transform duration-300">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(101,201,232,0.08),transparent)]"
            />
            <p className="absolute left-4 top-3 z-10 font-mono text-[10px] tracking-[0.2em] text-[#929DA5]">
              GATEWAY LIVE TRACE (DEMO)
            </p>
            <p className="absolute bottom-3 right-4 z-10 font-mono text-[10px] tracking-[0.2em] text-[#293239]">
              {sphere ? "WEBGL ROUTING SPHERE" : "LOOP 4.2S"}
            </p>

            {sphere && (
              <div className="absolute inset-0" aria-hidden>
                <RoutingScene />
              </div>
            )}
            {!sphere && (
            <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" aria-hidden>
              <line x1="16" y1="150" x2="166" y2="150" stroke="#293239" strokeWidth="1" />
              <text x="52" y="136" fill="#929DA5" fontSize="9" fontFamily="ui-monospace, monospace" letterSpacing="2">REQUEST</text>

              <line x1="234" y1="150" x2="296" y2="70" stroke="#293239" strokeWidth="1" />
              <line x1="234" y1="150" x2="318" y2="150" stroke="#293239" strokeWidth="1" />
              <line x1="234" y1="150" x2="296" y2="230" stroke="#293239" strokeWidth="1" />
              <line x1="234" y1="150" x2="296" y2="70" stroke="#65C9E8" strokeWidth="1.5" className="oo-line" opacity={0} />
              <line x1="234" y1="150" x2="318" y2="150" stroke="#65C9E8" strokeWidth="1.5" className="oo-line oo-p1" opacity={0} />
              <line x1="234" y1="150" x2="296" y2="230" stroke="#65C9E8" strokeWidth="1.5" className="oo-line oo-p2" opacity={0} />

              <polygon points={HEX} fill="none" stroke="#293239" strokeWidth="1.5" />
              <polygon points={HEX} fill="#C6F36B" className="oo-fillh" opacity={0.12} />
              <circle cx="200" cy="150" r="40" fill="none" stroke="#65C9E8" strokeWidth="1" className="oo-scan" opacity={0} />
              <text x="200" y="154" textAnchor="middle" fill="#C6F36B" fontSize="10" fontFamily="ui-monospace, monospace" letterSpacing="2">OPTM</text>

              <circle cx="16" cy="150" r="4" fill="#65C9E8" className="oo-in" opacity={0} />
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
                    opacity={0}
                  />
                  <rect x={i === 1 ? 318 : 296} y={i === 0 ? 59 : i === 1 ? 139 : 219} width="64" height="22" rx="6" fill="#171D22" stroke="#293239" />
                  <text x={i === 1 ? 350 : 328} y={i === 0 ? 74 : i === 1 ? 154 : 234} textAnchor="middle" fill="#929DA5" fontSize="8" fontFamily="ui-monospace, monospace" letterSpacing="1">
                    {n.name}
                  </text>
                </g>
              ))}
            </svg>
            )}

            <div className="absolute bottom-3 left-4 z-10 w-52 rounded-lg border border-[#293239] bg-[#090B0D]/90 px-3 py-2.5">
              <p className="font-mono text-[9px] tracking-[0.2em] text-[#929DA5]">
                ROUTED BY POLICY (ILLUSTRATIVE)
              </p>
              <div className="mt-1 grid grid-cols-3 gap-1">
                {PRESETS.map((p, i) => (
                  <div
                    key={p.label}
                    className={`oo-read${i === 1 ? " oo-p1" : i === 2 ? " oo-p2" : ""} font-mono text-[8.5px] text-[#929DA5]`}
                    style={{ opacity: 0.35 }}
                  >
                    <p className="tracking-widest">{p.label}</p>
                    <p className="text-[#F3F5F2]">{p.model}</p>
                    <p>
                      {p.cost} / {p.lat}ms
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
