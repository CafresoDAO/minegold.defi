import { Principal } from "@icp-sdk/core/principal";
import { describe, expect, it } from "vitest";
import {
  assertEthAddress,
  encodeCkErc20Deposit,
  encodeERC20Allowance,
  encodeERC20Approve,
  encodeERC20Transfer,
  extractTxHash,
  parseDecimalToBigInt,
  principalToBytes32,
} from "./erc20";

/**
 * Calldata encoders for the Ethereum leg of a deposit.
 *
 * Why this file exists: every function here builds bytes that get signed and
 * broadcast. A wrong selector, a mis-padded address, or a float-rounded
 * amount doesn't throw — it produces a valid-looking transaction that moves
 * the wrong money to the wrong place, irreversibly. The selectors below are
 * pinned to their real keccak256 values so a typo can't pass review.
 */

const UNI = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
const HELPER = "0x6abDA0438307733FC299e9C229FD3cc074bD8cC0";

describe("parseDecimalToBigInt", () => {
  it("converts a decimal string without floating-point loss", () => {
    // 0.021 * 1e18 via Number() would be 2.1000000000000002e16.
    expect(parseDecimalToBigInt("0.021", 18)).toBe(21_000_000_000_000_000n);
  });

  it("handles the classic 0.1 + 0.2 float trap exactly", () => {
    expect(parseDecimalToBigInt("0.1", 18)).toBe(100_000_000_000_000_000n);
    expect(parseDecimalToBigInt("0.3", 18)).toBe(300_000_000_000_000_000n);
  });

  it("parses whole numbers and pads to full decimals", () => {
    expect(parseDecimalToBigInt("1", 18)).toBe(1_000_000_000_000_000_000n);
    expect(parseDecimalToBigInt("1.", 18)).toBe(1_000_000_000_000_000_000n);
    expect(parseDecimalToBigInt(".5", 18)).toBe(500_000_000_000_000_000n);
  });

  it("truncates rather than rounds beyond the decimal limit", () => {
    // Rounding UP here would spend more of the user's money than they typed.
    expect(parseDecimalToBigInt("0.9999999999", 8)).toBe(99_999_999n);
    expect(parseDecimalToBigInt("1.999999999999999999999", 18)).toBe(
      1_999_999_999_999_999_999n,
    );
  });

  it("returns 0 for malformed input instead of NaN or a throw", () => {
    // Callers feed this straight from a text input. Every reject path must
    // land on 0 — a NaN would propagate into calldata as garbage.
    for (const bad of ["", ".", "abc", "1.2.3", "-1", "1e18", " ", "0x10"]) {
      expect(parseDecimalToBigInt(bad, 18)).toBe(0n);
    }
  });

  it("trims surrounding whitespace from pasted amounts", () => {
    expect(parseDecimalToBigInt("  1.5  ", 18)).toBe(1_500_000_000_000_000_000n);
  });

  it("strips leading zeros without destroying the value", () => {
    expect(parseDecimalToBigInt("007", 8)).toBe(700_000_000n);
    expect(parseDecimalToBigInt("0", 18)).toBe(0n);
    expect(parseDecimalToBigInt("0.0", 18)).toBe(0n);
  });
});

describe("assertEthAddress", () => {
  it("accepts valid addresses with and without the 0x prefix", () => {
    expect(() => assertEthAddress(UNI, "test")).not.toThrow();
    expect(() => assertEthAddress(UNI.slice(2), "test")).not.toThrow();
  });

  it("rejects malformed addresses rather than silently zero-padding", () => {
    // This is the guard that stops funds going to address(0): padStart on a
    // short string produces a valid-looking but wrong destination.
    for (const bad of ["", "0x", "0x123", `${UNI}00`, "0xZZZZ", "not-an-address"]) {
      expect(() => assertEthAddress(bad, "test")).toThrow();
    }
  });

  it("names the failing argument in the error", () => {
    // Debugging a bad deposit at 2am is easier when the error says which arg.
    expect(() => assertEthAddress("0x123", "approve spender")).toThrow(
      /approve spender/,
    );
  });
});

