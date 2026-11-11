"use client";

import { Reveal } from "../../lib/landing/Reveal";

export default function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 border-y border-[var(--color-steel)] bg-[var(--color-graphite)]">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <Reveal>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-lime)]">
            PRICING
          </p>
          <h2 className="mt-3 max-w-2xl text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[var(--color-ice)]">
            Open beta today. The cap is the feature, not the fee.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-silver)]">
            This is a hackathon beta, so pricing is simple and honest: the
            software is free to run, you bring your own keys, and spending is
            governed by the budget cap you can see everywhere in the product.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Reveal className="rounded-xl border border-[var(--color-lime)] bg-[var(--color-elevated)] p-6" delay={0}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-lime)]">
                OPEN BETA
              </p>
              <span className="rounded bg-[var(--color-lime)] px-2 py-0.5 font-mono text-[9px] font-semibold tracking-widest text-[var(--color-obsidian)]">
                CURRENT
              </span>
            </div>
            <p className="mt-6 font-mono text-3xl tracking-tight text-[var(--color-ice)]">
              $0
              <span className="text-sm text-[var(--color-silver)]"> / software</span>
            </p>
            <ul className="mt-6 space-y-2.5 text-sm leading-relaxed text-[var(--color-silver)]">
              {[
                "Studio, gateway and routing engine included",
                "Local demo tier: unlimited, zero-cost responses",
                "$5.00 default project cap on real provider calls",
                "CSV and activity export included",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--color-lime)]" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="panel p-6" delay={80}>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-lime)]">
              BRING YOUR OWN KEYS
            </p>
            <p className="mt-6 font-mono text-3xl tracking-tight text-[var(--color-ice)]">
              at cost
            </p>
            <ul className="mt-6 space-y-2.5 text-sm leading-relaxed text-[var(--color-silver)]">
              {[
                "Otari hosted gateway key for live models",
                "Groq key as fallback, free tier compatible",
                "Exa key for search nodes, pay-per-call",
                "Each call priced before it is sent",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--color-steel)]" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="panel p-6" delay={160}>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--color-lime)]">
              AFTER THE BETA
            </p>
            <p className="mt-6 font-mono text-3xl tracking-tight text-[var(--color-ice)]">
              usage-based
            </p>
            <ul className="mt-6 space-y-2.5 text-sm leading-relaxed text-[var(--color-silver)]">
              {[
                "Same engine: reserve, route, record",
                "Per-project caps; per-user caps need a service key and are not built",
                "Alert policies stay readable in config",
                "No fabricated tiers to inflate the table",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--color-steel)]" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <p className="mt-6 font-mono text-[9px] tracking-[0.2em] text-[var(--color-silver)]">
            PROVIDER CALLS ARE BILLED BY PROVIDERS AT THEIR PUBLISHED RATES. THE
            CAP ENFORCES YOUR LIMIT, IT DOES NOT REPLACE THEIR PRICING.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
