"use client";

import { useState } from "react";

const CARD =
  "rounded-xl border border-[#293239] bg-[#171D22] p-6 transition-all duration-200 hover:-translate-y-[3px] hover:border-[#C6F36B]/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

const CURL = `curl -X POST "https://eu.api.otari.ai/api/v1/chat/completions" \\
  -H "Authorization: Bearer $OTARI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai:gpt-4o-mini",
    "messages": [
      { "role": "user", "content": "Summarize this support ticket" }
    ]
  }'`;

const URL_TEXT = "https://eu.api.otari.ai/api/v1\nAuthorization: Bearer $OTARI_API_KEY";

export function Problem() {
  const CARDS = [
    {
      n: "01",
      title: "Manual model picking chaos",
      body: "Every request, someone eyeballs a pricing page and guesses which model is good enough today.",
    },
    {
      n: "02",
      title: "Provider lock-in",
      body: "One SDK per provider means rewrites every time limits hit or prices move.",
    },
    {
      n: "03",
      title: "Invisible costs, visible latency",
      body: "Spend and latency live in three dashboards; nobody blocks a run until the invoice lands.",
    },
  ];
  return (
    <section id="product" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B]">
          01 — THE PROBLEM
        </p>
        <h2 className="mt-3 max-w-2xl text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[#F3F5F2]">
          Fragmented models mean gaming a pricing page every day.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c) => (
            <div key={c.n} className={CARD}>
              <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B]">{c.n}</p>
              <h3 className="mt-3 text-lg font-medium text-[#F3F5F2]">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#929DA5]">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Ships() {
  const CARDS = [
    {
      title: "Visual workflow studio",
      body: "Drag Model Chat, Web Search, Code Exec and Guardrails nodes onto a canvas. Wire them, save, run.",
    },
    {
      title: "Budget enforcement",
      body: "Atomic reservations before each call. Over budget returns HTTP 402 before a token is spent. Live meter.",
    },
    {
      title: "Auto-routing",
      body: "Cost, latency and provider health scored per call, then routed to the best available model.",
    },
    {
      title: "Live activity stream + CSV export",
      body: "WebSocket events as executions happen. Export the full spend log whenever finance asks.",
    },
  ];
  return (
    <section className="border-y border-[#293239] bg-[#111519]">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B]">
          04 — WHAT SHIPS TODAY
        </p>
        <h2 className="mt-3 text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[#F3F5F2]">
          Built, not promised.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c) => (
            <div key={c.title} className={CARD}>
              <span className="inline-block rounded border border-[#C6F36B]/40 px-2 py-0.5 font-mono text-[9px] tracking-widest text-[#C6F36B]">
                STATUS: BUILT
              </span>
              <h3 className="mt-4 text-base font-medium text-[#F3F5F2]">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#929DA5]">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Integration() {
  const [tab, setTab] = useState<0 | 1>(0);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const text = tab === 0 ? URL_TEXT : CURL;
    try {
      navigator.clipboard.writeText(text).then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        },
        () => {}
      );
    } catch {
      /* clipboard unavailable */
    }
  };

  const TABS = ["GATEWAY URL", "EXAMPLE REQUEST"];

  return (
    <section id="code" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B]">
          05 — INTEGRATE
        </p>
        <h2 className="mt-3 text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[#F3F5F2]">
          One base URL. Three headers. Done.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#929DA5]">
          OtariOptm sits on the hosted Otari gateway. Point your client at the
          base URL, pass your key, and every request is routed and metered.
        </p>

        <div className="mt-8 overflow-hidden rounded-xl border border-[#293239] bg-[#171D22]">
          <div className="flex items-center justify-between border-b border-[#293239]">
            <div className="flex">
              {TABS.map((t, i) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(i as 0 | 1)}
                  aria-pressed={tab === i}
                  className={`h-11 border-b-2 px-4 font-mono text-[11px] tracking-widest transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C6F36B]/50 ${
                    tab === i
                      ? "border-[#C6F36B] text-[#C6F36B]"
                      : "border-transparent text-[#929DA5] hover:text-[#F3F5F2]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={copy}
              className="mr-3 rounded border border-[#293239] px-2.5 py-1 font-mono text-[9px] tracking-widest text-[#929DA5] transition-colors duration-200 hover:border-[#C6F36B]/40 hover:text-[#C6F36B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F36B]/50"
            >
              {copied ? "COPIED" : "COPY"}
            </button>
          </div>
          <pre className="overflow-x-auto bg-[#090B0D] p-5 font-mono text-xs leading-6 text-[#929DA5]">
            {tab === 0 ? (
              <>
                <span className="text-[#929DA5]">{"// hosted otari gateway\n\n"}</span>
                <span className="text-[#F3F5F2]">https://eu.api.otari.ai/api/v1</span>
                {"\n\n"}
                <span className="text-[#929DA5]">{"// authorization header\n\n"}</span>
                <span className="text-[#65C9E8]">Authorization: Bearer $OTARI_API_KEY</span>
                {"\n"}
              </>
            ) : (
              CURL
            )}
          </pre>
        </div>
      </div>
    </section>
  );
}

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
    <section className="border-y border-[#293239] bg-[#111519]">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B]">
          06 — USE CASES
        </p>
        <h2 className="mt-3 text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[#F3F5F2]">
          Wherever tokens flow, OtariOptm meters them.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((c) => (
            <div key={c.title} className={CARD}>
              <h3 className="text-base font-medium text-[#F3F5F2]">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#929DA5]">{c.body}</p>
            </div>
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
        <div className="rounded-2xl border border-[#293239] bg-[#111519] px-6 py-14 text-center md:px-16 md:py-20">
          <h2 className="mx-auto max-w-2xl text-[clamp(32px,4.5vw,48px)] font-semibold leading-[1.1] tracking-tight text-[#C6F36B]">
            Finish your project, not your prompt engineering.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-[#929DA5]">
            Open the studio, wire a workflow, and let the gateway account for
            every token.
          </p>
          <div className="mt-8 flex justify-center">
            <a
              href="/studio"
              className="group inline-flex h-12 items-center gap-2 rounded-lg bg-[#C6F36B] px-6 text-sm font-semibold text-[#10140A] transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F36B]/50"
            >
              Open Studio
              <span
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                →
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
