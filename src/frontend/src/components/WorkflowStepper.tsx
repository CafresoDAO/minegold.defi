import { Check, Loader2, Wallet, Coins, Activity } from "lucide-react";

type StepStatus = "pending" | "active" | "done" | "error";
type Step = { id: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; status: StepStatus };

type Props = {
  /** 0 (idle) | 1 (wallet) | 2 (eth monitoring) | 3 (releasing) */
  currentStep: number;
  /** true when every step is done */
  complete?: boolean;
  /** true when flow errored */
  errored?: boolean;
};

/**
 * Top-of-refinery progress stepper. Three horizontal pills showing where in
 * the Wallet → Ethereum → Release flow the user is, with live status icons.
 *
 * Visual rules:
 *   - done   → emerald filled circle with check
 *   - active → yellow pulsing ring with spinner
 *   - pending → zinc outline
 *   - error (if errored AND step ≥ currentStep) → red x
 *
 * The connector line between steps fills in as progress advances, using a
 * CSS gradient so the "liquid gold" aesthetic matches the rest of the dApp.
 */
export function WorkflowStepper({ currentStep, complete, errored }: Props) {
  const steps: Step[] = [
    { id: "wallet", label: "Sign in Wallet", icon: Wallet, status: resolveStatus(1, currentStep, complete, errored) },
    { id: "ethereum", label: "Ethereum Confirm", icon: Activity, status: resolveStatus(2, currentStep, complete, errored) },
    { id: "release", label: "Release sGLDT", icon: Coins, status: resolveStatus(3, currentStep, complete, errored) },
  ];

  return (
    <div className="relative rounded-2xl bg-zinc-900/60 border border-zinc-800 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex-1 flex items-center">
            <StepNode step={s} index={i + 1} />
            {i < steps.length - 1 && (
              <Connector
                fromStatus={s.status}
                toStatus={steps[i + 1].status}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function resolveStatus(
  stepNum: number,
  current: number,
  complete?: boolean,
  errored?: boolean,
): StepStatus {
  if (complete) return "done";
  if (errored && stepNum >= current) return stepNum === current ? "error" : "pending";
  if (stepNum < current) return "done";
  if (stepNum === current) return "active";
  return "pending";
}

function StepNode({ step, index }: { step: Step; index: number }) {
  const Icon = step.icon;
  const done = step.status === "done";
  const active = step.status === "active";
  const error = step.status === "error";

  const circleClasses = done
    ? "bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/30"
    : active
      ? "bg-yellow-500/15 border-yellow-400 animate-pulse-slow"
      : error
        ? "bg-red-500/15 border-red-500"
        : "bg-zinc-900 border-zinc-700";

  const labelClasses = done
    ? "text-emerald-400"
    : active
      ? "text-yellow-400"
      : error
        ? "text-red-400"
        : "text-zinc-500";

  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <div
        className={`relative w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all ${circleClasses}`}
      >
        {done ? (
          <Check size={20} className="text-white" strokeWidth={3} />
        ) : active ? (
          <>
            <Loader2 size={16} className="text-yellow-300 animate-spin" />
            <span className="absolute inset-0 rounded-full border-2 border-yellow-400 animate-ping opacity-40" />
          </>
        ) : error ? (
          <span className="text-red-400 font-black text-base">!</span>
        ) : (
          <Icon size={16} className="text-zinc-500" />
        )}
      </div>
      <div className="flex flex-col items-center">
        <span className={`t-label ${labelClasses}`}>
          Step {index}
        </span>
        <span
          className={`text-[10px] font-semibold text-center leading-tight ${labelClasses}`}
        >
          {step.label}
        </span>
      </div>
    </div>
  );
}

function Connector({ fromStatus, toStatus }: { fromStatus: StepStatus; toStatus: StepStatus }) {
  const filled = fromStatus === "done";
  const transitioning = fromStatus === "done" && toStatus === "active";
  return (
    <div className="flex-1 h-0.5 mx-2 relative self-start mt-[22px] bg-zinc-800 rounded-full overflow-hidden">
      <span
        className={`absolute inset-y-0 left-0 ${
          filled
            ? "bg-gradient-to-r from-emerald-400 to-yellow-400"
            : "bg-transparent"
        }`}
        style={{ width: filled ? "100%" : "0%", transition: "width 0.6s ease-out" }}
      />
      {transitioning && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300/60 to-transparent animate-shimmer" />
      )}
    </div>
  );
}
