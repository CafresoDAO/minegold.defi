import { ArrowRightLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  approveSGLDTForRedeem,
  fetchMySGLDTPosition,
  redeemSGLDT,
  type SGLDTPosition,
} from "../hooks/useQueries";
import { parseDecimalToBigInt } from "../lib/erc20";
import { GoldCTA } from "./ui/GoldCTA";

type Props = {
  identity: unknown;
  onClose: () => void;
  /** Called after a successful redeem so the parent can refresh balances. */
  onRedeemed: () => void;
};

type RedeemPhase =
  | { kind: "loading" }
  | { kind: "input"; position: SGLDTPosition }
  | { kind: "approving"; position: SGLDTPosition }
  | { kind: "redeeming"; position: SGLDTPosition }
  | { kind: "done"; ckuni: bigint; sgldt: bigint }
  | { kind: "error"; message: string; position: SGLDTPosition | null };

/** sGLDT fee headroom added to the approve so the ledger's fee deduction
 *  can't leave the allowance a hair short of the redeem amount. */
const SGLDT_FEE_HEADROOM = 100_000n;

/** Redeem sGLDT back into ckUNI at the oracle rate — the exit half of the
 *  refinery. Once the ckUNI lands in the user's own account they can bridge
 *  back to native UNI on Ethereum via DFINITY's standard minter withdrawal. */
