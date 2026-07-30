import { Clock, Coins } from "lucide-react";
import type { LedgerEntry } from "../lib/ledger";
import { GoldCTA } from "./ui/GoldCTA";

/**
 * ActionQueue — everything that needs the user's attention, as ONE ranked
 * stack of cards. Replaces three scattered surfaces (UnclaimedDepositsBanner,
 * the inline leftover-ckUNI banner, HoldingsCard's stranded panel) that each
 * had their own render gate — a held swap could hide behind a phase check
 * while the user stared at an unrelated banner.
 *
 * Rank order = severity: held swaps (funds awaiting manual resolution)
 * always outrank routine finish-your-swap prompts; a passive "in flight"
 * note ranks last. The queue renders even mid-flow — attention items don't
 * pause because an animation is playing. Only the ACTION buttons gate on
 * flow state (actionable), so a card can inform without offering a
 * conflicting second swap.
 */
type Props = {
  entries: LedgerEntry[];
  unclaimedCount: number;
  claiming: boolean;
  onClaim: () => void;
  /** Leftover ckUNI in the user's account (e18). 0n = no card. */
  leftoverCkUNI: bigint;
  /** False while a flow is active — the card still shows, the button doesn't. */
  actionable: boolean;
  onRefineLeftover: () => void;
  onViewHistory: () => void;
};

export function ActionQueue({
  entries,
  unclaimedCount,
  claiming,
  onClaim,
  leftoverCkUNI,
  actionable,
  onRefineLeftover,
  onViewHistory,
}: Props) {
  const held = entries.filter((e) => e.status === "held");
  const inFlight = entries.filter((e) => e.status === "in-flight");
  const hasLeftover = leftoverCkUNI > 0n;

  if (
    held.length === 0 &&
    unclaimedCount === 0 &&
    !hasLeftover &&
    inFlight.length === 0
  ) {
    return null;
  }

  return (
    <section data-ocid="action_queue" className="mb-6 space-y-3">
      {/* 1 — held swaps: resolution path, never a dead end. A stranded
          record means the swap AND its auto-refund both failed: the funds
          are recorded on-chain awaiting manual release, not lost. */}
      {held.length > 0 && (
        <div
          data-ocid="action_queue.held"
          className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5 text-[12px] leading-relaxed text-zinc-300"
        >
          <p className="font-bold text-amber-300 mb-1">
            {held.length === 1
              ? "A swap of yours is held for manual resolution"
              : `${held.length} swaps of yours are held for manual resolution`}
          </p>
          <p className="text-zinc-400">
            The refund couldn&apos;t be sent automatically, so the record is
            held on-chain with your funds noted — nothing is dropped. Email{" "}
            <a
              href={`mailto:anthony@cafreso.com?subject=${encodeURIComponent(
                `minegold.defi held swap: ${held.map((e) => e.id).join(", ")}`,
              )}`}
              className="text-amber-300 underline underline-offset-2 hover:text-amber-200"
            >
              anthony@cafreso.com
            </a>{" "}
            quoting{" "}
            <span className="font-mono text-zinc-200">
              {held.map((e) => e.id).join(", ")}
            </span>{" "}
            and it will be released or refunded by hand.
          </p>
        </div>
      )}

      {/* 2 — confirmed deposits the frontend missed claiming */}
      {unclaimedCount > 0 && (
        <div
          data-ocid="action_queue.unclaimed"
          className="rounded-3xl border border-yellow-500/40 bg-yellow-500/10 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <div className="shrink-0 w-11 h-11 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
            <Coins className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-yellow-300 mb-0.5">
              {unclaimedCount === 1
                ? "1 confirmed deposit is waiting for its gold"
                : `${unclaimedCount} confirmed deposits are waiting for their gold`}
            </p>
            <p className="text-xs text-yellow-200/70">
              Your UNI deposit confirmed on Ethereum. Claiming takes ~5
              seconds.
            </p>
          </div>
          {actionable && (
            <GoldCTA
              data-ocid="action_queue.claim.button"
              loading={claiming}
              onClick={onClaim}
              size="md"
              fullWidth={false}
              trailingIcon={null}
              className="w-full sm:w-auto"
            >
              {claiming ? "Claiming…" : "Claim sGLDT"}
            </GoldCTA>
          )}
        </div>
      )}

      {/* 3 — ckUNI already in the user's account, one tap from gold */}
      {hasLeftover && (
        <div
          data-ocid="action_queue.leftover"
          className="rounded-3xl border border-blue-500/40 bg-blue-500/10 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <div className="flex-1">
            <p className="text-sm font-black text-blue-300 mb-0.5">
              {(Number(leftoverCkUNI) / 1e18).toFixed(6)} ckUNI is in your
              account, ready to refine
            </p>
            <p className="text-xs text-blue-200/70">
              The bridge already moved your UNI. One tap swaps it for sGLDT —
              no wallet needed.
            </p>
          </div>
          {actionable && (
            <GoldCTA
              data-ocid="refine.leftover.button"
              size="md"
              fullWidth={false}
              trailingIcon={null}
              className="w-full sm:w-auto"
              onClick={onRefineLeftover}
            >
              Refine into sGLDT
            </GoldCTA>
          )}
        </div>
      )}

      {/* 4 — passive: swaps currently moving */}
      {inFlight.length > 0 && (
        <div
          data-ocid="action_queue.in_flight"
          className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center gap-3 text-[12px] text-zinc-400"
        >
          <Clock size={14} className="text-amber-400 shrink-0" />
          <p className="flex-1">
            {inFlight.length === 1
              ? `${inFlight[0].summary} is in flight — nothing to do, it settles on its own.`
              : `${inFlight.length} swaps are in flight — nothing to do, they settle on their own.`}
          </p>
          <button
            type="button"
            data-ocid="action_queue.view_history"
            onClick={onViewHistory}
            className="shrink-0 min-h-[36px] text-zinc-300 underline underline-offset-2 hover:text-white"
          >
            Watch
          </button>
        </div>
      )}
    </section>
  );
}
