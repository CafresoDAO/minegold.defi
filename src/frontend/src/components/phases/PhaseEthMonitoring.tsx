import { Activity } from "lucide-react";
import { MineShaft } from "../MineShaft";
import { GoldCTA } from "../ui/GoldCTA";
import { WorkflowStepper } from "../WorkflowStepper";
import { useEthConfirmations } from "../../hooks/useEthConfirmations";

type Props = {
  uniAmount: string;
  /** Retained for the legacy treasury flow's backend-status milestones; the
   *  shaft itself NEVER renders this — depth is real confirmations only. */
  bridgeProgress: number;
  pollAttempt: number;
  currentTxHash: string | null;
  statusMsg: string;
  /** True for the minter-attribution flow: ckUNI is being minted to the
   *  user's own account, and the refinery swaps it once it lands. False for
   *  legacy deposits still being verified against Ethereum by the backend. */
  minterFlow: boolean;
  checkDisabled: boolean;
  onCheckNow: () => void;
  onCancel: () => void;
};

const TARGET = 12;

/** eth_monitoring / ckuni_minting phase — the descent.
 *
 *  One progress object: the mine shaft. Each of the 12 strata is a REAL
 *  Ethereum confirmation (useEthConfirmations — receipt + head via viem);
 *  the chain-key seam below them is the ICP mint moment; the gold glow at
 *  the bottom is the destination. The old stack of four competing indicators
 *  (cross-chain diorama, elapsed-time % bar, confirmation meter, mining
 *  animation) collapsed into this one honest object. */
export function PhaseEthMonitoring({
  uniAmount,
  bridgeProgress,
  pollAttempt,
  currentTxHash,
  statusMsg,
  minterFlow,
  checkDisabled,
  onCheckNow,
  onCancel,
}: Props) {
  const chain = useEthConfirmations(currentTxHash, TARGET);
  const confs = chain.confirmations;
  const stage: "surface" | "confirming" | "sealing" =
    chain.receiptStatus === "mined" || chain.receiptStatus === "reverted"
      ? confs >= TARGET
        ? "sealing"
        : "confirming"
      : "surface";

  const headline =
    chain.receiptStatus === "reverted"
      ? "Deposit transaction reverted on Ethereum"
      : stage === "sealing"
        ? minterFlow
          ? "At the chain-key seam — minting your ckUNI"
          : "Confirmed — verifying and releasing sGLDT"
        : stage === "confirming"
          ? `Breaking through block ${Math.min(confs + 1, TARGET)} of ${TARGET}`
          : currentTxHash
            ? "Waiting for your deposit to be mined"
            : "Watching your account for the ckUNI credit";

  /** The wait-copy arc — a different sentence per PHASE of the wait, keyed
   *  to real confirmations. A 3-minute wait with one static line feels
   *  stalled; the same wait narrated in stages feels like progress (which it
   *  is — every stratum on screen is a mined block). */
  const waitArc = (c: number): string => {
    if (c <= 0) return "First confirmation starts the descent — usually within ~15 seconds.";
    if (c <= 3) return "Under way. Each stratum breaking on screen is a real Ethereum block confirming your deposit.";
    if (c <= 8) return "Deep in the middle stretch — the pace you see is Ethereum's, not ours. Nothing needs you until the gold.";
    if (c <= 11) return "Nearly at the seam — a couple of blocks left before the chain-key mint.";
    return "All 12 blocks confirmed.";
  };

  const sub =
    chain.receiptStatus === "reverted"
      ? "The deposit tx failed on-chain — your UNI did not move. Check the transaction on Etherscan and try again."
      : stage === "sealing"
        ? minterFlow
          ? "All 12 blocks confirmed. DFINITY's chain-key minter is crediting ckUNI to your own account; the refinery swaps it the moment it lands."
          : "All 12 blocks confirmed. The canister is verifying the deposit and releasing your sGLDT."
        : stage === "confirming"
          ? `${waitArc(confs)} ~${Math.max(1, Math.ceil(chain.etaSec / 60))} min at current pace.`
          : currentTxHash
            ? "Broadcast to Ethereum — the first confirmation starts the descent."
            : "Watching your account for the ckUNI credit directly — no tx hash needed.";

  return (
    <div
      data-ocid="refinery.eth_monitoring.loading_state"
      className="space-y-4"
    >
      <WorkflowStepper currentStep={2} />

      {/* THE SHAFT — the single progress display. Depth = confirmations. */}
      <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
        <MineShaft
          confirmations={confs}
          targetConfirmations={TARGET}
          stage={stage}
        />
        {/* Status overlay pinned to the shaft's top edge */}
        <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent px-4 pt-3 pb-8 pointer-events-none">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-black text-white text-sm sm:text-base leading-snug">
              {headline}
            </p>
            <p
              className="text-[11px] font-mono font-bold text-yellow-400 tabular-nums shrink-0"
              data-ocid="refinery.shaft.depth"
              aria-live="polite"
            >
              {Math.min(confs, TARGET)}/{TARGET}
            </p>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
            {sub}
          </p>
          {stage !== "surface" && chain.receiptStatus !== "reverted" && (
            <p className="text-[11px] font-semibold text-emerald-300/90 mt-1">
              Safe to close this tab — your deposit finishes on its own.
            </p>
          )}
        </div>
      </div>

      {/* Deposit context + reassurance */}
      <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 space-y-1.5">
        <div className="flex items-center justify-between gap-3 text-[11px]">
          <span className="text-zinc-500 font-bold uppercase tracking-widest">
            Depositing
          </span>
          <span className="text-zinc-200 font-mono font-bold">
            {uniAmount} UNI
          </span>
        </div>
        {currentTxHash && (
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <code className="text-blue-300 font-mono truncate">
              {currentTxHash.slice(0, 14)}…{currentTxHash.slice(-8)}
            </code>
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
        <p className="text-[10px] text-zinc-500 leading-relaxed pt-1">
          {minterFlow
            ? "The ckUNI is minted to your own account, so it is yours whether or not this page is open. Return any time to refine it."
            : "Your deposit is recorded and the canister will finalize on its own."}
        </p>
        {statusMsg && (
          <p className="text-[10px] text-zinc-500 font-mono">
            {statusMsg}
            {pollAttempt > 0 && !minterFlow ? ` · check ${pollAttempt}` : ""}
          </p>
        )}
        {/* Legacy flow: surface the backend milestone the chain can't show */}
        {!minterFlow && bridgeProgress >= 0.8 && (
          <p className="text-[10px] text-emerald-400/90 font-mono">
            backend: deposit verified — payout imminent
          </p>
        )}
      </div>

      {/* Refresh forces an immediate recheck (mobile browsers throttle the
       *  poll). Cancel is deliberately a TEXT LINK, not a button: at this
       *  point the deposit completes with or without this tab, so "cancel"
       *  only stops the watching — button-sized it read like an abort that
       *  could still save the funds. */}
      <GoldCTA
        data-ocid="refinery.check_now.button"
        tone="info"
        size="md"
        trailingIcon={null}
        disabled={checkDisabled}
        onClick={onCheckNow}
      >
        Refresh
      </GoldCTA>
      <p className="text-center text-[11px] text-zinc-500">
        <button
          type="button"
          data-ocid="refinery.cancel.button"
          onClick={onCancel}
          className="underline underline-offset-2 hover:text-zinc-300"
        >
          Stop watching
        </button>{" "}
        — the deposit itself keeps going either way.
      </p>
    </div>
  );
}
