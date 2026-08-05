import { describe, expect, it } from "vitest";
import { computeRefineAmounts } from "./refineMath";

/**
 * The ckUNI → sGLDT refine fee arithmetic.
 *
 * Why this file exists: ICRC ledgers charge their fee ON TOP of the moved
 * amount, and this flow crosses the ledger twice (approve, then
 * transfer_from). Off-by-one-fee here doesn't throw — it produces an
 * approve that can't cover the transfer, and the refine fails after the
 * user has already signed. These cases are the boundaries where that
 * happens.
 *
 * ckUNI is an 18-decimal ledger; FEE is its real mainnet transfer fee.
 */
const FEE = 10_000_000_000_000n; // 0.00001 ckUNI
const ONE = 1_000_000_000_000_000_000n; // 1 ckUNI

describe("computeRefineAmounts", () => {
  it("refines the requested amount when the balance comfortably covers it", () => {
    const { refineAmount, approveAmount } = computeRefineAmounts(
      10n * ONE,
      ONE,
      FEE,
    );
    expect(refineAmount).toBe(ONE);
    // The approve must cover the transfer AND its fee, or transfer_from
    // reverts on an insufficient allowance.
    expect(approveAmount).toBe(ONE + FEE);
  });

  it("caps the refine at balance minus two fees, never the raw balance", () => {
    // The user asks to refine everything they hold. They can't: one fee is
    // charged by approve, another by transfer_from.
    const balance = 5n * ONE;
    const { refineAmount } = computeRefineAmounts(balance, balance, FEE);
    expect(refineAmount).toBe(balance - 2n * FEE);
  });

  it("leaves the balance exactly able to pay both fees after settling", () => {
    // The invariant that matters: refineAmount + approve fee + transfer fee
    // must never exceed the balance, or the second ledger call fails.
    const balance = 3n * ONE;
    const { refineAmount } = computeRefineAmounts(balance, balance, FEE);
    expect(refineAmount + 2n * FEE).toBeLessThanOrEqual(balance);
  });

  it("returns 0 rather than a negative amount when the balance is below two fees", () => {
    // BigInt subtraction would underflow into a huge positive number in some
    // languages; here it would go negative. Either way, quoting a refine the
    // ledger will reject is worse than quoting none.
    expect(computeRefineAmounts(FEE, FEE, FEE).refineAmount).toBe(0n);
    expect(computeRefineAmounts(0n, ONE, FEE).refineAmount).toBe(0n);
  });

  it("returns 0 at exactly two fees — the amount would be zero, not refinable", () => {
    // Boundary: balance == 2*fee. `>` not `>=` in the guard, so this is 0.
    expect(computeRefineAmounts(2n * FEE, ONE, FEE).refineAmount).toBe(0n);
  });

  it("refines a single unit at one wei above two fees", () => {
    // The first balance that CAN refine anything at all.
    const { refineAmount, approveAmount } = computeRefineAmounts(
      2n * FEE + 1n,
      ONE,
      FEE,
    );
    expect(refineAmount).toBe(1n);
    expect(approveAmount).toBe(1n + FEE);
  });

  it("prefers the requested amount when it is strictly less than spendable", () => {
    const { refineAmount } = computeRefineAmounts(10n * ONE, 2n * ONE, FEE);
    expect(refineAmount).toBe(2n * ONE);
  });

  it("clamps to spendable when the request equals spendable exactly", () => {
    // `requested < spendable` is a strict compare, so an exactly-equal
    // request takes the spendable branch. Same value either way — this
    // pins the behaviour so a later refactor can't silently change it.
    const balance = 4n * ONE;
    const spendable = balance - 2n * FEE;
    const { refineAmount } = computeRefineAmounts(balance, spendable, FEE);
    expect(refineAmount).toBe(spendable);
  });

  it("never returns an approve smaller than the refine", () => {
    // Property check across a spread of balances/requests: the approve must
    // always cover refineAmount + one fee, including the zero case.
    for (const balance of [0n, FEE, 2n * FEE, 2n * FEE + 1n, ONE, 999n * ONE]) {
      for (const requested of [0n, 1n, FEE, ONE, 999n * ONE]) {
        const { refineAmount, approveAmount } = computeRefineAmounts(
          balance,
          requested,
          FEE,
        );
        expect(approveAmount).toBe(refineAmount + FEE);
        expect(refineAmount).toBeGreaterThanOrEqual(0n);
        expect(refineAmount).toBeLessThanOrEqual(balance);
      }
    }
  });

  it("handles a zero fee ledger without changing the requested amount", () => {
    const { refineAmount, approveAmount } = computeRefineAmounts(ONE, ONE, 0n);
    expect(refineAmount).toBe(ONE);
    expect(approveAmount).toBe(ONE);
  });
});
