import { Loader2 } from "lucide-react";
import { MiningAnimation } from "../MiningAnimation";

type Props = {
  /** Show the "releasing sGLDT" success-flavored hero card (releasing_sgldt
   *  phase); other active phases render only the progress bar. */
  releasing: boolean;
  phaseStep: number;
  phaseLabels: string[];
  statusMsg: string;
};

/** Generic in-flight view for the active mining phases: the 3-step progress
 *  bar, plus a highlighted hero card while sGLDT is being transferred. */
export function PhaseReleasing({
  releasing,
  phaseStep,
  phaseLabels,
  statusMsg,
}: Props) {
  return (
    <div
      data-ocid="refinery.mining.loading_state"
      className="space-y-6"
    >
      {releasing && (
        <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-4 flex items-center gap-4">
          <div className="shrink-0 bg-zinc-900/80 rounded-xl p-1">
            <MiningAnimation progress={1} success={true} scale={0.55} />
          </div>
          <div>
            <p className="font-bold text-yellow-400 text-sm">
              Releasing sGLDT to Your Account
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              ETH transaction confirmed — sGLDT is being
              transferred from the treasury to your ICP
              account.
            </p>
          </div>
        </div>
      )}
      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
        <span>{phaseLabels[phaseStep - 1] ?? statusMsg}</span>
        <span className="text-yellow-400">
          {Math.round((phaseStep / 3) * 100)}%
        </span>
      </div>
      <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden p-0.5">
        {/* Blue (chain) → gold (sGLDT): the bar terminates in the thing being
            released. The old to-pink-600 end-stop rendered as a second blue
            under an orphaned magenta glow after the rebrand remap. */}
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-yellow-400 to-yellow-300 rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(250,204,21,0.3)]"
          style={{ width: `${(phaseStep / 3) * 100}%` }}
        />
      </div>
      <div className="text-center text-xs text-zinc-500 font-medium">
        {statusMsg}
      </div>
      <div className="flex justify-center">
        <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-bold italic">
          <Loader2 size={12} className="animate-spin" />
          Processing on ICP...
        </div>
      </div>
    </div>
  );
}
