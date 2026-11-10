"use client";

import { useEffect, useState } from "react";

const LAYERS: {
  name: string;
  glyph: string;
  desc: string;
  chips?: string[];
}[] = [
  {
    name: "Applications & SDKs",
    glyph: "[SDK]",
    desc: "Client apps and SDKs open one connection to the gateway.",
  },
  {
    name: "API Gateway",
    glyph: "[GATE]",
    desc: "Auth, rate limits and request validation at the edge.",
  },
  {
    name: "Orchestration Engine",
    glyph: "[OPTM]",
    desc: "Scores cost, latency and health per call; reserves budget atomically.",
    chips: ["SMART ROUTER", "BUDGET GUARD", "WORKFLOW ENGINE", "GUARDRAILS"],
  },
  {
    name: "Provider Adapter Layer",
    glyph: "[ADPT]",
    desc: "Normalizes every provider protocol into one interface.",
  },
  {
    name: "Models",
    glyph: "[MDLS]",
    desc: "Hosted and third-party models behind uniform routing.",
  },
  {
    name: "Observability & Storage",
    glyph: "[OBSV]",
    desc: "Every execution logged, every dollar accounted, CSV export.",
  },
];

function isReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function Architecture() {
  const [tracing, setTracing] = useState(false);
  const [step, setStep] = useState(-1);
  const [staticAll, setStaticAll] = useState(false);

  useEffect(() => {
    if (!tracing) return;
    if (isReducedMotion()) {
      setStaticAll(true);
      setStep(-1);
      return;
    }
    setStaticAll(false);
    setStep(0);
    const id = setInterval(() => setStep((s) => (s + 1) % LAYERS.length), 800);
    return () => clearInterval(id);
  }, [tracing]);

  const toggle = () => {
    if (tracing) {
      setTracing(false);
      setStaticAll(false);
      setStep(-1);
    } else {
      setTracing(true);
    }
  };

  return (
    <section id="architecture" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B]">
              03 — ARCHITECTURE
            </p>
            <h2 className="mt-3 text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[#F3F5F2]">
              One request, six layers, zero blind spots.
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {tracing && (
              <span className="rounded-md border border-[#C6F36B]/40 px-2.5 py-1.5 font-mono text-[10px] tracking-widest text-[#C6F36B]">
                {staticAll ? "TRACED — STATIC" : `TRACING — STEP ${step + 1}/${LAYERS.length}`}
              </span>
            )}
            <button
              type="button"
              onClick={toggle}
              className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 font-mono text-[11px] tracking-widest transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F36B]/50 ${
                tracing
                  ? "border-[#C6F36B] text-[#C6F36B]"
                  : "border-[#293239] text-[#929DA5] hover:border-[#C6F36B]/40 hover:text-[#C6F36B]"
              }`}
            >
              {tracing && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[#C6F36B] motion-safe:animate-pulse"
                  aria-hidden
                />
              )}
              {tracing ? "STOP TRACE" : "TRACE THIS REQUEST"}
            </button>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-4xl">
          {LAYERS.map((layer, i) => {
            const active = tracing && (staticAll || i === step);
            const next = LAYERS[i + 1];
            return (
              <div key={layer.name}>
                <div
                  className={`group relative flex items-start gap-4 rounded-xl border bg-[#171D22] p-4 transition-colors duration-200 md:p-5 ${
                    active
                      ? "border-[#C6F36B]"
                      : "border-[#293239] hover:border-[#C6F36B]/40"
                  }`}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute right-4 top-1/2 -mt-1 h-2 w-2 motion-safe:animate-ping rounded-full bg-[#C6F36B]"
                    />
                  )}
                  <span
                    className={`shrink-0 rounded-md border px-2 py-1 font-mono text-[10px] tracking-widest transition-colors duration-200 ${
                      active
                        ? "border-[#C6F36B] text-[#C6F36B]"
                        : "border-[#293239] text-[#929DA5] group-hover:border-[#C6F36B]/40 group-hover:text-[#C6F36B]"
                    }`}
                  >
                    {layer.glyph}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium transition-colors duration-200 ${
                        active
                          ? "text-[#C6F36B]"
                          : "text-[#F3F5F2] group-hover:text-[#C6F36B]"
                      }`}
                    >
                      {layer.name}
                      <span className="ml-3 font-mono text-[9px] tracking-widest text-[#929DA5]">
                        L{i + 1}
                      </span>
                    </p>
                    <p
                      className={`mt-1 h-5 max-w-xl text-xs text-[#929DA5] transition-opacity duration-200 ${
                        active || "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {layer.desc}
                    </p>
                    {layer.chips && (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {layer.chips.map((c) => (
                          <span
                            key={c}
                            className={`rounded-md border bg-[#090B0D] px-2 py-1.5 text-center font-mono text-[9px] tracking-widest transition-colors duration-200 ${
                              active
                                ? "border-[#C6F36B]/40 text-[#C6F36B]"
                                : "border-[#293239] text-[#929DA5]"
                            }`}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {next && <div aria-hidden className="mx-auto h-6 w-px bg-[#293239]" />}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
