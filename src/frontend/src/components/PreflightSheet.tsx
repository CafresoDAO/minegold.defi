import { CheckCircle2, X } from "lucide-react";
import { GoldCTA } from "./ui/GoldCTA";

type Props = {
  uniAmount: string;
  /** "≈ 0.23 sGLDT" estimate at the current on-chain rate, or null. */
  estSgldt: string | null;
  /** Live gas estimate string ("~0.0012 ETH ($2.31)"), or null while unknown. */
  gasEstimate: string | null;
  unlimitedApproval: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * The pre-signing confirm sheet — shown AFTER every validation has passed
 * (amount, floor, spender assertion) and BEFORE the wallet opens.
 *
 * Purpose: nobody should meet a wallet signature they weren't told about.
 * The two taps are named, the permission is stated exactly, the gas is the
 * real estimate, and the escape hatch is explicit: rejecting in the wallet
 * costs nothing. Every fact here is the same fact the flow acts on — this
 * sheet renders state, it doesn't restate hopes.
 */
export function PreflightSheet({
  uniAmount,
  estSgldt,
  gasEstimate,
  unlimitedApproval,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      data-ocid="refinery.preflight.sheet"
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
    >
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-t-[2rem] sm:rounded-[2rem] p-6 sm:p-8 relative max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain">
        <button
          type="button"
          data-ocid="refinery.preflight.close"
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <h2 className="t-headline text-white mb-1">
          Two taps in your wallet, coming up
        </h2>
        <p className="text-[13px] text-zinc-400 leading-relaxed mb-5">
          Your wallet will ask you to sign twice. That&apos;s one deposit —
          you are <span className="text-zinc-200 font-semibold">not</span>{" "}
          paying twice.
        </p>

        <ol className="space-y-3 mb-5">
          <li className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-baseline gap-2">
              <span className="t-label text-yellow-500">Tap 1</span>
              <span className="text-sm font-bold text-white">Permission</span>
            </div>
            <p className="text-[12px] text-zinc-400 leading-relaxed mt-1">
              {unlimitedApproval ? (
                <>
                  Grants the deposit contract an{" "}
                  <span className="text-amber-300 font-semibold">
                    unlimited UNI allowance
                  </span>{" "}
                  (you opted in — future swaps skip this tap).
                </>
              ) : (
                <>
                  Lets the deposit contract move{" "}
                  <span className="text-zinc-200 font-semibold">
                    exactly {uniAmount} UNI
                  </span>{" "}
                  — nothing more, nothing again.
                </>
              )}
            </p>
          </li>
          <li className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-baseline gap-2">
              <span className="t-label text-yellow-500">Tap 2</span>
              <span className="text-sm font-bold text-white">The deposit</span>
            </div>
            <p className="text-[12px] text-zinc-400 leading-relaxed mt-1">
              Sends the {uniAmount} UNI{estSgldt ? <> (≈ {estSgldt})</> : null}.
              After 12 Ethereum blocks it&apos;s credited to your own account —
              never to us.
            </p>
          </li>
        </ol>

        <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 space-y-1.5 text-[12px] mb-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-500">Network fee (both taps)</span>
            <span className="text-zinc-200 font-mono">
              {gasEstimate ?? "estimating…"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-zinc-500">Deposit contract</span>
            <span
              className="inline-flex items-center gap-1 text-emerald-300"
              title="Checked before this sheet opened: the contract matches DFINITY's published ckERC-20 helper. On a mismatch the flow halts and nothing is signed."
            >
              <CheckCircle2 size={11} />
              verified DFINITY helper
            </span>
          </div>
        </div>

        <GoldCTA
          data-ocid="refinery.preflight.confirm"
          onClick={onConfirm}
          size="lg"
          trailingIcon={null}
        >
          Open my wallet
        </GoldCTA>
        <p className="mt-3 text-center text-[11px] text-zinc-500 leading-relaxed">
          Reject either tap by accident? Nothing is lost and nothing moves —
          just start again.{" "}
          <button
            type="button"
            data-ocid="refinery.preflight.cancel"
            onClick={onCancel}
            className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
          >
            Not now
          </button>
        </p>
      </div>
    </div>
  );
}
