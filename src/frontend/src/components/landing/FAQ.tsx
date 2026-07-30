/**
 * FAQ — the six questions a skeptic actually asks, answered without
 * hedging. Native <details> so it works with no JS, is keyboard-operable
 * and screen-reader-announced for free, and survives a failed hydration.
 */
const ITEMS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Is this custodial? Do you hold my money?",
    a: (
      <>
        No. DFINITY&apos;s chain-key minter credits your bridged tokens to{" "}
        <strong>your own account</strong>, and the gold lands in your vault.
        The refinery holds funds only for the seconds of the atomic swap, and
        a failed swap refunds you automatically. Four of the five custody
        steps are yours — the refinery&apos;s rail on the refinery page names
        each one.
      </>
    ),
  },
  {
    q: "What actually backs sGLDT?",
    a: (
      <>
        sGLDT is a 1:1 wrapper of <strong>GLDT</strong>, Gold DAO&apos;s
        token — each backed by 0.01&nbsp;g of LBMA-sourced physical gold in
        audited Swiss vaults. The wrapper exists purely for fees (0.00001 vs
        0.10 per transfer, ~10,000× cheaper). Unwrap at sVault any time;
        redeem GLDT for metal through Gold DAO.{" "}
        <a
          href="https://gldt.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
          style={{ color: "var(--bb-brand)" }}
        >
          gldt.org
        </a>{" "}
        explains the gold behind it. We link that chain — we don&apos;t
        control it.
      </>
    ),
  },
  {
    q: "What happens if a swap fails?",
    a: (
      <>
        Your deposit is refunded automatically to your own account — the swap
        and the refund are one atomic path in the canister. If even the
        refund fails, the record is <strong>held</strong> on-chain with your
        funds noted, it appears in your activity with a resolution contact,
        and the live count of held swaps is published on the proof page —
        even when it&apos;s zero. Nothing is silently dropped.
      </>
    ),
  },
  {
    q: "Do I need a seed phrase?",
    a: (
      <>
        No. Your vault is an Internet Identity passkey — Face ID or a
        fingerprint, about 20 seconds to create, nothing to write down or
        lose. You&apos;ll also connect an ordinary Ethereum wallet for the
        tokens you&apos;re spending; that one is yours already.
      </>
    ),
  },
  {
    q: "When does BAT intake open?",
    a: (
      <>
        When DFINITY&apos;s chain-key minter lists BAT — not before, and not
        on our say-so. The chip at the top of this page is a live read of the
        minter&apos;s supported-token list, so it tells you the truth on
        every visit. Join the waitlist and you get exactly one message, at
        launch.
      </>
    ),
  },
  {
    q: "Who runs this, and how does it relate to Banking.Brave?",
    a: (
      <>
        minegold.defi is an application in the{" "}
        <strong>Banking.Brave</strong> ecosystem, which is powered by{" "}
        <strong>CafresoDAO</strong>. They are separate products: Banking.Brave
        is the institution; this is a refinery that runs under it. Day to day,
        the canisters here have a{" "}
        <strong>single controller</strong> — published on the proof page
        alongside the code&apos;s limitations — and the code is{" "}
        <strong>unaudited</strong>. Check the numbers before you send
        anything; that is what the proof page is for.
      </>
    ),
  },
];

export function FAQ() {
  return (
    <section data-ocid="landing.faq">
      <h2
        className="t-display mb-4"
        style={{ fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)" }}
      >
        Fair questions
      </h2>
      <div className="space-y-2">
        {ITEMS.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border px-4 py-3"
            style={{
              borderColor: "var(--bb-border)",
              background: "var(--bb-surface)",
            }}
          >
            <summary className="cursor-pointer list-none text-sm font-bold marker:hidden flex items-center justify-between gap-3 min-h-[28px]">
              <span>{item.q}</span>
              <span
                aria-hidden
                className="shrink-0 transition-transform group-open:rotate-45"
                style={{ color: "var(--bb-text-dim)" }}
              >
                +
              </span>
            </summary>
            <p
              className="mt-2 text-[13px] leading-relaxed"
              style={{ color: "var(--bb-text-muted)" }}
            >
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
