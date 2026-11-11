import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms - OtariOptm",
  description:
    "Terms of use for the OtariOptm beta: demo values, acceptable use, and the Apache 2.0 codebase.",
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "Beta status",
    body: [
      "OtariOptm is a hackathon beta provided as is, without warranties of any kind. Features, limits and pricing shown on this site describe the current prototype and may change without notice.",
    ],
  },
  {
    title: "Demo and illustrative values",
    body: [
      "Metrics, savings, latencies and model prices shown in the landing page visualizations and in demo mode are illustrative, and are labeled as such where they appear. They are not live provider quotes, benchmarks, or promises of performance or cost.",
    ],
  },
  {
    title: "Acceptable use",
    body: [
      "Do not use a gateway running this code for unlawful content, to probe or disrupt services, or to process data you do not have the right to share. Guardrails in the product block configured terms; they are a safety aid, not a guarantee.",
    ],
  },
  {
    title: "Your keys, your spend",
    body: [
      "If you configure the gateway with your own provider API keys, usage on those keys is billed by the provider to you. The budget guard enforces configured caps within a run but is not a billing contract.",
    ],
  },
  {
    title: "Open source",
    body: [
      "The OtariOptm source code is licensed under the Apache License 2.0. Otari is a Mozilla AI project with its own license and terms; this project is built on the Otari hosted gateway for the DoraHacks Devs Wilding 2026 hackathon.",
    ],
  },
  {
    title: "Liability",
    body: [
      "To the maximum extent permitted by law, the authors are not liable for indirect or consequential damages arising from use of this beta, including provider charges incurred through configured keys.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 md:px-6">
      <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-silver)]">
        OtariOptm · Legal
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ice)]">
        Terms of use
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
