import { useCallback, useRef, useState } from "react";
import { CKBAT_ASSET, formatAssetAmount } from "../lib/refineAssets";
import { computeRefineAmounts } from "../lib/refineMath";
import {
  type CkBATPosition,
  approveCkBATForRefinery,
  fetchCkBATFee,
  fetchMyCkBATPosition,
  refineCkBAT,
} from "./useQueries";

/**
 * The ckBAT → sGLDT half of the refinery.
 *
 * Deliberately simpler than useRefineFlow: that hook watches for the minter
 * to credit ckUNI because it is driven from an in-app Ethereum deposit it
 * initiated, so it knows what amount to expect and when. BAT intake starts
 * from ckBAT the user already holds — they bridged it themselves, possibly
 * days ago, possibly in another tab — so there is nothing to watch for and no
 * expected target. The user says how much, we refine it.
 *
 *   idle → approving → refining → done / failed
 *
 * The fee is the thing to be careful with here. ckBAT charges 0.1 per
 * transfer and the flow pays it twice (approve, then transfer_from), so a
 * balance needs 0.2 ckBAT of headroom above the amount before a refine is
 * even attemptable. computeRefineAmounts does that arithmetic; the error copy
 * below states the real number rather than a generic "insufficient funds",
 * because with a fee this size the difference is what confuses people.
 */

export type BatRefineState =
  | { kind: "idle" }
  | { kind: "approving"; target: bigint }
  | { kind: "refining"; target: bigint }
  | {
      kind: "done";
      sgldt: bigint;
      refineId: bigint;
      payBlock: bigint;
      settledRate: bigint;
    }
  | { kind: "failed"; error: string; recoverable: boolean };

export function useBatRefineFlow(identity: unknown) {
  const [state, setState] = useState<BatRefineState>({ kind: "idle" });
  const [position, setPosition] = useState<CkBATPosition | null>(null);
  const busyRef = useRef(false);

  /** One-shot position read — surfaces any ckBAT already sitting in the
   *  user's account, and tells us whether the intake is open (rate > 0). */
  const refreshPosition = useCallback(async () => {
    const pos = await fetchMyCkBATPosition(identity);
    if (pos) setPosition(pos);
    return pos;
  }, [identity]);

  const refineNow = useCallback(
    async (requested: bigint, rateHint: bigint | null): Promise<void> => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const pos = await fetchMyCkBATPosition(identity);
        if (!pos) {
          setState({
            kind: "failed",
            error:
              "Could not read your ckBAT position. Check your connection and try again.",
            recoverable: true,
          });
          return;
        }
        setPosition(pos);

        // The backend is the authority on the rate; 0 means it is refusing
        // refines rather than paying out against a guessed number.
        if (pos.rate === 0n) {
          setState({
            kind: "failed",
            error:
              "BAT intake is not open yet — no exchange rate has been established. Your ckBAT is untouched.",
            recoverable: false,
          });
          return;
        }

        // Prefer the fee the backend just reported over the cached ledger
        // query: it came from the same read as the balance, so the two can't
        // disagree about which fee regime we're in.
        const fee = pos.fee > 0n ? pos.fee : await fetchCkBATFee();
        const { refineAmount: amount, approveAmount } = computeRefineAmounts(
          pos.balance,
          requested,
          fee,
        );

        if (amount < pos.minRefine) {
          const needed = pos.minRefine + 2n * fee;
          setState({
            kind: "failed",
            error: `Not enough ckBAT once ledger fees are covered. The ckBAT ledger charges ${formatAssetAmount(fee, CKBAT_ASSET, 2)} per transfer and this flow pays it twice, so you need at least ${formatAssetAmount(needed, CKBAT_ASSET)} ckBAT to refine the ${formatAssetAmount(pos.minRefine, CKBAT_ASSET, 2)} minimum. Your balance is ${formatAssetAmount(pos.balance, CKBAT_ASSET)}.`,
            recoverable: true,
          });
          return;
        }

        // Skip the approve signature when the standing allowance already
        // covers amount + fee.
        if (pos.allowance < approveAmount) {
          setState({ kind: "approving", target: amount });
          const approval = await approveCkBATForRefinery({
            identity,
            amount: approveAmount,
          });
          if (!approval.ok) {
            setState({
              kind: "failed",
              error: approval.error,
              recoverable: true,
            });
            return;
          }
        }

        setState({ kind: "refining", target: amount });
        const result = await refineCkBAT({ identity, amount, rateHint });
        if (!result.ok) {
          // The backend refunds the ckBAT when the sGLDT payout fails, so a
          // retry is legitimate — the funds are back in the user's account.
          setState({ kind: "failed", error: result.error, recoverable: true });
          return;
        }
        setState({
          kind: "done",
          sgldt: result.sgldtPaid,
          refineId: result.refineId,
          payBlock: result.blockIndex,
          settledRate: result.rate,
        });
        void refreshPosition();
      } catch (err) {
        setState({
          kind: "failed",
          error: err instanceof Error ? err.message : String(err),
          recoverable: true,
        });
      } finally {
        busyRef.current = false;
      }
    },
    [identity, refreshPosition],
  );

  const reset = useCallback(() => {
    busyRef.current = false;
    setState({ kind: "idle" });
  }, []);

  const busy = state.kind === "approving" || state.kind === "refining";

  return { state, position, busy, refineNow, refreshPosition, reset };
}
