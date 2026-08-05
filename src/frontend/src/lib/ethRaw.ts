/**
 * Raw injected-provider Ethereum helpers — balance races, gas estimation,
 * receipt polling. Distinct from ./eth.ts (the viem-backed client): this
 * file exists because mobile wallet quirks (dropped responses, CORS on
 * public RPC, wallet bridges that silently hang) mean every read here races
 * the injected wallet against a public-RPC fallback rather than trusting
 * either alone. Extracted out of App.tsx, which had grown past 3,000 lines
 * with these pure helpers mixed into the component body.
 */
import { ethCall, publicClient } from "./eth";

// UNI ERC-20 contract on Ethereum mainnet
export const UNI_CONTRACT_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
export const CKUNI_LEDGER_CANISTER_ID = "ilzky-ayaaa-aaaar-qahha-cai";
// DFINITY ckERC-20 helper contract on Ethereum — the shared entry point for all ckERC-20
// deposits. Users approve UNI to this contract, then call its deposit() method which
// pulls the UNI and triggers the ckERC-20 minter (sv3dd-oaaaa-aaaar-qacoa-cai) to mint
// ckUNI to the specified ICP principal.
export const CKERC20_HELPER_CONTRACT = "0x6abDA0438307733FC299e9C229FD3cc074bD8cC0";
// Treasury principal — every deposit credits ckUNI to this principal on ICP.
export const TREASURY_PRINCIPAL = "c626g-iyaaa-aaaau-agpoa-cai";

export interface EthProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isBraveWallet?: boolean;
}

export interface EthWindow extends EthProvider {
  providers?: EthProvider[];
}

export type MiningPhase =
  | "idle"
  | "awaiting_deposit" // Legacy fallback: manual deposit flow
  | "wallet_confirming" // Phase 1: waiting for wallet to sign the transaction
  | "eth_monitoring" // Phase 2: watching Etherscan for on-chain confirmation
  | "ckuni_minting" // Phase 3: polling until ckUNI mint is confirmed on ICP
  | "releasing_sgldt" // Phase 4: sGLDT being released to user's ICP account
  | "success"
  | "error";

// Hex calldata encoders + tx-hash extraction live in ./erc20 — see there.

/** Validate that a value is a well-formed hex string (e.g. "0x1a2b") */
export function isValidHex(val: unknown): val is string {
  return typeof val === "string" && /^0x[0-9a-fA-F]+$/i.test(val);
}

/** Poll eth_getTransactionReceipt until mined, failed, or timeout.
 *  Returns "confirmed" | "failed" | "timeout" | "dropped" */
export async function pollReceipt(
  txHash: string,
  timeoutMs: number,
): Promise<"confirmed" | "failed" | "timeout"> {
  const win = window as unknown as { ethereum?: EthProvider };
  const deadline = Date.now() + timeoutMs;

  // Try the injected wallet first, then fall back to public RPC endpoints.
  // Mobile Brave can't serve eth_getTransactionReceipt via the injected
  // provider, so without the public fallback the flow would hang until timeout.
  const queryReceipt = async (): Promise<{ status?: string } | null> => {
    if (win.ethereum) {
      try {
        const r = (await win.ethereum.request({
          method: "eth_getTransactionReceipt",
          params: [txHash],
        })) as { status?: string } | null;
        if (r && typeof r === "object") return r;
      } catch {
        // fall through to public RPC
      }
    }
    for (const endpoint of PUBLIC_ETH_RPC_ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5_000);
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getTransactionReceipt",
            params: [txHash],
            id: 1,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) continue;
        const json = await response.json();
        if (json?.result === null) return null; // pending
        if (json?.result && typeof json.result === "object") return json.result;
      } catch {
        // try next endpoint
      }
    }
    return null;
  };

  while (Date.now() < deadline) {
    const receipt = await queryReceipt();
    if (receipt && receipt.status === "0x1") return "confirmed";
    if (receipt && receipt.status === "0x0") return "failed";
    await new Promise((r) => setTimeout(r, 3000));
  }
  return "timeout";
}

export const isMobile =
  /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
