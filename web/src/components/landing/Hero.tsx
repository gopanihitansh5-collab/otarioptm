"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Reveal, CountUp, useLiveGuard } from "../../lib/landing/Reveal";
import KineticType from "../motion/KineticType";

// The 3D routing sphere loads only on the client, after hydration, so the
// three.js bundle never blocks the first paint.
const RoutingVisualizer = dynamic(
  () => import("../motion/RoutingVisualizer"),
  { ssr: false },
);

function useRoutingSphere(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      // Small screens keep the lightweight static SVG trace.
      if (window.innerWidth < 768) return;
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
  "group inline-flex h-12 items-center gap-2 rounded-lg bg-[var(--color-lime)] px-6 text-sm font-semibold text-[var(--color-obsidian)] shadow-[0_0_28px_rgba(184,169,143,0.18)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lime)]/50";
const SECONDARY =
  "inline-flex h-12 items-center gap-2 rounded-lg border border-[var(--color-steel)] px-6 text-sm font-medium text-[var(--color-ice)] transition-all duration-200 hover:border-[var(--color-lime)]/40 hover:text-[var(--color-lime)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lime)]/50";

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
@keyframes oo-stage { 0%,100% { opacity: 0.35; } }
.oo-stage { animation: oo-stage 6s linear infinite; }
.oo-st0 { animation-name: oo-st0; } @keyframes oo-st0 { 0%,23% { opacity: 1; color: #B8A98F; } 23.1%,100% { opacity: 0.35; } }
.oo-st1 { animation-name: oo-st1; } @keyframes oo-st1 { 0%,23% { opacity: 0.35; } 23%,40% { opacity: 1; color: #B8A98F; } 40.1%,100% { opacity: 0.35; } }
.oo-st2 { animation-name: oo-st2; } @keyframes oo-st2 { 0%,40% { opacity: 0.35; } 40%,67% { opacity: 1; color: #B8A98F; } 67.1%,100% { opacity: 0.35; } }
.oo-st3 { animation-name: oo-st3; } @keyframes oo-st3 { 0%,67% { opacity: 0.35; } 67%,93% { opacity: 1; color: #B8A98F; } 93.1%,100% { opacity: 0.35; } }
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

  const status =
    live.status === "live"
      ? live.liveProviders
        ? "LIVE"
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
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 md:px-6 lg:min-h-[88vh] lg:grid-cols-2 lg:items-center lg:gap-8 lg:pt-20">
        <div className="flex flex-col items-start">
          <Reveal as="span">
            <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-lime)]">
              V0.1 BETA / AI ORCHESTRATION, OPTIMIZED
            </p>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="mt-5 font-display text-[clamp(44px,6vw,76px)] font-normal leading-[1.05] tracking-tight text-[var(--color-ice)]">
              <KineticType text="Intelligence," speed={40} startDelay={350} />{" "}
              <KineticType
                text="without the overhead."
                speed={40}
                startDelay={950}
                className="otari-gradient-text"
              />
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-5 text-lg font-medium text-[var(--color-lime)]/90">
              Route intelligently. Spend deliberately. Operate confidently.
            </p>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-[var(--color-silver)] md:text-lg">
              An intelligent orchestration layer for cost-aware AI
              infrastructure. Route every workload to the right model, control
              spending and monitor every execution through one unified gateway
              built on the Otari hosted gateway.
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
                  className="rounded-md border border-[var(--color-steel)] bg-[var(--color-graphite)] px-3 py-2 font-mono text-[10px] tracking-[0.2em] text-[var(--color-silver)]"
                >
                  <span className="text-[var(--color-lime)]">{chip.slice(0, 2)}</span>{" "}
                  {chip.slice(3)}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] tracking-[0.2em] text-[var(--color-silver)]">
              <span>
                GATEWAY: <span className={live.status === "offline" ? "text-[var(--color-fail)]" : "text-[var(--color-lime)]"}>{status}</span>
              </span>
              {live.budget && (
                <span>
                  BUDGET CAP ${" "}
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

        <div
          className="relative mx-auto w-full max-w-[580px]"
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          style={{ willChange: "transform" }}
        >
          <div ref={panelRef} className="oo-anim relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[var(--color-steel)] bg-[var(--color-graphite)] transition-transform duration-300">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgba(101,201,232,0.08),transparent)]"
            />
            <p className="absolute left-4 top-3 z-10 font-mono text-[10px] tracking-[0.2em] text-[var(--color-silver)]">
              GATEWAY LIVE TRACE (DEMO)
            </p>
            {!sphere && (
              <p className="absolute bottom-3 right-4 z-10 font-mono text-[10px] tracking-[0.2em] text-[var(--color-steel)]">
                LOOP 4.2S
              </p>
            )}

            {sphere && (
              <div className="absolute inset-0 p-3" aria-hidden>
                <RoutingVisualizer />
              </div>
            )}
            {sphere && (
              <div className="oo-anim absolute right-4 top-3 z-10 flex gap-2 font-mono text-[9px] tracking-[0.15em] text-[var(--color-silver)]" aria-hidden>
                <span className="oo-stage oo-st0">RECEIVED</span>
                <span aria-hidden>→</span>
                <span className="oo-stage oo-st1">CLASSIFYING</span>
                <span aria-hidden>→</span>
                <span className="oo-stage oo-st2">ROUTING</span>
                <span aria-hidden>→</span>
                <span className="oo-stage oo-st3">EXECUTED</span>
              </div>
            )}
            {!sphere && (
            <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" aria-hidden>
              <line x1="16" y1="150" x2="166" y2="150" stroke="#34322D" strokeWidth="1" />
              <text x="52" y="136" fill="#A6A197" fontSize="9" fontFamily="ui-monospace, monospace" letterSpacing="2">REQUEST</text>

              <line x1="234" y1="150" x2="296" y2="70" stroke="#34322D" strokeWidth="1" />
              <line x1="234" y1="150" x2="318" y2="150" stroke="#34322D" strokeWidth="1" />
              <line x1="234" y1="150" x2="296" y2="230" stroke="#34322D" strokeWidth="1" />
              <line x1="234" y1="150" x2="296" y2="70" stroke="#8FA6B7" strokeWidth="1.5" className="oo-line" opacity={0} />
              <line x1="234" y1="150" x2="318" y2="150" stroke="#8FA6B7" strokeWidth="1.5" className="oo-line oo-p1" opacity={0} />
              <line x1="234" y1="150" x2="296" y2="230" stroke="#8FA6B7" strokeWidth="1.5" className="oo-line oo-p2" opacity={0} />

              <polygon points={HEX} fill="none" stroke="#34322D" strokeWidth="1.5" />
              <polygon points={HEX} fill="#B8A98F" className="oo-fillh" opacity={0.12} />
              <circle cx="200" cy="150" r="40" fill="none" stroke="#8FA6B7" strokeWidth="1" className="oo-scan" opacity={0} />
              <text x="200" y="154" textAnchor="middle" fill="#B8A98F" fontSize="10" fontFamily="ui-monospace, monospace" letterSpacing="2">OPTM</text>

              <circle cx="16" cy="150" r="4" fill="#8FA6B7" className="oo-in" opacity={0} />
              {NODES.map((n, i) => (
                <g key={n.name}>
                  <circle
                    cx="234"
                    cy="150"
                    r="4"
                    fill="#B8A98F"
                    className={`oo-out${i === 1 ? " oo-p1" : i === 2 ? " oo-p2" : ""}`}
                    style={{ "--dx": n.dx, "--dy": n.dy, opacity: 0 } as DotStyle}
                  />
                  <circle
                    cx={i === 1 ? 350 : 328}
                    cy={i === 0 ? 70 : i === 1 ? 150 : 230}
                    r="10"
                    fill="none"
                    stroke="#B8A98F"
                    className={`oo-chip${i === 1 ? " oo-p1" : i === 2 ? " oo-p2" : ""}`}
                    opacity={0}
                  />
                  <rect x={i === 1 ? 318 : 296} y={i === 0 ? 59 : i === 1 ? 139 : 219} width="64" height="22" rx="6" fill="#1D1C19" stroke="#34322D" />
                  <text x={i === 1 ? 350 : 328} y={i === 0 ? 74 : i === 1 ? 154 : 234} textAnchor="middle" fill="#A6A197" fontSize="8" fontFamily="ui-monospace, monospace" letterSpacing="1">
                    {n.name}
                  </text>
                </g>
              ))}
            </svg>
            )}

            <div
              className={`absolute bottom-3 left-4 z-10 w-52 rounded-lg border border-[var(--color-steel)] bg-[var(--color-obsidian)]/90 px-3 py-2.5${sphere ? " hidden" : ""}`}
            >
              <p className="font-mono text-[9px] tracking-[0.2em] text-[var(--color-silver)]">
                ROUTED BY POLICY (ILLUSTRATIVE)
              </p>
              <div className="mt-1 grid grid-cols-3 gap-1">
                {PRESETS.map((p, i) => (
                  <div
                    key={p.label}
                    className={`oo-read${i === 1 ? " oo-p1" : i === 2 ? " oo-p2" : ""} font-mono text-[8.5px] text-[var(--color-silver)]`}
                    style={{ opacity: 0.35 }}
                  >
                    <p className="tracking-widest">{p.label}</p>
                    <p className="text-[var(--color-ice)]">{p.model}</p>
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
