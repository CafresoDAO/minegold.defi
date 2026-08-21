/**
 * The refinery's intake assets, in one place.
 *
 * Both intakes are ckERC-20 twins minted by DFINITY's chain-key minter, both
 * 18 decimals, both settling into sGLDT through the same treasury. What
 * actually differs between them is the ledger fee, and it differs by 100x:
 *
 *   ckUNI  0.001 (1e15)
 *   ckBAT  0.1   (1e17)
 *
 * That single number drives the minimum refine, the "can this be refunded if
 * the payout fails" question, and how much headroom a balance needs before a
 * refine is even attemptable. Hard-coding it per call site is how you ship a
 * flow that works for UNI and silently strands BAT, so it lives here and
 * every fee-sensitive path reads it from the descriptor.
 *
 * The fee values below are FALLBACKS. The live ledger is always asked first
 * (see fetchLedgerFee); these are what we use when that query fails, verified
 * against mainnet 2026-08-21.
 */

export type RefineAssetId = "ckUNI" | "ckBAT";

export interface RefineAsset {
  id: RefineAssetId;
  /** Ticker as shown to a person. */
  symbol: string;
  /** The Ethereum-side asset this is a chain-key twin of. */
  originSymbol: string;
  ledgerCanisterId: string;
  /** ERC-20 contract on Ethereum mainnet, for verification links. */
  erc20Address: string;
  decimals: number;
  /** Ledger transfer fee in base units. Fallback only — see module doc. */
  feeFallback: bigint;
  /**
   * Backend minimum, mirrored from main.mo. Kept here so the UI can reject
   * an under-minimum amount before spending a signature, but the backend is
   * the authority — getMy*Position returns the live value and that wins.
   */
  minRefineFallback: bigint;
  /** Human-readable minimum, for copy. */
  minRefineLabel: string;
}

export const CKUNI_ASSET: RefineAsset = {
  id: "ckUNI",
  symbol: "ckUNI",
  originSymbol: "UNI",
  ledgerCanisterId: "ilzky-ayaaa-aaaar-qahha-cai",
  erc20Address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
  decimals: 18,
  feeFallback: 1_000_000_000_000_000n,
  minRefineFallback: 1_000_000_000_000_000n,
  minRefineLabel: "0.001 ckUNI",
};

export const CKBAT_ASSET: RefineAsset = {
  id: "ckBAT",
  symbol: "ckBAT",
  originSymbol: "BAT",
  ledgerCanisterId: "j7x7x-syaaa-aaaar-qcbea-cai",
  erc20Address: "0x0D8775F648430679A709E98d2b0Cb6250d2887EF",
  decimals: 18,
  feeFallback: 100_000_000_000_000_000n,
  // 1 ckBAT — ten times the ledger fee. At ckUNI's "minimum == one fee" rule
  // a failed payout here could not cover its own refund transfer.
  minRefineFallback: 1_000_000_000_000_000_000n,
  minRefineLabel: "1 ckBAT",
};

export const REFINE_ASSETS: Record<RefineAssetId, RefineAsset> = {
  ckUNI: CKUNI_ASSET,
  ckBAT: CKBAT_ASSET,
};

/** Whole-token display for an e18 amount. */
export function formatAssetAmount(
  amount: bigint,
  asset: RefineAsset,
  places = 4,
): string {
  const divisor = 10 ** asset.decimals;
  return (Number(amount) / divisor).toFixed(places);
}

/** Parse a whole-token string into base units, without float drift on the
 *  integer part (which is where the large values live). */
export function parseAssetAmount(input: string, asset: RefineAsset): bigint {
  const trimmed = input.trim();
  if (!trimmed || !/^\d*\.?\d*$/.test(trimmed)) return 0n;
  const [whole = "0", frac = ""] = trimmed.split(".");
  const padded = (frac + "0".repeat(asset.decimals)).slice(0, asset.decimals);
  return (
    BigInt(whole || "0") * 10n ** BigInt(asset.decimals) + BigInt(padded || "0")
  );
}
