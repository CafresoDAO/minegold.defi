/**
 * Pending-deposit intent: localStorage payload we write BEFORE calling the
 * wallet's sendTransaction. Survives tab kills and mobile browser suspensions
 * so the user can resume a half-complete swap on reload.
 *
 * Layout per user principal so two II sessions on the same device don't step
 * on each other's pending swaps.
 */

const TTL_MS = 30 * 60_000;

export type PendingDepositIntent = {
  ethAddress: string;
  uniAmount: string;
  amountWei: string;
  depositAddress: string;
  startedAt: number;
  /** Nonce captured right before wallet.sendTransaction. Lets the recovery
   *  hook locate the exact tx via RPC even when Etherscan is unreachable
   *  (mobile Brave Shields). Null when we couldn't read the nonce beforehand. */
  expectedNonce: number | null;
};

const keyFor = (principalSlug: string) =>
  `minegold_pending_deposit_${principalSlug}`;

export function writePendingDeposit(
  principalSlug: string,
  intent: PendingDepositIntent,
): void {
  try {
    localStorage.setItem(keyFor(principalSlug), JSON.stringify(intent));
  } catch {
    /* localStorage unavailable (private mode, quota exceeded) */
  }
}

export function readPendingDeposit(
  principalSlug: string,
): PendingDepositIntent | null {
  try {
    const raw = localStorage.getItem(keyFor(principalSlug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingDepositIntent;
    if (!parsed?.ethAddress || !parsed?.depositAddress) return null;
    if (Date.now() - (parsed.startedAt ?? 0) > TTL_MS) {
      localStorage.removeItem(keyFor(principalSlug));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingDeposit(principalSlug: string): void {
  try {
    localStorage.removeItem(keyFor(principalSlug));
  } catch {
    /* noop */
  }
}