export function RedeemModal({ identity, onClose, onRedeemed }: Props) {
  const [phase, setPhase] = useState<RedeemPhase>({ kind: "loading" });
  const [amountStr, setAmountStr] = useState("");

  const loadPosition = useCallback(async () => {
    setPhase({ kind: "loading" });
    const pos = await fetchMySGLDTPosition(identity);
    if (!pos) {
      setPhase({
        kind: "error",
        message: "Could not load your sGLDT position. Check your connection and try again.",
        position: null,
      });
      return;
    }
    setPhase({ kind: "input", position: pos });
  }, [identity]);

  useEffect(() => {
    void loadPosition();
  }, [loadPosition]);

  const position =
    phase.kind === "input" || phase.kind === "approving" || phase.kind === "redeeming"
      ? phase.position
      : phase.kind === "error"
        ? phase.position
        : null;

  const amountE8s = parseDecimalToBigInt(amountStr, 8);

  const rateNum = position ? Number(position.rate) / 1e8 : 0;
  const estCkUNI = rateNum > 0 ? (Number(amountE8s) / 1e8) / rateNum : 0;
  const balanceNum = position ? Number(position.balance) / 1e8 : 0;
  const treasuryCkUNINum = position ? Number(position.treasuryCkUNI) / 1e18 : 0;

  const tooSmall = position != null && amountE8s > 0n && amountE8s < position.minRedeem;
  const overBalance = position != null && amountE8s > position.balance;
  const overLiquidity = position != null && rateNum > 0 && estCkUNI > treasuryCkUNINum;
  const canSubmit =
    position != null && amountE8s > 0n && !tooSmall && !overBalance && !overLiquidity;

  const submit = async () => {
    if (!position || !canSubmit) return;
    const rateHint = position.rate > 0n ? position.rate : null;
    try {
      if (position.allowance < amountE8s + SGLDT_FEE_HEADROOM) {
        setPhase({ kind: "approving", position });
        const approval = await approveSGLDTForRedeem({
          identity,
          amount: amountE8s + SGLDT_FEE_HEADROOM,
        });
        if (!approval.ok) {
          setPhase({ kind: "error", message: approval.error, position });
          return;
        }
      }
      setPhase({ kind: "redeeming", position });
      const result = await redeemSGLDT({ identity, amount: amountE8s, rateHint });
      if (!result.ok) {
        setPhase({ kind: "error", message: result.error, position });
        return;
      }
      setPhase({ kind: "done", ckuni: result.ckuniPaid, sgldt: amountE8s });
      onRedeemed();
    } catch (err) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
        position,
      });
    }
  };

  const busy = phase.kind === "approving" || phase.kind === "redeeming";

  return (
    <div
      data-ocid="wallet.redeem.modal"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] p-8 w-full max-w-md relative">
        <button
          type="button"
          data-ocid="wallet.redeem.close_button"
          onClick={onClose}
          disabled={busy}
          className="absolute top-4 right-4 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 disabled:opacity-40"
        >
          <XCircle size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-pink-500/20">
            <ArrowRightLeft size={20} className="text-pink-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Redeem sGLDT</h2>
            <p className="text-xs text-zinc-500">
              Swap back to ckUNI at the live oracle rate
            </p>
          </div>
        </div>

        {phase.kind === "loading" && (
          <div className="flex items-center justify-center gap-2 py-10 text-zinc-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading your position…
          </div>
        )}

        {phase.kind === "done" && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 size={40} className="text-emerald-400 mx-auto" />
            <div>
              <p className="text-white font-bold">
                {(Number(phase.ckuni) / 1e18).toFixed(6)} ckUNI received
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                for {(Number(phase.sgldt) / 1e8).toFixed(4)} sGLDT — the ckUNI is
                in your own ICP account. Bridge it back to native UNI on Ethereum
                any time via the chain-key minter.
              </p>
            </div>
            <GoldCTA
              data-ocid="wallet.redeem.done_button"
              tone="info"
              size="md"
              trailingIcon={null}
              onClick={onClose}
            >
              Done
            </GoldCTA>
          </div>
        )}

        {(phase.kind === "input" ||
          phase.kind === "approving" ||
          phase.kind === "redeeming" ||
          phase.kind === "error") && (
          <div className="space-y-4">
            {position && (
              <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">
                    Your sGLDT
                  </div>
                  <div className="text-yellow-500 font-bold">
                    {balanceNum.toFixed(4)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">
                    Rate
                  </div>
                  <div className="text-zinc-200 font-bold">
                    {rateNum > 0 ? `${rateNum.toFixed(4)} sGLDT/UNI` : "—"}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">
                    Treasury liquidity
                  </div>
                  <div className="text-zinc-300 font-bold">
                    {treasuryCkUNINum.toFixed(6)} ckUNI available
                  </div>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="redeem-amount"
                className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5"
              >
                Amount (sGLDT)
              </label>
              <div className="flex gap-2">
                <input
                  id="redeem-amount"
                  data-ocid="wallet.redeem.amount_input"
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  disabled={busy}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-yellow-500/50 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  data-ocid="wallet.redeem.max_button"
                  disabled={busy || !position}
                  onClick={() => setAmountStr(balanceNum > 0 ? String(balanceNum) : "")}
                  className="px-3 rounded-xl border border-zinc-800 bg-zinc-900 text-[10px] font-black text-yellow-500 uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-40"
                >
                  Max
                </button>
              </div>
              {amountE8s > 0n && rateNum > 0 && (
                <p className="text-[11px] text-zinc-400 mt-1.5">
                  ≈ {estCkUNI.toFixed(6)} ckUNI
                </p>
              )}
              {tooSmall && position && (
                <p className="text-[11px] text-amber-400 mt-1.5">
                  Minimum redeem is {(Number(position.minRedeem) / 1e8).toFixed(1)} sGLDT.
                </p>
              )}
              {overBalance && (
                <p className="text-[11px] text-red-400 mt-1.5">
                  That's more sGLDT than you hold.
                </p>
              )}
              {overLiquidity && !overBalance && (
                <p className="text-[11px] text-amber-400 mt-1.5">
                  The treasury doesn't hold that much ckUNI right now — try a
                  smaller amount.
                </p>
              )}
            </div>

            {phase.kind === "error" && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-300 leading-relaxed">
                {phase.message}
              </div>
            )}

            <GoldCTA
              data-ocid="wallet.redeem.submit_button"
              tone="info"
              size="md"
              trailingIcon={null}
              disabled={busy || !canSubmit}
              onClick={() => void submit()}
            >
              {phase.kind === "approving" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Approving sGLDT…
                </span>
              ) : phase.kind === "redeeming" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Redeeming…
                </span>
              ) : (
                "Redeem to ckUNI"
              )}
            </GoldCTA>

            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Two Internet Identity signatures: one approval letting the
              refinery pull your sGLDT, then the atomic swap. If the payout
              fails for any reason, your sGLDT is refunded automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