describe("calldata encoders", () => {
  it("encodes transfer() with the canonical selector and layout", () => {
    const data = encodeERC20Transfer(UNI, 1n);
    // keccak256("transfer(address,uint256)")[:4]
    expect(data.slice(0, 10)).toBe("0xa9059cbb");
    // 4-byte selector + two 32-byte words = 2 + 8 + 128 chars
    expect(data).toHaveLength(138);
    expect(data.endsWith("1".padStart(64, "0"))).toBe(true);
    // Address is lowercased and left-padded into a full word.
    expect(data.slice(10, 74)).toBe(UNI.slice(2).toLowerCase().padStart(64, "0"));
  });

  it("encodes approve() with the canonical selector", () => {
    const data = encodeERC20Approve(HELPER, 1_000n);
    // keccak256("approve(address,uint256)")[:4]
    expect(data.slice(0, 10)).toBe("0x095ea7b3");
    expect(data).toHaveLength(138);
    expect(data.slice(74)).toBe((1000).toString(16).padStart(64, "0"));
  });

  it("encodes allowance() with two address words and no amount", () => {
    const data = encodeERC20Allowance(UNI, HELPER);
    // keccak256("allowance(address,address)")[:4]
    expect(data.slice(0, 10)).toBe("0xdd62ed3e");
    expect(data).toHaveLength(138);
  });

  it("encodes the ckERC-20 helper deposit() with three words", () => {
    const principalBytes32 = principalToBytes32(
      Principal.fromText("c626g-iyaaa-aaaau-agpoa-cai"),
    );
    const data = encodeCkErc20Deposit(UNI, 5n, principalBytes32);
    // keccak256("deposit(address,uint256,bytes32)")[:4] — the selector the
    // backend also checks for when verifying a deposit tx.
    expect(data.slice(0, 10)).toBe("0x26b3293f");
    // selector + 3 words
    expect(data).toHaveLength(202);
    expect(data.slice(138)).toBe(principalBytes32.slice(2));
  });

  it("refuses to encode against a malformed contract address", () => {
    expect(() => encodeERC20Transfer("0xbad", 1n)).toThrow();
    expect(() => encodeERC20Approve("0xbad", 1n)).toThrow();
    expect(() => encodeCkErc20Deposit("0xbad", 1n, `0x${"0".repeat(64)}`)).toThrow();
  });

  it("encodes large amounts without truncation", () => {
    // A whale-sized approve must survive the hex round-trip intact.
    const huge = 2n ** 200n;
    const data = encodeERC20Approve(HELPER, huge);
    expect(BigInt(`0x${data.slice(74)}`)).toBe(huge);
  });
});

describe("principalToBytes32", () => {
  it("encodes as [length byte][principal bytes][zero pad] in 32 bytes", () => {
    const p = Principal.fromText("c626g-iyaaa-aaaau-agpoa-cai");
    const encoded = principalToBytes32(p);
    expect(encoded).toHaveLength(66); // 0x + 64 hex chars
    const bytes = p.toUint8Array();
    // First byte is the length, so the minter knows where the principal ends.
    expect(encoded.slice(2, 4)).toBe(bytes.length.toString(16).padStart(2, "0"));
    // Remainder is zero-padded, not junk.
    const tail = encoded.slice(4 + bytes.length * 2);
    expect(/^0*$/.test(tail)).toBe(true);
  });

  it("round-trips the principal bytes exactly", () => {
    // If this drifts, ckUNI mints to the wrong principal and is unrecoverable.
    const p = Principal.fromText("c626g-iyaaa-aaaau-agpoa-cai");
    const bytes = p.toUint8Array();
    const encoded = principalToBytes32(p);
    const decoded = encoded.slice(4, 4 + bytes.length * 2);
    const expected = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    expect(decoded).toBe(expected);
  });

  it("handles the anonymous principal (shortest case)", () => {
    const encoded = principalToBytes32(Principal.anonymous());
    expect(encoded).toHaveLength(66);
  });
});

describe("extractTxHash", () => {
  const HASH = `0x${"a1b2".repeat(16)}`;

  it("accepts a plain hash string", () => {
    expect(extractTxHash(HASH)).toBe(HASH);
  });

  it("unwraps the shapes real wallets actually return", () => {
    // Each of these is a shape some mobile wallet bridge has returned in
    // practice. Missing one means the deposit "vanishes" from the UI even
    // though it is on-chain.
    expect(extractTxHash({ hash: HASH })).toBe(HASH);
    expect(extractTxHash({ transactionHash: HASH })).toBe(HASH);
    expect(extractTxHash({ txHash: HASH })).toBe(HASH);
    expect(extractTxHash({ result: HASH })).toBe(HASH);
    expect(extractTxHash({ tx: HASH })).toBe(HASH);
  });

  it("digs a hash out of a nested or JSON-RPC-wrapped response", () => {
    expect(extractTxHash({ result: { hash: HASH } })).toBe(HASH);
    expect(extractTxHash({ jsonrpc: "2.0", id: 1, result: HASH })).toBe(HASH);
  });

  it("returns null when there is no hash, rather than a partial match", () => {
    for (const bad of [null, undefined, 42, "", "0x", "0xabc", {}, { hash: "nope" }]) {
      expect(extractTxHash(bad)).toBeNull();
    }
  });

  it("does not mistake a 40-char address for a 64-char hash", () => {
    // Both are 0x-prefixed hex; only length distinguishes them.
    expect(extractTxHash(UNI)).toBeNull();
    expect(extractTxHash({ hash: UNI })).toBeNull();
  });
});
