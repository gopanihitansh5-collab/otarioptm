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
      "OtariOptm is a beta hackathon project. It has no accounts, no sign-in, no tracking cookies, and no analytics pipeline, so there is no advertising or analytics profile built about you.",
      "What does move is what you run: prompts and search queries are sent to the providers described below whenever you execute a workflow. Don't put anything in a workflow you wouldn't send to those providers.",
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
      "If you connect to a gateway operated by someone else, treat everything in your workflows as visible to that operator.",
    ],
  },
  {
    title: "Third-party providers",
    body: [
      "Depending on configuration, a gateway may forward prompts to the Otari hosted gateway, Groq, or Exa for search. Those requests carry your prompt or query text and are governed by the respective providers' own privacy policies.",
      "Without API keys, chat, code-exec and guardrails nodes run locally in the gateway process and make no external calls. The web-search node is the exception: it always queries DuckDuckGo (or Exa, when a key is configured) with your search text, even in demo mode.",
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
      <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-silver)]">
        OtariOptm · Legal
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ice)]">
        Privacy &amp; data retention
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-silver)]">
        Draft for the current beta, pending owner review. Last updated
        November 10, 2026.
      </p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-base font-medium text-[var(--color-lime)]">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-2 text-sm leading-6 text-[var(--color-silver)]">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
      <p className="mt-12 font-mono text-[11px] tracking-wider">
        <Link
          href="/"
          className="text-[var(--color-signal)] transition-colors hover:text-[var(--color-lime)]"
        >
          &larr; Back to OtariOptm
        </Link>
      </p>
    </main>
  );
}
