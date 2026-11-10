"use client";

import { Reveal } from "../../lib/landing/Reveal";

const CARD =
  "rounded-xl border border-[#293239] bg-[#171D22] p-6 transition-all duration-200 hover:-translate-y-[3px] hover:border-[#C6F36B]/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

export function UseCases() {
  const CARDS = [
    {
      title: "AI SaaS",
      body: "Ship model-backed features without betting your margin on one provider.",
    },
    {
      title: "AI agents",
      body: "Keep multi-step agents inside budget with per-run reservations and 402 stops.",
    },
    {
      title: "RAG pipelines",
      body: "Route retrieval, embedding and generation calls to the cheapest healthy model.",
    },
    {
      title: "Enterprise workloads",
      body: "One gateway, full audit trail, CSV spend export for finance.",
    },
  ];
  return (
    <section id="use-cases" className="scroll-mt-24 border-y border-[#293239] bg-[#111519]">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <Reveal>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B]">
            USE CASES
          </p>
          <h2 className="mt-3 text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[#F3F5F2]">
            Wherever tokens flow, OtariOptm meters them.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} className={CARD} delay={i * 60}>
              <h3 className="text-base font-medium text-[#F3F5F2]">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#929DA5]">
                {c.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ClosingCTA() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-[#293239] bg-[#111519] px-6 py-14 text-center md:px-16 md:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(198,243,107,0.08),transparent)]"
            />
            <h2 className="mx-auto max-w-2xl text-[clamp(32px,4.5vw,48px)] font-semibold leading-[1.1] tracking-tight text-[#C6F36B]">
              Finish your project, not your prompt engineering.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base text-[#929DA5]">
              Open the studio, wire a workflow, and let the gateway account for
              every token.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="/studio"
                className="group inline-flex h-12 items-center gap-2 rounded-lg bg-[#C6F36B] px-6 text-sm font-semibold text-[#10140A] transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F36B]/50"
              >
                Open Studio
                <span
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </a>
              <a
                href="https://github.com/gopanihitansh5-collab/otarioptm"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-[#293239] px-6 text-sm font-medium text-[#F3F5F2] transition-all duration-200 hover:border-[#C6F36B]/40 hover:text-[#C6F36B] active:scale-[0.98]"
              >
                View source <span aria-hidden className="text-[10px]">↗</span>
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
