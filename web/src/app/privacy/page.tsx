import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy - OtariOptm",
  description:
    "What OtariOptm collects, where workflow data lives, and how API keys are handled.",
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "The short version",
    body: [
      "OtariOptm is a beta hackathon project. It has no accounts, no sign-in, no tracking cookies, and no analytics pipeline. We do not sell, share, or broker any data because there is effectively nothing to sell.",
    ],
  },
  {
    title: "What stays in your browser",
    body: [
      "The Studio workflow editor saves your canvas (nodes, edges, prompts and settings) to your own browser's localStorage under the key otarioptm.workflow.v1. It never leaves your device unless you run a workflow.",
      "Clearing your browser storage deletes it completely. There is no server-side copy to request or erase.",
    ],
  },
  {
    title: "What the gateway processes when you run a workflow",
    body: [
      "When you press Run Workflow, the node definitions and prompts are sent to the gateway you are connected to so it can execute them. Execution events (node, model, token counts, cost, latency) are held in memory by that gateway process to power the activity feed, budget meter and CSV export, and are discarded when the process restarts.",
      "The hosted demo gateway is operated as a hackathon showcase. Do not paste personal data, credentials or confidential material into demo workflows.",
    ],
  },
  {
    title: "Third-party providers",
    body: [
      "Depending on configuration, a gateway may forward prompts to the Otari hosted gateway, Groq, or Exa/DuckDuckGo (web search node). Those requests are governed by the respective providers' own privacy policies. Without API keys the gateway runs a deterministic local demo tier that sends nothing anywhere.",
    ],
  },
  {
    title: "API keys",
    body: [
      "API keys are supplied by the operator as environment variables at runtime. They are never written into the repository, never baked into Docker images, and never exposed to the browser.",
    ],
  },
  {
    title: "Self-hosting",
    body: [
      "OtariOptm is open source (Apache 2.0). When you self-host, all of the above runs on your own infrastructure and your own policies apply.",
    ],
  },
  {
    title: "Contact",
    body: [
      "Questions or deletion requests: open an issue on the GitHub repository linked in the footer.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 md:px-6">
      <p className="font-mono text-[11px] uppercase tracking-widest text-[#929DA5]">
        OtariOptm · Legal
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#F3F5F2]">
        Privacy &amp; data retention
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#929DA5]">
        Last updated November 10, 2026. This policy describes the current beta;
        it will be revised if accounts or hosted persistence are introduced.
      </p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-base font-medium text-[#C6F36B]">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-2 text-sm leading-6 text-[#929DA5]">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
      <p className="mt-12 font-mono text-[11px] tracking-wider">
        <Link
          href="/"
          className="text-[#65C9E8] transition-colors hover:text-[#C6F36B]"
        >
          &larr; Back to OtariOptm
        </Link>
      </p>
    </main>
  );
}
