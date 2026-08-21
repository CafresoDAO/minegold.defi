import { describe, expect, it } from "vitest";
import {
  CKBAT_ASSET,
  CKUNI_ASSET,
  formatAssetAmount,
  parseAssetAmount,
} from "./refineAssets";
import { computeRefineAmounts } from "./refineMath";

/**
 * Edge cases not already covered by refineMath.test.ts / refineAssets.test.ts.
 *
 * Every test here asserts CURRENT behaviour of the shipped code. Where that
 * behaviour looks wrong, the test still pins it (so a silent regression is
 * still caught) but is flagged with a `SUSPECTED BUG:` comment instead of
 * being written as a failing spec.
 */

const FEE = 10_000_000_000_000n; // 0.00001 ckUNI, 18 decimals
const ONE = 1_000_000_000_000_000_000n; // 1 ckUNI

describe("computeRefineAmounts — additional boundaries", () => {
  it("treats a requested amount of 0 as nothing to refine, but still quotes a nonzero approve", () => {
    // requested=0 takes the `requested < spendable` branch (0 < spendable),
    // so refineAmount is correctly 0 — but approveAmount is refineAmount+fee,
    // i.e. one fee's worth of allowance for a transfer that will never
    // happen. Harmless IF callers gate on refineAmount === 0 before
    // spending an approve signature (which the flow does), but this pins
    // the raw output so that assumption stays visible.
    const { refineAmount, approveAmount } = computeRefineAmounts(
      10n * ONE,
      0n,
      FEE,
    );
    expect(refineAmount).toBe(0n);
    expect(approveAmount).toBe(FEE);
  });

  // SUSPECTED BUG: computeRefineAmounts has no guard against a negative
  // `requested`. `requested < spendable` is true for any negative number
  // against a positive spendable balance, so the negative value flows
  // straight through as refineAmount. A negative refineAmount handed to
  // refineCkUNI/refineCkBAT (or used to compute a UI diff) is nonsensical
  // and, depending on what the caller does with it (e.g. balance -
  // refineAmount to show "remaining"), could inflate a displayed balance
  // or otherwise corrupt downstream math. The function should clamp
  // requested to a minimum of 0n before comparing against spendable.
  it("passes a negative requested amount straight through as a negative refineAmount", () => {
    const { refineAmount, approveAmount } = computeRefineAmounts(
      10n * ONE,
      -5n,
      FEE,
    );
    expect(refineAmount).toBe(-5n);
    expect(approveAmount).toBe(FEE - 5n);
  });

  it("refines up to spendable minus one wei when requested falls just short of it", () => {
    // One wei below the max spendable: the requested branch wins, not the
    // clamp — pins the strict `<` comparison at a non-trivial boundary.
    const balance = 4n * ONE;
    const spendable = balance - 2n * FEE;
    const { refineAmount } = computeRefineAmounts(balance, spendable - 1n, FEE);
    expect(refineAmount).toBe(spendable - 1n);
  });

  it("handles balances and requests far beyond Number.MAX_SAFE_INTEGER without precision loss", () => {
    // 2^200 base units — many orders of magnitude past 2^53. BigInt math
    // must stay exact; this would silently corrupt under any float path.
    const huge = 2n ** 200n;
    const { refineAmount, approveAmount } = computeRefineAmounts(
      huge,
      huge,
      FEE,
    );
    expect(refineAmount).toBe(huge - 2n * FEE);
    expect(approveAmount).toBe(huge - 2n * FEE + FEE);
  });

  it("is unaffected by which of two equal fees the ledger reports, when balance sits exactly on the boundary for both", () => {
    // ckUNI and ckBAT fee regimes exercised through the same pure function
    // with a shared balance, to confirm the 100x fee gap alone determines
    // refinability — not any asset-specific branching (there is none).
    const balance = 3n * CKUNI_ASSET.feeFallback;
    const uniResult = computeRefineAmounts(
      balance,
      balance,
      CKUNI_ASSET.feeFallback,
    );
    expect(uniResult.refineAmount).toBe(balance - 2n * CKUNI_ASSET.feeFallback);

    const batResult = computeRefineAmounts(
      balance,
      balance,
      CKBAT_ASSET.feeFallback,
    );
    // Same raw balance, but ckBAT's fee is 100x ckUNI's, so 3 ckUNI-fees
    // worth of balance doesn't even clear one ckBAT fee's boundary check
    // (balance > 2*fee): 3*uniFee = 0.03 ckUNI-equivalent units, while
    // 2*batFee is vastly larger, so nothing is spendable.
    expect(batResult.refineAmount).toBe(0n);
  });
});

