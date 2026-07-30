import { ExternalLink, Link2 } from "lucide-react";
import { useState } from "react";
import { fmtAmount, type LedgerEntry } from "../../lib/ledger";
import { ledgerUrl } from "../../lib/canisters";
import { StatusPill } from "./StatusPill";

/**
 * ReceiptBlock — the reconcilable record of one ledger entry: both amounts,
 * the settled rate, and the pull/pay block references linked to the CORRECT
 * ledger for each token (refine pulls ckUNI and pays sGLDT; redeem is the
 * mirror). Every fact here exists on a public ledger; nothing is decorative.
 *
 * Used inline on /history rows (expanded) and full-page at /receipt/:id.
 */

const KIND_LABEL: Record<LedgerEntry["kind"], string> = {
  refine: "Refine — UNI into gold",
  redeem: "Redeem — gold back to ckUNI",
  bridge: "Deposit — UNI onto the bridge",
  mint: "Mint — ckUNI credited",
  transfer: "Transfer",
};

/** Which token each block leg settles on, per kind. */
const legTokens = (
  kind: LedgerEntry["kind"],
): { pull: "sGLDT" | "ckUNI"; pay: "sGLDT" | "ckUNI" } =>
  kind === "redeem"
    ? { pull: "sGLDT", pay: "ckUNI" }
    : { pull: "ckUNI", pay: "sGLDT" };

const fmtTime = (ns: bigint): string =>
  new Date(Number(ns / 1_000_000n)).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-zinc-800/60 last:border-0">
      <span className="text-[11px] text-zinc-500 shrink-0">{label}</span>
      <span className="text-[12px] text-zinc-200 text-right min-w-0">
        {children}
      </span>
    </div>
  );
}

function BlockLink({
  token,
  block,
}: {
  token: "sGLDT" | "ckUNI";
  block: bigint;
}) {
  return (
    <a
      href={ledgerUrl(token)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-blue-400 hover:text-blue-300 underline underline-offset-2"
      title={`${token} ledger canister on the ICP dashboard`}
    >
      {token} ledger block #{block.toString()} <ExternalLink size={10} />
    </a>
  );
}

export function ReceiptBlock({
  entry,
  /** Show the copy-link row (off inside pages that ARE the link target). */
  showLink = true,
}: {
  entry: LedgerEntry;
  showLink?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const legs = legTokens(entry.kind);
  const isSwap = entry.kind === "refine" || entry.kind === "redeem";

  const copyLink = () => {
    try {
      void navigator.clipboard.writeText(
        `${window.location.origin}/receipt/${entry.id}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      data-ocid={`receipt.block.${entry.id}`}
      className="rounded-2xl border border-zinc-800 bg-black/30 p-4"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-sm font-bold text-white">{KIND_LABEL[entry.kind]}</p>
        <StatusPill status={entry.status} />
      </div>

      <Row label="When">{fmtTime(entry.timestampNs)}</Row>
      {entry.amountIn && (
        <Row label={isSwap ? "You put in" : "Amount"}>
          <span className="font-mono">{fmtAmount(entry.amountIn, 6)}</span>
        </Row>
      )}
      {entry.amountOut && (
        <Row label="You received">
          <span className="font-mono">{fmtAmount(entry.amountOut, 6)}</span>
        </Row>
      )}
      {entry.rateE8 != null && entry.rateE8 > 0n && (
        <Row label="Settled rate">
          <span className="font-mono">
            1 UNI = {(Number(entry.rateE8) / 1e8).toFixed(4)} sGLDT
          </span>
        </Row>
      )}
      {entry.pullBlock != null && (
        <Row label={isSwap ? "Pull leg" : "Block"}>
          <BlockLink token={legs.pull} block={entry.pullBlock} />
        </Row>
      )}
      {entry.payBlock != null && (
        <Row label={isSwap ? "Pay leg" : "Block"}>
          <BlockLink
            token={isSwap ? legs.pay : entry.amountOut?.symbol === "ckUNI" || entry.amountIn?.symbol === "ckUNI" ? "ckUNI" : "sGLDT"}
            block={entry.payBlock}
          />
        </Row>
      )}
      {entry.ethTxHash && (
        <Row label="Ethereum tx">
          <a
            href={`https://etherscan.io/tx/${entry.ethTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            {entry.ethTxHash.slice(0, 10)}…{entry.ethTxHash.slice(-6)}{" "}
            <ExternalLink size={10} />
          </a>
        </Row>
      )}
      {entry.errorMsg && (
        <Row label="Note">
          <span className="text-amber-400/90 break-words">{entry.errorMsg}</span>
        </Row>
      )}

      {showLink && (
        <button
          type="button"
          data-ocid={`receipt.copy_link.${entry.id}`}
          onClick={copyLink}
          className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 underline underline-offset-2"
        >
          <Link2 size={11} />
          {copied ? "Link copied" : `Copy receipt link (/receipt/${entry.id})`}
        </button>
      )}
    </div>
  );
}
