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
        <span className="text-[#C6F36B]">winning model and score line</span>:
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
        An <span className="text-[#C6F36B]">atomic pre-spend reserve</span>{" "}
        holds the estimated cost before execution. At the cap the gateway
        answers <span className="text-[#C6F36B]">HTTP 402</span>, so an
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
        <span className="text-[#C6F36B]">locally at $0.00</span>, every step
        honestly labeled <span className="text-[#C6F36B]">demo</span>.
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
          <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B]">
            THE DIFFERENCE
          </p>
          <h2 className="mt-3 max-w-2xl text-[clamp(30px,4vw,40px)] font-semibold leading-[1.1] tracking-tight text-[#F3F5F2]">
            Built different, on purpose.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#929DA5]">
            Three decisions that separate this gateway from the generic ones.
            No competitor names, no benchmark theater: just what happens on
            each call, and what you can verify.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-12 grid gap-4 border-b border-[#1C2429] pb-4 md:grid-cols-[2.5rem_1fr_1fr] md:gap-8">
            <span aria-hidden className="hidden md:block" />
            <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B]">
              OTARIOPTM
            </p>
            <p className="font-mono text-[10px] tracking-[0.25em] text-[#929DA5]">
              GENERIC GATEWAYS
            </p>
          </div>

          <div>
            {ROWS.map((row) => (
              <div
                key={row.n}
                className="grid gap-x-8 gap-y-3 border-t border-[#1C2429] py-8 md:grid-cols-[2.5rem_1fr_1fr] md:py-10"
              >
                <p className="font-mono text-[10px] tracking-[0.25em] text-[#C6F36B] md:pt-1">
                  {row.n}
                </p>
                <div>
                  <h3 className="text-lg font-medium tracking-tight text-[#F3F5F2]">
                    {row.oursTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#929DA5]">
                    {row.oursBody}
                  </p>
                </div>
                <div className="md:border-l md:border-[#1C2429] md:pl-8">
                  <h3 className="text-lg font-medium tracking-tight text-[#929DA5]">
                    {row.theirsTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#929DA5]">
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
