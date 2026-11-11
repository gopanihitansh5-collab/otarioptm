"use client";

import { useState } from "react";
import { Reveal } from "../../lib/landing/Reveal";

const GH = "https://github.com/gopanihitansh5-collab/otarioptm";
const OTARI = "https://github.com/mozilla-ai/otari";

const CURL = `curl -X POST "https://eu.api.otari.ai/api/v1/chat/completions" \\
  -H "Authorization: Bearer $OTARI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai:gpt-4o-mini",
    "messages": [
      { "role": "user", "content": "Summarize this support ticket" }
    ]
  }'`;

const LOCAL = `# gateway (FastAPI)
git clone https://github.com/gopanihitansh5-collab/otarioptm.git
cd otarioptm
pip install -r requirements.txt
set OTARI_API_KEY=otk_your_key
python run_server.py

# web studio (Next.js)
cd web
npm install
npm run dev`;

const DOCKER = `# run the Otari core with your own provider keys
git clone ${OTARI}.git
cd otari
cp config.example.yml config.yml
docker compose pull
docker compose up -d`;

const TABS = ["GATEWAY URL", "EXAMPLE REQUEST", "LOCAL QUICKSTART", "SELF-HOST DOCKER"] as const;

export default function DX() {
  const [tab, setTab] = useState<0 | 1 | 2 | 3>(0);
  const [copied, setCopied] = useState(false);

  const textFor = () =>
    tab === 0
      ? "https://eu.api.otari.ai/api/v1\nAuthorization: Bearer $OTARI_API_KEY"
      : tab === 1
        ? CURL
        : tab === 2
          ? LOCAL
          : DOCKER;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(textFor());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <section id="code" className="scroll-mt-24 border-y border-[#34322D] bg-[#171715]">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <Reveal>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[#B8A98F]">
            DEVELOPER EXPERIENCE
          </p>
          <h2 className="mt-3 max-w-2xl text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[#E9E4DA]">
            One base URL. Three headers. Or run your own.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#A6A197]">
            OtariOptm sits on the hosted Otari gateway, an OpenAI-compatible
            surface. Point any existing OpenAI client at it and routing, metering
            and budgets come along for free.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-8 overflow-hidden rounded-xl border border-[#34322D] bg-[#1D1C19]">
            <div className="scroll-thin flex items-center justify-between overflow-x-auto border-b border-[#34322D]">
              <div className="flex">
                {TABS.map((t, i) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(i as 0 | 1 | 2 | 3)}
                    aria-pressed={tab === i}
                    className={`h-11 shrink-0 border-b-2 px-4 font-mono text-[11px] tracking-widest transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B8A98F]/50 ${
                      tab === i
                        ? "border-[#B8A98F] text-[#B8A98F]"
                        : "border-transparent text-[#A6A197] hover:text-[#E9E4DA]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={copy}
                className="mr-3 inline-flex h-11 shrink-0 items-center rounded-lg border border-[#34322D] px-3 font-mono text-[9px] tracking-widest text-[#A6A197] transition-colors duration-200 hover:border-[#B8A98F]/40 hover:text-[#B8A98F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8A98F]/50"
              >
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>
            <pre className="scroll-thin overflow-x-auto bg-[#111110] p-5 font-mono text-xs leading-6 text-[#A6A197]">
              {textFor()}
            </pre>
          </div>
        </Reveal>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Reveal className="panel p-5" delay={140}>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#B8A98F]">
              QUICKSTART
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#A6A197]">
              Open the Studio, drop a Chat node and a Search node, connect them,
              press run. The gateway routes and meters every step.
            </p>
          </Reveal>
          <Reveal className="panel p-5" delay={200}>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#B8A98F]">
              YOUR GATEWAY, YOUR KEYS
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#A6A197]">
              Run against the hosted Otari gateway for the demo, or self-host
              the FastAPI gateway with your own provider credentials in
              config.yml.
            </p>
          </Reveal>
          <Reveal className="panel p-5" delay={260}>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#B8A98F]">
              SOURCE
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#A6A197]">
              Full-stack source is public:{" "}
              <a
                href={GH}
                target="_blank"
                rel="noreferrer"
                className="text-[#B8A98F] transition-colors duration-200 hover:text-[#CCBDA5]"
              >
                otarioptm on GitHub
              </a>
              .
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