// iOS Brave regular tabs do NOT inject window.ethereum because Apple does
// not allow wallet browser extensions. The only in-browser path on iOS is
// to open the dApp inside Brave Wallet's own in-app browser.
export const isIOS =
  /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// Public Ethereum RPC endpoints used as fallback when the wallet provider
// can't serve read RPC (common on mobile Brave / injected wallets).
//
// Brave Wallet's endpoint is first: Brave's Shields treat this domain as
// first-party infra (never blocked as a tracker), it's unauthenticated + CORS-
// enabled, and the majority of our users are Brave-browser users. If it's
// unreachable for any reason, publicRpcCall walks the list to the next.
//
// Dropped: cloudflare-eth.com (returns -32046 for anonymous calls) and
// rpc.ankr.com/eth (now demands an API key).
export const PUBLIC_ETH_RPC_ENDPOINTS = [
  "https://ethereum-mainnet.wallet.brave.com/",
  "https://eth.llamarpc.com",
  "https://ethereum-rpc.publicnode.com",
  "https://eth-mainnet.public.blastapi.io",
];

/** Make a JSON-RPC call against public RPC endpoints, returning the first
 * valid hex result. Used as a fallback when window.ethereum can't serve reads. */
export async function publicRpcCall(method: string, params: unknown[]): Promise<string | null> {
  for (const endpoint of PUBLIC_ETH_RPC_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5_000);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) continue;
      const json = await response.json();
      const hex: string = json?.result ?? "";
      if (isValidHex(hex)) return hex;
    } catch {
      // try next endpoint
    }
  }
  return null;
}

/** Format an 18-decimal wei BigInt as a 4-decimal display string without
 *  Number precision loss. `1_234_567_000_000_000_000n` → `"1.2346"`. */
export function format18(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const frac = wei % 10n ** 18n;
  // 18-digit padded fractional, truncate to 4 digits for display.
  const fracStr = frac.toString().padStart(18, "0").slice(0, 4);
  return `${whole.toString()}.${fracStr}`;
}

/** Resolve the injected wallet provider (window.ethereum). On mobile this is
 *  what the in-app browser gives us; on desktop it's the extension. Reading
 *  through this path avoids public-RPC CORS issues and rate limiting — the
 *  wallet has its own RPC connection, and calls go through the extension
 *  rather than a browser fetch. */
export type InjectedProvider = {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
  isBraveWallet?: boolean;
};
export function getInjected(): InjectedProvider | null {
  if (typeof window === "undefined") return null;
  // biome-ignore lint/suspicious/noExplicitAny: window.ethereum shape
  const eth = (window as any).ethereum as
    | (InjectedProvider & { providers?: InjectedProvider[] })
    | undefined;
  if (!eth?.request) return null;
  // If multiple providers are injected (MetaMask + Brave), prefer Brave since
  // it's the user's active wallet on this dApp.
  if (eth.providers && eth.providers.length > 0) {
    const brave = eth.providers.find((p) => p.isBraveWallet === true);
    if (brave) return brave;
    return eth.providers[0];
  }
  return eth;
}

/** Wrap a promise with a hard timeout. If the underlying promise hasn't
 *  settled within `ms`, resolves to `timeoutValue` instead of hanging. Used
 *  to prevent mobile-wallet `eth.request` calls from blocking balance reads
 *  indefinitely — a common failure mode when the wallet bridge drops the
 *  response payload but never rejects. */
export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn(`[balance] ${label} timed out after ${ms}ms`);
        resolve(null);
      }, ms);
    }),
  ]);
}

/** Ask the injected wallet for a hex balance. Returns the hex string (or
 *  null on timeout/error). Kept separate so we can race it against viem. */
export async function readHexViaWallet(method: string, params: unknown[], label: string): Promise<string | null> {
  const eth = getInjected();
  if (!eth) return null;
  try {
    const res = await withTimeout(
      eth.request({ method, params }),
      6_000,
      `wallet:${label}`,
    );
    if (res === null || res === undefined) return null;
    // Some wallets return an object { result: "0x..." } — unwrap that shape.
    let hex = res as unknown;
    if (typeof hex === "object" && hex !== null && "result" in hex) {
      // biome-ignore lint/suspicious/noExplicitAny: wallet returns any shape
      hex = (hex as any).result;
    }
    if (typeof hex !== "string") {
      console.warn(`[balance] wallet ${label} returned non-string:`, res);
      return null;
    }
    // Normalize: empty "0x" → "0x0" so BigInt() doesn't throw.
    if (hex === "0x" || hex === "0X") return "0x0";
    if (!hex.toLowerCase().startsWith("0x")) {
      console.warn(`[balance] wallet ${label} returned non-hex:`, hex);
      return null;
    }
    return hex;
  } catch (err) {
    console.warn(`[balance] wallet ${label} threw:`, err);
    return null;
  }
}

