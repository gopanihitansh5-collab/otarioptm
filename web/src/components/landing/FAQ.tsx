"use client";

import { useState } from "react";
import { Reveal } from "../../lib/landing/Reveal";

const QA = [
  {
    q: "Is the API OpenAI-compatible?",
    a: "Yes. POST /api/v1/chat/completions accepts an OpenAI-style body and returns OpenAI-style choices. Any OpenAI client works by swapping the base URL and the key.",
  },
  {
    q: "What happens when a provider fails?",
    a: "The router walks the fallback chain: Otari hosted gateway, then Groq, then a deterministic local demo tier. Each failed provider's raw error is collected into a diagnostic note attached to the result and the activity feed.",
  },
  {
    q: "How exactly is the budget enforced?",
    a: "Before dispatch, the gateway reserves the estimated cost atomically under an asyncio lock. On completion the real spend replaces the reservation. If the reservation does not fit the remaining cap, the node is refused with HTTP 402 and an alert email is sent via Resend.",
  },
  {
    q: "Which models can it route to?",
    a: "Whatever the connected tiers expose: hosted Otari models with provider credentials, Groq's catalogue discovered at runtime, and the built-in demo tier that always answers.",
  },
  {
    q: "Do workflows persist?",
    a: "Studio workflows are stored in browser localStorage (key otarioptm.workflow.v1) with undo and redo, keyboard shortcuts and node statuses. The gateway is stateless between runs.",
  },
  {
    q: "What does a search node use?",
    a: "Exa's search API with an objective and highlights, falling back to DuckDuckGo extraction when Exa is unavailable. Real Exa costs are recorded into the same budget.",
  },
  {
    q: "Can I see and export every dollar?",
    a: "Yes. The studio shows a live meter plus a WebSocket activity feed, GET /api/v1/budget returns the snapshot, and GET /api/v1/export streams the full spend log as CSV with a totals row.",
  },
  {
    q: "Is the code-exec node safe to run untrusted code?",
    a: "It is a best-effort MVP sandbox: imports blocked, five-second timeout, exec isolated in-process. The source labels it honestly as not a security boundary. For untrusted multi-tenant code you would run it in a proper container.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number>(0);

  return (
    <section id="faq" className="scroll-mt-24">
      <div className="mx-auto max-w-4xl px-4 py-20 md:px-6 md:py-24">
        <Reveal>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-lime)]">
            FAQ
          </p>
          <h2 className="mt-3 text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[var(--color-ice)]">
            The questions a technical buyer asks first.
          </h2>
        </Reveal>

        <div className="mt-10 divide-y divide-[var(--color-steel)] border-y border-[var(--color-steel)]">
          {QA.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-lime)]/50"
                >
                  <span
                    className={`text-[15px] font-medium transition-colors duration-200 ${
                      isOpen ? "text-[var(--color-lime)]" : "text-[var(--color-ice)]"
                    }`}
                  >
                    {item.q}
                  </span>
                  <span
                    aria-hidden
                    className={`shrink-0 font-mono text-sm text-[var(--color-silver)] transition-transform duration-300 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                <div
                  id={`faq-panel-${i}`}
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0 motion-reduce:opacity-100"
                  }`}
                >
                  <p className="overflow-hidden pb-5 text-sm leading-relaxed text-[var(--color-silver)]">
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
