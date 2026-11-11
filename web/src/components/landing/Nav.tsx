"use client";

import { useEffect, useRef, useState } from "react";
import WordmarkSignature from "../motion/WordmarkSignature";
import ThemeToggle from "../ThemeToggle";

const GH = "https://github.com/gopanihitansh5-collab/otarioptm";
const GHB = `${GH}/blob/main`;

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

const LINK_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-lime)]/50";

function Dropdown({ label, items }: { label: string; items: Item[] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const menuId = `nav-${label.toLowerCase()}`;

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node))
          setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-11 items-center gap-1 text-sm text-[var(--color-silver)] transition-colors duration-200 hover:text-[var(--color-ice)] ${LINK_RING}`}
      >
        {label}
        <span
          aria-hidden
          className={`text-[9px] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute left-0 top-full z-50 min-w-48 pt-2"
        >
          <div className="rounded-xl border border-[var(--color-steel)] bg-[var(--color-graphite)] py-2 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            {items.map((i) => (
              <a
                key={i.label}
                href={i.href}
                {...(i.external ? { target: "_blank", rel: "noreferrer" } : {})}
                className={`block px-4 py-2 text-sm text-[var(--color-silver)] transition-colors duration-150 hover:bg-[var(--color-elevated)] hover:text-[var(--color-ice)] ${LINK_RING}`}
              >
                {i.label}
                {i.external && (
                  <span aria-hidden className="ml-1 text-[10px]">↗</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 border-b border-[var(--color-steel)] bg-[var(--color-obsidian)]/90"
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <a href="#top" className={`flex items-baseline gap-3 ${LINK_RING}`}>
          <WordmarkSignature
            className="font-mono text-sm font-semibold tracking-[0.2em] text-[var(--color-ice)]"
            staggerMs={55}
          />
          <span className="hidden font-mono text-[10px] tracking-[0.2em] text-[var(--color-silver)] sm:inline">
            ORCHESTRATION CONTROL PLANE
          </span>
        </a>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Sections">
          <Dropdown label="Product" items={PRODUCT} />
          <Dropdown label="Solutions" items={SOLUTIONS} />
          <Dropdown label="Developers" items={DEVELOPERS} />
          <a
            href="#pricing"
            className={`text-sm text-[var(--color-silver)] transition-colors duration-200 hover:text-[var(--color-ice)] ${LINK_RING}`}
          >
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span
            aria-disabled="true"
            title="Coming soon"
            className="hidden h-11 cursor-not-allowed items-center rounded-lg border border-[var(--color-steel)] px-4 text-sm text-[var(--color-silver)]/60 md:inline-flex"
          >
            Sign in · soon
          </span>
          <a
            href="/studio"
            className="hidden h-11 items-center rounded-lg bg-[var(--color-lime)] px-4 text-sm font-semibold text-[var(--color-obsidian)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] sm:inline-flex"
          >
            Open Studio
          </a>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-steel)] text-sm text-[var(--color-silver)] transition-colors duration-200 hover:border-[var(--color-lime)]/40 hover:text-[var(--color-ice)] md:hidden ${LINK_RING}`}
          >
            <span aria-hidden>{open ? "✕" : "≡"}</span>
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`border-t border-[var(--color-steel)] bg-[var(--color-obsidian)] md:hidden ${open ? "block" : "hidden"}`}
      >
        <nav aria-label="Mobile sections" className="mx-auto flex max-w-6xl flex-col px-4">
          {[
            { group: "PRODUCT", items: PRODUCT },
            { group: "SOLUTIONS", items: SOLUTIONS },
            { group: "DEVELOPERS", items: DEVELOPERS },
          ].map(({ group, items }) => (
            <div key={group} className="border-b border-[var(--color-steel-dim)] py-2">
              <p className="py-1 font-mono text-[9px] tracking-[0.25em] text-[var(--color-silver)]/60">
                {group}
              </p>
              {items.map((i) => (
                <a
                  key={i.label}
                  href={i.href}
                  {...(i.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  onClick={() => setOpen(false)}
                  className={`block py-3 text-sm text-[var(--color-silver)] transition-colors duration-200 hover:text-[var(--color-ice)] ${LINK_RING}`}
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
            className={`border-b border-[var(--color-steel-dim)] py-3 text-sm text-[var(--color-silver)] transition-colors duration-200 hover:text-[var(--color-ice)] ${LINK_RING}`}
          >
            Pricing
          </a>
          <span
            aria-disabled="true"
            className="border-b border-[var(--color-steel-dim)] py-3 text-sm text-[var(--color-silver)]/50"
          >
            Sign in (coming soon)
          </span>
          <a
            href="/studio"
            onClick={() => setOpen(false)}
            className={`my-3 inline-flex h-11 items-center justify-center rounded-lg bg-[var(--color-lime)] text-sm font-semibold text-[var(--color-obsidian)] ${LINK_RING}`}
          >
            Open Studio
          </a>
        </nav>
      </div>
    </header>
  );
}