/** Safe BigInt hex parse. Returns null if the string isn't parseable.
 *
 *  The empty string is explicitly rejected: `BigInt("")` is `0n` in JS, so
 *  without this guard an empty/absent RPC response would render as a
 *  confirmed zero balance rather than an unknown one. Claiming someone
 *  holds nothing because the network hiccuped is the more alarming
 *  direction to be wrong in — same reason the treasury read shows "—"
 *  rather than "0.0000" when every endpoint fails. `"0x"` is different:
 *  that IS a real zero-result shape from some endpoints, so it maps to 0n. */
export function parseHexBigInt(hex: string): bigint | null {
  if (hex.trim() === "") return null;
  try {
    return BigInt(hex === "0x" || hex === "0X" ? "0x0" : hex);
  } catch {
    return null;
  }
}

/** Resolve to the first promise that yields a non-null `{src, v}` wrapper,
 *  along with a diagnostic of EVERY racer's outcome (so we can surface "wallet
 *  failed, rpc failed, canister succeeded" on the UI for mobile debugging).
 *  If all promises resolve to null (or reject), returns null value with full
 *  outcomes. */
export type RaceOutcome = "ok" | "null" | "err";
export type BalanceDiagnostic<T> = {
  value: T | null;
  source: string | null;
  outcomes: Record<string, RaceOutcome>;
};
export async function firstNonNullWithDiag<T>(
  racers: { name: string; p: Promise<{ src: string; v: T } | null> }[],
  label: string,
): Promise<BalanceDiagnostic<T>> {
  return new Promise((resolve) => {
    const outcomes: Record<string, RaceOutcome> = {};
    let pending = racers.length;
    let done = false;
    let winner: { src: string; v: T } | null = null;
    const maybeResolve = () => {
      if (done) return;
      if (winner) {
        done = true;
        console.log(`[balance] ${label} via ${winner.src}: ${winner.v}`);
        resolve({ value: winner.v, source: winner.src, outcomes });
      } else if (pending === 0) {
        done = true;
        console.warn(`[balance] ${label}: all paths returned null`, outcomes);
        resolve({ value: null, source: null, outcomes });
      }
    };
    for (const r of racers) {
      r.p
        .then((wrapped) => {
          pending -= 1;
          if (wrapped) {
            outcomes[r.name] = "ok";
            if (!winner) winner = wrapped;
          } else {
            outcomes[r.name] = "null";
          }
          maybeResolve();
        })
        .catch((err) => {
          pending -= 1;
          outcomes[r.name] = "err";
          console.warn(`[balance] ${label} ${r.name} threw:`, err);
          maybeResolve();
        });
    }
  });
}

/** Pre-estimate gas for an eth_sendTransaction via the public RPC, then add a
 *  25% buffer. If estimation fails (simulated revert, rate-limited RPC, wallet
 *  bridge refuses to simulate), fall back to a known-safe hardcoded limit.
 *
 *  Why this is necessary: viem's walletClient.sendTransaction defaults to
 *  calling eth_estimateGas via the WALLET's RPC. Some wallets — notably Brave
 *  Wallet on desktop, and every wallet bridge that exposes a cached/stale RPC
 *  state — fail that estimate and return the classic "fails to send gas limit"
 *  error before the user ever sees a signing prompt. Passing an explicit `gas`
 *  param bypasses the wallet's internal estimate step entirely.
 *
 *  Fallbacks are conservative: approve() on OpenZeppelin ERC-20 uses ~46k gas
 *  in the canonical path; UNI's token is standard so 80k is a safe ceiling.
 *  The ckERC-20 helper's deposit() does a transferFrom + CALL to the minter,
 *  typically ~150-200k gas; 250k gives headroom without burning user ETH
 *  (unused gas is refunded by the EVM). */
