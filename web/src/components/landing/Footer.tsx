export default function Footer() {
  const LINKS = [
    { label: "otari.ai", href: "https://otari.ai" },
    { label: "github.com/mozilla-ai/otari", href: "https://github.com/mozilla-ai/otari" },
    { label: "dorahacks.io", href: "https://dorahacks.io" },
  ];
  return (
    <footer className="border-t border-[#293239]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 font-mono text-[11px] tracking-wider text-[#929DA5] md:flex-row md:items-center md:justify-between md:px-6">
        <p>
          <span className="text-[#F3F5F2]">OTARIOPTM</span> · Built on Otari
          (Mozilla AI) · DoraHacks Devs Wilding 2026
        </p>
        <nav aria-label="External links" className="flex flex-wrap gap-5">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="transition-colors duration-200 hover:text-[#C6F36B]"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
