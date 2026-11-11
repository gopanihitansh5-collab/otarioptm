export default function AnnouncementBar() {
  return (
    <div className="relative z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-[#34322D] bg-[#171715] px-4 py-2 text-center font-mono text-[10px] tracking-[0.18em] text-[#A6A197]">
      <span className="hidden h-1.5 w-1.5 rounded-full bg-[#B8A98F] motion-safe:animate-pulse sm:inline-block" aria-hidden />
      <span className="text-[#E9E4DA]">BETA</span>
      <span aria-hidden className="hidden text-[#34322D] sm:inline">/</span>
      <span>
        Hackathon MVP on the{" "}
        <a
          href="https://otari.ai"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[24px] items-center text-[#B8A98F] transition-colors duration-200 hover:text-[#CCBDA5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8A98F]/50"
        >
          Otari
        </a>{" "}
        hosted gateway
      </span>
      <span aria-hidden className="hidden text-[#34322D] sm:inline">/</span>
      <a
        href="https://github.com/gopanihitansh5-collab/otarioptm"
        target="_blank"
        rel="noreferrer"
        className="hidden min-h-[24px] items-center gap-1 transition-colors duration-200 hover:text-[#B8A98F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8A98F]/50 sm:inline-flex"
      >
        GitHub <span aria-hidden>↗</span>
      </a>
    </div>
  );
}
