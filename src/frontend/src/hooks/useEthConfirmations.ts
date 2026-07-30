import { useEffect, useRef, useState } from "react";
import { publicClient } from "../lib/eth";
import { hapticTick } from "../lib/haptics";

/**
 * Live Ethereum confirmation tracking for a deposit tx — REAL chain data
 * (getTransactionReceipt + getBlockNumber via viem), extracted from
 * BlockConfirmationMeter so the mine-shaft animation and any status text
 * consume ONE truth instead of each inventing their own progress.
 *
 * Also owns the per-block haptic tick: one "pick strike" per newly confirmed
 * block (Android only; silent no-op on iOS; respects reduced-motion).
 */

export type EthConfirmationState = {
  /** Block the tx was mined in, null while pending in mempool. */
  minedInBlock: number | null;
  /** Current chain head, null before the first successful poll. */
  head: number | null;
  /** head − minedInBlock + 1, floored at 0. */
  confirmations: number;
  receiptStatus: "unknown" | "pending" | "mined" | "reverted";
  /** Rough seconds remaining to target at ~12 s/block. */
  etaSec: number;
};

export function useEthConfirmations(
  txHash: string | null,
  targetConfirmations = 12,
): EthConfirmationState {
  const [state, setState] = useState<EthConfirmationState>({
    minedInBlock: null,
    head: null,
    confirmations: 0,
    receiptStatus: "unknown",
    etaSec: targetConfirmations * 12,
  });

  // Haptic strike per newly confirmed block, capped at the target.
  const lastBuzzedRef = useRef(0);
  useEffect(() => {
    const c = Math.min(state.confirmations, targetConfirmations);
    if (c > lastBuzzedRef.current) {
      lastBuzzedRef.current = c;
      hapticTick();
    }
  }, [state.confirmations, targetConfirmations]);

  useEffect(() => {
    if (!txHash) {
      setState({
        minedInBlock: null,
        head: null,
        confirmations: 0,
        receiptStatus: "unknown",
        etaSec: targetConfirmations * 12,
      });
      lastBuzzedRef.current = 0;
      return;
    }
    let cancelled = false;
    let minedInBlock: number | null = null;

    const poll = async () => {
      try {
        const head = Number(await publicClient.getBlockNumber());
        if (minedInBlock === null) {
          try {
            const receipt = await publicClient.getTransactionReceipt({
              hash: txHash as `0x${string}`,
            });
            minedInBlock = Number(receipt.blockNumber);
            if (cancelled) return;
            const confs = Math.max(0, head - minedInBlock + 1);
            setState({
              minedInBlock,
              head,
              confirmations: confs,
              receiptStatus: receipt.status === "success" ? "mined" : "reverted",
              etaSec: Math.max(0, (targetConfirmations - confs) * 12),
            });
            return;
          } catch {
            if (cancelled) return;
            setState((s) => ({ ...s, head, receiptStatus: "pending" }));
            return;
          }
        }
        if (cancelled) return;
        const confs = Math.max(0, head - minedInBlock + 1);
        setState((s) => ({
          ...s,
          head,
          confirmations: confs,
          receiptStatus: s.receiptStatus === "reverted" ? "reverted" : "mined",
          etaSec: Math.max(0, (targetConfirmations - confs) * 12),
        }));
      } catch (err) {
        console.warn("[eth-confirmations] poll failed:", err);
      }
    };

    void poll();
    const id = setInterval(() => void poll(), 5_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [txHash, targetConfirmations]);

  return state;
}
