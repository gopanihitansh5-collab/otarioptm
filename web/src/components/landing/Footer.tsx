import Link from "next/link";

const COLUMNS: {
  heading: string;
  links: { label: string; href: string; external?: boolean }[];
}[] = [
  {
    heading: "Developers",
    links: [
      {
        label: "Source",
        href: "https://github.com/gopanihitansh5-collab/otarioptm",
        external: true,
      },
      {
        label: "API reference",
        href: "https://github.com/gopanihitansh5-collab/otarioptm/blob/main/docs/api.md",
        external: true,
      },
      {
        label: "Quickstart",
        href: "https://github.com/gopanihitansh5-collab/otarioptm/blob/main/README.md#quickstart",
        external: true,
      },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy & retention", href: "/privacy" },
      { label: "Terms of use", href: "/terms" },
    ],
  },
  {
    heading: "Ecosystem",
    links: [
      { label: "otari.ai", href: "https://otari.ai", external: true },
      {
        label: "mozilla-ai/otari",
        href: "https://github.com/mozilla-ai/otari",
        external: true,
      },
      {
        label: "DoraHacks",
        href: "https://dorahacks.io",
        external: true,
      },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-[#34322D]">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <p className="max-w-xs font-mono text-[11px] leading-5 tracking-wider text-[#A6A197]">
            <span className="text-[#E9E4DA]">OTARIOPTM</span>
            <br />
            Built on Otari (Mozilla AI) · DoraHacks Devs Wilding 2026
          </p>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <nav key={col.heading} aria-label={col.heading}>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#A6A197]">
                  {col.heading}
                </p>
                <ul className="mt-3 space-y-1">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      {l.external ? (
                        <a
                          href={l.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[36px] items-center font-mono text-[11px] tracking-wider text-[#A6A197] transition-colors duration-200 hover:text-[#B8A98F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8A98F]/50"
                        >
                          {l.label}
                        </a>
                      ) : (
                        <Link
                          href={l.href}
                          className="inline-flex min-h-[36px] items-center font-mono text-[11px] tracking-wider text-[#A6A197] transition-colors duration-200 hover:text-[#B8A98F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8A98F]/50"
                        >
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
