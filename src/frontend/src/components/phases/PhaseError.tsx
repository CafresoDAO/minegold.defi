import { Activity, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { MiningAnimation } from "../MiningAnimation";
import type { TimelineStep } from "../TransactionTimeline";
import { GoldCTA } from "../ui/GoldCTA";

type Props = {
  statusMsg: string;
  bridgeProgress: number;
  currentTxHash: string | null;
  pollAttempt: number;
  retryErrorMsg: string | null;
  miningSteps: TimelineStep[];
  manualTxHash: string;
  manualRecoveryBusy: boolean;
  onManualTxHashChange: (v: string) => void;
  onFinalizeFromChain: () => void;
  onResumeFromTxHash: (hash: string) => void;
  onViewHistory: () => void;
  onTryAgain: () => void;
};

/** Error phase — either the soft "still processing" state (ETH confirmed,
 *  backend sweeper still working, auto-polling continues) or the hard error
 *  state with the step tracker and manual recovery paths. */
export function PhaseError({
  statusMsg,
  bridgeProgress,
  currentTxHash,
  pollAttempt,
  retryErrorMsg,
  miningSteps,
  manualTxHash,
  manualRecoveryBusy,
  onManualTxHashChange,
  onFinalizeFromChain,
  onResumeFromTxHash,
  onViewHistory,
  onTryAgain,
}: Props) {
  return (
    <div data-ocid="refinery.error_state" className="space-y-4">
      {statusMsg === "still_processing" ? (
        /* Soft state: ETH confirmed but backend still processing — auto-polling */
        <>
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 flex items-start gap-4">
            <div className="shrink-0">
              <MiningAnimation progress={bridgeProgress} scale={0.55} />
            </div>
            <div className="flex-1 pt-1">
              <p className="font-bold text-amber-400 mb-1">
                Ethereum Transaction Confirmed
              </p>
              <p className="text-sm text-zinc-400 mb-2">
                Still mining — checking your sGLDT release
                automatically every 3 seconds.
              </p>
              {currentTxHash && (
                <a
                  href={`https://etherscan.io/tx/${currentTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 underline transition-colors"
                  data-ocid="refinery.etherscan_processing.link"
                >
                  <Activity size={11} />
                  View on Etherscan
                </a>
              )}
              <p className="text-[10px] text-zinc-600 mt-2 font-mono animate-pulse">
                Checking transaction... (attempt {pollAttempt})
              </p>
            </div>
          </div>
          {/* Payout-specific error message — shown if a payout attempt fails */}
          {retryErrorMsg && (
            <div
              data-ocid="refinery.retry_error.error_state"
              className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 flex items-start gap-3"
            >
              <XCircle
                className="text-red-400 flex-shrink-0 mt-0.5"
                size={18}
              />
              <div>
                <p className="text-sm font-semibold text-red-400 mb-0.5">
                  Payout Error
                </p>
                <p className="text-xs text-zinc-400">
                  {retryErrorMsg}
                </p>
                {retryErrorMsg.toLowerCase().includes("too low") && (
                  <p className="text-xs text-zinc-500 mt-1">
                    The treasury needs to be topped up with
                    sGLDT before this payout can complete.
                    Your deposit is safe — retrying
                    automatically.
                  </p>
                )}
              </div>
            </div>
          )}
          <button
            type="button"
            data-ocid="refinery.view_history.button"
            onClick={onViewHistory}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold h-12 rounded-2xl transition-all text-sm"
          >
            View Transaction History
          </button>
        </>
      ) : (
        /* Hard error state */
        <>
          <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-5 flex items-start gap-3">
            <XCircle
              className="text-red-400 flex-shrink-0 mt-0.5"
              size={20}
            />
            <div>
              <p className="font-bold text-red-400 mb-1">
                Error
              </p>
              <p className="text-sm text-zinc-400">
                {statusMsg}
              </p>
              {currentTxHash && (
                <a
                  href={`https://etherscan.io/tx/${currentTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 underline transition-colors"
                  data-ocid="refinery.etherscan_error.link"
                >
                  <Activity size={11} />
                  Track on Etherscan
                </a>
              )}
            </div>
          </div>
          {/* Step tracker + manual recovery panel */}
          {miningSteps.length > 0 && (
            <div className="rounded-2xl bg-zinc-900 border border-zinc-700/50 p-4 space-y-2">
              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                Progress
              </div>
              {miningSteps.map((s) => (
                <div key={s.id} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 shrink-0 text-sm">
                    {s.status === "done" ? "✅" : s.status === "error" ? "❌" : s.status === "active" ? "⏳" : "⚪"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={
                      s.status === "done" ? "text-emerald-400"
                      : s.status === "error" ? "text-red-400"
                      : s.status === "active" ? "text-yellow-400"
                      : "text-zinc-500"
                    }>
                      {s.label}
                    </div>
                    {s.detail && (
                      <div className="text-[10px] text-zinc-500 font-mono break-all mt-0.5">
                        {s.detail}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* PRIMARY recovery — one-click finalize.
              Same button as in wallet_confirming, placed
              here too because that's where users land if
              the automated hash-capture race fails. */}
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/40 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-300 leading-relaxed">
                <strong className="block text-emerald-200 mb-0.5">Already signed your deposit?</strong>
                Tap below — we'll find your deposit on Ethereum and finalize it automatically.
              </div>
            </div>
            <button
              type="button"
              disabled={manualRecoveryBusy}
              onClick={onFinalizeFromChain}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              data-ocid="refinery.finalize_from_chain.error_button"
            >
              {manualRecoveryBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching Ethereum…
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Finalize my deposit
                </>
              )}
            </button>
          </div>
          <details className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4">
            <summary className="cursor-pointer text-xs font-bold text-yellow-400 select-none">
              Paste tx hash manually (advanced)
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Rarely needed — the green button above is the fastest path. Use this
                only if you want to explicitly paste a specific deposit hash.
              </p>
              <input
                type="text"
                value={manualTxHash}
                onChange={(e) => onManualTxHashChange(e.target.value)}
                placeholder="0x…"
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
          <GoldCTA
            data-ocid="refinery.try_again.button"
            tone="neutral"
            size="md"
            trailingIcon={null}
            onClick={onTryAgain}
          >
            Try Again
          </GoldCTA>
        </>
      )}
    </div>
  );
}
