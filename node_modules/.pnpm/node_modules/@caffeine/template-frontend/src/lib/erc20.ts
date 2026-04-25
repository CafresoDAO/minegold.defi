/**
 * ERC-20 + ckERC-20-helper calldata encoders, plus small numeric helpers.
 *
 * Extracted from App.tsx to keep calldata-building logic out of the UI
 * layer. All encoders validate their address arguments up-front — a malformed
 * address silently zero-pads otherwise, which would ship funds to address(0).
 */
import type { Principal } from "@icp-sdk/core/principal";

/** Convert a decimal string to the smallest-unit BigInt without floating-point
 *  precision loss. E.g. parseDecimalToBigInt("0.021", 18) === 21000000000000000n. */
export function parseDecimalToBigInt(value: string, decimals: number): bigint {
  const clean = value.trim();
  if (!/^\d*\.?\d*$/.test(clean) || clean === "" || clean === ".") {
    return 0n;
  }
  const [whole = "0", frac = ""] = clean.split(".");
  const fracPadded = frac.slice(0, decimals).padEnd(decimals, "0");
  const joined = (whole + fracPadded).replace(/^0+(?=\d)/, "");
  return joined === "" ? 0n : BigInt(joined);
}

/** ERC-20 addresses must be exactly 40 hex chars (with or without `0x`). */
const ETH_ADDR_RE = /^(0x)?[a-fA-F0-9]{40}$/;
export function assertEthAddress(addr: string, label: string): void {
  if (!ETH_ADDR_RE.test(addr)) {
    throw new Error(`Invalid Ethereum address for ${label}: ${addr}`);
  }
}

/** Extract a 66-char (0x + 64 hex) tx hash from ANY wallet response shape.
 *  Handles: plain string, { hash }, { transactionHash }, { result }, JSON-RPC
 *  wrapped responses, arrays, and nested objects. Falls back to regex-scanning
 *  a JSON stringification of the value. Returns null if no valid hash found. */
export function extractTxHash(value: unknown): string | null {
  const HASH_RE = /0x[a-fA-F0-9]{64}/;

  const fromString = (s: string): string | null => {
    if (/^0x[a-fA-F0-9]{64}$/.test(s)) return s;
    const m = s.match(HASH_RE);
    return m ? m[0] : null;
  };

  if (typeof value === "string") return fromString(value);
  if (!value || typeof value !== "object") return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = value as any;
  for (const key of ["hash", "transactionHash", "txHash", "result", "tx"]) {
    const v = obj[key];
    if (typeof v === "string") {
      const hit = fromString(v);
      if (hit) return hit;
    }
  }
  try {
    const serialized = JSON.stringify(value);
    const m = serialized.match(HASH_RE);
    if (m) return m[0];
  } catch {
    /* unserializable */
  }
  return null;
}

/** Encode ERC-20 transfer(address,uint256) call data. */
export function encodeERC20Transfer(toAddress: string, amount: bigint): string {
  assertEthAddress(toAddress, "transfer recipient");
  const methodId = "a9059cbb";
  const paddedTo = toAddress.toLowerCase().replace("0x", "").padStart(64, "0");
  const paddedAmount = amount.toString(16).padStart(64, "0");
  return `0x${methodId}${paddedTo}${paddedAmount}`;
}

/** Encode ERC-20 approve(address,uint256) — grants `spender` permission to transferFrom. */
export function encodeERC20Approve(spender: string, amount: bigint): string {
  assertEthAddress(spender, "approve spender");
  const methodId = "095ea7b3";
  const paddedSpender = spender.toLowerCase().replace("0x", "").padStart(64, "0");
  const paddedAmount = amount.toString(16).padStart(64, "0");
  return `0x${methodId}${paddedSpender}${paddedAmount}`;
}

/** Encode ERC-20 allowance(owner, spender) call data. */
export function encodeERC20Allowance(owner: string, spender: string): string {
  assertEthAddress(owner, "allowance owner");
  assertEthAddress(spender, "allowance spender");
  const methodId = "dd62ed3e";
  const paddedOwner = owner.toLowerCase().replace("0x", "").padStart(64, "0");
  const paddedSpender = spender.toLowerCase().replace("0x", "").padStart(64, "0");
  return `0x${methodId}${paddedOwner}${paddedSpender}`;
}

/** Encode ckERC-20 helper deposit(address erc20Contract, uint256 amount, bytes32 principal).
 *  The helper pulls `amount` of the ERC-20 via transferFrom and signals the minter to mint
 *  ck<token> to the given ICP principal. */
export function encodeCkErc20Deposit(
  erc20Contract: string,
  amount: bigint,
  principalBytes32: string,
): string {
  assertEthAddress(erc20Contract, "ckERC-20 deposit token");
  const methodId = "26b3293f";
  const paddedToken = erc20Contract.toLowerCase().replace("0x", "").padStart(64, "0");
  const paddedAmount = amount.toString(16).padStart(64, "0");
  const principalHex = principalBytes32.replace("0x", "");
  return `0x${methodId}${paddedToken}${paddedAmount}${principalHex}`;
}

/** Encode an ICP Principal as bytes32 for the ckERC-20 helper contract.
 *  Layout (per DFINITY ckERC-20 helper): [length:1 byte][principal bytes...][zero pad to 32]. */
export function principalToBytes32(principal: Principal): string {
  const bytes = principal.toUint8Array();
  if (bytes.length > 29) throw new Error("Principal too long to encode as bytes32");
  const lengthHex = bytes.length.toString(16).padStart(2, "0");
  const principalHex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const padLength = (32 - 1 - bytes.length) * 2;
  const result = `0x${lengthHex}${principalHex}${"0".repeat(padLength)}`;
  if (result.length !== 66)
    throw new Error(`principalToBytes32 produced ${result.length} chars, expected 66`);
  return result;
}
