/**
 * Fee arithmetic for the ckUNI → sGLDT refine, kept pure so the boundary
 * cases are checkable by hand (and unit-testable the day a runner lands).
 *
 * ICRC ledgers charge the fee ON TOP of the moved amount, twice in this flow:
 *   1. icrc2_approve debits one fee from the balance.
 *   2. icrc2_transfer_from debits amount + fee from the balance AND
 *      decrements the allowance by amount + fee.
 * So a user whose whole balance is X can refine at most X − 2·fee, and the
 * approve must cover refineAmount + fee.
 */
export type RefineAmounts = {
  /** ckUNI (e18) actually passed to refineCkUNI. 0n = not refinable. */
  refineAmount: bigint;
  /** Allowance to grant: refineAmount + one ledger fee. */
  approveAmount: bigint;
};

export function computeRefineAmounts(
  balance: bigint,
  requested: bigint,
  fee: bigint,
): RefineAmounts {
  const spendable = balance > 2n * fee ? balance - 2n * fee : 0n;
  const refineAmount = requested < spendable ? requested : spendable;
  return { refineAmount, approveAmount: refineAmount + fee };
}
