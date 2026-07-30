import { CheckCircle2, Loader2 } from "lucide-react";
import { CrossChainFlow } from "../CrossChainFlow";
import { GoldCTA } from "../ui/GoldCTA";
import { WorkflowStepper } from "../WorkflowStepper";

type Props = {
  uniAmount: string;
  depositAddress: string;
  /** "I signed in my wallet but the promise hung" escape hatch: skip straight
   *  to watching for the minter's ckUNI credit. Harmless if pressed early —
   *  the watch simply polls until the credit lands or times out. */
  onBeginWatch: () => void;
  onCancel: () => void;
};

/**
 * Shown while we're waiting for the user to sign in their wallet app.
 *
 * Under minter attribution there is nothing to register with the backend and
 * no tx hash to recover — DFINITY's minter credits ckUNI to the user's own
 * principal once the deposit confirms. So the only escape hatch needed for a
 * hung wallet promise is "start watching for my ckUNI", which is exactly what
 * the automated path does after signing anyway.
 */
export function PhaseWalletConfirming({
  uniAmount,
  depositAddress,
  onBeginWatch,
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

      {/* Escape hatch for a hung wallet promise (mobile wallet app switches
          are the usual cause): the deposit names the user's own principal,
          so we can just start watching for the ckUNI credit — no hash, no
          Ethereum scanning, no backend registration. */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4 space-y-2">
        <div className="flex items-start gap-2">
          <CheckCircle2 size={14} className="text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-zinc-400 leading-relaxed">
            <strong className="block text-zinc-200 mb-0.5">
              Signed in your wallet but this screen didn't move on?
            </strong>
            Tap below — your ckUNI is minted to your own account after 12
            Ethereum blocks, so we just need to watch for it to arrive.
          </div>
        </div>
        <GoldCTA
          data-ocid="refinery.begin_watch.button"
          tone="info"
          size="md"
          trailingIcon={null}
          onClick={onBeginWatch}
        >
          I signed — watch for my ckUNI
        </GoldCTA>
      </div>
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
