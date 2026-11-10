"use client";

import { useState } from "react";

const GH = "https://github.com/gopanihitansh5-collab/otarioptm";
const GHB = `${GH}/blob/hackathon-2026-nov`;

type Item = { label: string; href: string; external?: boolean };

const PRODUCT: Item[] = [
  { label: "Product demo", href: "#demo" },
  { label: "Smart routing", href: "#routing" },
  { label: "Budget governance", href: "#budget" },
  { label: "Observability", href: "#observability" },
  { label: "Architecture", href: "#architecture" },
];

const SOLUTIONS: Item[] = [
  { label: "AI SaaS", href: "#use-cases" },
  { label: "AI agents", href: "#use-cases" },
  { label: "RAG pipelines", href: "#use-cases" },
  { label: "Enterprise workloads", href: "#use-cases" },
  { label: "Trust and limits", href: "#trust" },
];

const DEVELOPERS: Item[] = [
  { label: "API reference", href: `${GHB}/docs/api.md`, external: true },
  { label: "Quickstart", href: `${GHB}/docs/quickstart.md`, external: true },
  { label: "Architecture notes", href: `${GHB}/docs/architecture.md`, external: true },
  { label: "Design system", href: `${GHB}/MASTER.md`, external: true },
  { label: "GitHub repository", href: GH, external: true },
];

function Dropdown({ label, items }: { label: string; items: Item[] }) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-haspopup="true"
        className="flex items-center gap-1 text-sm text-[#929DA5] transition-colors duration-200 hover:text-[#F3F5F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F36B]/50"
      >
        {label}
        <span aria-hidden className="text-[9px] transition-transform duration-200 group-hover:rotate-180">
          ▾
        </span>
      </button>
      <div className="invisible absolute left-0 top-full z-50 min-w-48 pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="rounded-xl border border-[#293239] bg-[#111519] py-2 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
          {items.map((i) => (
            <a
              key={i.label}
              href={i.href}
              {...(i.external ? { target: "_blank", rel: "noreferrer" } : {})}
              className="block px-4 py-2 text-sm text-[#929DA5] transition-colors duration-150 hover:bg-[#171D22] hover:text-[#F3F5F2]"
            >
              {i.label}
              {i.external && (
                <span aria-hidden className="ml-1 text-[10px]">↗</span>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#293239] bg-[#090B0D]/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <a href="#top" className="flex items-baseline gap-3">
          <span className="font-mono text-sm font-semibold tracking-[0.2em] text-[#F3F5F2]">
            OTARIOPTM
          </span>
          <span className="hidden font-mono text-[10px] tracking-[0.2em] text-[#929DA5] sm:inline">
            ORCHESTRATION CONTROL PLANE
          </span>
        </a>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Sections">
          <Dropdown label="Product" items={PRODUCT} />
          <Dropdown label="Solutions" items={SOLUTIONS} />
          <Dropdown label="Developers" items={DEVELOPERS} />
          <a
            href="#pricing"
            className="text-sm text-[#929DA5] transition-colors duration-200 hover:text-[#F3F5F2]"
          >
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <span
            aria-disabled="true"
            title="Coming soon"
            className="hidden h-9 cursor-not-allowed items-center rounded-lg border border-[#293239] px-4 text-sm text-[#929DA5]/60 md:inline-flex"
          >
            Sign in
          </span>
          <a
            href="/studio"
            className="hidden h-9 items-center rounded-lg bg-[#C6F36B] px-4 text-sm font-semibold text-[#10140A] transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F36B]/50 sm:inline-flex"
          >
            Open Studio
          </a>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#293239] text-sm text-[#929DA5] transition-colors duration-200 hover:border-[#C6F36B]/40 hover:text-[#F3F5F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F36B]/50 md:hidden"
          >
            <span aria-hidden>{open ? "✕" : "≡"}</span>
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`border-t border-[#293239] bg-[#090B0D] md:hidden ${open ? "block" : "hidden"}`}
      >
        <nav aria-label="Mobile sections" className="mx-auto flex max-w-6xl flex-col px-4">
          {[
            { group: "PRODUCT", items: PRODUCT },
            { group: "SOLUTIONS", items: SOLUTIONS },
            { group: "DEVELOPERS", items: DEVELOPERS },
          ].map(({ group, items }) => (
            <div key={group} className="border-b border-[#1C2429] py-2">
              <p className="py-1 font-mono text-[9px] tracking-[0.25em] text-[#929DA5]/60">
                {group}
              </p>
              {items.map((i) => (
                <a
                  key={i.label}
                  href={i.href}
                  {...(i.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  onClick={() => setOpen(false)}
                  className="block py-2 text-sm text-[#929DA5] transition-colors duration-200 hover:text-[#F3F5F2]"
                >
                  {i.label}
                  {i.external && (
                    <span aria-hidden className="ml-1 text-[10px]">↗</span>
                  )}
                </a>
              ))}
            </div>
          ))}
          <a
            href="#pricing"
            onClick={() => setOpen(false)}
            className="border-b border-[#1C2429] py-3 text-sm text-[#929DA5] transition-colors duration-200 hover:text-[#F3F5F2]"
          >
            Pricing
          </a>
          <span
            aria-disabled="true"
            className="border-b border-[#1C2429] py-3 text-sm text-[#929DA5]/50"
          >
            Sign in (coming soon)
          </span>
          <a
            href="/studio"
            onClick={() => setOpen(false)}
            className="my-3 inline-flex h-10 items-center justify-center rounded-lg bg-[#C6F36B] text-sm font-semibold text-[#10140A]"
          >
            Open Studio
          </a>
        </nav>
      </div>
    </header>
  );
}
