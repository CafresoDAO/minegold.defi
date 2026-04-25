import { CheckCircle2, Loader2 } from "lucide-react";
import { CrossChainFlow } from "../CrossChainFlow";
import { WorkflowStepper } from "../WorkflowStepper";

type Props = {
  uniAmount: string;
  depositAddress: string;
  manualTxHash: string;
  manualRecoveryBusy: boolean;
  onManualTxHashChange: (v: string) => void;
  onResumeFromTxHash: (hash: string) => void;
  onFinalizeFromChain: () => void;
  onCancel: () => void;
};

/**
 * Shown while we're waiting for the user to sign in their wallet app.
 * Exposes a manual-hash paste-box for the "I already signed but the flow
 * hung" escape hatch (primarily mobile). The cross-phase TransactionTimeline
 * renders above this in App.tsx, so we don't duplicate per-step progress here.
 */
export function PhaseWalletConfirming({
  uniAmount,
  depositAddress,
  manualTxHash,
  manualRecoveryBusy,
  onManualTxHashChange,
  onResumeFromTxHash,
  onFinalizeFromChain,
  onCancel,
}: Props) {
  return (
    <div
      data-ocid="refinery.wallet_confirming.loading_state"
      className="space-y-4"
    >
      <WorkflowStepper currentStep={1} />
      <CrossChainFlow phase="eth" amount={uniAmount} />
      <div className="rounded-2xl bg-pink-500/10 border border-pink-500/30 p-5 flex items-start gap-3">
        <Loader2 size={20} className="text-pink-400 animate-spin shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-pink-400 text-sm mb-1">
            Waiting for Wallet Confirmation
          </p>
          <p className="text-xs text-zinc-400">
            Your{" "}
            <span className="text-white font-semibold">{uniAmount} UNI</span>{" "}
            transfer is pending approval in your Brave Wallet. Please open your
            wallet and confirm the transaction.
          </p>
        </div>
      </div>
      <div className="rounded-2xl bg-zinc-900 border border-zinc-700/50 p-4 text-xs text-zinc-500 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-zinc-600 font-sans">To (Helper)</span>
          <span className="text-yellow-300 text-[10px]">
            {depositAddress.slice(0, 10)}…{depositAddress.slice(-4)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-zinc-600 font-sans">Amount</span>
          <span className="text-white">{uniAmount} UNI (ERC-20)</span>
        </div>
      </div>

      {/* PRIMARY ESCAPE HATCH — after the user signs the deposit in their
          wallet, they tap this button. Backend scans Etherscan for their
          most recent matching deposit tx and auto-registers it. No hash
          copying needed. Works even when the frontend's hash-capture race
          failed silently on mobile. */}
      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/40 p-4 space-y-2">
        <div className="flex items-start gap-2">
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-emerald-300 leading-relaxed">
            <strong className="block text-emerald-200 mb-0.5">Done signing in your wallet?</strong>
            Tap below — we'll find your deposit on Ethereum and finalize it automatically. No hash copying needed.
          </div>
        </div>
        <button
          type="button"
          disabled={manualRecoveryBusy}
          onClick={onFinalizeFromChain}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          data-ocid="refinery.finalize_from_chain.button"
        >
          {manualRecoveryBusy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching Ethereum…
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              I signed — finalize my deposit
            </>
          )}
        </button>
      </div>
      <details className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4">
        <summary className="cursor-pointer text-xs font-bold text-yellow-400 select-none">
          ⛏ Already signed? Continue with tx hash →
        </summary>
        <div className="mt-3 space-y-2">
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            If the flow hangs on mobile after you signed, open your wallet's
            activity tab and paste the <strong className="text-yellow-300">deposit</strong>{" "}
            hash below. Mining will resume.
          </p>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-[10px] text-amber-300 leading-relaxed">
            <strong className="block text-amber-200 mb-1">⚠ Paste the DEPOSIT tx, not Approve</strong>
            A UNI swap signs two transactions in order:
            <span className="block mt-1 font-mono text-[10px]">
              1. <span className="text-zinc-400">Approve UNI</span>{" "}
              <span className="text-zinc-600">← skip this one</span><br />
              2. <span className="text-emerald-400">Deposit to Bridge</span>{" "}
              <span className="text-emerald-300">← paste THIS hash</span>
            </span>
          </div>
          <input
            type="text"
            value={manualTxHash}
            onChange={(e) => onManualTxHashChange(e.target.value)}
            placeholder="0x… (deposit tx, 2nd signed)"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-yellow-300 font-mono placeholder:text-zinc-600"
          />
          <button
            type="button"
            disabled={manualRecoveryBusy || !manualTxHash}
            onClick={() => onResumeFromTxHash(manualTxHash)}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 rounded-lg disabled:opacity-50 text-sm"
          >
            {manualRecoveryBusy ? (
              <Loader2 className="w-4 h-4 mx-auto animate-spin" />
            ) : (
              "Resume monitoring"
            )}
          </button>
        </div>
      </details>
      <button
        type="button"
        data-ocid="refinery.cancel.button"
        onClick={onCancel}
        className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold h-14 rounded-2xl transition-all"
      >
        Cancel
      </button>
    </div>
  );
}
