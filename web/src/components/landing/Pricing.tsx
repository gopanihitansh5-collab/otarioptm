"use client";

import { Reveal } from "../../lib/landing/Reveal";

export default function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 border-y border-[#293239] bg-[#111519]">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <Reveal>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B]">
            PRICING
          </p>
          <h2 className="mt-3 max-w-2xl text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[#F3F5F2]">
            Open beta today. The cap is the feature, not the fee.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#929DA5]">
            This is a hackathon beta, so pricing is simple and honest: the
            software is free to run, you bring your own keys, and spending is
            governed by the budget cap you can see everywhere in the product.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Reveal className="rounded-xl border border-[#C6F36B] bg-[#171D22] p-6" delay={0}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] tracking-[0.2em] text-[#C6F36B]">
                OPEN BETA
              </p>
              <span className="rounded bg-[#C6F36B] px-2 py-0.5 font-mono text-[9px] font-semibold tracking-widest text-[#10140A]">
                CURRENT
              </span>
            </div>
            <p className="mt-6 font-mono text-3xl tracking-tight text-[#F3F5F2]">
              $0
              <span className="text-sm text-[#929DA5]"> / software</span>
            </p>
            <ul className="mt-6 space-y-2.5 text-sm leading-relaxed text-[#929DA5]">
              {[
                "Studio, gateway and routing engine included",
                "Local demo tier: unlimited, zero-cost responses",
                "$5.00 default project cap on real provider calls",
                "CSV and activity export included",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#C6F36B]" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="panel p-6" delay={80}>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#C6F36B]">
              BRING YOUR OWN KEYS
            </p>
            <p className="mt-6 font-mono text-3xl tracking-tight text-[#F3F5F2]">
              at cost
            </p>
            <ul className="mt-6 space-y-2.5 text-sm leading-relaxed text-[#929DA5]">
              {[
                "Otari hosted gateway key for live models",
                "Groq key as fallback, free tier compatible",
                "Exa key for search nodes, pay-per-call",
                "Each call priced before it is sent",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#293239]" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="panel p-6" delay={160}>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#C6F36B]">
              AFTER THE BETA
            </p>
            <p className="mt-6 font-mono text-3xl tracking-tight text-[#F3F5F2]">
              usage-based
            </p>
            <ul className="mt-6 space-y-2.5 text-sm leading-relaxed text-[#929DA5]">
              {[
                "Same engine: reserve, route, record",
                "Per-project and per-user caps",
                "Alert policies stay readable in config",
                "No fabricated tiers to inflate the table",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#293239]" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <p className="mt-6 font-mono text-[9px] tracking-[0.2em] text-[#293239]">
            PROVIDER CALLS ARE BILLED BY PROVIDERS AT THEIR PUBLISHED RATES. THE
            CAP ENFORCES YOUR LIMIT, IT DOES NOT REPLACE THEIR PRICING.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
