/**
 * Viem-backed Ethereum client. This replaces all raw `window.ethereum.request`
 * calls so that mobile wallet quirks (iOS WKWebView double-encoding, Android
 * bridge result wrapping, swallowed-prompt races) are handled by viem's
 * battle-tested normalization code path.
 *
 *   publicClient  — reads (balances, allowance, receipts) via public RPC
 *   walletClient  — signs (approve, deposit, transfers) via window.ethereum
 */
import {
  type Account,
  type Address,
  type Hash,
  type TransactionReceipt,
  createPublicClient,
  createWalletClient,
  custom,
  fallback,
  http,
} from "viem";
import { mainnet } from "viem/chains";

/** Public mainnet reader. Uses a fallback transport across multiple endpoints
 * so a single-provider outage never blocks reads. No wallet dependency.
 *
 * Endpoint selection (as of 2026-04):
 *   - Brave Wallet's mainnet RPC is listed FIRST. Brave users are the
 *     primary audience for this dApp, their Shields-protected browser
 *     treats this domain as first-party infra (never blocked as a tracker),
 *     and it's unauthenticated + CORS-enabled.
 *   - Rest of the list is all-anonymous, CORS-enabled, verified returning
 *     for `eth_blockNumber`.
 *   - Dropped: cloudflare-eth.com (returns -32046 "Cannot fulfill request"
 *     for anonymous calls) and rpc.ankr.com/eth (now demands an API key).
 *
 * `rank: true` makes viem health-check these periodically and route to the
 * fastest responder — if Brave's endpoint degrades, traffic rotates to
 * LlamaRPC / publicnode automatically without a redeploy. */
export const publicClient = createPublicClient({
  chain: mainnet,
  transport: fallback(
    [
      http("https://ethereum-mainnet.wallet.brave.com/"),
      http("https://eth.llamarpc.com"),
      http("https://ethereum-rpc.publicnode.com"),
      http("https://eth-mainnet.public.blastapi.io"),
      http("https://eth.merkle.io"),
      http("https://rpc.flashbots.net"),
    ],
    { rank: true },
  ),
});

type WindowEthereum = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isBraveWallet?: boolean;
};

function getEthereumProvider(): WindowEthereum | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: WindowEthereum }).ethereum;
  return eth ?? null;
}

/** Wallet-bound client for signing. Returns null if no injected provider.
 * NOTE: we intentionally do NOT pin `chain: mainnet` on the client. Mobile
 * Brave sometimes reports chain ID 0 during boot — viem would then throw
 * "current chain of the wallet (ID: 0)" on every sendTransaction. By leaving
 * chain unset, viem trusts whatever chain the wallet is on. The user is
 * already on Ethereum mainnet (that's where their UNI lives). */
export function getWalletClient() {
  const eth = getEthereumProvider();
  if (!eth) return null;
  return createWalletClient({
    transport: custom(eth),
  });
}

/** Prompt the wallet for accounts — viem handles the response normalization. */
export async function requestWalletAddress(): Promise<Address | null> {
  const client = getWalletClient();
  if (!client) return null;
  const [address] = await client.requestAddresses();
  return address ?? null;
}

/** Send a signed transaction. viem returns a properly typed 0x-prefixed Hash
 * regardless of whether the mobile wallet returned a string, object, or
 * JSON-RPC-wrapped response. Throws a typed error on failure. */
export async function sendTransaction(params: {
  account: Address;
  to: Address;
  data?: `0x${string}`;
  value?: bigint;
}): Promise<Hash> {
  const client = getWalletClient();
  if (!client) throw new Error("No Ethereum wallet connected");
  return client.sendTransaction({
    account: params.account,
    to: params.to,
    data: params.data,
    value: params.value,
  } as Parameters<typeof client.sendTransaction>[0]);
}

/** Wait for a tx to mine. Uses the public client (not the wallet) so mobile
 * Brave's read-RPC limitations don't block us. */
export async function waitForReceipt(hash: Hash, timeoutMs = 180_000): Promise<TransactionReceipt> {
  return publicClient.waitForTransactionReceipt({
    hash,
    timeout: timeoutMs,
    pollingInterval: 3_000,
  });
}

/** Read native ETH balance via public RPC. */
export async function readEthBalance(address: Address): Promise<bigint> {
  return publicClient.getBalance({ address });
}

/** Low-level eth_call through the public client — used for ERC-20 reads. */
export async function ethCall(params: {
  to: Address;
  data: `0x${string}`;
}): Promise<`0x${string}`> {
  const result = await publicClient.call({ to: params.to, data: params.data });
  return (result.data ?? "0x") as `0x${string}`;
}

