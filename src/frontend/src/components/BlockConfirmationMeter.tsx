import { useEffect, useRef, useState } from "react";
import { Activity, Clock } from "lucide-react";
import { publicClient } from "../lib/eth";
import { hapticTick } from "../lib/haptics";

type Props = {
  /** The tx hash we're tracking on Ethereum. When null, meter shows "waiting
   *  for broadcast" rather than confirmations (prevents phantom countdowns). */
  txHash: string | null;
  /** Target confirmations before the ckERC-20 minter accepts the deposit.
   *  DFINITY's helper waits ~12 blocks in practice; we show 12 for accuracy. */
  targetConfirmations?: number;
};

type ChainState = {
  submittedAt: number | null;      // block number the tx landed in
  head: number | null;              // current chain tip
  confirmations: number;            // head - submittedAt (min 0)
  receiptStatus: "mined" | "pending" | "reverted" | "unknown";
  lastPoll: number;                 // ms timestamp of last successful poll
};

/**
 * Live Ethereum block confirmation meter, tied to REAL chain state.
 *
 * Phase 1 — `txHash` is null: shows "Waiting for tx to be broadcast".
 * Phase 2 — tx in mempool:   polls getTransactionReceipt every 4s, shows
 *           "Confirming in mempool" until the tx is mined.
 * Phase 3 — tx mined:        captures blockNumber, then polls
 *           getBlockNumber() every 5s to compute real confirmations.
 *
 * Render priorities: clarity over flash. No fake block pills that look like
 * workflow steps — uses a single linear counter + progress bar + elapsed
 * clock. Users see `7 / 12 confirmations` with a real number from the chain.
 */
