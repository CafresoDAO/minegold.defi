import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "../components/ThemeToggle";
import { formatTokenAmount, formatTimestamp } from "../hooks/useQueries";
import { ledgerUrl, SGLDT_LEDGER_ID } from "../lib/canisters";
import { fetchPublicReceipt, type PublicReceipt } from "../lib/receiptShare";

type Props = {
  token: string | undefined;
  onNavigatePath: (path: string) => void;
};

const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  paid: { label: "Settled", tone: "var(--trust-verified)" },
  pulled: { label: "In flight", tone: "var(--trust-attested)" },
  refunded: { label: "Refunded", tone: "var(--trust-unknown)" },
  stranded: { label: "Held for manual resolution", tone: "var(--trust-fault)" },
};

/**
 * /r/:token — a receipt someone chose to share.
 *
 * Public and anonymous by design, and it contains no principal: the backend
 * builds this view without the owner field rather than filtering it out. The
 * page says so plainly, because a shared financial document that doesn't
 * explain what it does and doesn't reveal invites the reader to assume the
 * worst.
 *
 * An unknown token and a revoked token render identically — the backend
 * returns null for both, deliberately, so a probe can't tell them apart.
 */
export function SharedReceiptPage({ token, onNavigatePath }: Props) {
  const [receipt, setReceipt] = useState<PublicReceipt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setLoading(false);
      return;
    }
    void (async () => {
      const r = await fetchPublicReceipt(token);
      if (cancelled) return;
      setReceipt(r);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const isRefine = receipt?.kind === "refine";
  // A refine takes ckUNI (e18) and pays sGLDT (e8s); a redeem is the mirror.
  const inDecimals = isRefine ? 18 : 8;
  const outDecimals = isRefine ? 8 : 18;
  const inSymbol = isRefine ? "ckUNI" : "sGLDT";
  const outSymbol = isRefine ? "sGLDT" : "ckUNI";
  const status = receipt ? STATUS_COPY[receipt.status] : null;

  return (
    <div
      data-ocid="shared_receipt.page"
      className="min-h-screen"
      style={{ background: "var(--bb-bg)", color: "var(--bb-text)" }}
    >
      <div className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigatePath("/")}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold"
            style={{ color: "var(--bb-text-muted)" }}
          >
            minegold.defi
          </button>
          <ThemeToggle />
        </div>

        <p className="t-label mb-3" style={{ color: "var(--bb-text-dim)" }}>
          Shared receipt
        </p>

        {loading ? (
          <p className="animate-pulse text-sm" style={{ color: "var(--bb-text-muted)" }}>
            Reading the ledger…
          </p>
        ) : !receipt ? (
          <div data-ocid="shared_receipt.not_found">
            <h1 className="t-display" style={{ fontSize: "1.75rem" }}>
              This link doesn&apos;t resolve
            </h1>
            <p
              className="mt-3 text-[15px] leading-relaxed"
              style={{ color: "var(--bb-text-muted)" }}
            >
              Either it was never a valid share link, or its owner revoked it.
              We deliberately don&apos;t say which — distinguishing the two
              would let someone probe for receipts that exist.
            </p>
            <button
              type="button"
              onClick={() => onNavigatePath("/")}
              className="mt-6 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold"
              style={{ color: "var(--bb-brand)" }}
            >
              Go to minegold.defi <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <>
            <h1 className="t-display" style={{ fontSize: "1.75rem" }}>
              {isRefine ? "Deposit" : "Withdrawal"}
            </h1>

            <div
              className="mt-6 rounded-3xl border p-6"
              style={{
                borderColor: "var(--bb-border)",
                background: "var(--bb-surface)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="t-label" style={{ color: "var(--bb-text-dim)" }}>
                  Status
                </span>
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold"
                  style={{ color: status?.tone }}
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ background: status?.tone }}
                  />
                  {status?.label}
                </span>
              </div>

              <dl className="mt-5 space-y-3 text-[13px]">
                <Row
                  label="In"
                  value={`${formatTokenAmount(receipt.amountIn, inDecimals)} ${inSymbol}`}
                />
                <Row
                  label="Out"
                  value={`${formatTokenAmount(receipt.amountOut, outDecimals)} ${outSymbol}`}
                />
                <Row
                  label="Settled rate"
                  value={`${(Number(receipt.rate) / 1e8).toFixed(4)} sGLDT / UNI`}
                />
                <Row label="Time" value={formatTimestamp(receipt.timestampNs)} />
                {receipt.payBlock !== null && (
                  <Row
                    label="sGLDT ledger block"
                    value={receipt.payBlock.toString()}
                    href={ledgerUrl("sGLDT")}
                  />
                )}
                {receipt.pullBlock !== null && (
                  <Row label="Pull block" value={receipt.pullBlock.toString()} />
                )}
              </dl>
            </div>

            {/* What this document does and doesn't contain, stated. */}
            <div
              className="mt-4 flex items-start gap-3 rounded-3xl border p-5"
              style={{
                borderColor: "var(--bb-border)",
                background: "var(--bb-surface)",
              }}
            >
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0"
                style={{ color: "var(--trust-verified)" }}
              />
              <p
                className="text-[12px] leading-relaxed"
                style={{ color: "var(--bb-text-muted)" }}
              >
                <span className="font-bold" style={{ color: "var(--bb-text)" }}>
                  This receipt names nobody.
                </span>{" "}
                It carries no account, wallet address, or identity — the figures
                above are all it contains. The block reference is public on the
                sGLDT ledger, so anyone can confirm the payout happened without
                asking us, or the person who shared it, for anything.
              </p>
            </div>

            <p
              className="mt-6 text-[12px] leading-relaxed"
              style={{ color: "var(--bb-text-muted)" }}
            >
              Verify independently on the{" "}
              <a
                href={`https://dashboard.internetcomputer.org/canister/${SGLDT_LEDGER_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
                style={{ color: "var(--bb-brand)" }}
              >
                sGLDT ledger <ExternalLink size={11} />
              </a>
              , read the live treasury figures on{" "}
              <button
                type="button"
                onClick={() => onNavigatePath("/proof")}
                className="font-semibold underline underline-offset-2"
                style={{ color: "var(--bb-brand)" }}
              >
                /proof
              </button>
              , or start with{" "}
              <button
                type="button"
                onClick={() => onNavigatePath("/docs/how-it-works")}
                className="font-semibold underline underline-offset-2"
                style={{ color: "var(--bb-brand)" }}
              >
                how it works
              </button>
              .
            </p>
          </>
        )}

        <footer
          className="mt-12 border-t pt-5 text-center text-[11px]"
          style={{ borderColor: "var(--bb-border)", color: "var(--bb-text-dim)" }}
        >
          minegold.defi · part of the Banking.Brave ecosystem, powered by
          CafresoDAO
        </footer>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt style={{ color: "var(--bb-text-dim)" }}>{label}</dt>
      <dd className="text-right font-mono font-semibold" style={{ color: "var(--bb-text)" }}>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
            style={{ color: "var(--bb-brand)" }}
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
