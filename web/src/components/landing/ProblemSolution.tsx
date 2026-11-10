"use client";

import { Reveal } from "../../lib/landing/Reveal";

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
    body: "Spend and latency live in three separate dashboards; nothing blocks a run before the invoice lands.",
  },
];

function FlowChaos() {
  return (
    <svg viewBox="0 0 280 150" className="h-auto w-full" aria-hidden>
      <line x1="20" y1="30" x2="120" y2="30" stroke="#293239" strokeWidth="1" />
      <line x1="20" y1="30" x2="120" y2="70" stroke="#293239" strokeWidth="1" />
      <line x1="20" y1="30" x2="120" y2="110" stroke="#293239" strokeWidth="1" />
      <rect x="0" y="18" width="70" height="24" rx="6" fill="#171D22" stroke="#293239" />
      <text x="35" y="33" textAnchor="middle" fill="#929DA5" fontSize="8" fontFamily="ui-monospace, monospace" letterSpacing="1">GUESS 1</text>
      <rect x="120" y="18" width="76" height="24" rx="6" fill="#171D22" stroke="#293239" />
      <text x="158" y="33" textAnchor="middle" fill="#E8B44A" fontSize="8" fontFamily="ui-monospace, monospace" letterSpacing="1">$0.0030 ML</text>
      <rect x="120" y="58" width="76" height="24" rx="6" fill="#171D22" stroke="#293239" />
      <text x="158" y="73" textAnchor="middle" fill="#E8B44A" fontSize="8" fontFamily="ui-monospace, monospace" letterSpacing="1">1400 MS ML</text>
      <rect x="120" y="98" width="76" height="24" rx="6" fill="#171D22" stroke="#293239" />
      <text x="158" y="113" textAnchor="middle" fill="#929DA5" fontSize="8" fontFamily="ui-monospace, monospace" letterSpacing="1">DRIFT</text>
      <rect x="216" y="58" width="60" height="24" rx="6" fill="#090B0D" stroke="#293239" />
      <text x="246" y="73" textAnchor="middle" fill="#929DA5" fontSize="8" fontFamily="ui-monospace, monospace" letterSpacing="1">PAY MORE</text>
      <line x1="196" y1="70" x2="216" y2="70" stroke="#E8B44A" strokeWidth="1" strokeDasharray="3 3" />
      <text x="140" y="142" textAnchor="middle" fill="#E8B44A" fontSize="7" fontFamily="ui-monospace, monospace" letterSpacing="1.5">MANUAL PICKS, RENEGOTIATED EVERY RUN</text>
    </svg>
  );
}

function FlowOptm() {
  return (
    <svg viewBox="0 0 280 150" className="h-auto w-full" aria-hidden>
      <line x1="30" y1="70" x2="110" y2="70" stroke="#65C9E8" strokeWidth="1.5" />
      <circle cx="30" cy="70" r="4" fill="#65C9E8" />
      <rect x="110" y="46" width="64" height="48" rx="10" fill="#171D22" stroke="#C6F36B" />
      <text x="142" y="74" textAnchor="middle" fill="#C6F36B" fontSize="9" fontFamily="ui-monospace, monospace" letterSpacing="1.5">OPTM</text>
      <circle cx="142" cy="70" r="13" fill="none" stroke="#C6F36B" strokeOpacity="0.35" strokeWidth="1" />
      <line x1="174" y1="70" x2="250" y2="70" stroke="#65C9E8" strokeWidth="1.5" />
      <rect x="230" y="58" width="0" height="0" fill="none" />
      <rect x="196" y="16" width="80" height="22" rx="6" fill="#171D22" stroke="#293239" />
      <text x="236" y="30" textAnchor="middle" fill="#C6F36B" fontSize="8" fontFamily="ui-monospace, monospace" letterSpacing="1">C cheapest</text>
      <rect x="196" y="59" width="80" height="22" rx="6" fill="#171D22" stroke="#293239" />
      <text x="236" y="73" textAnchor="middle" fill="#929DA5" fontSize="8" fontFamily="ui-monospace, monospace" letterSpacing="1">L2 MID</text>
      <rect x="196" y="102" width="80" height="22" rx="6" fill="#171D22" stroke="#293239" />
      <text x="236" y="116" textAnchor="middle" fill="#929DA5" fontSize="8" fontFamily="ui-monospace, monospace" letterSpacing="1">L3 BACKUP</text>
      <g>
        <rect x="36" y="108" width="76" height="30" rx="6" fill="#171D22" stroke="#293239" />
        <text x="74" y="122" textAnchor="middle" fill="#929DA5" fontSize="7" fontFamily="ui-monospace, monospace" letterSpacing="1">BUDGET RESERVE</text>
        <text x="74" y="132" textAnchor="middle" fill="#C6F36B" fontSize="7" fontFamily="ui-monospace, monospace" letterSpacing="1">COMMITTED</text>
      </g>
      <text x="140" y="142" textAnchor="middle" fill="#C6F36B" fontSize="7" fontFamily="ui-monospace, monospace" letterSpacing="1.5">ONE ROUTER, SCORED PER CALL</text>
    </svg>
  );
}

export default function ProblemSolution() {
  return (
    <section id="product" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <Reveal>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B]">
            THE PROBLEM
          </p>
          <h2 className="mt-3 max-w-2xl text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[#F3F5F2]">
            Fragmented models mean gaming a pricing page every day.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Reveal className="panel p-6" delay={60}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] tracking-[0.2em] text-[#E8B44A]">
                WITHOUT OTARIOPTM
              </p>
              <span className="rounded border border-[#293239] px-2 py-0.5 font-mono text-[9px] tracking-widest text-[#929DA5]">
                ILLUSTRATIVE
              </span>
            </div>
            <div className="mt-4">
              <FlowChaos />
            </div>
          </Reveal>
          <Reveal className="panel p-6" delay={140}>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] tracking-[0.2em] text-[#C6F36B]">
                WITH OTARIOPTM
              </p>
              <span className="rounded border border-[#293239] px-2 py-0.5 font-mono text-[9px] tracking-widest text-[#929DA5]">
                ILLUSTRATIVE
              </span>
            </div>
            <div className="mt-4">
              <FlowOptm />
            </div>
          </Reveal>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c, i) => (
            <Reveal key={c.n} className="panel p-6" delay={i * 70}>
              <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B]">
                {c.n}
              </p>
              <h3 className="mt-3 text-lg font-medium text-[#F3F5F2]">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#929DA5]">{c.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
