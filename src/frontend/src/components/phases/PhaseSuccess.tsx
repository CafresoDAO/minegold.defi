import { Activity, CheckCircle2, Sparkles } from "lucide-react";
import { CrossChainFlow } from "../CrossChainFlow";
import { GoldCTA } from "../ui/GoldCTA";
import { WorkflowStepper } from "../WorkflowStepper";

type Props = {
  /** The REAL settled amount from the backend, or null while it's still
   *  being confirmed. Never pass a client-side estimate here — an unverified
   *  number presented as settled is the fastest way to lose trust. */
  sgldtReleased: string | null;
  currentTxHash: string | null;
  onStartNew: () => void;
};

export function PhaseSuccess({ sgldtReleased, currentTxHash, onStartNew }: Props) {
  return (
    <div data-ocid="refinery.success_state" className="space-y-4">
      <WorkflowStepper currentStep={3} complete />
      <CrossChainFlow phase="done" amount={sgldtReleased ?? undefined} />

      {/* Hero success card — pops in with a scale/fade animation */}
      <div className="relative rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-900 p-6 sm:p-8 overflow-hidden animate-success-pop">
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at top, rgba(16, 185, 129, 0.25) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
            <CheckCircle2 size={44} className="text-emerald-400" strokeWidth={2.2} />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-yellow-400" />
            <h2 className="font-black text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-emerald-300 via-yellow-300 to-yellow-400 bg-clip-text text-transparent">
              Refinery Complete
            </h2>
            <Sparkles size={16} className="text-yellow-400" />
          </div>
          {sgldtReleased != null ? (
            <>
              <p className="text-sm text-zinc-300 mb-1">
                <span className="text-yellow-400 font-black text-lg">
                  {sgldtReleased} sGLDT
                </span>
              </p>
              <p className="text-xs text-zinc-500">
                released to your ICP account
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-300 mb-1">
                <span className="text-yellow-400 font-black text-lg animate-pulse">
                  Amount confirming…
                </span>
              </p>
              <p className="text-xs text-zinc-500">
                your sGLDT was released — fetching the exact amount
              </p>
            </>
          )}
          {currentTxHash && (
            <a
              href={`https://etherscan.io/tx/${currentTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-300 hover:text-blue-200 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl transition-colors"
              data-ocid="refinery.etherscan.link"
            >
              <Activity size={11} />
              View deposit on Etherscan ↗
            </a>
          )}
        </div>
      </div>

      <GoldCTA
        data-ocid="refinery.success.start_new"
        onClick={onStartNew}
        size="md"
        trailingIcon={null}
      >
        Start Another Refinery
      </GoldCTA>
    </div>
  );
}