export async function estimateGasOrFallback(
  from: `0x${string}`,
  to: `0x${string}`,
  data: `0x${string}`,
  fallback: bigint,
): Promise<bigint> {
  try {
    const estimate = await publicClient.estimateGas({
      account: from,
      to,
      data,
    });
    // Buffer: +5% — tight enough to keep user's out-of-pocket gas low,
    // with enough headroom to cover small block-to-block variance. Unused
    // gas is refunded by the EVM, so slight over-estimation costs the
    // user nothing. The fallback values below (80k/250k) already include
    // conservative headroom for the common paths.
    const buffered = (estimate * 105n) / 100n + 1n;
    console.log(
      `[gas] estimate=${estimate.toString()} buffered=${buffered.toString()} for ${to.slice(0, 10)}…`,
    );
    return buffered;
  } catch (err) {
    console.warn(
      `[gas] estimation failed, using fallback=${fallback.toString()} for ${to.slice(0, 10)}…`,
      err,
    );
    return fallback;
  }
}

/** Fetch native ETH balance. Races the INJECTED wallet and viem publicClient
 *  in parallel — whichever returns first wins. Every path has a hard timeout.
 *  On mobile Brave the public-RPC path often stalls on CORS/cellular, AND the
 *  wallet-injected path can also silently drop responses — so serial fallback
 *  produces "balance never shows" while parallel race always completes.
 *
 *  NATIVE-ETH ONLY per wallet-docs.brave.com guidance: no canister outcalls.
 *  If both paths fail, the UI shows "—" with a clear diagnostic rather than
 *  falling back to a trust-widened backend roundtrip. */
export async function fetchEthBalanceRaw(address: string): Promise<BalanceDiagnostic<string>> {
  const walletPromise = readHexViaWallet("eth_getBalance", [address, "latest"], "eth_getBalance")
    .then((hex) => {
      if (!hex) return null;
      const n = parseHexBigInt(hex);
      return n === null ? null : format18(n);
    });

  const rpcPromise = withTimeout(
    publicClient.getBalance({ address: address as `0x${string}` }),
    6_000,
    "rpc:getBalance",
  )
    .then((bal) => (bal === null ? null : format18(bal)))
    .catch((err) => {
      console.warn("[balance] rpc getBalance threw:", err);
      return null;
    });

  return firstNonNullWithDiag<string>(
    [
      { name: "wallet", p: walletPromise.then((v) => (v ? { src: "wallet", v } : null)) },
      { name: "rpc", p: rpcPromise.then((v) => (v ? { src: "rpc", v } : null)) },
    ],
    "ETH",
  );
}

/** Fetch UNI ERC-20 balance. Same parallel race as fetchEthBalanceRaw. */
export async function fetchUniBalanceRaw(address: string): Promise<BalanceDiagnostic<string>> {
  const balanceOfData = `0x70a08231${address
    .toLowerCase()
    .replace("0x", "")
    .padStart(64, "0")}` as `0x${string}`;

  const walletPromise = readHexViaWallet(
    "eth_call",
    [{ to: UNI_CONTRACT_ADDRESS, data: balanceOfData }, "latest"],
    "eth_call(UNI)",
  ).then((hex) => {
    if (!hex) return null;
    const n = parseHexBigInt(hex);
    return n === null ? null : format18(n);
  });

  const rpcPromise = withTimeout(
    ethCall({ to: UNI_CONTRACT_ADDRESS as `0x${string}`, data: balanceOfData }),
    6_000,
    "rpc:ethCall(UNI)",
  )
    .then((hex) => {
      if (!hex) return null;
      const n = parseHexBigInt(hex);
      return n === null ? null : format18(n);
    })
    .catch((err) => {
      console.warn("[balance] rpc ethCall threw:", err);
      return null;
    });

  return firstNonNullWithDiag<string>(
    [
      { name: "wallet", p: walletPromise.then((v) => (v ? { src: "wallet", v } : null)) },
      { name: "rpc", p: rpcPromise.then((v) => (v ? { src: "rpc", v } : null)) },
    ],
    "UNI",
  );
}
