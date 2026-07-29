import { useCallback, useEffect, useRef, useState } from "react";
import {
  approveCkUNIForRefinery,
  fetchMyCkUNIPosition,
  refineCkUNI,
  type CkUNIPosition,
} from "./useQueries";

/**
 * The post-deposit half of the refinery, under minter attribution.
 *
 * Once the user deposits UNI on Ethereum naming their OWN principal, the
 * chain-key ckERC-20 minter credits ckUNI directly to them after 12 block
 * confirmations. From that point everything happens on ICP:
 *
 *   waiting_mint → the minter is working; we poll the user's ckUNI balance
 *   approving    → icrc2_approve, letting the refinery pull that ckUNI
 *   refining     → backend swaps the ckUNI for sGLDT in one atomic call
 *   done / failed
 *
 * The user's ckUNI balance is the proof the bridge completed, so there is no
 * Ethereum verification here — no Etherscan, no tx hash, nothing that breaks
 * if this tab is closed. A user who navigates away simply comes back and
 * refines the ckUNI sitting in their account.
 */

export type RefineState =
  | { kind: "idle" }
  | { kind: "waiting_mint"; target: bigint; observed: bigint; elapsedMs: number }
  | { kind: "approving"; target: bigint }
  | { kind: "refining"; target: bigint }
  | { kind: "done"; sgldt: bigint; refineId: bigint }
  | { kind: "failed"; error: string; recoverable: boolean };

/** Poll cadence while waiting for the minter. The minter needs ~12 Ethereum
 *  blocks (~2.5-3 min), so a 6s cadence is responsive without being wasteful.
 *  These are free query-ish calls against the ledger, not chain outcalls. */
const POLL_MS = 6_000;
/** Give up watching after 40 minutes. The ckUNI is still safely the user's —
 *  they can refine it manually whenever it lands. */
const WATCH_TIMEOUT_MS = 40 * 60_000;

export function useRefineFlow(identity: unknown) {
  const [state, setState] = useState<RefineState>({ kind: "idle" });
  const [position, setPosition] = useState<CkUNIPosition | null>(null);

  // Refs mirror state for use inside the polling interval, which captures its
  // closure once and would otherwise read stale values.
  const stateRef = useRef<RefineState>(state);
  stateRef.current = state;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const busyRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  /** Approve + refine. Safe to call directly when the user already holds
   *  ckUNI (e.g. resuming after a closed tab). */
  const refineNow = useCallback(
    async (amount: bigint, rateHint: bigint | null): Promise<void> => {
      if (busyRef.current) return;
      busyRef.current = true;
      stopPolling();
      try {
        setState({ kind: "approving", target: amount });
        const approval = await approveCkUNIForRefinery({ identity, amount });
        if (!approval.ok) {
          setState({ kind: "failed", error: approval.error, recoverable: true });
          return;
        }

        setState({ kind: "refining", target: amount });
        const result = await refineCkUNI({ identity, amount, rateHint });
        if (!result.ok) {
          // Backend refunds the ckUNI on payout failure, so retrying later is
          // legitimate — the funds are back in the user's account.
          setState({ kind: "failed", error: result.error, recoverable: true });
          return;
        }
        setState({
          kind: "done",
          sgldt: result.sgldtPaid,
          refineId: result.refineId,
        });
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
    [identity, stopPolling],
  );

  /** Start watching for the minter to credit `target` ckUNI, then refine
   *  automatically. Approving is an Internet Identity signature, not a wallet
   *  popup, so the whole tail of the flow runs without user interaction. */
  const beginWatch = useCallback(
    (target: bigint, rateHint: bigint | null) => {
      stopPolling();
      startedAtRef.current = Date.now();
      setState({ kind: "waiting_mint", target, observed: 0n, elapsedMs: 0 });

      const tick = async () => {
        const current = stateRef.current;
        if (current.kind !== "waiting_mint") return;

        const pos = await fetchMyCkUNIPosition(identity);
        if (pos) setPosition(pos);

        const elapsedMs = Date.now() - startedAtRef.current;
        const observed = pos?.balance ?? 0n;

        if (observed >= target && target > 0n) {
          // The minter credited us — refine the amount we actually received,
          // capped at the target so a pre-existing balance from an earlier
          // deposit isn't swept into this run.
          void refineNow(target, rateHint);
          return;
        }

        if (elapsedMs > WATCH_TIMEOUT_MS) {
          stopPolling();
          setState({
            kind: "failed",
            error:
              "The chain-key minter hasn't credited your ckUNI yet. Your deposit is safe on Ethereum and the ckUNI will arrive in your account — come back and refine it any time.",
            recoverable: true,
          });
          return;
        }

        setState({ kind: "waiting_mint", target, observed, elapsedMs });
      };

      void tick();
      timerRef.current = setInterval(() => void tick(), POLL_MS);
    },
    [identity, refineNow, stopPolling],
  );

  /** One-shot position read — used on mount to surface leftover ckUNI. */
  const refreshPosition = useCallback(async () => {
    const pos = await fetchMyCkUNIPosition(identity);
    if (pos) setPosition(pos);
    return pos;
  }, [identity]);

  const reset = useCallback(() => {
    stopPolling();
    busyRef.current = false;
    setState({ kind: "idle" });
  }, [stopPolling]);

  /** 0→1 progress for the mining animation while we wait on the minter.
   *  Creeps on elapsed time up to 0.85, then jumps as the flow completes. */
  const progress = (() => {
    switch (state.kind) {
      case "waiting_mint": {
        const t = Math.min(1, state.elapsedMs / (3 * 60_000));
        return 0.08 + t * 0.72;
      }
      case "approving":
        return 0.86;
      case "refining":
        return 0.94;
      case "done":
        return 1;
      default:
        return 0;
    }
  })();

  return { state, position, progress, beginWatch, refineNow, refreshPosition, reset };
}
