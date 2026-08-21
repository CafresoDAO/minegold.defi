import { describe, expect, it } from "vitest";
import { computeRefineAmounts } from "./refineMath";
import {
  CKBAT_ASSET,
  CKUNI_ASSET,
  formatAssetAmount,
  parseAssetAmount,
} from "./refineAssets";

describe("parseAssetAmount", () => {
  it("parses whole tokens", () => {
    expect(parseAssetAmount("1", CKBAT_ASSET)).toBe(10n ** 18n);
    expect(parseAssetAmount("25", CKBAT_ASSET)).toBe(25n * 10n ** 18n);
  });

  it("parses fractions without float drift", () => {
    expect(parseAssetAmount("0.1", CKBAT_ASSET)).toBe(100_000_000_000_000_000n);
    expect(parseAssetAmount("1.5", CKBAT_ASSET)).toBe(1_500_000_000_000_000_000n);
  });

  it("keeps precision on values a double could not hold exactly", () => {
    // 123456789.123456789 tokens — well past 2^53 base units.
    expect(parseAssetAmount("123456789.123456789", CKBAT_ASSET)).toBe(
      123_456_789_123_456_789_000_000_000n,
    );
  });

  it("truncates beyond the asset's decimals rather than rounding up", () => {
    // 19 decimal places on an 18-decimal asset: the last digit is dropped.
    expect(parseAssetAmount("0.1234567890123456789", CKBAT_ASSET)).toBe(
      123_456_789_012_345_678n,
    );
  });

  it("rejects junk without throwing", () => {
    expect(parseAssetAmount("", CKBAT_ASSET)).toBe(0n);
    expect(parseAssetAmount("abc", CKBAT_ASSET)).toBe(0n);
    expect(parseAssetAmount("1.2.3", CKBAT_ASSET)).toBe(0n);
    expect(parseAssetAmount("-5", CKBAT_ASSET)).toBe(0n);
  });

  it("round-trips through formatAssetAmount", () => {
    const amount = parseAssetAmount("12.3456", CKBAT_ASSET);
    expect(formatAssetAmount(amount, CKBAT_ASSET)).toBe("12.3456");
  });
});

describe("ckBAT fee headroom", () => {
  // The whole reason refineAssets exists: ckBAT's fee is 100x ckUNI's, and
  // the refine flow pays it twice. A balance that is comfortably refinable in
  // ckUNI terms can be entirely unrefinable in ckBAT terms.
  const batFee = CKBAT_ASSET.feeFallback; // 0.1
  const uniFee = CKUNI_ASSET.feeFallback; // 0.001

  it("is 100x the ckUNI fee", () => {
    expect(batFee).toBe(uniFee * 100n);
  });

  it("leaves nothing spendable below two fees", () => {
    const balance = 2n * batFee; // exactly 0.2, all of it fee
    const { refineAmount } = computeRefineAmounts(balance, balance, batFee);
    expect(refineAmount).toBe(0n);
  });

  it("clamps a max-out request to balance minus two fees", () => {
    const balance = 5n * 10n ** 18n; // 5 ckBAT
    const { refineAmount, approveAmount } = computeRefineAmounts(
      balance,
      balance,
      batFee,
    );
    expect(refineAmount).toBe(balance - 2n * batFee);
    // The approval must additionally cover the transfer_from fee.
    expect(approveAmount).toBe(refineAmount + batFee);
  });

  it("rejects a balance that clears the ckUNI bar but not the ckBAT one", () => {
    // 0.5 ckBAT. Under ckUNI's fee regime this would be plenty; here two fees
    // (0.2) leave 0.3, which is below the 1 ckBAT minimum.
    const balance = 500_000_000_000_000_000n;
    const { refineAmount } = computeRefineAmounts(balance, balance, batFee);
    expect(refineAmount).toBeLessThan(CKBAT_ASSET.minRefineFallback);
  });

  it("accepts the documented minimum plus its fee headroom", () => {
    const min = CKBAT_ASSET.minRefineFallback; // 1 ckBAT
    const balance = min + 2n * batFee; // 1.2 ckBAT
    const { refineAmount } = computeRefineAmounts(balance, min, batFee);
    expect(refineAmount).toBe(min);
  });

  it("keeps the minimum above the fee so a failed payout can be refunded", () => {
    // _refundCkBAT sends (amount - fee); if the minimum were <= one fee that
    // refund could not cover itself and the record would strand.
    expect(CKBAT_ASSET.minRefineFallback).toBeGreaterThan(batFee);
  });
});
