"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "../../lib/landing/Reveal";

const STEPS = [
  {
    id: "request",
    label: "REQUEST RECEIVED",
    body: "A request enters through the OtariOptm gateway. A glowing particle moves into the router.",
  },
  {
    id: "classify",
    label: "TASK CLASSIFICATION",
    body: "The engine evaluates task complexity, required capabilities and routing constraints.",
  },
  {
    id: "select",
    label: "MODEL SELECTION",
    body: "Candidate model nodes illuminate. The selected model receives the active route.",
  },
  {
    id: "execute",
    label: "EXECUTION",
    body: "The request flows to the model. A progress indicator and token counter update.",
  },
  {
    id: "analytics",
    label: "RESPONSE AND ANALYTICS",
    body: "Cost, latency and token usage appear in the analytics panel. Budget is committed atomically.",
  },
];

export default function ProductDemo() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [staticAll, setStaticAll] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStaticAll(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.step);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        }
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const stage = staticAll ? STEPS.length : active;

  return (
    <section id="demo" className="scroll-mt-24 border-y border-[#293239] bg-[#111519]">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <Reveal>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B]">
            PRODUCT DEMO
          </p>
          <h2 className="mt-3 max-w-2xl text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[#F3F5F2]">
            One workflow graph shows the entire lifecycle.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
          <div className="space-y-4 lg:space-y-24">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                data-step={i}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className={`rounded-xl border p-5 transition-colors duration-300 ${
                  stage === i
                    ? "border-[#C6F36B]/60 bg-[#090B0D]"
                    : "border-[#293239] bg-[#090B0D]/50"
                }`}
              >
                <p
                  className={`font-mono text-[10px] tracking-[0.2em] transition-colors duration-300 ${
                    stage === i ? "text-[#C6F36B]" : "text-[#929DA5]"
                  }`}
                >
                  STEP {i + 1} / {STEPS.length} - {s.label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#929DA5]">
                  {s.body}
                </p>
              </div>
            ))}
          </div>

          <div className="lg:sticky lg:top-32 self-start">
            <div className="panel !transform-none p-5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-[0.2em] text-[#929DA5]">
                  WORKFLOW EXECUTION (DEMO)
                </p>
                <span className="rounded border border-[#293239] px-2 py-0.5 font-mono text-[9px] tracking-widest text-[#929DA5]">
                  DEMO MODE
                </span>
              </div>
              <DemoGraph stage={stage} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoGraph({ stage }: { stage: number }) {
  const nodes = [
    { name: "WEB SEARCH", col: 0 },
    { name: "MODEL ROUTER", col: 1 },
    { name: "GUARDRAILS", col: 2 },
    { name: "OUTPUT", col: 3 },
  ];
  const active = [false, false, false, false];
  active[Math.min(stage, 3)] = true;
  const completed = Math.max(0, Math.min(stage, 4));
  const isDone = (col: number) => completed > col;

  const chip = (name: string, col: number) => {
    const act = active[col];
    const done = isDone(col);
    const stroke = act ? "#C6F36B" : done ? "#293239" : "#293239";
    const fill = done ? "#171D22" : "#171D22";
    return (
      <rect
        x={col * 96 + 26}
        y={92}
        width={86}
        height={40}
        rx={9}
        fill={fill}
        stroke={stroke}
        strokeWidth={act ? 1.5 : 1}
      />
    );
  };

  return (
    <svg viewBox="0 0 380 210" className="mt-4 h-auto w-full" aria-hidden={false}>
      {chip(nodes[0].name, 0)}
      {chip(nodes[1].name, 1)}
      {chip(nodes[2].name, 2)}
      {chip(nodes[3].name, 3)}

      {nodes.map((n) => (
        <text
          key={n.name}
          x={n.col * 96 + 69}
          y={115}
          textAnchor="middle"
          fill={active[n.col] ? "#C6F36B" : "#929DA5"}
          fontSize="8"
          fontFamily="ui-monospace, monospace"
          letterSpacing="1.2"
        >
          {n.name}
        </text>
      ))}

      {[0, 1, 2].map((i) => (
        <line
          key={`edge-${i}`}
          x1={i * 96 + 112}
          y1={112}
          x2={(i + 1) * 96 + 26}
          y2={112}
          stroke={completed > i ? "#65C9E8" : "#293239"}
          strokeWidth={completed > i ? 1.5 : 1}
          strokeDasharray={completed > i ? undefined : "3 4"}
        />
      ))}

      {completed > 0 && completed < 4 && (
        <circle
          cx={Math.min(completed, 3) * 96 + 69}
          cy={112}
          r={5}
          fill="#65C9E8"
        />
      )}

      <text x="30" y="40" fill="#929DA5" fontSize="8" fontFamily="ui-monospace, monospace" letterSpacing="1.5">
        {stage >= 4 ? "TOKENS 182" : stage === 3 ? "TOKENS..." : stage === 2 ? "SCANNING" : "WAITING"}
      </text>
      <text x="30" y="60" fill={stage >= 4 ? "#C6F36B" : "#929DA5"} fontSize="8" fontFamily="ui-monospace, monospace" letterSpacing="1.5">
        COST $0.00{Math.min(2 + stage, 7)}
      </text>

      <rect x="26" y="152" width="338" height="1" fill="#293239" />
      <text x="26" y="172" fill="#929DA5" fontSize="7" fontFamily="ui-monospace, monospace" letterSpacing="1.5">
        {stage === 0 ? "REQUEST ADMITTED" : stage === 1 ? "CLASSIFYING TASK" : stage === 2 ? "CANDIDATES SCORED" : stage === 3 ? "MODEL EXECUTING" : "ANALYTICS PUBLISHED"}
      </text>
      <text x="352" y="172" textAnchor="end" fill="#C6F36B" fontSize="7" fontFamily="ui-monospace, monospace" letterSpacing="1.5">
        {stage === 4 ? "COMPLETE" : `STEP ${Math.min(stage + 1, 5)}/5`}
      </text>
    </svg>
  );
}