export function BlockConfirmationMeter({
  txHash,
  targetConfirmations = 12,
}: Props) {
  const [state, setState] = useState<ChainState>({
    submittedAt: null,
    head: null,
    confirmations: 0,
    receiptStatus: "unknown",
    lastPoll: 0,
  });
  const [now, setNow] = useState(() => Date.now());

  // Tick the clock every second for the elapsed-time readout.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  // One haptic "pick strike" per newly confirmed block (Android; silently a
  // no-op on iOS) — pocket the phone and feel the confirmations land.
  const lastBuzzedRef = useRef(0);
  useEffect(() => {
    const c = Math.min(state.confirmations, targetConfirmations);
    if (c > lastBuzzedRef.current) {
      lastBuzzedRef.current = c;
      hapticTick();
    }
  }, [state.confirmations, targetConfirmations]);

  // Poll the chain for tx receipt + current head. Scales interval by state:
  // pending — 4s (user is actively waiting for mine)
  // mined   — 5s (just watching confirmations accumulate, block time is ~12s)
  useEffect(() => {
    if (!txHash) return;
    let cancelled = false;

    const poll = async () => {
      try {
        // Fast head fetch first (used in both phases)
        const head = await publicClient.getBlockNumber();
        const headNum = Number(head);

        // If we already know the submission block, compute confirmations from head.
        if (state.submittedAt !== null) {
          const confs = Math.max(0, headNum - state.submittedAt + 1);
          if (cancelled) return;
          setState((s) => ({
            ...s,
            head: headNum,
            confirmations: confs,
            receiptStatus: "mined",
            lastPoll: Date.now(),
          }));
          return;
        }

        // Otherwise, try to fetch the receipt — if mined, we get its block.
        try {
          const receipt = await publicClient.getTransactionReceipt({
            hash: txHash as `0x${string}`,
          });
          if (cancelled) return;
          const block = Number(receipt.blockNumber);
          const confs = Math.max(0, headNum - block + 1);
          const receiptStatus = receipt.status === "success" ? "mined" : "reverted";
          setState({
            submittedAt: block,
            head: headNum,
            confirmations: confs,
            receiptStatus,
            lastPoll: Date.now(),
          });
        } catch {
          // No receipt yet — still pending in mempool.
          if (cancelled) return;
          setState((s) => ({
            ...s,
            head: headNum,
            receiptStatus: "pending",
            lastPoll: Date.now(),
          }));
        }
      } catch (err) {
        console.warn("[block-meter] poll failed:", err);
      }
    };

    poll(); // kick immediately, then interval
    const interval = state.submittedAt === null ? 4_000 : 5_000;
    const id = setInterval(poll, interval);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [txHash, state.submittedAt]);

  if (!txHash) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-center gap-3">
        <Clock size={14} className="text-zinc-500 animate-pulse shrink-0" />
        <div className="text-xs text-zinc-400">
          Waiting for your deposit tx to broadcast…
        </div>
      </div>
    );
  }

  const progress = Math.min(1, state.confirmations / targetConfirmations);
  const elapsed = state.lastPoll > 0 ? Math.floor((now - state.lastPoll) / 1000) : 0;
  const pending = state.receiptStatus === "pending";
  const reverted = state.receiptStatus === "reverted";

  // Estimated seconds remaining: (target - current) × 12s avg block time.
  const etaSec = Math.max(0, (targetConfirmations - state.confirmations) * 12);
  const etaLabel =
    pending
      ? "waiting for mempool inclusion"
      : reverted
        ? "tx reverted on-chain"
        : state.confirmations >= targetConfirmations
          ? "ready for release"
          : `~${Math.floor(etaSec / 60)}m ${etaSec % 60}s remaining`;

  return (
    <div
      className={`rounded-xl border p-4 ${
        reverted
          ? "border-red-500/40 bg-red-500/5"
          : state.confirmations >= targetConfirmations
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-blue-500/30 bg-blue-500/5"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity
            size={12}
            className={`${
              reverted
                ? "text-red-400"
                : state.confirmations >= targetConfirmations
                  ? "text-emerald-400"
                  : "text-blue-300 animate-pulse"
            }`}
          />
          <span
            className={`text-[10px] font-black uppercase tracking-widest ${
              reverted
                ? "text-red-300"
                : state.confirmations >= targetConfirmations
                  ? "text-emerald-300"
                  : "text-blue-300"
            }`}
          >
            {pending
              ? "Pending in mempool"
              : reverted
                ? "Tx reverted"
                : "Ethereum confirmations"}
          </span>
        </div>
        {state.head !== null && (
          <span className="text-[9px] font-mono text-zinc-500">
            head #{state.head.toLocaleString()}
          </span>
        )}
      </div>

      {/* Real confirmation counter — prominent, on-chain data */}
      <div className="flex items-baseline gap-2 mb-2">
        <span
          className={`text-3xl font-black tabular-nums ${
            reverted
              ? "text-red-400"
              : state.confirmations >= targetConfirmations
                ? "text-emerald-400"
                : "text-blue-400"
          }`}
        >
          {state.confirmations}
        </span>
        <span className="text-sm font-bold text-zinc-500">
          / {targetConfirmations}
        </span>
        <span className="text-xs text-zinc-500 ml-auto">confirmations</span>
      </div>

      {/* Smooth progress bar */}
      <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <span
          className={`absolute inset-y-0 left-0 transition-all duration-500 ${
            reverted
              ? "bg-red-500"
              : "bg-gradient-to-r from-blue-500 via-blue-400 to-emerald-400"
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
        <span className="text-zinc-500">
          {state.submittedAt !== null ? `mined in block #${state.submittedAt.toLocaleString()}` : "not yet mined"}
        </span>
        <span
          className={`${
            reverted
              ? "text-red-400"
              : state.confirmations >= targetConfirmations
                ? "text-emerald-400"
                : "text-zinc-500"
          }`}
        >
          {etaLabel}
        </span>
      </div>

      {state.lastPoll > 0 && (
        <div className="mt-1 text-[9px] text-zinc-600 font-mono">
          last chain poll {elapsed}s ago
        </div>
      )}
    </div>
  );
}
