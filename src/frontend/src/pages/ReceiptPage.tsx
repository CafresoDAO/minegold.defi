import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useInternetIdentity } from "../auth";
import { ReceiptBlock } from "../components/trust/ReceiptBlock";
import { ShareReceiptControl } from "../components/trust/ShareReceiptControl";
import { useLedger } from "../hooks/useLedger";
import { findEntry } from "../lib/ledger";

/**
 * /receipt/:id — one ledger entry, full page. The id is the LedgerEntry key
 * ("rf-3" / "rd-1" / "tx-17"). Records are caller-scoped on the backend, so
 * the viewer must be the owner signed into their own vault — a link opened
 * by anyone else shows the sign-in prompt, never someone else's receipt.
 * (A public, non-identifying receipt endpoint is planned separately — I8.)
 */
export function ReceiptPage({
  id,
  onBack,
}: {
  id: string | undefined;
  onBack: () => void;
}) {
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();
  const { entries, isLoading } = useLedger(identity);

  const entry = id ? findEntry(entries, id) : null;

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-100">
      <div className="max-w-md mx-auto px-4 sm:px-6 py-10">
        <button
          type="button"
          data-ocid="receipt.back"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Back to activity
        </button>

        <h1 className="t-headline text-white mb-1">Receipt</h1>
        <p className="text-[12px] text-zinc-500 mb-6">
          Every figure below exists on a public ledger — verify it, don&apos;t
          trust it.
        </p>

        {!isLoggedIn ? (
          <div
            data-ocid="receipt.login_prompt"
            className="text-center bg-zinc-900 border border-zinc-800 rounded-[2rem] p-10"
          >
            <ShieldCheck
              size={40}
              className="text-yellow-500 mx-auto mb-4 opacity-80"
            />
            <p className="text-zinc-400 text-sm mb-6">
              Receipts are private to their owner. Open your vault to view
              yours.
            </p>
            <button
              type="button"
              onClick={login}
              disabled={isLoggingIn}
              data-ocid="receipt.login_button"
              className="w-full bg-white text-black hover:bg-zinc-200 h-14 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                "Open my vault"
              )}
            </button>
          </div>
        ) : isLoading && !entry ? (
          <div className="text-center text-sm text-zinc-500 py-16 animate-pulse">
            Reading your ledger…
          </div>
        ) : !entry ? (
          <div
            data-ocid="receipt.not_found"
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center"
          >
            <p className="text-sm font-bold text-zinc-300 mb-1">
              No receipt with this reference
            </p>
            <p className="text-xs text-zinc-500">
              This vault has no entry &quot;{id ?? "—"}&quot;. Receipts are
              visible only to the vault that owns them — if someone shared
              this link with you, only they can open it.
            </p>
          </div>
        ) : (
          <>
            <ReceiptBlock entry={entry} showLink={false} />
            {identity && (
              <ShareReceiptControl entry={entry} identity={identity} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
