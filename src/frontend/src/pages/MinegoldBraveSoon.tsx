import { ArrowLeft, ArrowRight, ExternalLink, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  fetchCkBatStatus,
  BAT_ERC20_ADDRESS,
  CK_MINTER_CANISTER_ID,
  type CkBatStatus,
} from "../lib/ckMinter";

interface MinegoldBraveSoonProps {
  onBack: () => void;
  onOpenUni: () => void;
}

const NOTIFY_EMAIL = "anthony@cafreso.com";

/**
 * /brave — the BAT intake status page. minegold.defi's page, in its calm
 * banking register: what the BAT intake is, the one external fact it is
 * gated on, and that fact checked LIVE against DFINITY's minter on every
 * load. No countdowns, no "coming soon" theater — the page flips itself to
 * a launch state the moment ckBAT appears in the minter's allowlist.
 *
 * (This replaced the old "Minegold.Brave — a protocol" framing:
 * minegold.brave is this application's future domain, not a sibling
 * product. The intake is just called what it is: BAT intake.)
 */
export function MinegoldBraveSoon({ onBack, onOpenUni }: MinegoldBraveSoonProps) {
  const [status, setStatus] = useState<CkBatStatus | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const s = await fetchCkBatStatus();
      if (cancelled) return;
      setStatus(s);
      setCheckedAt(new Date());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = status === null;
  const live = status?.supported === true;
  const tokenCount = status?.allTokens.length ?? 0;

  const notifyHref =
    `mailto:${NOTIFY_EMAIL}` +
    `?subject=${encodeURIComponent("Notify me when BAT intake opens")}` +
    `&body=${encodeURIComponent(
      "Add me to the BAT intake waitlist — one email when BAT → ckBAT → sGLDT opens on minegold.defi.",
    )}`;

  return (
    <div
      data-ocid="brave.page"
      className="min-h-screen"
      style={{ background: "var(--bb-bg)", color: "var(--bb-text)" }}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-10 flex items-center justify-between">
          <button
            type="button"
            data-ocid="brave.back"
            onClick={onBack}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold"
            style={{ color: "var(--bb-text-muted)" }}
          >
            <ArrowLeft size={14} /> minegold.defi
          </button>
          <ThemeToggle />
        </div>

        <p className="t-label mb-3" style={{ color: "var(--bb-text-dim)" }}>
          BAT intake · status
        </p>
        <h1 className="t-display" style={{ fontSize: "clamp(1.9rem, 1.4rem + 2.2vw, 2.75rem)" }}>
          Ad revenue, refined to gold.
        </h1>
        <p
          className="mt-3 max-w-xl text-[15px] leading-relaxed"
          style={{ color: "var(--bb-text-muted)" }}
        >
          The Brave browser pays its users BAT for the ads they already see.
          This intake will accept that BAT and refine it into sGLDT — the same
          gold-backed token, through the same refinery, that the UNI intake
          settles today.
        </p>

        {/* The one gate, checked live. */}
        <div
          data-ocid="brave.status_card"
          className="mt-8 rounded-3xl border p-6"
          style={{ borderColor: "var(--bb-border)", background: "var(--bb-surface)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="t-label" style={{ color: "var(--bb-text-dim)" }}>
              The one thing this is waiting on
            </p>
            {checkedAt && (
              <p className="text-[10px]" style={{ color: "var(--bb-text-dim)" }}>
                checked live at {checkedAt.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="mt-2 flex items-start gap-3">
            <span
              aria-hidden
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                background: loading
                  ? "var(--trust-unknown)"
                  : live
                    ? "var(--trust-verified)"
                    : status?.error
                      ? "var(--trust-fault)"
                      : "var(--trust-attested)",
              }}
            />
            <div>
              <p className="text-sm font-bold">
                {loading
                  ? "Reading DFINITY's chain-key minter…"
                  : live
                    ? "ckBAT is listed — the intake is opening"
                    : status?.error
                      ? "The minter couldn't be reached just now"
                      : "DFINITY's minter does not yet list BAT"}
              </p>
              <p
                className="mt-1 text-[12px] leading-relaxed"
                style={{ color: "var(--bb-text-muted)" }}
              >
                Chain-key intake requires DFINITY&apos;s ckERC-20 minter to
                support the token. That listing happens by NNS vote — a public
                process we participate in but don&apos;t control — so this page
                reads the minter&apos;s own supported-token list on every load
                {tokenCount > 0 ? (
                  <> ({tokenCount} tokens listed today, BAT {live ? "among" : "not among"} them)</>
                ) : null}
                . No date is promised because no date is ours to promise.
              </p>
              <p className="mt-2 text-[11px]" style={{ color: "var(--bb-text-dim)" }}>
                Verify it yourself: minter{" "}
                <a
                  href={`https://dashboard.internetcomputer.org/canister/${CK_MINTER_CANISTER_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono underline underline-offset-2"
                  style={{ color: "var(--bb-brand)" }}
                >
                  {CK_MINTER_CANISTER_ID} <ExternalLink size={10} />
                </a>{" "}
                · BAT contract{" "}
                <a
                  href={`https://etherscan.io/token/${BAT_ERC20_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono underline underline-offset-2"
                  style={{ color: "var(--bb-brand)" }}
                >
                  {BAT_ERC20_ADDRESS.slice(0, 10)}… <ExternalLink size={10} />
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* What's true meanwhile */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div
            className="rounded-3xl border p-5"
            style={{ borderColor: "var(--bb-border)", background: "var(--bb-surface)" }}
          >
            <p className="t-label mb-1" style={{ color: "var(--bb-text-dim)" }}>
              Working today
            </p>
            <p className="text-sm font-bold">The same refinery, via UNI</p>
            <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--bb-text-muted)" }}>
              Every part of this machine except the BAT door is live on
              mainnet — deposits, atomic settlement, withdrawals, the public
              proof page. BAT intake reuses it unchanged.
            </p>
            <button
              type="button"
              data-ocid="brave.open_uni"
              onClick={onOpenUni}
              className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 text-xs font-bold"
              style={{ color: "var(--bb-brand)" }}
            >
              Open the live app <ArrowRight size={13} />
            </button>
          </div>
          <div
            className="rounded-3xl border p-5"
            style={{ borderColor: "var(--bb-border)", background: "var(--bb-surface)" }}
          >
            <p className="t-label mb-1" style={{ color: "var(--bb-text-dim)" }}>
              Worth knowing
            </p>
            <p className="text-sm font-bold">Where your BAT actually lives</p>
            <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--bb-text-muted)" }}>
              Brave&apos;s newer self-custody payouts settle BAT on Solana;
              chain-key intake starts with the Ethereum ERC-20. Small monthly
              amounts are cheapest to convert once accumulated — and if ICP&apos;s
              Solana integration reaches SPL tokens, that cost drops to cents.
              This page will say so plainly when either fact changes.
            </p>
          </div>
        </div>

        {/* Waitlist — one message, stated as policy */}
        <div
          className="mt-4 rounded-3xl border p-6 text-center"
          style={{ borderColor: "var(--bb-border)", background: "var(--bb-surface)" }}
        >
          <p className="text-sm font-bold mb-1">
            {live ? "It's opening — watch your inbox" : "One message, at launch. No newsletter."}
          </p>
          <p className="mb-4 text-[12px]" style={{ color: "var(--bb-text-muted)" }}>
            Ask to be told when BAT intake opens, and that is the only email
            you will ever get from it.
          </p>
          <a
            href={notifyHref}
            data-ocid="brave.notify"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl px-5 text-sm font-bold"
            style={{ background: "var(--royal-700)", color: "#ffffff" }}
          >
            <Mail size={15} /> Notify me at launch
          </a>
        </div>

        <footer
          className="mt-10 border-t pt-5 text-center text-[11px]"
          style={{ borderColor: "var(--bb-border)", color: "var(--bb-text-dim)" }}
        >
          minegold.defi · part of the Banking.Brave ecosystem, powered by
          CafresoDAO
        </footer>
      </div>
    </div>
  );
}
