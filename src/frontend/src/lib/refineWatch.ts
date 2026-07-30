/**
 * Persisted record of an in-flight minter watch: the user signed a deposit
 * and the chain-key minter is confirming it (~12 Ethereum blocks). Without
 * this, a refresh mid-wait lands on a pristine idle screen — the highest-
 * anxiety moment in the whole flow — even though the deposit is fine.
 *
 * The record is only a UI convenience: the ckUNI is minted to the user's own
 * principal regardless, so losing it costs nothing but a resumed progress
 * screen (the leftover-ckUNI banner is the backstop).
 */

const TTL_MS = 60 * 60_000; // 60 min — well past the minter's worst case

export type RefineWatchRecord = {
  /** Ethereum deposit tx hash, for the Etherscan link. */
  txHash: string | null;
  /** Deposit amount in ckUNI e18, serialized as a string (bigint-safe). */
  amountWei: string;
  /** Rate hint in 1e8, serialized as a string, or null. */
  rateHint: string | null;
  /** Epoch ms when the watch started — preserved across refreshes so the
   *  40-min watch timeout can't be reset forever by reloading. */
  startedAt: number;
};

const key = (principalSlug: string) => `minegold_refine_watch_${principalSlug}`;

export function writeRefineWatch(
  principalSlug: string,
  record: RefineWatchRecord,
): void {
  try {
    localStorage.setItem(key(principalSlug), JSON.stringify(record));
  } catch {
    // localStorage unavailable — the leftover-ckUNI banner still recovers
  }
}

export function clearRefineWatch(principalSlug: string): void {
  try {
    localStorage.removeItem(key(principalSlug));
  } catch {
    /* ignore */
  }
}

/** Read + validate the record. Corrupt or expired records are deleted and
 *  reported as absent — a bad localStorage entry must never throw on mount. */
export function readRefineWatch(
  principalSlug: string,
): RefineWatchRecord | null {
  try {
    const raw = localStorage.getItem(key(principalSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RefineWatchRecord>;
    if (
      typeof parsed.amountWei !== "string" ||
      typeof parsed.startedAt !== "number" ||
      Date.now() - parsed.startedAt > TTL_MS
    ) {
      clearRefineWatch(principalSlug);
      return null;
    }
    BigInt(parsed.amountWei); // throws on garbage → caught below
    if (parsed.rateHint != null) BigInt(parsed.rateHint);
    return {
      txHash: typeof parsed.txHash === "string" ? parsed.txHash : null,
      amountWei: parsed.amountWei,
      rateHint: typeof parsed.rateHint === "string" ? parsed.rateHint : null,
      startedAt: parsed.startedAt,
    };
  } catch {
    clearRefineWatch(principalSlug);
    return null;
  }
}
