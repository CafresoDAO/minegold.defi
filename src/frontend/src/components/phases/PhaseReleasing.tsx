import { CheckCircle2, Loader2 } from "lucide-react";

type Props = {
  /** Show the "releasing sGLDT" hero card (releasing_sgldt phase); other
   *  active phases render only the step list. */
  releasing: boolean;
  phaseStep: number;
  phaseLabels: string[];
  statusMsg: string;
};

/** Generic in-flight view for the active refine phases.
 *
 *  Deliberately NO percentage bar: the old (phaseStep/3)*100% bar was a fake
 *  progress number — step 2 (Ethereum confirmation) dominates wall-clock time
 *  while the bar sat at 67% implying near-done. Steps are shown as discrete
 *  states (done / current / upcoming) with the live status line underneath —
 *  honest about WHERE the flow is without inventing HOW FAR ALONG it is. */
export function PhaseReleasing({
  releasing,
  phaseStep,
  phaseLabels,
  statusMsg,
}: Props) {
  return (
    <div data-ocid="refinery.mining.loading_state" className="space-y-5">
      {releasing && (
        <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-4 flex items-center gap-3">
          <Loader2 size={20} className="text-yellow-400 animate-spin shrink-0" />
          <div>
            <p className="font-bold text-yellow-400 text-sm">
              Settling the swap on ICP
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              The refinery is pulling the ckUNI you approved and paying sGLDT
              to your account in one atomic step — if it can&apos;t complete,
              your ckUNI is refunded automatically.
            </p>
          </div>
        </div>
      )}

      <ol className="space-y-2">
        {phaseLabels.map((label, i) => {
          const step = i + 1;
          const state =
            step < phaseStep ? "done" : step === phaseStep ? "current" : "next";
          return (
            <li key={label} className="flex items-center gap-2.5 text-xs">
              {state === "done" ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              ) : state === "current" ? (
                <Loader2
                  size={16}
                  className="text-yellow-400 animate-spin shrink-0"
                />
              ) : (
                <span className="w-4 h-4 rounded-full border border-zinc-700 shrink-0" />
              )}
              <span
                className={
                  state === "done"
                    ? "text-zinc-500 line-through decoration-zinc-700"
                    : state === "current"
                      ? "text-zinc-100 font-bold"
                      : "text-zinc-600"
                }
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="text-center text-xs text-zinc-500 font-medium">
        {statusMsg}
      </div>
    </div>
  );
}
