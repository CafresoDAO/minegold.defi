import { describe, expect, it } from "vitest";
import { format18, isValidHex, parseHexBigInt } from "./ethRaw";
import { safeBalance } from "./format";

/**
 * Balance formatting and hex parsing.
 *
 * Why this file exists: these run on every balance read, and their failure
 * mode is silent. A truncation bug shows a user a number that isn't what
 * they hold; a hex parse that throws takes down the whole balance panel.
 * Neither surfaces as an error — the UI just lies or goes blank.
 */

const ONE_ETH = 1_000_000_000_000_000_000n;

describe("format18", () => {
  it("formats whole and fractional amounts to 4 decimals", () => {
    expect(format18(ONE_ETH)).toBe("1.0000");
    expect(format18(0n)).toBe("0.0000");
    expect(format18(1_234_567_000_000_000_000n)).toBe("1.2345");
  });

  it("truncates rather than rounds", () => {
    // Rounding up would overstate a balance and let the UI offer a deposit
    // the wallet can't actually cover.
    expect(format18(1_999_999_999_999_999_999n)).toBe("1.9999");
    expect(format18(9_999_999_999_999_999n)).toBe("0.0099");
  });

  it("shows dust as 0.0000 without claiming it is exactly zero elsewhere", () => {
    // Sub-0.0001 balances display as 0.0000; the raw bigint is still
    // non-zero, which is what the deposit-minimum check uses.
    expect(format18(1n)).toBe("0.0000");
    expect(format18(99_999_999_999_999n)).toBe("0.0000");
  });

  it("handles very large balances without precision loss", () => {
    // Number() would lose precision well below this.
    expect(format18(123_456_789n * ONE_ETH)).toBe("123456789.0000");
  });

  it("pads short fractionals to a stable 4-digit width", () => {
    // A jittering column width reads as a glitch; fixed width reads as data.
    expect(format18(100_000_000_000_000_000n)).toBe("0.1000");
    expect(format18(10_000_000_000_000_000n)).toBe("0.0100");
  });
});

describe("isValidHex", () => {
  it("accepts 0x-prefixed hex of any length", () => {
    expect(isValidHex("0x0")).toBe(true);
    expect(isValidHex("0xdeadBEEF")).toBe(true);
  });

  it("rejects non-hex, unprefixed, and non-string input", () => {
    // "0x" alone is the empty-result shape some RPCs return; it must not
    // pass, or BigInt("0x") throws downstream.
    for (const bad of ["0x", "", "deadbeef", "0xZZ", null, undefined, 42, {}]) {
      expect(isValidHex(bad)).toBe(false);
    }
  });
});

describe("parseHexBigInt", () => {
  it("parses hex into a bigint", () => {
    expect(parseHexBigInt("0x10")).toBe(16n);
    expect(parseHexBigInt("0x0")).toBe(0n);
  });

  it("treats the empty-result 0x shape as zero instead of throwing", () => {
    // Public RPCs return "0x" for a zero balance on some endpoints. A raw
    // BigInt("0x") throws and would blank the balance panel.
    expect(parseHexBigInt("0x")).toBe(0n);
    expect(parseHexBigInt("0X")).toBe(0n);
  });

  it("returns null on garbage rather than throwing", () => {
    for (const bad of ["nope", "0xZZ", ""]) {
      expect(parseHexBigInt(bad)).toBeNull();
    }
  });

  it("parses full 32-byte words without precision loss", () => {
    const word = `0x${(2n ** 200n).toString(16).padStart(64, "0")}`;
    expect(parseHexBigInt(word)).toBe(2n ** 200n);
  });
});

describe("safeBalance", () => {
  it("passes through a real balance string unchanged", () => {
    expect(safeBalance("1.2345")).toBe("1.2345");
  });

  it("collapses every empty/garbage shape to 0.0000", () => {
    // These reach the UI from wallet bridges that drop or mangle responses.
    for (const bad of [null, undefined, "", "NaN", "abc", Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(safeBalance(bad)).toBe("0.0000");
    }
  });

  it("accepts numeric input", () => {
    expect(safeBalance(0)).toBe("0");
    expect(safeBalance(1.5)).toBe("1.5");
  });
});
