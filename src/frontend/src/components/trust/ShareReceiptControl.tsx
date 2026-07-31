import { Check, Copy, Link2, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Identity } from "@dfinity/agent";
import type { LedgerEntry } from "../../lib/ledger";
import {
  fetchShareToken,
  publishReceipt,
  shareUrl,
  unpublishReceipt,
  type ReceiptKind,
} from "../../lib/receiptShare";

/**
 * Turn one of your own receipts into a link anyone can open.
 *
 * The share link resolves to a view containing no principal, no account, and
 * no wallet address — the backend builds it without those fields rather than
 * stripping them. What the link DOES expose is the amounts, the settled rate
 * and the ledger block, and this component says so before you create one:
 * the moment to explain what sharing publishes is before the click, not in a
 * help page afterwards.
 *
 * Only refines and redeems can be shared; the other ledger kinds have no
 * backing record with a public view.
 */
export function ShareReceiptControl({
  entry,
  identity,
}: {
  entry: LedgerEntry;
  identity: Identity;
}) {
  const kind: ReceiptKind | null =
    entry.kind === "refine" || entry.kind === "redeem" ? entry.kind : null;
  // "rf-3" / "rd-1" → 3 / 1
  const numericId = (() => {
    const n = entry.id.split("-")[1];
    return n && /^\d+$/.test(n) ? BigInt(n) : null;
  })();

  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  // Look up existing share state WITHOUT minting a link — opening a receipt
  // should never publish it as a side effect.
  useEffect(() => {
    let cancelled = false;
    if (!kind || numericId === null) {
      setChecked(true);
      return;
    }
    void (async () => {
      const t = await fetchShareToken(identity, kind, numericId);
      if (cancelled) return;
      setToken(t);
      setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [identity, kind, numericId]);

  if (!kind || numericId === null || !checked) return null;

  const onShare = async () => {
    setBusy(true);
    setError(null);
    const res = await publishReceipt(identity, kind, numericId);
    if (res.ok) setToken(res.token);
    else setError(res.error);
    setBusy(false);
  };

  const onRevoke = async () => {
    setBusy(true);
    setError(null);
    const res = await unpublishReceipt(identity, kind, numericId);
    if (res.ok) {
      setToken(null);
      setCopied(false);
    } else setError(res.error ?? "Couldn't revoke the link.");
    setBusy(false);
  };

  const onCopy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — select the link and copy it manually.");
    }
  };

  return (
    <div
      data-ocid="receipt.share"
      className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
    >
      {token ? (
        <>
          <p className="text-[12px] font-bold text-zinc-200 mb-1">
            This receipt is shared
          </p>
          <p className="text-[11px] leading-relaxed text-zinc-500 mb-3">
            Anyone with the link can see the amounts, the settled rate and the
            ledger block — and nothing that identifies you. Revoking stops the
            link resolving; the receipt stays in your history either way.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-zinc-800 bg-black/40 px-2.5 py-2 font-mono text-[11px] text-zinc-400">
              {shareUrl(token)}
            </code>
            <button
              type="button"
              data-ocid="receipt.share.copy"
              onClick={() => void onCopy()}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-[12px] font-bold text-zinc-200 hover:bg-zinc-800"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              data-ocid="receipt.share.revoke"
              onClick={() => void onRevoke()}
              disabled={busy}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-zinc-800 px-3 text-[12px] font-semibold text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
              Revoke
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[12px] font-bold text-zinc-200 mb-1">
            Share this receipt
          </p>
          <p className="text-[11px] leading-relaxed text-zinc-500 mb-3">
            Creates a link anyone can open. It shows the amounts, the settled
            rate and the ledger block — and carries no account, wallet address
            or identity. You can revoke it at any time.
          </p>
          <button
            type="button"
            data-ocid="receipt.share.create"
            onClick={() => void onShare()}
            disabled={busy}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 text-[12px] font-bold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Link2 size={13} />
            )}
            Create share link
          </button>
        </>
      )}
      {error && (
        <p className="mt-2 text-[11px] text-amber-400" data-ocid="receipt.share.error">
          {error}
        </p>
      )}
    </div>
  );
}