describe("parseAssetAmount — malformed and boundary input", () => {
  it("parses a lone decimal point as zero", () => {
    expect(parseAssetAmount(".", CKUNI_ASSET)).toBe(0n);
  });

  it("parses a leading-dot fraction with no whole part", () => {
    expect(parseAssetAmount(".5", CKBAT_ASSET)).toBe(500_000_000_000_000_000n);
  });

  it("parses a trailing-dot whole number with no fractional part", () => {
    expect(parseAssetAmount("5.", CKBAT_ASSET)).toBe(
      5_000_000_000_000_000_000n,
    );
  });

  it("rejects exponential notation rather than silently misreading magnitude", () => {
    // "1e18" must not be read as 1 (whole="1e18" fails the digit regex),
    // and it must never be misinterpreted as 10^18 base units — that would
    // be a 10^18x overstatement of the amount typed.
    expect(parseAssetAmount("1e18", CKUNI_ASSET)).toBe(0n);
  });

  it("rejects a leading plus sign", () => {
    expect(parseAssetAmount("+5", CKUNI_ASSET)).toBe(0n);
  });

  it("treats whitespace-only input as zero, not junk that throws", () => {
    expect(parseAssetAmount("   ", CKUNI_ASSET)).toBe(0n);
  });

  it("accepts a plain leading-zero integer", () => {
    expect(parseAssetAmount("007", CKUNI_ASSET)).toBe(7n * ONE);
  });

  it("parses a fraction exactly as long as the asset's decimals without truncating a digit", () => {
    // 18 fractional digits on an 18-decimal asset: every digit should
    // survive (contrast with refineAssets.test.ts's 19-digit truncation
    // case).
    expect(parseAssetAmount("0.123456789012345678", CKUNI_ASSET)).toBe(
      123_456_789_012_345_678n,
    );
  });

  it("parses a fee-sized dust amount from its decimal string exactly", () => {
    // Real-world hazard: a user pastes their remaining ckBAT balance after
    // a prior refine, which may be sitting at exactly the fee floor. This
    // must round-trip exactly or the follow-up refine quote is wrong.
    expect(parseAssetAmount("0.1", CKBAT_ASSET)).toBe(CKBAT_ASSET.feeFallback);
  });
});

describe("formatAssetAmount — display boundaries", () => {
  it("formats zero", () => {
    expect(formatAssetAmount(0n, CKUNI_ASSET)).toBe("0.0000");
  });

  it("formats a one-wei balance as zero at the default precision", () => {
    // Real-world hazard: dust left behind by fee arithmetic is invisible
    // at 4 decimal places, which is by design for the token's own decimals
    // (18) but worth pinning — a user could hold nonzero, unrefinable dust
    // that the UI displays as "0.0000" and looks like an empty balance.
    expect(formatAssetAmount(1n, CKUNI_ASSET)).toBe("0.0000");
  });

  it("formats the ckUNI and ckBAT fees at their documented decimal values", () => {
    expect(formatAssetAmount(CKUNI_ASSET.feeFallback, CKUNI_ASSET)).toBe(
      "0.0010",
    );
    expect(formatAssetAmount(CKBAT_ASSET.feeFallback, CKBAT_ASSET)).toBe(
      "0.1000",
    );
  });

  // SUSPECTED BUG: formatAssetAmount converts the bigint amount to a
  // JS `Number` before dividing. For an 18-decimal asset, 1 whole token is
  // already 1e18 base units — far past Number.MAX_SAFE_INTEGER (2^53 ~=
  // 9.007e15) — so effectively every realistic on-chain balance loses
  // precision the moment it hits `Number(amount)`. At everyday balances
  // (single/double-digit token counts) the error stays below the 4
  // displayed decimals, but at large balances it does not: this test
  // shows a balance of 99999999999999999999999999n base units (~1e8
  // tokens) rendering as "100000000.0000" instead of the true
  // "99999999.9999...ish" figure — the display silently rounds up to the
  // next whole token. A balance-sensitive display (or anything that fed
  // this string back into a comparison) should use BigInt division for
  // the integer part instead of Number().
  it("loses precision on very large balances instead of showing the exact whole-token count", () => {
    const hugeBalance = 99_999_999_999_999_999_999_999_999n;
    expect(formatAssetAmount(hugeBalance, CKUNI_ASSET)).toBe("100000000.0000");
  });

  it("rounds the displayed fraction rather than truncating it", () => {
    // 0.00005 rounds to 0.0001 at 4 places (toFixed rounds), unlike
    // parseAssetAmount which truncates extra input digits. The two
    // directions (parse vs format) are not symmetric, which matters if a
    // caller assumes formatting is just the inverse of parsing.
    expect(formatAssetAmount(50_000_000_000_000n, CKUNI_ASSET)).toBe("0.0001");
  });
});
