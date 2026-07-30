import type { TxRecord } from "../backend.d";
import { TxStatus, TxType } from "../backend.d";
import type {
  RedeemRecordView,
  RefineRecordView,
  RefineStatusKey,
} from "../hooks/useQueries";

/**
 * The unified ledger — ONE entry shape for everything the user has done,
 * merged from three backend streams:
 *
 *   getMyRefines   → kind "refine"  (canonical for ckUNI→sGLDT swaps)
 *   getMyRedeems   → kind "redeem"  (canonical for sGLDT→ckUNI swaps)
 *   getMyTransactions → Bridge / Mint / Transfer only
 *
 * DEDUP RULE (verified against main.mo): every refine/redeem ALSO writes
 * TxRecords tagged #Refine / #Redeem / #Refund describing the same event,
 * so those TxTypes are EXCLUDED from the TxRecord side — the refine/redeem
 * records are richer (both amounts, settled rate, pull+pay blocks) and are
 * the receipt of record. Keeping both would show every swap twice.
 */

/** The one settlement taxonomy (see components/trust/StatusPill). */
export type SettlementStatus =
  | "settled"
  | "in-flight"
  | "refunded"
  | "held"
  | "failed";

export type LedgerAmount = {
  /** Raw on-chain units. */
  value: bigint;
  /** 18 for ckUNI/ETH-side, 8 for sGLDT/ICRC-1. */
  decimals: number;
  symbol: string;
};

export type LedgerEntry = {
  /** Stable, URL-safe id: "rf-3" / "rd-1" / "tx-17" — the /receipt/:id key. */
  id: string;
  kind: "refine" | "redeem" | "bridge" | "mint" | "transfer";
  status: SettlementStatus;
  timestampNs: bigint;
  /** What left the user (null when the stream doesn't record it). */
  amountIn: LedgerAmount | null;
  /** What the user received. */
  amountOut: LedgerAmount | null;
  /** Settled sGLDT-per-UNI rate, 1e8 — swaps only. */
  rateE8: bigint | null;
  /** Ledger block of the pull leg (refine: ckUNI, redeem: sGLDT). */
  pullBlock: bigint | null;
  /** Ledger block of the pay leg (refine: sGLDT, redeem: ckUNI). */
  payBlock: bigint | null;
  ethTxHash: string | null;
  errorMsg: string | null;
  /** One plain-language line for list rows. */
  summary: string;
};

const refineStatus = (k: RefineStatusKey): SettlementStatus =>
  k === "paid"
    ? "settled"
    : k === "pulled"
      ? "in-flight"
      : k === "refunded"
        ? "refunded"
        : "held";

const txStatus = (s: TxStatus): SettlementStatus =>
  s === TxStatus.Completed
    ? "settled"
    : s === TxStatus.Failed
      ? "failed"
      : s === TxStatus.Held
        ? "held"
        : "in-flight";

export const fmtAmount = (a: LedgerAmount, digits = 4): string =>
  `${(Number(a.value) / 10 ** a.decimals).toFixed(digits)} ${a.symbol}`;

export function fromRefine(r: RefineRecordView): LedgerEntry {
  const inAmt: LedgerAmount = { value: r.ckuniAmount, decimals: 18, symbol: "ckUNI" };
  const outAmt: LedgerAmount | null =
    r.sgldtPaid > 0n ? { value: r.sgldtPaid, decimals: 8, symbol: "sGLDT" } : null;
  return {
    id: `rf-${r.id.toString()}`,
    kind: "refine",
    status: refineStatus(r.status),
    timestampNs: r.timestamp,
    amountIn: inAmt,
    amountOut: outAmt,
    rateE8: r.rate,
    pullBlock: r.pullBlock,
    payBlock: r.payBlock,
    ethTxHash: null,
    errorMsg: r.errorMsg,
    summary: outAmt
      ? `Refined ${fmtAmount(inAmt)} → ${fmtAmount(outAmt)}`
      : `Refine of ${fmtAmount(inAmt)}${r.status === "refunded" ? " — refunded" : ""}`,
  };
}

export function fromRedeem(r: RedeemRecordView): LedgerEntry {
  const inAmt: LedgerAmount = { value: r.sgldtAmount, decimals: 8, symbol: "sGLDT" };
  const outAmt: LedgerAmount | null =
    r.ckuniPaid > 0n ? { value: r.ckuniPaid, decimals: 18, symbol: "ckUNI" } : null;
  return {
    id: `rd-${r.id.toString()}`,
    kind: "redeem",
    status: refineStatus(r.status),
    timestampNs: r.timestamp,
    amountIn: inAmt,
    amountOut: outAmt,
    rateE8: r.rate,
    pullBlock: r.pullBlock,
    payBlock: r.payBlock,
    ethTxHash: null,
    errorMsg: r.errorMsg,
    summary: outAmt
      ? `Redeemed ${fmtAmount(inAmt)} → ${fmtAmount(outAmt)}`
      : `Redeem of ${fmtAmount(inAmt)}${r.status === "refunded" ? " — refunded" : ""}`,
  };
}

/** TxRecord kinds the unified ledger keeps (swap-shaped types are covered
 *  by the canonical refine/redeem streams — see the dedup rule above). */
const TX_KIND: Partial<Record<TxType, LedgerEntry["kind"]>> = {
  [TxType.Bridge]: "bridge",
  [TxType.Mint]: "mint",
  [TxType.Transfer]: "transfer",
};

export function fromTxRecord(t: TxRecord): LedgerEntry | null {
  const kind = TX_KIND[t.txType];
  if (!kind) return null;
  const decimals = t.tokenSymbol === "ckUNI" || t.tokenSymbol === "UNI" ? 18 : 8;
  const amt: LedgerAmount = { value: t.amount, decimals, symbol: t.tokenSymbol };
  const verb =
    kind === "bridge" ? "Deposited" : kind === "mint" ? "Minted" : "Transferred";
  return {
    id: `tx-${t.id}`,
    kind,
    status: txStatus(t.status),
    timestampNs: t.timestamp,
    // Bridge = UNI leaving the wallet; mint = ckUNI arriving; transfer = leaving.
    amountIn: kind === "mint" ? null : amt,
    amountOut: kind === "mint" ? amt : null,
    rateE8: null,
    pullBlock: null,
    payBlock: t.icpBlockIndex ?? null,
    ethTxHash: t.ethTxHash ?? null,
    errorMsg: t.errorMsg ?? null,
    summary: `${verb} ${fmtAmount(amt)}`,
  };
}

/** Merge the three streams into one newest-first ledger. */
export function mergeLedger(
  refines: RefineRecordView[] | undefined,
  redeems: RedeemRecordView[] | undefined,
  txs: TxRecord[] | undefined,
): LedgerEntry[] {
  return [
    ...(refines ?? []).map(fromRefine),
    ...(redeems ?? []).map(fromRedeem),
    ...(txs ?? []).map(fromTxRecord).filter((e): e is LedgerEntry => e !== null),
  ].sort((a, b) => (a.timestampNs < b.timestampNs ? 1 : -1));
}

/** Find one entry by its /receipt/:id key. */
export const findEntry = (
  entries: LedgerEntry[],
  id: string,
): LedgerEntry | null => entries.find((e) => e.id === id) ?? null;
