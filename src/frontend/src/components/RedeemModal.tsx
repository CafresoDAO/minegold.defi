import { ArrowRightLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";
import {
  approveSGLDTForRedeem,
  fetchMySGLDTPosition,
  fetchMySGLDTPositionForCkBAT,
  redeemCkBAT,
  redeemSGLDT,
} from "../hooks/useQueries";
import { parseDecimalToBigInt } from "../lib/erc20";
import {
  CKBAT_ASSET,
  CKUNI_ASSET,
  type RefineAsset,
  type RefineAssetId,
} from "../lib/refineAssets";
import { GoldCTA } from "./ui/GoldCTA";

type Props = {
  identity: unknown;
  onClose: () => void;
  /** Called after a successful redeem so the parent can refresh balances. */
  onRedeemed: () => void;
};

/** The two exit assets, normalized to one shape so the rest of this
 *  component doesn't need to know whether it's looking at
 *  SGLDTPosition.treasuryCkUNI or SGLDTPositionForCkBAT.treasuryCkBAT. */
type RedeemPosition = {
  balance: bigint;
  allowance: bigint;
  minRedeem: bigint;
  rate: bigint;
  treasuryLiquidity: bigint;
};

type RedeemPhase =
  | { kind: "loading" }
  | { kind: "input"; position: RedeemPosition }
  | { kind: "approving"; position: RedeemPosition }
  | { kind: "redeeming"; position: RedeemPosition }
  | {
      kind: "done";
      asset: RefineAssetId;
      received: bigint;
      sgldt: bigint;
      payBlock: bigint;
      rate: bigint;
    }
  | { kind: "error"; message: string; position: RedeemPosition | null };

/** sGLDT fee headroom added to the approve so the ledger's fee deduction
 *  can't leave the allowance a hair short of the redeem amount. Same for
 *  both exit assets — the token being approved is always sGLDT. */
const SGLDT_FEE_HEADROOM = 100_000n;

const REDEEM_ASSETS: Record<RefineAssetId, RefineAsset> = {
  ckUNI: CKUNI_ASSET,
  ckBAT: CKBAT_ASSET,
};

/** Redeem sGLDT back into ckUNI or ckBAT at the oracle rate — the exit half
 *  of the refinery. Once the chain-key token lands in the user's own account
 *  they can bridge it back to the native Ethereum asset via DFINITY's
 *  standard minter withdrawal. */
export function RedeemModal({ identity, onClose, onRedeemed }: Props) {
  const [asset, setAsset] = useState<RefineAssetId>("ckUNI");
  const [phase, setPhase] = useState<RedeemPhase>({ kind: "loading" });
  const [amountStr, setAmountStr] = useState("");

  const loadPosition = useCallback(async () => {
    setPhase({ kind: "loading" });
    if (asset === "ckUNI") {
      const pos = await fetchMySGLDTPosition(identity);
      if (!pos) {
        setPhase({
          kind: "error",
          message:
            "Could not load your sGLDT position. Check your connection and try again.",
          position: null,
        });
        return;
      }
      setPhase({
        kind: "input",
        position: {
          balance: pos.balance,
          allowance: pos.allowance,
          minRedeem: pos.minRedeem,
          rate: pos.rate,
          treasuryLiquidity: pos.treasuryCkUNI,
        },
      });
      return;
    }
    const pos = await fetchMySGLDTPositionForCkBAT(identity);
    if (!pos) {
      setPhase({
        kind: "error",
        message:
          "Could not load your sGLDT position. Check your connection and try again.",
        position: null,
      });
      return;
    }
    setPhase({
      kind: "input",
      position: {
        balance: pos.balance,
        allowance: pos.allowance,
        minRedeem: pos.minRedeem,
        rate: pos.rate,
        treasuryLiquidity: pos.treasuryCkBAT,
      },
    });
  }, [identity, asset]);

  useEffect(() => {
    void loadPosition();
  }, [loadPosition]);

  // Reset the amount whenever the asset tab changes — a typed amount for one
  // asset's balance/rate is meaningless for the other.
  useEffect(() => {
    setAmountStr("");
  }, [asset]);

  const assetInfo = REDEEM_ASSETS[asset];

  const position =
    phase.kind === "input" || phase.kind === "approving" || phase.kind === "redeeming"
      ? phase.position
      : phase.kind === "error"
        ? phase.position
        : null;

  const amountE8s = parseDecimalToBigInt(amountStr, 8);

  const rateNum = position ? Number(position.rate) / 1e8 : 0;
  const estReceived = rateNum > 0 ? (Number(amountE8s) / 1e8) / rateNum : 0;
  const balanceNum = position ? Number(position.balance) / 1e8 : 0;
  const treasuryLiquidityNum = position
    ? Number(position.treasuryLiquidity) / 1e18
    : 0;

  const tooSmall = position != null && amountE8s > 0n && amountE8s < position.minRedeem;
  const overBalance = position != null && amountE8s > position.balance;
  const overLiquidity =
    position != null && rateNum > 0 && estReceived > treasuryLiquidityNum;
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
      const result =
        asset === "ckUNI"
          ? await redeemSGLDT({ identity, amount: amountE8s, rateHint })
          : await redeemCkBAT({ identity, amount: amountE8s, rateHint });
      if (!result.ok) {
        setPhase({ kind: "error", message: result.error, position });
        return;
      }
      setPhase({
        kind: "done",
        asset,
        received: "ckuniPaid" in result ? result.ckuniPaid : result.ckbatPaid,
        sgldt: amountE8s,
        payBlock: result.blockIndex,
        rate: result.rate,
      });
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

  // Escape mirrors the close button: ignored while a transaction is in flight.
  const requestClose = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y({ open: true, onClose: requestClose, containerRef: dialogRef });

  return (
    <div
      data-ocid="wallet.redeem.modal"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="redeem-modal-title"
        className="bg-zinc-950 border border-zinc-800 rounded-[2rem] p-6 sm:p-8 w-full max-w-md relative max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain"
      >
        <button
          type="button"
          data-ocid="wallet.redeem.close_button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 disabled:opacity-40 min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
        >
          <XCircle size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-pink-500/20">
            <ArrowRightLeft size={20} className="text-pink-400" />
          </div>
          <div>
            <h2 id="redeem-modal-title" className="t-headline text-white">
              Redeem sGLDT
            </h2>
            <p className="text-xs text-zinc-500">
              Swap back to {assetInfo.symbol} at the live oracle rate
            </p>
          </div>
        </div>

        {phase.kind !== "done" && (
          <div
            role="tablist"
            aria-label="Redeem to"
            className="grid grid-cols-2 gap-2 mb-5"
          >
            {(Object.keys(REDEEM_ASSETS) as RefineAssetId[]).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={asset === id}
                data-ocid={`wallet.redeem.asset_tab.${id}`}
                disabled={busy}
                onClick={() => setAsset(id)}
                className={`rounded-xl py-2 text-sm font-bold border transition-colors disabled:opacity-40 ${
                  asset === id
                    ? "bg-yellow-500/15 border-yellow-500/50 text-yellow-400"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                {REDEEM_ASSETS[id].symbol}
              </button>
            ))}
          </div>
        )}

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
                {(Number(phase.received) / 1e18).toFixed(6)}{" "}
                {REDEEM_ASSETS[phase.asset].symbol} received
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                for {(Number(phase.sgldt) / 1e8).toFixed(4)} sGLDT — the{" "}
                {REDEEM_ASSETS[phase.asset].symbol} is in your own ICP account.
                Bridge it back to native {REDEEM_ASSETS[phase.asset].originSymbol}{" "}
                on Ethereum any time via the chain-key minter.
              </p>
              {/* On-chain receipt: the settled rate and the ledger block of
               *  the payout — the verifiable proof of this swap. */}
              <p className="text-[10px] text-zinc-500 font-mono mt-2">
                settled @ {(Number(phase.rate) / 1e8).toFixed(4)} sGLDT/
                {REDEEM_ASSETS[phase.asset].originSymbol} ·{" "}
                <a
                  href={`https://dashboard.internetcomputer.org/canister/${REDEEM_ASSETS[phase.asset].ledgerCanisterId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                  title={`${REDEEM_ASSETS[phase.asset].symbol} ledger canister on the ICP dashboard`}
                >
                  {REDEEM_ASSETS[phase.asset].symbol} ledger block #
                  {phase.payBlock.toString()}
                </a>
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
                  <div className="t-label text-zinc-500 mb-0.5">
                    Your sGLDT
                  </div>
                  <div className="text-yellow-500 font-bold">
                    {balanceNum.toFixed(4)}
                  </div>
                </div>
                <div>
                  <div className="t-label text-zinc-500 mb-0.5">
                    Rate
                  </div>
                  <div className="text-zinc-200 font-bold">
                    {rateNum > 0
                      ? `${rateNum.toFixed(4)} sGLDT/${assetInfo.originSymbol}`
                      : "—"}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="t-label text-zinc-500 mb-0.5">
                    Treasury liquidity
                  </div>
                  <div className="text-zinc-300 font-bold">
                    {treasuryLiquidityNum.toFixed(6)} {assetInfo.symbol} available
                  </div>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="redeem-amount"
                className="t-label text-zinc-500 block mb-1.5"
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
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-yellow-500/50 focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  data-ocid="wallet.redeem.max_button"
                  disabled={busy || !position}
                  onClick={() => {
                    // Max is the balance minus what this flow will charge on
                    // top of the amount: the approve's fee and the
                    // transfer_from's fee. The full balance was guaranteed to
                    // fail with InsufficientFunds at the pull.
                    if (!position) return;
                    const headroom = 2n * SGLDT_FEE_HEADROOM;
                    const max = position.balance > headroom ? position.balance - headroom : 0n;
                    if (max === 0n) {
                      setAmountStr("");
                      return;
                    }
                    const whole = max / 100_000_000n;
                    const frac = (max % 100_000_000n).toString().padStart(8, "0").replace(/0+$/, "");
                    setAmountStr(frac ? `${whole}.${frac}` : String(whole));
                  }}
                  className="px-3 rounded-xl border border-zinc-800 bg-zinc-900 t-label text-yellow-500 hover:bg-zinc-800 disabled:opacity-40"
                >
                  Max
                </button>
              </div>
              {amountE8s > 0n && rateNum > 0 && (
                <p className="text-[11px] text-zinc-400 mt-1.5">
                  ≈ {estReceived.toFixed(6)} {assetInfo.symbol}
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
                  The treasury doesn't hold that much {assetInfo.symbol} right
                  now — try a smaller amount.
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
                `Redeem to ${assetInfo.symbol}`
              )}
            </GoldCTA>

            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Two Internet Identity signatures: one approval letting the
              refinery pull your sGLDT, then the atomic swap. If the payout
              fails for any reason, your sGLDT is refunded automatically.
            </p>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Prefer the gold itself? sGLDT unwraps 1:1 to GLDT at sVault, and
              GLDT is redeemable for physical gold via Gold DAO —{" "}
              <a
                href="https://gldt.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                gldt.org
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
