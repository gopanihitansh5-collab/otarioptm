"use client";

import { Reveal } from "../../lib/landing/Reveal";

const Items = [
  {
    title: "API key security",
    body: "Provider keys live in a server-side environment file, never committed to git. We audited gateway logging and error paths: no key values are printed or returned, and key-shaped strings are redacted by a guardrail pattern.",
    status: "IMPLEMENTED",
  },
  {
    title: "Sandbox isolation",
    body: "The code-exec node currently refuses every program: a confirmed escape in the previous in-process sandbox means it stays off until execution runs behind a genuine isolation boundary (separate container and user, no shared filesystem). Chat, web-search and guardrails nodes are unaffected.",
    status: "TEMPORARILY UNAVAILABLE",
  },
  {
    title: "Failure handling",
    body: "Every chat call falls through Otari to Groq to the local demo tier, and the activity feed carries a diagnostic note with each provider's raw failure reason.",
    status: "IMPLEMENTED",
  },
  {
    title: "Budget as rate control",
    body: "The project cap refuses an over-budget run with HTTP 402 before a token leaves. It is tracked in memory per server instance, so it is not a durable cross-instance guarantee on serverless deploys; a call that fails after dispatch can still be billed by the provider. Per-run spend is labeled by source: provider-reported or estimate.",
    status: "IMPLEMENTED",
  },
  {
    title: "Data and events",
    body: "The activity feed and CSV export are served by your own gateway instance. This page sets no third-party analytics or tracking cookies.",
    status: "IMPLEMENTED",
  },
  {
    title: "Known limits",
    body: "Workflows persist in browser localStorage, not a multi-tenant database; the demo tier is a deterministic local responder, not a real model.",
    status: "HONEST LIMITS",
  },
];

export default function Trust() {
  return (
    <section id="trust" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <Reveal>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-lime)]">
            TRUST AND LIMITS
          </p>
          <h2 className="mt-3 max-w-2xl text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[var(--color-ice)]">
            What is hardened, what is honest about being a beta.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Items.map((c, i) => (
            <Reveal key={c.title} className="panel p-6" delay={i * 60}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-medium text-[var(--color-ice)]">
                  {c.title}
                </h3>
                <span className="shrink-0 rounded border border-[var(--color-steel)] px-1.5 py-0.5 font-mono text-[8.5px] tracking-widest text-[var(--color-silver)]">
                  {c.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-silver)]">
                {c.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
