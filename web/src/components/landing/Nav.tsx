"use client";

import { useState } from "react";

const LINKS = [
  { label: "Product", href: "#product" },
  { label: "Routing", href: "#routing" },
  { label: "Architecture", href: "#architecture" },
  { label: "Code", href: "#code" },
  { label: "Pricing", href: "#pricing" },
];

const GH = "https://github.com/gopanihitansh5-collab/otarioptm";

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
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-[#929DA5] transition-colors duration-200 hover:text-[#F3F5F2]"
            >
              {l.label}
            </a>
          ))}
          <a
            href={GH}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[#929DA5] transition-colors duration-200 hover:text-[#F3F5F2]"
          >
            GitHub <span aria-hidden className="text-[10px]">↗</span>
          </a>
        </nav>

        <div className="flex items-center gap-2">
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
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="border-b border-[#1C2429] py-3 text-sm text-[#929DA5] transition-colors duration-200 hover:text-[#F3F5F2]"
            >
              {l.label}
            </a>
          ))}
          <a
            href={GH}
            target="_blank"
            rel="noreferrer"
            className="border-b border-[#1C2429] py-3 text-sm text-[#929DA5] transition-colors duration-200 hover:text-[#F3F5F2]"
          >
            GitHub
          </a>
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