/** Helper: format a big-decimal hex result. Returns "0.0000" for 0. */
export function formatWei(value: bigint, decimals: number, precision = 4): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  const fractionStr = fraction.toString().padStart(decimals, "0").slice(0, precision);
  return `${whole.toString()}.${fractionStr}`;
}

/** When a mobile wallet signs a tx but drops the hash on the way back to the
 * dApp (viem returns [] / null), we can recover the hash by asking Etherscan
 * for the latest tx from the user's address to a specific contract. The
 * signed tx is typically broadcast within 1-3 s, so a few polls find it. */
export async function findLatestUserTxTo(
  userAddress: string,
  toContract: string,
  options: { timeoutMs?: number; pollMs?: number } = {},
): Promise<Hash | null> {
  const timeoutMs = options.timeoutMs ?? 45_000;
  const pollMs = options.pollMs ?? 3_000;
  const deadline = Date.now() + timeoutMs;
  const user = userAddress.toLowerCase();
  const target = toContract.toLowerCase();
  const API_KEY = "***REMOVED-ETHERSCAN-KEY***"; // shared free-tier key already used by backend

  while (Date.now() < deadline) {
    try {
      // Etherscan migrated to v2 API (April 2026) — the v1 endpoint now
      // returns "NOTOK — switch to v2" for every call. v2 requires chainid.
      const url =
        `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist` +
        `&address=${user}&sort=desc&page=1&offset=5&apikey=${API_KEY}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5_000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json?.status === "1" && Array.isArray(json.result)) {
          // Find the newest tx targeting the helper contract
          const match = json.result.find(
            (tx: { to?: string; hash?: string; timeStamp?: string }) =>
              typeof tx.to === "string" &&
              tx.to.toLowerCase() === target &&
              typeof tx.hash === "string" &&
              /^0x[a-fA-F0-9]{64}$/.test(tx.hash),
          );
          if (match?.hash) return match.hash as Hash;
        }
      }
    } catch {
      // network/CORS — try again
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return null;
}

/**
 * RPC-based tx-hash recovery for mobile — runs entirely against the public
 * Ethereum RPCs we already use for reads (Cloudflare, LlamaRPC, Ankr,
 * publicnode). This path is critical on mobile Brave because Brave Shields
 * blocks `api.etherscan.io` by default (it's on the tracker list), which
 * silently breaks `findLatestUserTxTo`. The RPC endpoints are infrastructure,
 * not trackers, so they're always reachable.
 *
 * Algorithm:
 *   1. Caller captured `expectedNonce` (getTransactionCount at "latest") BEFORE
 *      calling sendTransaction.
 *   2. Poll `getTransactionCount(user, "pending")`. When it > expectedNonce,
 *      the wallet has broadcast the tx to the mempool.
 *   3. Scan the last N blocks for a tx matching (from=user, nonce=expected,
 *      to=toContract). Returns its hash.
 *
 * Works whether or not Etherscan is reachable.
 */
export async function findTxByNonce(
  userAddress: string,
  expectedNonce: number,
  toContract: string,
  options: { timeoutMs?: number; pollMs?: number; scanBlocks?: number } = {},
): Promise<Hash | null> {
  const timeoutMs = options.timeoutMs ?? 180_000;
  const pollMs = options.pollMs ?? 4_000;
  const scanBlocks = options.scanBlocks ?? 20;
  const deadline = Date.now() + timeoutMs;
  const user = userAddress.toLowerCase() as `0x${string}`;
  const target = toContract.toLowerCase();

  // Phase 1: wait for the user's pending nonce to advance — this is the
  // definitive signal that the wallet broadcast the tx.
  while (Date.now() < deadline) {
    try {
      const pendingNonce = await publicClient.getTransactionCount({
        address: user as `0x${string}`,
        blockTag: "pending",
      });
      if (pendingNonce > expectedNonce) break;
    } catch {
      // transient RPC error — fallback transport will retry on next poll
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  if (Date.now() >= deadline) return null;

  // Phase 2: scan recent blocks. We check the last `scanBlocks` confirmed
  // blocks AND the pending block. On average the tx lands in 1-2 confirmed
  // blocks after broadcast, so this almost always finds it in one pass.
  while (Date.now() < deadline) {
    try {
      const latest = await publicClient.getBlockNumber();
      const blockTags = ["pending" as const];
      const block = async (tag: "pending") =>
        publicClient.getBlock({ blockTag: tag, includeTransactions: true });
      const numbered = async (n: bigint) =>
        publicClient.getBlock({ blockNumber: n, includeTransactions: true });
      // Newest blocks first — pending, then latest, latest-1, ...
      for (const tag of blockTags) {
        try {
          const b = await block(tag);
          for (const tx of b.transactions) {
            if (typeof tx === "string") continue;
            if (
              tx.from?.toLowerCase() === user &&
              Number(tx.nonce) === expectedNonce &&
              typeof tx.to === "string" &&
              tx.to.toLowerCase() === target
            ) {
              return tx.hash as Hash;
            }
          }
        } catch {
          // Some RPCs reject blockTag="pending". Skip and fall through to numbered.
        }
      }
      for (let i = 0; i < scanBlocks; i++) {
        const bn = latest - BigInt(i);
        if (bn < 0n) break;
        try {
          const b = await numbered(bn);
          for (const tx of b.transactions) {
            if (typeof tx === "string") continue;
            if (
              tx.from?.toLowerCase() === user &&
              Number(tx.nonce) === expectedNonce &&
              typeof tx.to === "string" &&
              tx.to.toLowerCase() === target
            ) {
              return tx.hash as Hash;
            }
          }
        } catch {
          // transient RPC error on this block — try next
        }
      }
    } catch {
      // outer error — retry after pollMs
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return null;
}

/** Read the user's current transaction count at the "latest" block. Caller
 *  snapshots this BEFORE sending so `findTxByNonce` knows what to look for. */
export async function readCurrentNonce(userAddress: string): Promise<number> {
  return publicClient.getTransactionCount({
    address: userAddress as `0x${string}`,
    blockTag: "latest",
  });
}

/** The ckERC-20 helper's `deposit(address,uint256,bytes32)` selector.
 *  Exported so the frontend can detect when a user has pasted an approve tx
 *  hash by mistake (approve selector is `0x095ea7b3`). */
export const CKERC20_DEPOSIT_SELECTOR = "0x26b3293f";
export const ERC20_APPROVE_SELECTOR = "0x095ea7b3";

/** Verify that a given tx hash actually points to a deposit() call on the
 *  ckERC-20 helper contract. Backstops the backend's deep verification with
 *  a client-side pre-flight so we can show a specific "you pasted the approve
 *  tx, not the deposit" error BEFORE the user submits anything. */
export async function verifyHashIsDeposit(
  txHash: string,
  expectedTo: string,
): Promise<
  | { ok: true }
  | { ok: false; code: "not_found" | "wrong_to" | "approve_tx" | "wrong_selector" | "rpc_error"; detail: string }
> {
  try {
    const tx = await publicClient.getTransaction({ hash: txHash as Hash });
    if (!tx) return { ok: false, code: "not_found", detail: "Transaction not found on Ethereum mainnet." };
    const actualTo = (tx.to ?? "").toLowerCase();
    const expected = expectedTo.toLowerCase();
    const input = (tx.input ?? "0x").toLowerCase();

    // The commonest UX failure: user pasted the *approve* tx they did first,
    // not the follow-up deposit. Detect that specifically so we can explain.
    if (input.startsWith(ERC20_APPROVE_SELECTOR)) {
      return {
        ok: false,
        code: "approve_tx",
        detail:
          "This is the UNI approve transaction (the first one your wallet signed). The deposit is the NEXT transaction — check your wallet's activity tab for one sent to the Banking.Brave bridge contract.",
      };
    }
    if (actualTo !== expected) {
      return {
        ok: false,
        code: "wrong_to",
        detail: `Transaction is to ${actualTo || "(none)"}, not the bridge contract ${expected}. Did you paste the wrong hash?`,
      };
    }
    if (!input.startsWith(CKERC20_DEPOSIT_SELECTOR)) {
      return {
        ok: false,
        code: "wrong_selector",
        detail: `Transaction to the bridge doesn't look like a deposit call (selector ${input.slice(0, 10)}). Double-check the hash.`,
      };
    }
    return { ok: true };
  } catch (err) {
    // Public RPCs flaky? Don't block the user on our own health — let the
    // backend make the final call. Surface the error for debugging.
    return {
      ok: false,
      code: "rpc_error",
      detail: `Couldn't reach Ethereum RPC to pre-check (${err instanceof Error ? err.message : String(err)}). Submitting anyway — the backend will verify.`,
    };
  }
}

export type { Address, Hash };
export { mainnet };

// Silence unused type export warning
export type _UnusedAccount = Account;
