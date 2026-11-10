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
        href: "https://github.com/gopanihitansh5-collab/otarioptm/blob/hackathon-2026-nov/docs/api.md",
        external: true,
      },
      {
        label: "Quickstart",
        href: "https://github.com/gopanihitansh5-collab/otarioptm/blob/hackathon-2026-nov/README.md#quickstart",
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
    <footer className="border-t border-[#293239]">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <p className="max-w-xs font-mono text-[11px] leading-5 tracking-wider text-[#929DA5]">
            <span className="text-[#F3F5F2]">OTARIOPTM</span>
            <br />
            Built on Otari (Mozilla AI) · DoraHacks Devs Wilding 2026
          </p>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <nav key={col.heading} aria-label={col.heading}>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#929DA5]">
                  {col.heading}
                </p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      {l.external ? (
                        <a
                          href={l.href}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] tracking-wider text-[#929DA5] transition-colors duration-200 hover:text-[#C6F36B]"
                        >
                          {l.label}
                        </a>
                      ) : (
                        <Link
                          href={l.href}
                          className="font-mono text-[11px] tracking-wider text-[#929DA5] transition-colors duration-200 hover:text-[#C6F36B]"
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
