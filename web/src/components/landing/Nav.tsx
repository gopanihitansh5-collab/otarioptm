const LINKS = [
  { label: "Product", href: "#product" },
  { label: "Routing", href: "#routing" },
  { label: "Architecture", href: "#architecture" },
  { label: "Code", href: "#code" },
];

export default function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#293239] bg-[#090B0D]/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <a href="#" className="flex items-baseline gap-3">
          <span className="font-mono text-sm font-bold tracking-[0.2em] text-[#F3F5F2]">
            OTARIOPTM
          </span>
          <span className="hidden font-mono text-[10px] tracking-widest text-[#929DA5] sm:inline">
            / INTELLIGENT ORCHESTRATION
          </span>
        </a>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Landing sections">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-[#929DA5] transition-colors duration-200 hover:text-[#F3F5F2]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <a
          href="/studio"
          className="inline-flex h-9 items-center rounded-lg bg-[#C6F36B] px-4 text-sm font-semibold text-[#10140A] transition-all duration-200 hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F36B]/50"
        >
          Open Studio
        </a>
      </div>
    </header>
  );
}
