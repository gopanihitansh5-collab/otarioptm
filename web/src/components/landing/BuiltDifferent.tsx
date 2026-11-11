import { Reveal } from "../../lib/landing/Reveal";

type Row = {
  n: string;
  oursTitle: string;
  oursBody: React.ReactNode;
  theirsTitle: string;
  theirsBody: string;
};

const ROWS: Row[] = [
  {
    n: "01",
    oursTitle: "Routing you can audit",
    oursBody: (
      <>
        Every step returns its{" "}
        <span className="text-[var(--color-lime)]">winning model and score line</span>:
        cost, latency and health, weighted per step type, printed in the
        response where you can check the arithmetic.
      </>
    ),
    theirsTitle: "Silent model selection",
    theirsBody:
      "The gateway picks a model somewhere behind the response. Which one, and why, is a question for the invoice.",
  },
  {
    n: "02",
    oursTitle: "Spend blocked before it happens",
    oursBody: (
      <>
        An <span className="text-[var(--color-lime)]">atomic pre-spend reserve</span>{" "}
        holds the estimated cost before execution. At the cap the gateway
        answers <span className="text-[var(--color-lime)]">HTTP 402</span>, so an
        over-budget run never starts.
      </>
    ),
    theirsTitle: "Caps checked after the call",
    theirsBody:
      "The cap is compared once the tokens are already paid for. The overrun still happened; the dashboard just reports it.",
  },
  {
    n: "03",
    oursTitle: "Runs with zero keys",
    oursBody: (
      <>
        No account, no wallet: the full engine, router and budget execute{" "}
        <span className="text-[var(--color-lime)]">locally at $0.00</span>, every step
        honestly labeled <span className="text-[var(--color-lime)]">demo</span>.
      </>
    ),
    theirsTitle: "Account required",
    theirsBody:
      "Evaluation needs a sign-up and a payment method before the first request. Reading the repo is not the same as running it.",
  },
];

export default function BuiltDifferent() {
  return (
    <section id="difference" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
        <Reveal>
          <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-lime)]">
            THE DIFFERENCE
          </p>
          <h2 className="mt-3 max-w-2xl text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[var(--color-ice)]">
            Built different, on purpose.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--color-silver)]">
            Three decisions that separate this gateway from the generic ones.
            No competitor names, no benchmark theater: just what happens on
            each call, and what you can verify.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-12 grid gap-4 border-b border-[var(--color-steel-dim)] pb-4 md:grid-cols-[2.5rem_1fr_1fr] md:gap-8">
            <span aria-hidden className="hidden md:block" />
            <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-lime)]">
              OTARIOPTM
            </p>
            <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-silver)]">
              GENERIC GATEWAYS
            </p>
          </div>

          <div>
            {ROWS.map((row) => (
              <div
                key={row.n}
                className="grid gap-x-8 gap-y-3 border-t border-[var(--color-steel-dim)] py-8 md:grid-cols-[2.5rem_1fr_1fr] md:py-10"
              >
                <p className="font-mono text-[10px] tracking-[0.25em] text-[var(--color-lime)] md:pt-1">
                  {row.n}
                </p>
                <div>
                  <h3 className="text-lg font-medium tracking-tight text-[var(--color-ice)]">
                    {row.oursTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-silver)]">
                    {row.oursBody}
                  </p>
                </div>
                <div className="md:border-l md:border-[var(--color-steel-dim)] md:pl-8">
                  <h3 className="text-lg font-medium tracking-tight text-[var(--color-silver)]">
                    {row.theirsTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-silver)]">
                    {row.theirsBody}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
