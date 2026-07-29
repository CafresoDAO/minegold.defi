import { Activity } from "lucide-react";
import { BlockConfirmationMeter } from "../BlockConfirmationMeter";
import { CrossChainFlow } from "../CrossChainFlow";
import { MiningAnimation } from "../MiningAnimation";
import { GoldCTA } from "../ui/GoldCTA";
import { WorkflowStepper } from "../WorkflowStepper";

type Props = {
  uniAmount: string;
  bridgeProgress: number;
  pollAttempt: number;
  currentTxHash: string | null;
  statusMsg: string;
  checkDisabled: boolean;
  onCheckNow: () => void;
  onCancel: () => void;
};

/** eth_monitoring phase — waiting for Ethereum on-chain confirmation.
 *  Stepper + cross-chain flow + mining animation + live bridge progress bar
 *  + block confirmation meter + manual "check now" escape hatch. */
export function PhaseEthMonitoring({
  uniAmount,
  bridgeProgress,
  pollAttempt,
  currentTxHash,
  statusMsg,
  checkDisabled,
  onCheckNow,
  onCancel,
}: Props) {
  return (
    <div
      data-ocid="refinery.eth_monitoring.loading_state"
      className="space-y-4"
    >
      <WorkflowStepper currentStep={2} />
      <CrossChainFlow phase="bridge" amount={uniAmount} />

      {/* Calm monitoring hero — the mining animation is a subordinate
       *  decorative element; the real status signal is the bridge
       *  progress card immediately below. */}
      <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden p-5 flex items-center gap-5">
        <div className="shrink-0 scale-90 sm:scale-100 origin-left">
          <MiningAnimation
            progress={bridgeProgress}
            pollPing={pollAttempt > 0 ? pollAttempt : undefined}
            scale={0.7}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
            Status
          </p>
          <p className="font-bold text-white text-sm sm:text-base mb-1 leading-snug">
            {bridgeProgress >= 1
              ? "sGLDT released"
              : bridgeProgress >= 0.8
                ? "Verified — releasing sGLDT"
                : "Awaiting Ethereum confirmations"}
          </p>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            The chain-key minter waits for 12 Ethereum
            blocks, then credits ckUNI to the treasury.
            sGLDT releases automatically on arrival.
          </p>
        </div>
      </div>

      {/* Bridge progress — deposit status from getDepositStatus polling,
       *  rendered as a live 0→100% bar. Movement reflects the backend
       *  sweeper's actual verification state, not a simulated countdown. */}
      <div
        className="rounded-2xl border border-zinc-800 bg-black/30 p-4 space-y-2"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" aria-hidden />
            <span className="text-[11px] font-black text-zinc-300 uppercase tracking-widest truncate">
              Bridge progress
            </span>
          </div>
          <span
            className="text-[11px] font-mono font-bold text-zinc-200 tabular-nums"
            data-ocid="refinery.bridge.progress_pct"
          >
            {Math.round(bridgeProgress * 100)}%
          </span>
        </div>
        <div
          className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(bridgeProgress * 100)}
          aria-label="Refinery progress: how far your deposit has advanced through Ethereum confirmation and sGLDT release"
        >
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-sky-300 transition-[width] duration-500 ease-out"
            style={{
              width: `${Math.max(2, Math.round(bridgeProgress * 100))}%`,
            }}
          />
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          {bridgeProgress >= 1
            ? "Deposit verified — sGLDT released."
            : bridgeProgress >= 0.8
              ? "Deposit verified on Ethereum — the refinery is releasing your sGLDT now."
              : "Waiting for Ethereum confirmations. The refinery verifies your deposit on-chain and releases sGLDT automatically — typically 3–5 minutes."}
        </p>
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          Safe to close this tab — your deposit is recorded
          and the canister will finalize on its own.
        </p>
      </div>

      {/* Live block confirmation meter — pulls REAL data
          from viem publicClient.getTransactionReceipt +
          getBlockNumber. Shows the Ethereum-side
          confirmations count alongside the bridge progress
          so the user sees both halves of the journey. */}
      <BlockConfirmationMeter txHash={currentTxHash} />

      {/* Etherscan link + tx hash */}
      {currentTxHash && (
        <div className="rounded-2xl border border-zinc-800 bg-black/30 p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">
              Deposit Tx
            </div>
            <code className="text-[11px] text-blue-300 font-mono truncate block">
              {currentTxHash.slice(0, 14)}…{currentTxHash.slice(-8)}
            </code>
          </div>
          <a
            href={`https://etherscan.io/tx/${currentTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-300 hover:text-blue-200 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl transition-colors"
            data-ocid="refinery.etherscan.link"
          >
            <Activity size={11} />
            Etherscan ↗
          </a>
        </div>
      )}

      {statusMsg && (
        <div className="text-center text-xs text-zinc-500 font-medium">
          {statusMsg}
        </div>
      )}

      {/* Manual status check — useful on mobile when the browser has
       *  throttled the polling interval and the user wants to force an
       *  immediate recheck. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <GoldCTA
          data-ocid="refinery.check_now.button"
          tone="info"
          size="md"
          trailingIcon={null}
          disabled={checkDisabled}
          onClick={onCheckNow}
        >
          Check now
        </GoldCTA>
        <GoldCTA
          data-ocid="refinery.cancel.button"
          tone="neutral"
          size="md"
          trailingIcon={null}
          onClick={onCancel}
        >
          Cancel monitoring
        </GoldCTA>
      </div>
    </div>
  );
}
