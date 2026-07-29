import { useInternetIdentity } from "./auth";
import {
  ethCall,
  findLatestUserTxTo,
  findTxByNonce,
  getWalletClient,
  mainnet,
  publicClient,
  readCurrentNonce,
  verifyHashIsDeposit,
  type Hash,
} from "./lib/eth";
import {
  encodeCkErc20Deposit,
  encodeERC20Allowance,
  encodeERC20Approve,
  encodeERC20Transfer,
  extractTxHash,
  parseDecimalToBigInt,
  principalToBytes32,
} from "./lib/erc20";
import { Principal } from "@icp-sdk/core/principal";
import {
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PhaseAwaitingDeposit } from "./components/phases/PhaseAwaitingDeposit";
import { PhaseError } from "./components/phases/PhaseError";
import { PhaseEthMonitoring } from "./components/phases/PhaseEthMonitoring";
import { PhaseIdle } from "./components/phases/PhaseIdle";
import { PhaseReleasing } from "./components/phases/PhaseReleasing";
import { PhaseSuccess } from "./components/phases/PhaseSuccess";
import { PhaseWalletConfirming } from "./components/phases/PhaseWalletConfirming";
import { ConnectWalletModal } from "./components/ConnectWalletModal";
import { LoginOverlay } from "./components/LoginOverlay";
import { HowItWorksStrip } from "./components/HowItWorksStrip";
import { NavBar } from "./components/NavBar";
import { RefineryShell } from "./components/RefineryShell";
import { ProfileModal } from "./components/ProfileModal";
import { TransferModal } from "./components/TransferModal";
import { UnclaimedDepositsBanner } from "./components/UnclaimedDepositsBanner";
import { WalletSection } from "./components/WalletSection";
import { TransactionTimeline } from "./components/TransactionTimeline";
import { useBackendActor } from "./hooks/useBackendActor";
import { safeBalance } from "./lib/format";
import {
  autoFinalizeUNIDeposit,
  directSubmitUNIDeposit,
  icrc1TransferFromCaller,
  useDirectCkUNITreasuryBalance,
  useDirectSGLDTTreasuryBalance,
  useGetTreasuryWalletInfo,
  useIsAdmin,
  useMyUNIDeposits,
  usePublicCkUNITreasuryBalance,
  usePublicTreasuryBalance,
  useRefreshTreasuryBalances,
  useRetryUNIDepositPayout,
  useUserSGLDTBalance,
} from "./hooks/useQueries";
import { ThemeToggle } from "./components/ThemeToggle";
import { AdminPage } from "./pages/AdminPage";
import { BankingBraveHome } from "./pages/BankingBraveHome";
import { MinegoldBraveSoon } from "./pages/MinegoldBraveSoon";
import { TransactionHistoryPage } from "./pages/TransactionHistoryPage";

/** Display a balance string safely — returns "0.0000" for null, undefined, NaN, empty string, or "NaN" */


// UNI ERC-20 contract on Ethereum mainnet
const UNI_CONTRACT_ADDRESS = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
const CKUNI_LEDGER_CANISTER_ID = "ilzky-ayaaa-aaaar-qahha-cai";
// DFINITY ckERC-20 helper contract on Ethereum — the shared entry point for all ckERC-20
// deposits. Users approve UNI to this contract, then call its deposit() method which
// pulls the UNI and triggers the ckERC-20 minter (sv3dd-oaaaa-aaaar-qacoa-cai) to mint
// ckUNI to the specified ICP principal.
const CKERC20_HELPER_CONTRACT = "0x6abDA0438307733FC299e9C229FD3cc074bD8cC0";
// Treasury principal — every deposit credits ckUNI to this principal on ICP.
const TREASURY_PRINCIPAL = "c626g-iyaaa-aaaau-agpoa-cai";

// biome-ignore lint/correctness/noUnusedVariables: kept for reference
interface User {
  principal: string;
  name: string;
  identityType: string;
  identity?: unknown;
}

interface EthProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isBraveWallet?: boolean;
}

interface EthWindow extends EthProvider {
  providers?: EthProvider[];
}

type MiningPhase =
  | "idle"
  | "awaiting_deposit" // Legacy fallback: manual deposit flow
  | "wallet_confirming" // Phase 1: waiting for wallet to sign the transaction
  | "eth_monitoring" // Phase 2: watching Etherscan for on-chain confirmation
  | "ckuni_minting" // Phase 3: polling until ckUNI mint is confirmed on ICP
  | "releasing_sgldt" // Phase 4: sGLDT being released to user's ICP account
  | "success"
  | "error";


// Hex calldata encoders + tx-hash extraction live in ./lib/erc20 — see there.

/** Validate that a value is a well-formed hex string (e.g. "0x1a2b") */
function isValidHex(val: unknown): val is string {
  return typeof val === "string" && /^0x[0-9a-fA-F]+$/i.test(val);
}

/** Poll eth_getTransactionReceipt until mined, failed, or timeout.
 *  Returns "confirmed" | "failed" | "timeout" | "dropped" */
async function pollReceipt(
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

const isMobile =
  /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
// iOS Brave regular tabs do NOT inject window.ethereum because Apple does
// not allow wallet browser extensions. The only in-browser path on iOS is
// to open the dApp inside Brave Wallet's own in-app browser.
const isIOS =
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
const PUBLIC_ETH_RPC_ENDPOINTS = [
  "https://ethereum-mainnet.wallet.brave.com/",
  "https://eth.llamarpc.com",
  "https://ethereum-rpc.publicnode.com",
  "https://eth-mainnet.public.blastapi.io",
];

/** Make a JSON-RPC call against public RPC endpoints, returning the first
 * valid hex result. Used as a fallback when window.ethereum can't serve reads. */
async function publicRpcCall(method: string, params: unknown[]): Promise<string | null> {
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
function format18(wei: bigint): string {
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
type InjectedProvider = {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
  isBraveWallet?: boolean;
};
function getInjected(): InjectedProvider | null {
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
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T | null> {
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
async function readHexViaWallet(method: string, params: unknown[], label: string): Promise<string | null> {
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

/** Safe BigInt hex parse. Returns null if the string isn't parseable. */
function parseHexBigInt(hex: string): bigint | null {
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
type RaceOutcome = "ok" | "null" | "err";
type BalanceDiagnostic<T> = {
  value: T | null;
  source: string | null;
  outcomes: Record<string, RaceOutcome>;
};
async function firstNonNullWithDiag<T>(
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
async function estimateGasOrFallback(
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
async function fetchEthBalanceRaw(address: string): Promise<BalanceDiagnostic<string>> {
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
async function fetchUniBalanceRaw(address: string): Promise<BalanceDiagnostic<string>> {
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

export default function App() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const {
    identity,
    login: iiLogin,
    clear: iiClear,
    isLoggingIn: iiIsLoggingIn,
  } = useInternetIdentity();

  // Derive user from II context identity
  const user =
    identity && !identity.getPrincipal().isAnonymous()
      ? {
          principal: identity.getPrincipal().toText(),
          name: "ICP_Pioneer",
          identityType: "Internet Identity",
          identity,
        }
      : null;
  const isLoggingIn = iiIsLoggingIn;

  const [ethAddress, setEthAddress] = useState<string | null>(null);
  const [uniAmount, setUniAmount] = useState("");
  const [phase, setPhase] = useState<MiningPhase>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [sgldtReleased, setSgldtReleased] = useState<string | null>(null);
  const [uniBalance, setUniBalance] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [walletConnectionError, setWalletConnectionError] = useState<
    string | null
  >(null);
  // Modal closes itself when ethAddress flips truthy — see the open prop
  // passed to <ConnectWalletModal /> near the bottom of the tree.
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [liveRate, setLiveRate] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // Banking.Brave landing: default view on fresh load. Clicking the
  // minegold.defi card here opens the cross-chain refinery (this dapp).
  // Three top-level views: "home" (Banking.Brave landing), "uni" (live dApp),
  // "brave-soon" (Minegold.Brave preview). Persisted so reloads don't bounce
  // users out of a flow they were mid-way through.
  type TopView = "home" | "uni" | "brave-soon";
  const [topView, setTopView] = useState<TopView>(() => {
    try {
      const v = localStorage.getItem("banking_brave_view");
      if (v === "uni" || v === "brave-soon" || v === "home") return v as TopView;
      // Back-compat with the older "banking_brave_entered_minegold" key.
      return localStorage.getItem("banking_brave_entered_minegold") === "1" ? "uni" : "home";
    } catch { return "home" }
  });
  const setTopViewPersisted = (v: TopView) => {
    setTopView(v);
    try { localStorage.setItem("banking_brave_view", v); } catch { /* noop */ }
  };
  const enterMinegoldUni = () => setTopViewPersisted("uni");
  const enterMinegoldBrave = () => setTopViewPersisted("brave-soon");
  const backToBankingBrave = () => setTopViewPersisted("home");
  const [showProfile, setShowProfile] = useState(false);
  const [showTreasury, setShowTreasury] = useState(false);
  const [actorTimedOut, setActorTimedOut] = useState(false);
  const [copiedPrincipal, setCopiedPrincipal] = useState(false);
  const [copiedEthAddress, setCopiedEthAddress] = useState(false);
  const [uniPrice, setUniPrice] = useState<number | null>(null);
  const [sgldtPrice, setSgldtPrice] = useState<number | null>(null);
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const abortRef = useRef(false);
  const treasuryPanelRef = useRef<HTMLDivElement>(null);
  // Track the deposit request ID so the error-phase retry button can call resetMiningPhase.
  // Persisted to localStorage so polling resumes automatically on page refresh.
  // Keys are scoped by principal to prevent cross-user bleed on shared devices.
  const _principalSlug = user?.principal.slice(0, 16) ?? "";
  const DEPOSIT_ID_KEY = `minegold_deposit_id_${_principalSlug}`;
  // NOTE: starts null and is HYDRATED from localStorage in an effect once the
  // II identity resolves — reading here in the initializer ran before `user`
  // existed, so the key was `minegold_deposit_id_` (empty slug) and stored
  // deposits under the real principal key were never loaded. That race is why
  // resume-after-refresh only worked when auth happened to win the first render.
  const [depositRequestId, setDepositRequestIdState] = useState<bigint | null>(null);
  // Wrapper that keeps localStorage in sync with state
  const setDepositRequestId = (id: bigint | null) => {
    setDepositRequestIdState(id);
    try {
      if (id !== null) {
        localStorage.setItem(DEPOSIT_ID_KEY, id.toString());
      } else {
        localStorage.removeItem(DEPOSIT_ID_KEY);
      }
    } catch {
      // localStorage may be unavailable
    }
  };
  // Auto-polling state: tracks the attempt count shown below the mining animation
  const [pollAttempt, setPollAttempt] = useState(0);
  // ── Persistent mining timeline ─────────────────────────────────────────
  // Visible step tracker during the mining flow — persisted to localStorage
  // with per-step timestamps so it survives tab reloads / mobile tab kills.
  // Users can reopen the timeline to see exactly where a flow got stuck,
  // which cuts remote-debugging in half (we no longer have to ask "what was
  // the last thing you saw?").
  type MiningStep = {
    id: string;
    label: string;
    status: "pending" | "active" | "done" | "error";
    detail?: string;
    startedAt: number;
    updatedAt: number;
  };
  const MINING_STEPS_KEY = `minegold_steps_${_principalSlug}`;
  const MINING_STEPS_TTL_MS = 24 * 60 * 60_000; // drop timelines older than 24h

  // Hydrated from localStorage after auth resolves — see the hydration effect
  // near the TX_HASH_KEY block.
  const [miningSteps, setMiningSteps] = useState<MiningStep[]>([]);
  const persistMiningSteps = useCallback((next: MiningStep[]) => {
    try {
      if (next.length === 0) localStorage.removeItem(MINING_STEPS_KEY);
      else localStorage.setItem(MINING_STEPS_KEY, JSON.stringify(next));
    } catch { /* localStorage unavailable */ }
  }, [MINING_STEPS_KEY]);

  const updateStep = useCallback(
    (id: string, label: string, status: "pending" | "active" | "done" | "error", detail?: string) => {
      setMiningSteps((prev) => {
        const now = Date.now();
        const existing = prev.find((s) => s.id === id);
        let next: MiningStep[];
        if (existing) {
          next = prev.map((s) =>
            s.id === id ? { ...s, label, status, detail, updatedAt: now } : s,
          );
        } else {
          next = [...prev, { id, label, status, detail, startedAt: now, updatedAt: now }];
        }
        persistMiningSteps(next);
        return next;
      });
    },
    [persistMiningSteps],
  );
  const resetSteps = useCallback(() => {
    setMiningSteps([]);
    persistMiningSteps([]);
  }, [persistMiningSteps]);
  // Interval ref for the 3-second auto-polling loop
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  // Guard ref: prevents stopWithSuccess / stopWithError from firing more than once
  // per swap session (extra ticks can fire after clearInterval due to async gaps)
  const pollingCompletedRef = useRef(false);
  // Cleanup fn for the visibilitychange/focus listeners attached inside
  // startAutoPolling. Set when polling starts, called when it stops.
  const visibilityCleanupRef = useRef<(() => void) | null>(null);
  // Stores the specific error message from the last payout attempt
  const [retryErrorMsg, setRetryErrorMsg] = useState<string | null>(null);

  /** Stop any running poll interval (used in cancel/logout flows) */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current !== null) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (visibilityCleanupRef.current) {
      visibilityCleanupRef.current();
      visibilityCleanupRef.current = null;
    }
    pollingCompletedRef.current = false;
    setBridgeProgress(0);
  }, []);

  // Polling deadline — 10 minutes of wall-clock time. Mobile browsers throttle
  // setInterval to ~1Hz after 30s of background tab, then suspend entirely
  // after a few minutes — so the old 40 × 3s budget ran out in under 2 real
  // minutes for any mobile user who returned from the wallet app after signing.
  // 10 minutes gives plenty of headroom AND matches the backend sweeper
  // (runs every 30s) so even a throttled tab will catch the #paid status
  // on its next tick.
  const POLL_DEADLINE_MS = 10 * 60_000; // 10 minutes
  // Tick interval ramps up: faster at the start (user just signed — sGLDT
  // lands within 20-60s under normal conditions), slower after the first
  // minute (if it hasn't landed by then, extra polls won't help — save
  // canister cycles and network).
  const POLL_FAST_INTERVAL_MS = 3_000;
  const POLL_SLOW_INTERVAL_MS = 6_000;
  const POLL_SWITCH_AFTER_MS = 60_000; // first minute at fast cadence
  // Ref to current estimated gold so polling callbacks always read fresh value
  const estimatedGoldRef = useRef(0);
  // Tracks when the current polling session started, for the deadline check
  // + adaptive-interval logic. Survives visibility-change interval resets.
  const pollStartedAtRef = useRef<number>(0);

  // 0..1 progress derived from the deposit's backend status (see the tick in
  // startAutoPolling). Drives the mining animation + progress bar.
  const [bridgeProgress, setBridgeProgress] = useState(0);

  /** Stop any running poll and transition to a terminal failure state */
  const stopWithError = useCallback((message: string) => {
    if (pollingCompletedRef.current) return; // guard: only fire once per session
    pollingCompletedRef.current = true;
    if (pollingIntervalRef.current !== null) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (visibilityCleanupRef.current) {
      visibilityCleanupRef.current();
      visibilityCleanupRef.current = null;
    }
    setPhase("error");
    setStatusMsg(message);
  }, []);

  /** Stop any running poll and transition to the success state */
  // biome-ignore lint/correctness/useExhaustiveDependencies: setDepositRequestId is a stable wrapper function
  const stopWithSuccess = useCallback(async (sgldtAmount: string | null) => {
    if (pollingCompletedRef.current) return; // guard: only fire once per session
    pollingCompletedRef.current = true;
    if (pollingIntervalRef.current !== null) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (visibilityCleanupRef.current) {
      visibilityCleanupRef.current();
      visibilityCleanupRef.current = null;
    }
    setPhase("releasing_sgldt");
    setStatusMsg("sGLDT is being released to your ICP account...");
    await new Promise((r) => setTimeout(r, 1500));
    const released = sgldtAmount ?? estimatedGoldRef.current.toFixed(5);
    setSgldtReleased(released);
    setPhase("success");
    setStatusMsg("Transaction confirmed — sGLDT released!");
    toast.success(`⛏ Gold Mined! ${released} sGLDT released to your ICP account`);
    setDepositRequestId(null);
    setUniAmount("");
  }, []);

  /** Start the auto-polling interval for a given requestId.
   *
   *  DESIGN (2026-07): the frontend is a READ-ONLY observer. The backend
   *  sweeper is the single payout authority — every 30 s it verifies
   *  #pending deposits (Etherscan receipt + calldata) and pays #confirmed
   *  ones, with ledger-level dedup on the transfer. This loop just polls
   *  getDepositStatus (a free query call) and translates the deposit's
   *  status into UI state:
   *
   *    pending              → progress creeps 0.08 → 0.55 on elapsed time
   *    confirmed/processing → 0.8 / 0.92 (payout imminent)
   *    paid                 → success screen with the REAL e8s amount paid
   *    failed / not_found   → error state with recovery actions
   *
   *  Compared to the previous design this fires no update calls on a timer,
   *  needs no treasury-balance snapshot (whose global delta two concurrent
   *  deposits could satisfy for each other), and keeps working if the tab
   *  dies — the sweeper pays regardless, and the next visit resumes via the
   *  persisted deposit id. */
  const startAutoPolling = useCallback(
    (requestId: bigint) => {
      if (pollingIntervalRef.current !== null) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      // Reset the completion guard so a fresh polling session can run to completion
      pollingCompletedRef.current = false;
      setPollAttempt(0);
      pollStartedAtRef.current = Date.now();
      let attempt = 0;
      let currentInterval = POLL_FAST_INTERVAL_MS;

      const tick = async () => {
        // Stop immediately if user cancelled or component unmounted
        if (abortRef.current) {
          if (pollingIntervalRef.current !== null) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }

        attempt += 1;
        setPollAttempt(attempt);

        // Wall-clock deadline check (not attempt-count) so mobile tab
        // throttling doesn't make us "give up" too early on a session that
        // only fired a handful of ticks. The backend sweeper runs every 30s,
        // so 10 min of wall-clock is ~20 sweeper cycles — the sGLDT will
        // have been released long before we time out if it was going to be.
        const elapsed = Date.now() - pollStartedAtRef.current;
        if (elapsed > POLL_DEADLINE_MS) {
          stopWithError(
            `Your payout is taking longer than expected. Deposit ID ${requestId.toString()} is recorded on-chain — tap "Check now" below to recheck, or leave and come back later. Your sGLDT is safe.`,
          );
          return;
        }

        // Adaptive interval: first minute fast, then slow down to save
        // canister cycles. Switch happens on the next tick scheduling.
        if (elapsed >= POLL_SWITCH_AFTER_MS && currentInterval !== POLL_SLOW_INTERVAL_MS) {
          currentInterval = POLL_SLOW_INTERVAL_MS;
          if (pollingIntervalRef.current !== null) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = setInterval(tick, currentInterval);
          }
        }

        if (!actor) return; // actor not ready yet — keep waiting

        try {
          // READ-ONLY status poll. The backend sweeper is the single payout
          // authority (it verifies #pending deposits and pays #confirmed
          // ones every 30 s); the frontend just watches the deposit's status
          // via a free query call. This replaces the old design that (a)
          // fired retryUNIDepositPayout update calls on a timer and (b)
          // inferred bridge completion from a GLOBAL treasury balance delta —
          // which two concurrent deposits could satisfy for each other.
          const st = await (
            actor as unknown as {
              getDepositStatus: (id: bigint) => Promise<{
                status: string;
                txHash: string;
                sgldtPaid: bigint;
              }>;
            }
          ).getDepositStatus(requestId);

          switch (st.status) {
            case "paid": {
              setBridgeProgress(1);
              const paid = Number(st.sgldtPaid) / 1e8;
              await stopWithSuccess(paid > 0 ? paid.toFixed(5) : null);
              return;
            }
            case "failed": {
              stopWithError(
                `sGLDT release hit an error. Deposit ID ${requestId.toString()} is recorded — tap "Check now" to retry the payout, or contact support if it persists.`,
              );
              return;
            }
            case "not_found": {
              stopWithError(
                "This deposit is no longer recorded on the backend. If you signed a deposit, use “Finalize my deposit” to re-register it.",
              );
              return;
            }
            default: {
              // pending → waiting on Ethereum confirmations + sweeper verify
              // confirmed / processing → verified, payout imminent
              // Progress milestones drive the mining animation + bar. Within
              // "pending" we creep toward 0.55 on elapsed time (~12 confs is
              // 2-3 min) so the scene visibly advances between milestones.
              const el = Date.now() - pollStartedAtRef.current;
              const target =
                st.status === "processing"
                  ? 0.92
                  : st.status === "confirmed"
                    ? 0.8
                    : 0.08 + Math.min(0.47, (el / 180_000) * 0.47);
              setBridgeProgress((prev) => Math.max(prev, Math.min(1, target)));
            }
          }
        } catch (err) {
          // Query failed — transient network/actor issue. Keep polling
          // silently; we'll catch up on the next tick.
          console.warn("[mining] getDepositStatus poll failed:", err);
        }
      };

      // Fire immediately, then every fast-interval
      tick();
      pollingIntervalRef.current = setInterval(tick, currentInterval);

      // Mobile tab-return resume — when the tab regains visibility (user
      // just came back from wallet app), fire a tick IMMEDIATELY instead
      // of waiting for the next scheduled interval. iOS throttles the
      // interval to ~1Hz in background, so without this the user stares
      // at a hung UI for up to 6s even though their sGLDT is already
      // released. Listener lifetime is bound to the polling session —
      // removed in stopPolling / stopWithError / stopWithSuccess.
      const onVisibility = () => {
        if (document.visibilityState === "visible") {
          // Don't await — fire-and-forget so we don't block the handler
          void tick();
        }
      };
      document.addEventListener("visibilitychange", onVisibility);
      // Also listen to `focus` as a belt-and-suspenders path — some mobile
      // browsers fire one but not the other when returning from an external
      // app (Brave Wallet's in-app-browser-to-app switch is one such case).
      const onFocus = () => void tick();
      window.addEventListener("focus", onFocus);
      visibilityCleanupRef.current = () => {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("focus", onFocus);
      };
    },
    [actor, stopWithError, stopWithSuccess],
  );

  // Close treasury panel on outside click
  useEffect(() => {
    if (!showTreasury) return;
    const handler = (e: MouseEvent) => {
      if (
        treasuryPanelRef.current &&
        !treasuryPanelRef.current.contains(e.target as Node)
      ) {
        setShowTreasury(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTreasury]);

  // If the user is logged in but actor hasn't initialized after 10 seconds,
  // surface an error state so they're never stuck on "Connecting to canister..." forever.
  useEffect(() => {
    if (!user || actor) {
      setActorTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      if (!actor) setActorTimedOut(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [user, actor]);

  const [transferModal, setTransferModal] = useState<
    "eth" | "uni" | "sgldt" | null
  >(null);
  const [transferTo, setTransferTo] = useState("");
  const [transferAmt, setTransferAmt] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  // Public treasury balance (no auth required)
  // Prefer direct ledger queries (bypass backend cache), fall back to cached backend values
  const { data: treasuryBalanceRaw, isLoading: treasuryBalanceLoading } =
    usePublicTreasuryBalance();
  const { data: ckUNITreasuryRaw, isLoading: ckUNITreasuryLoading } =
    usePublicCkUNITreasuryBalance();

  // Direct on-chain queries — these bypass the backend cache entirely and
  // always reflect the real balance for 72fnc-ziaaa-aaaai-axk4q-cai
  const { data: directSGLDTBalance, isLoading: directSGLDTLoading } =
    useDirectSGLDTTreasuryBalance();
  const { data: directCkUNIBalance, isLoading: directCkUNILoading } =
    useDirectCkUNITreasuryBalance();

  // Use direct balance when available; fall back to backend-cached value
  // Note: check for !== undefined (not > BigInt(0)) so a genuine zero balance displays correctly
  const displaySGLDTBalance =
    directSGLDTBalance !== undefined && directSGLDTBalance !== null
      ? directSGLDTBalance
      : (treasuryBalanceRaw ?? BigInt(0));
  const displayCkUNIBalance =
    directCkUNIBalance !== undefined && directCkUNIBalance !== null
      ? directCkUNIBalance
      : (ckUNITreasuryRaw ?? BigInt(0));
  const displaySGLDTLoading = directSGLDTLoading && treasuryBalanceLoading;
  const displayCkUNILoading = directCkUNILoading && ckUNITreasuryLoading;

  // On mount, trigger a backend cache refresh so treasury balances show real values
  const { mutate: refreshTreasury } = useRefreshTreasuryBalances();
  useEffect(() => {
    refreshTreasury();
  }, [refreshTreasury]);

  // ETH-side UNI balance for the treasury deposit address — queried via a multi-endpoint
  // RPC fallback chain so it works for all visitors without a wallet connection
  const TREASURY_ETH_ADDRESS = "0x22582083361bf06579BbfFcC1138D3fc986B91FF";
  const [treasuryEthUniBalance, setTreasuryEthUniBalance] = useState<
    string | null
  >(null);
  const [treasuryEthUniLoading, setTreasuryEthUniLoading] = useState(true);
  // Flag: true when all RPC endpoints failed — show "—" instead of "0.0000"
  const [treasuryEthUniUnavailable, setTreasuryEthUniUnavailable] =
    useState(false);
  useEffect(() => {
    let cancelled = false;

    // Same ranking as PUBLIC_ETH_RPC_ENDPOINTS — Brave first (first-party
    // infra, never Shields-blocked), then the anonymous-friendly tier.
    const RPC_ENDPOINTS = [
      "https://ethereum-mainnet.wallet.brave.com/",
      "https://eth.llamarpc.com",
      "https://ethereum-rpc.publicnode.com",
      "https://eth-mainnet.public.blastapi.io",
    ];

    const fetchTreasuryUniBalance = async () => {
      // balanceOf(address) call data — address padded to 32 bytes (24 zero nibbles + 40 nibble address)
      const callData = `0x70a08231000000000000000000000000${TREASURY_ETH_ADDRESS.replace("0x", "").toLowerCase()}`;

      let successfulRead = false;

      // Try each public RPC endpoint in order with a 5-second per-endpoint timeout
      for (const endpoint of RPC_ENDPOINTS) {
        if (cancelled) return;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5_000);
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_call",
              params: [{ to: UNI_CONTRACT_ADDRESS, data: callData }, "latest"],
              id: 1,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (cancelled) return;
          if (!response.ok) continue;
          const json = await response.json();
          const hex: string = json?.result ?? "";
          // A valid 32-byte response is a non-empty hex string
          if (!isValidHex(hex) || hex === "0x") continue;
          const raw = BigInt(hex);
          successfulRead = true;
          if (!cancelled) {
            setTreasuryEthUniBalance((Number(raw) / 1e18).toFixed(4));
            setTreasuryEthUniLoading(false);
            setTreasuryEthUniUnavailable(false);
          }
          return;
        } catch {
          // Timeout, network error, or parse failure — try next endpoint
        }
      }

      // All endpoints exhausted
      if (!cancelled) {
        setTreasuryEthUniLoading(false);
        if (!successfulRead) {
          // All network calls failed — show unavailable indicator
          setTreasuryEthUniUnavailable(true);
          setTreasuryEthUniBalance(null);
        }
        // If successfulRead but never returned, it means every valid result was "0x"
        // which means genuine zero or malformed — show 0.0000
        if (successfulRead) {
          setTreasuryEthUniBalance("0.0000");
          setTreasuryEthUniUnavailable(false);
        }
      }
    };

    fetchTreasuryUniBalance();
    const id = setInterval(fetchTreasuryUniBalance, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // sGLDT balance via backend query
  const { data: sgldtBalanceRaw } = useUserSGLDTBalance(user?.principal);
  const sgldtBalance =
    sgldtBalanceRaw !== undefined
      ? (Number(sgldtBalanceRaw) / 1e8).toFixed(4)
      : null;
  const sgldtUsd =
    sgldtBalance && sgldtPrice
      ? (Number.parseFloat(sgldtBalance) * sgldtPrice).toFixed(2)
      : null;

  // Admin check — immediate local string comparison (synchronous) OR backend query.
  // The local check runs instantly on login so the admin button appears without waiting.
  const ADMIN_PRINCIPAL =
    "rc62u-qypnw-bbkkp-d56wk-tnzaq-vwhi2-cqqay-q56hw-gsqbp-6wegl-jae";
  const { data: isAdminData } = useIsAdmin();
  const isLocalAdmin = user?.principal === ADMIN_PRINCIPAL;
  const isAdmin = isLocalAdmin || !!isAdminData;

  // Unclaimed deposits recovery — surfaces any #confirmed deposits the user has
  // that weren't paid out (e.g. user closed the tab mid-flow).
  const userPrincipalObj = identity?.getPrincipal();
  const { data: myDeposits } = useMyUNIDeposits(userPrincipalObj);
  const retryPayout = useRetryUNIDepositPayout();
  const unclaimedDeposits = (myDeposits ?? []).filter((d: any) => {
    const statusKey = d?.status && typeof d.status === "object"
      ? Object.keys(d.status)[0]
      : "";
    return statusKey === "confirmed" || statusKey === "failed";
  });

  // Treasury wallet info — pre-fetched on mount so deposit address is ready before the user clicks Swap
  const FALLBACK_DEPOSIT_ADDRESS = CKERC20_HELPER_CONTRACT;
  const { data: treasuryWalletInfo } = useGetTreasuryWalletInfo();
  const depositAddress =
    treasuryWalletInfo?.depositAddress &&
    treasuryWalletInfo.depositAddress.length > 0
      ? treasuryWalletInfo.depositAddress
      : FALLBACK_DEPOSIT_ADDRESS;

  const [copiedDepositAddress, setCopiedDepositAddress] = useState(false);

  // ── Pending-deposit intent (mobile hash-loss recovery) ───────────────────
  // On mobile, the browser tab can be suspended — or killed outright — while
  // the user is signing in the wallet app. When that happens, the JS promise
  // from walletClient.sendTransaction() may never settle (suspended) or the
  // tab cold-reloads with no in-flight state (killed). Either way the hash is
  // lost and the deposit never reaches the backend.
  //
  // To survive both cases we write a "pending intent" to localStorage BEFORE
  // calling sendTransaction. If the promise never returns, or the tab is
  // killed and the user returns later, a mount-time hook reads this intent
  // and resumes Etherscan polling for the matching tx. The intent expires
  // after 30 min so a stale marker doesn't trap a future mining attempt.
  const PENDING_DEPOSIT_KEY = `minegold_pending_deposit_${_principalSlug}`;
  const PENDING_DEPOSIT_TTL_MS = 30 * 60_000;

  // Track the live Etherscan tx hash during monitoring — persisted so the link survives page reload
  const TX_HASH_KEY = `minegold_tx_hash_${_principalSlug}`;
  const [currentTxHash, setCurrentTxHashState] = useState<string | null>(null);
  const setCurrentTxHash = (hash: string | null) => {
    setCurrentTxHashState(hash);
    try {
      if (hash !== null) {
        localStorage.setItem(TX_HASH_KEY, hash);
      } else {
        localStorage.removeItem(TX_HASH_KEY);
      }
    } catch {
      // localStorage unavailable
    }
  };

  // ── Post-auth localStorage hydration ────────────────────────────────────
  // The persisted mining state (deposit id, tx hash, step timeline) is keyed
  // by principal, but II auth resolves asynchronously — so these reads MUST
  // happen after `user` is available, not in useState initializers (which run
  // on first render with an empty slug and therefore always miss).
  const hydratedForRef = useRef<string | null>(null);
  useEffect(() => {
    const slug = user?.principal.slice(0, 16) ?? "";
    if (!slug || hydratedForRef.current === slug) return;
    hydratedForRef.current = slug;
    try {
      const storedId = localStorage.getItem(`minegold_deposit_id_${slug}`);
      if (storedId) setDepositRequestIdState(BigInt(storedId));
    } catch { /* localStorage unavailable */ }
    try {
      const storedHash = localStorage.getItem(`minegold_tx_hash_${slug}`);
      if (storedHash) setCurrentTxHashState(storedHash);
    } catch { /* localStorage unavailable */ }
    try {
      const raw = localStorage.getItem(`minegold_steps_${slug}`);
      if (raw) {
        const parsed = JSON.parse(raw) as MiningStep[];
        if (Array.isArray(parsed)) {
          const newest = parsed.reduce((n, s) => Math.max(n, s.updatedAt ?? 0), 0);
          if (newest && Date.now() - newest > MINING_STEPS_TTL_MS) {
            localStorage.removeItem(`minegold_steps_${slug}`);
          } else {
            setMiningSteps(parsed);
          }
        }
      }
    } catch { /* localStorage unavailable */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  type PendingDepositIntent = {
    ethAddress: string;
    uniAmount: string;
    amountWei: string;
    depositAddress: string;
    startedAt: number;
    // Nonce captured right before the wallet was asked to sign. Lets the
    // mount-time resume hook locate the exact tx via RPC even when Etherscan
    // is unreachable (mobile Brave Shields).
    expectedNonce: number | null;
  };
  const writePendingDeposit = (intent: PendingDepositIntent) => {
    try { localStorage.setItem(PENDING_DEPOSIT_KEY, JSON.stringify(intent)); } catch { /* noop */ }
  };
  const readPendingDeposit = (): PendingDepositIntent | null => {
    try {
      const raw = localStorage.getItem(PENDING_DEPOSIT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PendingDepositIntent;
      if (!parsed?.ethAddress || !parsed?.depositAddress) return null;
      if (Date.now() - (parsed.startedAt ?? 0) > PENDING_DEPOSIT_TTL_MS) {
        localStorage.removeItem(PENDING_DEPOSIT_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  };
  const clearPendingDeposit = () => {
    try { localStorage.removeItem(PENDING_DEPOSIT_KEY); } catch { /* noop */ }
  };

  const copyDepositAddress = () => {
    const text = depositAddress;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedDepositAddress(true);
          setTimeout(() => setCopiedDepositAddress(false), 2000);
        })
        .catch(() => {
          const el = document.createElement("textarea");
          el.value = text;
          document.body.appendChild(el);
          el.select();
          document.execCommand("copy");
          document.body.removeChild(el);
          setCopiedDepositAddress(true);
          setTimeout(() => setCopiedDepositAddress(false), 2000);
        });
    } else {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedDepositAddress(true);
      setTimeout(() => setCopiedDepositAddress(false), 2000);
    }
  };

  /** Manual status check for eth_monitoring — kicks the backend's
   *  verify+payout path once. Same behavior as the auto-poll, but immediate;
   *  useful on mobile when the browser throttles the polling interval. */
  const checkPayoutNow = async () => {
    if (!actor || !depositRequestId) return;
    try {
      const result = await (
        actor as unknown as {
          retryUNIDepositPayout: (id: bigint) => Promise<string>;
        }
      ).retryUNIDepositPayout(depositRequestId);
      const raw = typeof result === "string" ? result : String(result ?? "");
      const s = raw.toLowerCase();
      if (s.includes("paid") || s.includes("success")) {
        const m =
          raw.match(/[:\s](\d+\.?\d*)\s*sgldt/i) ??
          raw.match(/paid[:\s]+(\d+\.?\d*)/i);
        await stopWithSuccess(m ? m[1] : null);
      } else if (s.includes("payout_failed:")) {
        const reason = raw.replace(/^.*payout_failed:\s*/i, "").trim();
        const isFunds =
          reason.toLowerCase().includes("insufficientfunds") ||
          reason.toLowerCase().includes("insufficient");
        stopWithError(
          isFunds
            ? "Refinery is out of sGLDT right now. Your deposit is recorded — try again in a few minutes, or contact support."
            : `Release failed: ${reason || "Unknown error"}`,
        );
      } else {
        toast.info(
          raw.trim().length > 0
            ? `Still processing: ${raw.trim()}`
            : "Still processing. The backend sweeper runs every 30s — sGLDT will appear automatically.",
        );
      }
    } catch (err) {
      toast.error(
        `Check failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const estimatedGold = (Number.parseFloat(uniAmount) || 0) * liveRate;
  // Keep the ref in sync so polling callbacks always read the current estimated amount
  estimatedGoldRef.current = estimatedGold;
  const isActive =
    phase === "awaiting_deposit" ||
    phase === "wallet_confirming" ||
    phase === "eth_monitoring" ||
    phase === "releasing_sgldt";

  // Per-token diagnostics + last-known source (for the collapsible panel).
  const [ethBalanceDiag, setEthBalanceDiag] = useState<BalanceDiagnostic<string> | null>(null);
  const [uniBalanceDiag, setUniBalanceDiag] = useState<BalanceDiagnostic<string> | null>(null);
  const [balanceRefreshing, setBalanceRefreshing] = useState(false);

  // Balance fetch — PARALLEL race of native-ETH paths only.
  //
  // Previously a SERIAL wallet → RPC fallback; this was the root cause of
  // "balance never loads on mobile" — on iOS Brave the wallet's injected
  // request can silently hang (response dropped but no rejection), blocking
  // the RPC fallback indefinitely.
  //
  // fetchEthBalanceRaw / fetchUniBalanceRaw (defined at module scope) race
  // both paths in parallel with 6s per-path hard timeouts. Whichever
  // returns first wins; if both fail we surface that plainly.
  const refreshBalances = useCallback(async (address: string) => {
    setBalanceRefreshing(true);
    const [ethDiag, uniDiag] = await Promise.all([
      fetchEthBalanceRaw(address),
      fetchUniBalanceRaw(address),
    ]);
    if (ethDiag.value !== null) setEthBalance(ethDiag.value);
    if (uniDiag.value !== null) setUniBalance(uniDiag.value);
    setEthBalanceDiag(ethDiag);
    setUniBalanceDiag(uniDiag);
    setWalletConnectionError(
      ethDiag.value === null && uniDiag.value === null
        ? "Can't read balance. Check your wallet is unlocked on Ethereum mainnet and your network allows reads to ethereum-mainnet.wallet.brave.com / eth.llamarpc.com."
        : null,
    );
    setBalanceRefreshing(false);
  }, []);

  const [priceWarning, setPriceWarning] = useState<string | null>(null);

  // Fetch live prices every 60 seconds
  useEffect(() => {
    let cancelled = false;
    const fetchPrices = async () => {
      try {
        // Fetch UNI + ETH from CoinGecko and sGLDT from the GeckoTerminal pool
        // on ICPSwap (sGLDT / ICP pair). Base token of that pool is sGLDT.
        const [cgRes, gtRes] = await Promise.all([
          fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=uniswap%2Cethereum&vs_currencies=usd",
          ),
          fetch(
            "https://api.geckoterminal.com/api/v2/networks/icp/pools/jedlb-haaaa-aaaar-qbrma-cai",
          ),
        ]);
        if (cancelled) return;

        let fetchedUniPrice: number | null = null;
        let fetchedSgldtPrice: number | null = null;
        let fetchedEthPrice: number | null = null;

        if (cgRes.ok) {
          const d = await cgRes.json();
          if (d?.uniswap?.usd) {
            fetchedUniPrice = Number(d.uniswap.usd);
            setUniPrice(fetchedUniPrice);
          }
          if (d?.ethereum?.usd) {
            fetchedEthPrice = Number(d.ethereum.usd);
            setEthPrice(fetchedEthPrice);
          }
        }

        if (gtRes.ok) {
          const gt = await gtRes.json();
          const basePrice = Number(gt?.data?.attributes?.base_token_price_usd);
          if (Number.isFinite(basePrice) && basePrice > 0) {
            fetchedSgldtPrice = basePrice;
            setSgldtPrice(fetchedSgldtPrice);
          }
        }

        if (fetchedUniPrice && fetchedSgldtPrice && fetchedSgldtPrice > 0) {
          setLiveRate(fetchedUniPrice / fetchedSgldtPrice);
          try {
            localStorage.setItem(
              "minegold_last_prices",
              JSON.stringify({
                uniPrice: fetchedUniPrice,
                sgldtPrice: fetchedSgldtPrice,
                ethPrice: fetchedEthPrice ?? 2500,
                timestamp: Date.now(),
              }),
            );
          } catch {
            // localStorage may be unavailable
          }
          setPriceWarning(null);
          return;
        }
      } catch {
        // fall through to cache/default
      }

      if (cancelled) return;

      // Live fetch failed — try localStorage cache
      try {
        const raw = localStorage.getItem("minegold_last_prices");
        if (raw) {
          const cached = JSON.parse(raw) as {
            uniPrice: number;
            sgldtPrice: number;
            ethPrice: number;
            timestamp: number;
          };
          if (cached.uniPrice > 0 && cached.sgldtPrice > 0) {
            setUniPrice(cached.uniPrice);
            setSgldtPrice(cached.sgldtPrice);
            setEthPrice(cached.ethPrice ?? 2500);
            setLiveRate(cached.uniPrice / cached.sgldtPrice);
            const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
            if (ageHours > 24) {
              setPriceWarning(
                "Using cached prices — live feed unavailable (>24h old)",
              );
            } else {
              setPriceWarning("Using cached prices — live feed unavailable");
            }
            return;
          }
        }
      } catch {
        // ignore
      }

      // No cache AND live fetch failed — we cannot sign an honest rate hint
      // from nothing. Leave prices null so downstream code disables the swap
      // button instead of silently sending a stale/guessed rate that would
      // either fall outside the canister's ±50% band (underpaying the user)
      // or cause the payout to settle at a stale on-chain rate.
      setPriceWarning(
        "Live exchange rate unavailable. Check your connection or wallet's content filters (Brave Shields blocks some price APIs) and retry.",
      );
    };
    fetchPrices();
    const id = setInterval(fetchPrices, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Refresh ETH + UNI balances every 60 seconds when wallet is connected
  useEffect(() => {
    if (!ethAddress) return;
    refreshBalances(ethAddress);
    const id = setInterval(() => refreshBalances(ethAddress), 60_000);
    return () => clearInterval(id);
  }, [ethAddress, refreshBalances]);

  const handleLogin = () => {
    iiLogin();
  };

  // On-screen diagnostics for Connect Wallet. Appended to as each step runs so
  // mobile users see exactly what's happening without opening a dev console.
  const [walletConnectLog, setWalletConnectLog] = useState<string[]>([]);
  const appendWalletLog = useCallback((line: string) => {
    console.log(`[connectWallet] ${line}`);
    setWalletConnectLog((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()} ${line}`]);
  }, []);

  // Silent probe: return an already-authorized account if the wallet is
  // already connected (no prompt). Used for both auto-connect on mount and
  // as a fallback when `eth_requestAccounts` returns nothing on mobile.
  const probeExistingAccount = useCallback(
    async (provider: EthProvider | undefined | null): Promise<string | null> => {
      if (!provider) return null;
      try {
        const result = (await provider.request({ method: "eth_accounts" })) as unknown;
        const addrRe = /^0x[a-fA-F0-9]{40}$/;
        if (Array.isArray(result)) {
          const first = result
            .map((a) => (typeof a === "string" ? a.trim() : ""))
            .find((a) => addrRe.test(a));
          if (first) return first;
        }
      } catch {
        // ignore
      }
      return null;
    },
    [],
  );

  // EIP-6963 provider discovery — reliable on Brave's in-app wallet browser
  // and on any EIP-6963-compliant wallet. The provider announces itself via
  // an event we can listen for. We stash the discovered provider for later
  // use by connectEthereumWallet.
  const eip6963ProviderRef = useRef<EthProvider | null>(null);
  useEffect(() => {
    const handleAnnounce = (e: Event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (e as any).detail;
      if (detail?.provider && !eip6963ProviderRef.current) {
        console.log("[eip6963] provider announced:", detail.info);
        eip6963ProviderRef.current = detail.provider as EthProvider;
      }
    };
    window.addEventListener("eip6963:announceProvider", handleAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnounce);
    };
  }, []);

  // Listen for the wallet's `accountsChanged` event — when the user approves
  // access in the wallet app (even if the original request call hung), this
  // fires with the new accounts and we can pick them up.
  useEffect(() => {
    const win = window as unknown as { ethereum?: EthWindow };
    const eth = win.ethereum;
    if (!eth) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyEth = eth as any;
    if (typeof anyEth.on !== "function") return;
    const handler = (accounts: unknown) => {
      if (Array.isArray(accounts) && accounts.length > 0 && typeof accounts[0] === "string") {
        const addr = accounts[0] as string;
        if (/^0x[a-fA-F0-9]{40}$/.test(addr)) {
          console.log("[accountsChanged] picked up", addr);
          setEthAddress(addr);
          refreshBalances(addr);
        }
      }
    };
    anyEth.on("accountsChanged", handler);
    return () => {
      if (typeof anyEth.removeListener === "function") {
        anyEth.removeListener("accountsChanged", handler);
      }
    };
  }, [refreshBalances]);

  // Auto-connect on page load if the wallet was previously authorized.
  useEffect(() => {
    if (ethAddress) return;
    const win = window as unknown as { ethereum?: EthWindow };
    const eth = win.ethereum;
    if (!eth) return;
    let cancelled = false;
    (async () => {
      // Small delay so the mobile provider is fully injected
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 200));
        if ((window as unknown as { ethereum?: EthWindow }).ethereum) break;
      }
      if (cancelled) return;
      const currentEth = (window as unknown as { ethereum?: EthWindow }).ethereum;
      if (!currentEth) return;
      let provider: EthProvider = currentEth;
      if (currentEth.providers && currentEth.providers.length > 0) {
        const brave = currentEth.providers.find((p) => p.isBraveWallet === true);
        if (brave) provider = brave;
      }
      const wasPending =
        (() => { try { return localStorage.getItem("bb_wallet_connect_pending") === "1"; } catch { return false; } })();
      const probeTries = wasPending ? 15 : 3;
      for (let i = 0; i < probeTries && !cancelled; i++) {
        const existing = await probeExistingAccount(provider);
        if (cancelled) return;
        if (existing) {
          console.log("[auto-connect] found existing account:", existing);
          try { localStorage.removeItem("bb_wallet_connect_pending"); } catch { /* noop */ }
          setEthAddress(existing);
          refreshBalances(existing);
          return;
        }
        if (i < probeTries - 1) await new Promise((r) => setTimeout(r, 2000));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ethAddress, probeExistingAccount, refreshBalances]);

  const connectEthereumWallet = async () => {
    setWalletConnectLog([]);
    appendWalletLog("Connect clicked");
    try { localStorage.setItem("bb_wallet_connect_pending", "1"); } catch { /* noop */ }
    const win = window as unknown as {
      ethereum?: EthWindow;
      braveEthereum?: EthProvider;
    };
    let eth = win.ethereum;
    // Diagnostic: what's present on the window?
    appendWalletLog(
      `Probes: window.ethereum=${!!win.ethereum} braveEthereum=${!!win.braveEthereum}`,
    );
    if (eth) {
      appendWalletLog(
        `ethereum flags: isBraveWallet=${!!eth.isBraveWallet} providers=${
          eth.providers ? eth.providers.length : 0
        }`,
      );
    }
    if (!eth) {
      // Mobile may inject window.ethereum slightly after page load — poll for up to 2s
      if (isMobile) {
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 200));
          eth = (window as unknown as { ethereum?: EthWindow }).ethereum;
          if (eth) break;
        }
      }
      if (!eth) {
        try { localStorage.removeItem("bb_wallet_connect_pending"); } catch { /* noop */ }
        if (isIOS) {
          // iOS Safari/Brave do not inject window.ethereum in regular tabs.
          // The Brave Wallet app has its own in-app browser — direct the user there.
          setWalletConnectionError(
            "iOS doesn't inject Web3 into regular browser tabs. Open the Brave Wallet app, tap the compass/browser tab, and navigate to this page from inside it. (MetaMask and Trust Wallet also have in-app browsers that work.)",
          );
        } else if (isMobile) {
          setWalletConnectionError(
            "No Web3 wallet detected. Open this page from inside your wallet app's built-in browser (Brave Wallet, MetaMask, Trust, Rainbow all have one).",
          );
        } else {
          setWalletConnectionError(
            "Please install Brave Wallet, MetaMask, or a compatible Web3 wallet browser extension, then refresh.",
          );
        }
        return;
      }
    }
    // Use the raw provider directly — on mobile Brave, viem's requestAddresses
    // triggers auxiliary eth_chainId calls that can hang on the injected-bridge
    // side. A plain eth_requestAccounts is the most compatible path. If the
    // user has multiple wallets injected, prefer the Brave sub-provider.
    let provider: EthProvider = eth;
    if (eth.providers && eth.providers.length > 0) {
      const brave = eth.providers.find((p) => p.isBraveWallet === true);
      if (brave) provider = brave;
    } else if (eth.isBraveWallet === true) {
      provider = eth;
    }
    try {
      // Per current mobile-Brave research (2025): wallet_requestPermissions
      // silently no-ops in mobile Brave's regular tabs. Use eth_requestAccounts
      // as the primary method — it's the one that CAN work in the in-app
      // Brave Wallet browser, and the only method MetaMask-mobile / Rainbow /
      // Trust Wallet consistently implement.
      appendWalletLog(
        `Calling eth_requestAccounts${provider.isBraveWallet ? " (Brave sub-provider)" : ""}`,
      );

      // Race eth_requestAccounts against a parallel eth_accounts poll. On
      // mobile Brave, the wallet app opens the signer UI, the user approves,
      // but the eth_requestAccounts promise sometimes never resolves — the
      // dApp then hangs forever. By polling read-only eth_accounts alongside,
      // whichever returns the address first wins. This is the same pattern
      // we use during tx signing.
      const requestPromise = provider
        .request({ method: "eth_requestAccounts" })
        .catch((err) => {
          // User rejection propagates; other errors we absorb and let polling
          // do its work.
          const code = (err as { code?: number })?.code;
          if (code === 4001) throw err;
          appendWalletLog(`eth_requestAccounts rejected: ${String(err).slice(0, 80)}`);
          return null as unknown;
        });

      // Parallel poll — starts after 3s (give the wallet a head start on happy path)
      const pollPromise = (async () => {
        await new Promise((r) => setTimeout(r, isMobile ? 3000 : 8000));
        for (let i = 0; i < 12; i++) {
          const addr = await probeExistingAccount(provider);
          if (addr) {
            appendWalletLog(`Parallel poll found addr (attempt ${i + 1})`);
            return [addr] as unknown;
          }
          await new Promise((r) => setTimeout(r, 2500));
        }
        return null as unknown;
      })();

      const accounts = await Promise.race([requestPromise, pollPromise]);
      appendWalletLog(
        `Got response: ${JSON.stringify(accounts)?.slice(0, 80) ?? String(accounts)}`,
      );

      // Defensive address extraction — mobile bridges return odd shapes.
      let addr: string | null = null;
      const addrRe = /^0x[a-fA-F0-9]{40}$/;
      if (Array.isArray(accounts)) {
        const first = accounts
          .map((a) => (typeof a === "string" ? a.trim() : ""))
          .find((a) => addrRe.test(a));
        if (first) addr = first;
      } else if (typeof accounts === "string") {
        const trimmed = accounts.trim();
        if (addrRe.test(trimmed)) addr = trimmed;
        else {
          // Try to fish an address out of any wrapping
          const m = trimmed.match(/0x[a-fA-F0-9]{40}/);
          if (m) addr = m[0];
        }
      } else if (accounts && typeof accounts === "object") {
        // Some bridges wrap in { result: [...] } or { accounts: [...] }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyAccounts = accounts as any;
        const candidate = anyAccounts.result ?? anyAccounts.accounts ?? anyAccounts[0];
        if (Array.isArray(candidate)) {
          const first = candidate
            .map((a: unknown) => (typeof a === "string" ? a.trim() : ""))
            .find((a: string) => addrRe.test(a));
          if (first) addr = first;
        } else if (typeof candidate === "string" && addrRe.test(candidate.trim())) {
          addr = candidate.trim();
        }
      }

      // If the prompt returned nothing usable, the wallet may have approved
      // silently. Poll eth_accounts (read-only, no prompt) to recover the
      // address. This handles the mobile Brave case where the wallet app
      // opens, user approves, returns to browser, but the response payload
      // never makes it back to our promise.
      if (!addr) {
        appendWalletLog("No address in response — polling eth_accounts…");
        for (let i = 0; i < 10 && !addr; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          addr = await probeExistingAccount(provider);
          if (addr) {
            appendWalletLog(`Recovered address (attempt ${i + 1}): ${addr.slice(0, 10)}…`);
            break;
          }
          appendWalletLog(`Still waiting (${i + 1}/10)…`);
        }
      }
      if (!addr) {
        appendWalletLog("FAILED — no address after all polls");
        try { localStorage.removeItem("bb_wallet_connect_pending"); } catch { /* noop */ }
        if (isIOS) {
          setWalletConnectionError(
            "No account returned. Make sure you've opened this page inside the Brave Wallet app's browser (not regular Brave), your wallet is unlocked, and an account is selected.",
          );
        } else if (isMobile) {
          setWalletConnectionError(
            "Wallet didn't return an account. Open this page from inside your wallet's in-app browser, make sure the wallet is unlocked with an account selected, then try again.",
          );
        } else {
          setWalletConnectionError(
            "Wallet didn't return an account. Make sure your wallet is unlocked and has at least one account selected, then try again.",
          );
        }
        return;
      }
      appendWalletLog(`Connected: ${addr.slice(0, 10)}…`);
      try { localStorage.removeItem("bb_wallet_connect_pending"); } catch { /* noop */ }
      setEthAddress(addr);
      const delay = isMobile ? 1000 : 500;
      await new Promise((r) => setTimeout(r, delay));
      await refreshBalances(addr);
    } catch (error) {
      const code = (error as { code?: number })?.code;
      if (code === 4001) {
        appendWalletLog("Rejected by user");
        try { localStorage.removeItem("bb_wallet_connect_pending"); } catch { /* noop */ }
        return;
      }
      appendWalletLog(
        `Error: ${error instanceof Error ? error.message : String(error)}`.slice(0, 120),
      );
      console.error("[connectWallet] error:", error);
      // Don't alert right away — poll first in case the wallet approved anyway
      appendWalletLog("Polling eth_accounts after error…");
      let addr: string | null = null;
      for (let i = 0; i < 10 && !addr; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        addr = await probeExistingAccount(provider);
        if (addr) {
          appendWalletLog(`Recovered after error (attempt ${i + 1}): ${addr.slice(0, 10)}…`);
          break;
        }
      }
      if (addr) {
        try { localStorage.removeItem("bb_wallet_connect_pending"); } catch { /* noop */ }
        setEthAddress(addr);
        await refreshBalances(addr);
        return;
      }
      try { localStorage.removeItem("bb_wallet_connect_pending"); } catch { /* noop */ }
      setWalletConnectionError(
        `Wallet connection failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const handleLogout = () => {
    stopPolling();
    iiClear();
    clearPendingDeposit();
    setEthAddress(null);
    setEthBalance(null);
    setUniBalance(null);
    setPhase("idle");
    setSgldtReleased(null);
  };

  const handleTransferSubmit = async () => {
    if (!transferModal || !transferTo || !transferAmt) return;
    setTransferLoading(true);
    try {
      if (transferModal === "eth") {
        if (!ethAddress) throw new Error("Wallet not connected");
        const wallet = getWalletClient();
        if (!wallet) throw new Error("Wallet not connected");
        const amtWei = BigInt(Math.round(Number.parseFloat(transferAmt) * 1e18));
        // Pre-estimate gas. Plain ETH transfer to an EOA is 21k, but if the
        // recipient is a contract with a receive() fallback, it can climb.
        // 50k fallback covers both cases comfortably; estimate buffers +25%.
        const ethGas = await estimateGasOrFallback(
          ethAddress as `0x${string}`,
          transferTo as `0x${string}`,
          "0x",
          50_000n,
        );
        const hash = await wallet.sendTransaction({
          account: ethAddress as `0x${string}`,
          to: transferTo as `0x${string}`,
          value: amtWei,
          gas: ethGas,
          chain: null,
        });
        toast.success(`ETH transfer submitted: ${hash.slice(0, 14)}…`);
      } else if (transferModal === "uni") {
        if (!ethAddress) throw new Error("Wallet not connected");
        const wallet = getWalletClient();
        if (!wallet) throw new Error("Wallet not connected");
        const amtWei = BigInt(Math.round(Number.parseFloat(transferAmt) * 1e18));
        const transferData = encodeERC20Transfer(transferTo, amtWei) as `0x${string}`;
        const uniGas = await estimateGasOrFallback(
          ethAddress as `0x${string}`,
          UNI_CONTRACT_ADDRESS as `0x${string}`,
          transferData,
          80_000n,
        );
        const hash = await wallet.sendTransaction({
          account: ethAddress as `0x${string}`,
          to: UNI_CONTRACT_ADDRESS as `0x${string}`,
          data: transferData,
          gas: uniGas,
          chain: null,
        });
        toast.success(`UNI transfer submitted: ${hash.slice(0, 14)}…`);
      } else if (transferModal === "sgldt") {
        if (!user || !user.identity) throw new Error("Not authenticated");
        const amtRaw = BigInt(Math.round(Number.parseFloat(transferAmt) * 1e8));
        const result = await icrc1TransferFromCaller({
          identity: user.identity,
          canisterId: "i2s4q-syaaa-aaaan-qz4sq-cai",
          to: transferTo,
          amountE8s: amtRaw,
        });
        if (!result.ok) throw new Error(result.error);
        toast.success(`sGLDT transfer confirmed (block ${result.blockIndex})`);
      }
      setTransferModal(null);
      setTransferTo("");
      setTransferAmt("");
      // Refresh balances after transfer
      if (ethAddress) refreshBalances(ethAddress);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setTransferLoading(false);
    }
  };

  // Manual recovery — if the in-browser wallet signing flow hangs (common on
  // mobile Brave), the user can paste the tx hash directly from their wallet's
  // activity tab to continue monitoring. Bypasses every wallet-response parsing
  // issue since we don't need to read anything from the injected provider.
  const [manualTxHash, setManualTxHash] = useState("");
  const [manualRecoveryBusy, setManualRecoveryBusy] = useState(false);
  // Visibility toggle for the "Recover a previous deposit" panel on the idle
  // screen. Hidden by default to keep the happy-path UI clean; one tap opens
  // the same autoFinalize + txHash paths the wallet-confirming phase exposes.
  const [showRecoveryPanel, setShowRecoveryPanel] = useState(false);

  /** One-click "I just signed my deposit — finalize it" flow. The backend
   *  scans the user's recent on-chain txs for a matching deposit to the
   *  helper contract, creates the record, verifies calldata, and pays out —
   *  all in one call. Reliable mobile escape hatch when the automated
   *  hash-capture path fails. */
  const finalizeFromChain = async () => {
    if (!actor) {
      toast.error("Backend not ready — wait a moment and retry.");
      return;
    }
    if (!ethAddress) {
      toast.error("Connect your Ethereum wallet first.");
      return;
    }
    if (!identity) {
      toast.error("Not logged in.");
      return;
    }
    const amountE8s = parseDecimalToBigInt(uniAmount || "0", 8);
    if (amountE8s === 0n) {
      toast.error("Enter the UNI amount you just deposited.");
      return;
    }
    setManualRecoveryBusy(true);
    setStatusMsg("Searching Ethereum for your deposit tx…");
    const rateHint: bigint | null = liveRate > 0 ? BigInt(Math.round(liveRate * 1e8)) : null;
    try {
      const result = await autoFinalizeUNIDeposit({
        identity,
        ethAddress,
        uniAmountE8s: amountE8s,
        rateHint,
      });
      if (result.kind === "ok") {
        setCurrentTxHash(result.txHash);
        setDepositRequestId(result.requestId);
        setPhase("eth_monitoring");
        setStatusMsg("Deposit found on-chain — verifying and releasing sGLDT…");
        startAutoPolling(result.requestId);
        toast.success("Deposit discovered on Ethereum — releasing sGLDT");
      } else if (result.kind === "alreadyExists") {
        setCurrentTxHash(result.txHash);
        setDepositRequestId(result.requestId);
        setPhase("eth_monitoring");
        setStatusMsg(`Deposit already registered (status: ${result.status}) — resuming monitoring`);
        startAutoPolling(result.requestId);
      } else if (result.kind === "noDepositFound") {
        setStatusMsg("");
        toast.error(result.detail, { duration: 10000 });
      } else {
        setStatusMsg("");
        toast.error(`Backend: ${result.detail}`, { duration: 10000 });
      }
    } catch (err) {
      setStatusMsg("");
      toast.error(err instanceof Error ? err.message : String(err), { duration: 10000 });
    } finally {
      setManualRecoveryBusy(false);
    }
  };

  const resumeFromTxHash = async (rawHash: string) => {
    const extracted = extractTxHash(rawHash) ?? rawHash.trim();
    if (!/^0x[a-fA-F0-9]{64}$/.test(extracted)) {
      toast.error("That doesn't look like an Ethereum tx hash (need 0x + 64 hex chars).");
      return;
    }
    if (!actor) {
      toast.error("Backend actor not ready — wait a moment and retry.");
      return;
    }
    if (!ethAddress) {
      toast.error("Connect your Ethereum wallet first.");
      return;
    }
    const amountE8s = parseDecimalToBigInt(uniAmount || "0", 8);
    if (amountE8s === 0n) {
      toast.error("Enter the UNI amount you deposited so the backend can record it.");
      return;
    }
    setManualRecoveryBusy(true);
    setStatusMsg("Verifying your tx on Ethereum…");

    // Pre-flight: reject the most common UX failure — the user pastes the
    // UNI approve hash (the first tx their wallet signed) instead of the
    // deposit hash. Backend would reject it too, but we'd permanently burn
    // a deposit record if we submitted. Block it here with a clear message.
    const check = await verifyHashIsDeposit(extracted, depositAddress);
    if (!check.ok && check.code !== "rpc_error") {
      setManualRecoveryBusy(false);
      toast.error(check.detail, { duration: 10000 });
      setStatusMsg("");
      return;
    }
    if (!check.ok) {
      // RPC error — let the user proceed but warn them
      console.warn("[recovery] tx pre-check RPC error, submitting anyway:", check.detail);
    }

    setPhase("eth_monitoring");
    setCurrentTxHash(extracted);
    setStatusMsg("Registering your tx with the backend…");
    const rateHint: bigint | null = liveRate > 0 ? BigInt(Math.round(liveRate * 1e8)) : null;
    try {
      if (!identity) throw new Error("Not logged in");
      console.log("[recovery] directSubmitUNIDeposit", { ethAddress, amountE8s: amountE8s.toString(), txHash: extracted });
      const requestId = await directSubmitUNIDeposit({
        identity,
        ethAddress,
        uniAmountE8s: amountE8s,
        txHash: extracted,
        rateHint,
      });
      console.log("[recovery] result:", requestId);
      setDepositRequestId(requestId);
      setManualTxHash("");
      toast.success("Tx registered — monitoring started");
      startAutoPolling(requestId);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const trapMatch = raw.match(/with message:\s*['"]?([^'"]+?)['"]?\s*$/i);
      setPhase("error");
      setStatusMsg(trapMatch ? `Backend rejected: ${trapMatch[1]}` : `Backend error: ${raw}`);
    } finally {
      setManualRecoveryBusy(false);
    }
  };

  const startMining = async () => {
    if (!uniAmount || !ethAddress || !user) return;
    if (!actor) {
      setPhase("error");
      setStatusMsg(
        "Unable to connect to the refinery. Please refresh and try again.",
      );
      return;
    }
    // Sanity check: require a real injected wallet before proceeding. The
    // Mine button's disabled gate checks ethAddress, but a stale ethAddress
    // without an active window.ethereum provider (e.g. wallet uninstalled
    // mid-session) would otherwise send us down a flow that hangs in the
    // animation with no wallet prompt.
    if (typeof window === "undefined" || !(window as unknown as { ethereum?: unknown }).ethereum) {
      setPhase("error");
      setStatusMsg(
        "No Ethereum wallet is available in this browser. Open the dApp inside your wallet app's in-app browser (Brave Wallet, MetaMask, Trust, Rainbow) and try again.",
      );
      return;
    }
    // Clear any stale pending-deposit intent from a previous failed run so
    // the auto-resume hook doesn't race with this fresh attempt.
    clearPendingDeposit();
    const amount = Number.parseFloat(uniAmount);
    if (Number.isNaN(amount) || amount <= 0) return;
    // Soft minimum — ckERC-20 minter requires at least 0.001 UNI to cover fees
    if (amount < 0.001) {
      setPhase("error");
      setStatusMsg("Minimum swap amount is 0.001 UNI. Please enter a larger amount.");
      return;
    }

    abortRef.current = false;
    setSgldtReleased(null);
    setDepositRequestId(null);
    setCurrentTxHash(null);
    setRetryErrorMsg(null);
    setBridgeProgress(0);
    resetSteps();

    // -----------------------------------------------
    // PHASE 1: Trigger wallet ERC-20 transfer (viem)
    // -----------------------------------------------
    setPhase("wallet_confirming");
    setStatusMsg("Waiting for wallet confirmation...");

    const walletClient = getWalletClient();
    if (!walletClient) {
      setPhase("error");
      setStatusMsg("No Ethereum wallet found. Please connect Brave Wallet and try again.");
      return;
    }

    // ckERC-20 deposit flow — two sequential transactions:
    //   1) UNI.approve(helperContract, amount)
    //   2) helper.deposit(UNI, amount, treasuryPrincipal32)
    // viem's walletClient.sendTransaction returns a properly normalized Hash
    // regardless of mobile wallet bridge quirks. publicClient.waitForTransactionReceipt
    // reads via public RPC — no mobile wallet dependency.
    let txHash: Hash;
    try {
      const amountWei = parseDecimalToBigInt(uniAmount, 18);
      if (amountWei === 0n) {
        setPhase("error");
        setStatusMsg("Invalid UNI amount.");
        return;
      }
      const treasuryPrincipal32 = principalToBytes32(
        Principal.fromText(TREASURY_PRINCIPAL),
      );

      // ---- Check existing allowance via public RPC (no wallet call) ----
      setStatusMsg("Checking UNI allowance…");
      updateStep("allowance", "Checking UNI allowance", "active");
      let currentAllowance: bigint = 0n;
      try {
        const allowanceHex = await ethCall({
          to: UNI_CONTRACT_ADDRESS as `0x${string}`,
          data: encodeERC20Allowance(ethAddress, depositAddress) as `0x${string}`,
        });
        currentAllowance = BigInt(allowanceHex === "0x" ? "0x0" : allowanceHex);
      } catch (err) {
        console.warn("[mining] allowance check failed, assuming 0:", err);
      }
      console.log("[mining] allowance", {
        currentAllowance: currentAllowance.toString(),
        needed: amountWei.toString(),
      });

      updateStep(
        "allowance",
        "Checking UNI allowance",
        "done",
        `current ${currentAllowance.toString()} / needed ${amountWei.toString()}`,
      );

      // ── SIMPLE SEQUENTIAL FLOW (2026-04-23) ──
      //
      // Every previous attempt added clever layers (manual nonces, parallel
      // signing, public-RPC receipt waits) and each one introduced a new
      // mobile failure mode. This version is deliberately dumb:
      //
      //   1. If allowance is insufficient, sign approve and AWAIT the hash.
      //      Wallet handles nonce internally. User taps Confirm once in
      //      their wallet — then the Promise resolves with a real hash.
      //   2. Sign the deposit tx — AWAIT its hash too.
      //   3. Phase → eth_monitoring. Start the canister autoFinalize poll.
      //
      // We do NOT wait for the approve to be mined before signing the
      // deposit. The wallet takes care of sequential nonces, and Ethereum
      // honors them. The deposit will simply sit in mempool until the
      // approve is mined, then execute `transferFrom` successfully.
      //
      // Every step gets a visible entry in the mining timeline so users
      // can see exactly what's happening — if the wallet prompt never
      // appears, the timeline shows "Approve: clicking wallet..." and they
      // know the issue is their wallet, not the dApp.

      const needsApprove = currentAllowance < amountWei;

      if (needsApprove) {
        updateStep(
          "approve-sign",
          "One-time: approve the bridge to spend your UNI",
          "active",
          "Sign once — future swaps won't need this step",
        );
        try {
          // MAX_UINT256 approval — the DeFi-standard "unlimited allowance"
          // pattern. Uniswap, 1inch, Curve, Aave all do this. The tradeoff
          // is that the helper contract can pull any amount of UNI from
          // this wallet in the future, but:
          //   (a) The helper is the canonical DFINITY ckERC-20 contract,
          //       audited and used by every ICP cross-chain app
          //   (b) UNI only ever moves when the user calls deposit(), which
          //       goes through our UI + the user's wallet signing — no
          //       passive drain surface
          //   (c) The user can always revoke via revoke.cash or by signing
          //       a fresh approve(helper, 0)
          // Upside: every subsequent swap is ONE signature instead of two.
          const MAX_UINT256 =
            0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn;
          const approveData = encodeERC20Approve(
            depositAddress,
            MAX_UINT256,
          ) as `0x${string}`;
          // Pre-estimate via public RPC so wallets that fail at internal
          // gas estimation (observed on desktop Brave Wallet) still receive
          // an explicit `gas` param and don't block with "fails to send gas
          // limit" before the signing sheet opens. 80k is the safe fallback
          // for a canonical ERC-20 approve.
          const approveGas = await estimateGasOrFallback(
            ethAddress as `0x${string}`,
            UNI_CONTRACT_ADDRESS as `0x${string}`,
            approveData,
            80_000n,
          );
          const approveHash = await walletClient.sendTransaction({
            account: ethAddress as `0x${string}`,
            to: UNI_CONTRACT_ADDRESS as `0x${string}`,
            data: approveData,
            gas: approveGas,
            chain: null,
          });
          console.log("[mining] approve signed (unlimited):", approveHash);
          updateStep(
            "approve-sign",
            "UNI approval signed — future swaps skip this step",
            "done",
            String(approveHash).slice(0, 14) + "…",
          );
        } catch (err) {
          const code = (err as { code?: number })?.code;
          if (code === 4001) {
            updateStep("approve-sign", "Approve rejected in wallet", "error");
            clearPendingDeposit();
            setPhase("idle");
            setStatusMsg("");
            toast.error("Transaction rejected in wallet — you can try again.");
            return;
          }
          console.error("[mining] approve failed:", err);
          updateStep(
            "approve-sign",
            "Approve failed: " + (err instanceof Error ? err.message : String(err)).slice(0, 80),
            "error",
          );
          setPhase("error");
          setStatusMsg(
            "UNI approval failed. " +
              (err instanceof Error ? err.message : String(err)),
          );
          return;
        }
      } else {
        updateStep(
          "approve-skip",
          "UNI already approved — skipping to deposit",
          "done",
        );
      }

      updateStep(
        "deposit-sign",
        "Open your wallet and sign the deposit",
        "active",
        "Wallet prompt should appear now",
      );
      // Status polling replaced the old treasury-balance-delta heuristic, so
      // no pre-sign snapshot is needed anymore — just reset the progress bar.
      // Capture the signed tx hash locally (state updates are async, so we
      // can't read currentTxHash back within this same function).
      let signedTxHash: string | null = null;
      setBridgeProgress(0);

      try {
        const depositData = encodeCkErc20Deposit(
          UNI_CONTRACT_ADDRESS,
          amountWei,
          treasuryPrincipal32,
        ) as `0x${string}`;
        // Pre-estimate via public RPC with a 250k fallback. ckERC-20
        // helper.deposit(address, uint256, bytes32) does a transferFrom +
        // CALL to the minter — typically ~150-200k gas. 250k is a safe
        // ceiling; unused gas is refunded by the EVM, so over-estimating
        // costs the user nothing but guarantees the wallet will broadcast.
        //
        // CAVEAT: estimation may fail BEFORE the approve is mined because
        // the helper will revert the simulated call due to insufficient
        // allowance. In that case we skip estimation and use the fallback —
        // the real tx, once the approve lands, succeeds cleanly with the
        // explicit 250k limit.
        const depositGas = await estimateGasOrFallback(
          ethAddress as `0x${string}`,
          depositAddress as `0x${string}`,
          depositData,
          250_000n,
        );
        const depositHash = await walletClient.sendTransaction({
          account: ethAddress as `0x${string}`,
          to: depositAddress as `0x${string}`,
          data: depositData,
          gas: depositGas,
          chain: null,
        });
        console.log("[mining] deposit signed:", depositHash);
        const cand = extractTxHash(depositHash) ?? String(depositHash ?? "").trim();
        if (/^0x[a-fA-F0-9]{64}$/.test(cand)) {
          setCurrentTxHash(cand);
          signedTxHash = cand;
        }
        updateStep(
          "deposit-sign",
          "Deposit signed + broadcast",
          "done",
          cand.slice(0, 14) + "…",
        );
      } catch (err) {
        const code = (err as { code?: number })?.code;
        if (code === 4001) {
          updateStep("deposit-sign", "Deposit rejected in wallet", "error");
          clearPendingDeposit();
          setPhase("idle");
          setStatusMsg("");
          toast.error("Transaction rejected in wallet — you can try again.");
          return;
        }

        // The previous version silently continued to eth_monitoring on ANY
        // non-4001 error. That caused the "jumps to animation with no wallet
        // prompt" symptom: a real error (wallet unreachable, chain mismatch,
        // insufficient gas) would be swallowed and the user would watch the
        // pixel axe animation for 6 minutes polling for a tx that was never
        // broadcast.
        //
        // Safer: only continue if we can recover a real tx hash from the
        // error object (some mobile wallet bridges throw but still broadcast,
        // and stuff the hash into the error payload). Otherwise, stop and
        // tell the user what happened.
        const recoveredHash = extractTxHash(err);
        if (recoveredHash && /^0x[a-fA-F0-9]{64}$/.test(recoveredHash)) {
          console.warn(
            "[mining] sendTransaction threw but recovered hash from error:",
            recoveredHash,
          );
          setCurrentTxHash(recoveredHash);
          signedTxHash = recoveredHash;
          updateStep(
            "deposit-sign",
            "Deposit broadcast (hash recovered from wallet bridge)",
            "done",
            recoveredHash.slice(0, 14) + "…",
          );
          // fall through to the eth_monitoring phase below
        } else {
          const reason = err instanceof Error ? err.message : String(err);
          console.error("[mining] deposit send failed without a hash:", err);
          updateStep(
            "deposit-sign",
            `Deposit failed: ${reason.slice(0, 80)}`,
            "error",
          );
          clearPendingDeposit();
          setPhase("error");
          setStatusMsg(
            `Couldn't broadcast the deposit: ${reason}. Check that your wallet is unlocked, on Ethereum mainnet, and has enough ETH for gas, then tap Mine again.`,
          );
          return;
        }
      }

      // Persist the intent so a tab kill doesn't leave the user orphaned.
      writePendingDeposit({
        ethAddress,
        uniAmount,
        amountWei: amountWei.toString(),
        depositAddress,
        startedAt: Date.now(),
        expectedNonce: null,
      });

      // ── Register the deposit with the backend, ONE call ──
      // We hold the signed tx hash, so no Etherscan-scanning loop is needed:
      // directSubmitUNIDeposit records it #pending, and the backend sweeper
      // takes it from there (on-chain verification + payout every 30 s).
      // From this point the frontend is a read-only status observer.
      const rateHintNat: bigint | null = liveRate > 0 ? BigInt(Math.round(liveRate * 1e8)) : null;
      const amountE8s = parseDecimalToBigInt(uniAmount, 8);

      if (!signedTxHash) {
        // Wallet reported success but returned no parseable hash (rare
        // mobile-bridge quirk). The pending-deposit intent stays persisted;
        // the server-side discovery button can pick it up.
        setPhase("error");
        setStatusMsg(
          "Your wallet signed the deposit but didn't hand back a transaction hash. Tap 'Finalize my deposit' below — we'll find it on Ethereum and resume automatically.",
        );
        return;
      }

      setPhase("eth_monitoring");
      setStatusMsg("Watching Ethereum for your deposit…");
      updateStep("deposit-sign", "Deposit broadcast — registering with the refinery…", "active");

      let requestId: bigint | null = null;
      try {
        if (!identity) throw new Error("Not authenticated");
        requestId = await directSubmitUNIDeposit({
          identity,
          ethAddress,
          uniAmountE8s: amountE8s,
          txHash: signedTxHash,
          rateHint: rateHintNat,
        });
      } catch (err) {
        console.warn("[mining] direct deposit submit failed, trying server-side discovery:", err);
        // Fallback: server-side Etherscan discovery — also creates the record.
        try {
          if (identity) {
            const result = await autoFinalizeUNIDeposit({
              identity,
              ethAddress,
              uniAmountE8s: amountE8s,
              rateHint: rateHintNat,
            });
            if (result.kind === "ok" || result.kind === "alreadyExists") {
              requestId = result.requestId;
            }
          }
        } catch (fallbackErr) {
          console.warn("[mining] autoFinalize fallback failed:", fallbackErr);
        }
      }

      if (requestId === null) {
        updateStep("deposit-sign", "Couldn't register the deposit with the backend", "error");
        setManualTxHash(signedTxHash);
        setPhase("error");
        setStatusMsg(
          "Your deposit is broadcast on Ethereum but we couldn't reach the backend to register it. Your funds are safe — tap 'Resume monitoring' below to retry.",
        );
        return;
      }

      updateStep("deposit-sign", "Deposit registered — refinery is watching Ethereum", "done", signedTxHash.slice(0, 14) + "…");
      setDepositRequestId(requestId);
      clearPendingDeposit();
      txHash = signedTxHash as `0x${string}`;

      try {
        startAutoPolling(requestId);
      } catch (pollErr) {
        console.error("[mining] startAutoPolling threw:", pollErr);
        setPhase("error");
        setStatusMsg(
          "Polling setup failed — your deposit is recorded (ID " +
            requestId.toString() +
            "). The backend will still pay out automatically; tap 'Check now' or come back later.",
        );
      }
      return; // early return: startAutoPolling handles phase transitions from here
    } catch (err) {
      // Handle user rejection (EIP-1193 error code 4001)
      const code = (err as { code?: number })?.code;
      if (code === 4001) {
        clearPendingDeposit();
        setPhase("idle");
        setStatusMsg("");
        toast.error("Transaction rejected in wallet — you can try again.");
        return;
      }
      clearPendingDeposit();
      setPhase("error");
      setStatusMsg(
        err instanceof Error
          ? err.message
          : "Wallet transaction failed. Please try again.",
      );
      return;
    }

    // The new autoFinalize flow above already calls startAutoPolling via the
    // canister's verify+pay chain. If control falls through here it means
    // neither wallet rejection nor the polling loop completed — shouldn't
    // happen in practice, but guard with a soft error just in case.
    console.warn("[mining] startMining fell through without resolving — unexpected");
    // `txHash` is the last value captured (set by finalizedHash in the new
    // flow) — keep the lint happy by referencing it.
    void txHash;
  };

  // Resume-after-refresh: once the actor is ready AND the persisted deposit
  // id has been hydrated (both arrive asynchronously after auth), check the
  // deposit's status via a free query and resume monitoring if it's still in
  // flight. Runs at most once per session via resumeCheckedRef.
  const resumeCheckedRef = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: phase/startAutoPolling are read from closure; effect is guarded to run once
  useEffect(() => {
    if (!actor || !depositRequestId || resumeCheckedRef.current) return;
    if (phase !== "idle") return; // user already started a new flow
    resumeCheckedRef.current = true;

    (async () => {
      try {
        const st = await (
          actor as unknown as {
            getDepositStatus: (id: bigint) => Promise<{
              status: string;
              txHash: string;
              sgldtPaid: bigint;
            }>;
          }
        ).getDepositStatus(depositRequestId);

        if (st.status === "paid") {
          const paid = Number(st.sgldtPaid) / 1e8;
          setPhase("success");
          setStatusMsg("Transaction confirmed — sGLDT released!");
          setSgldtReleased((prev) => prev ?? (paid > 0 ? paid.toFixed(5) : "check your wallet"));
          setDepositRequestId(null);
          return;
        }
        if (st.status === "failed" || st.status === "not_found") {
          // Hard failure or stale id — clear and let the user start fresh
          setDepositRequestId(null);
          return;
        }
        // pending / confirmed / processing — resume monitoring
        if (st.txHash) setCurrentTxHash(st.txHash);
        setPhase("eth_monitoring");
        setStatusMsg("Waiting for Ethereum confirmation...");
        startAutoPolling(depositRequestId);
      } catch {
        // Query failed — allow a later attempt (e.g. actor re-created)
        resumeCheckedRef.current = false;
      }
    })();
  }, [actor, depositRequestId]);

  // MOBILE FIX: on mount, if a pending-deposit intent is stored but we don't
  // yet have a tx hash or a backend requestId, it means the user was mid-sign
  // on mobile and the tab was suspended or killed. Poll Etherscan for their
  // tx to the helper contract and resume the flow from the hash recovery.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once when actor becomes available; reads intent/hash/id via refs-in-closure
  useEffect(() => {
    if (!actor || !identity) return;
    if (depositRequestId) return;     // backend submission already in flight
    if (currentTxHash) return;         // we already have the hash

    const intent = readPendingDeposit();
    if (!intent) return;

    // Only attempt recovery when we're otherwise idle — don't stomp on an
    // active UI flow.
    if (phase !== "idle") return;

    let cancelled = false;
    (async () => {
      setPhase("wallet_confirming");
      setStatusMsg(
        "Resuming from your mobile wallet — looking for the broadcast tx on Ethereum…",
      );
      // Race Etherscan + RPC-by-nonce. On mobile Brave, Etherscan is blocked
      // by Shields, so RPC is the actual winner; on other mobile browsers
      // either path works and we take whichever finishes first.
      const etherscan = findLatestUserTxTo(intent.ethAddress, intent.depositAddress, {
        timeoutMs: 240_000,
        pollMs: 4_000,
      }).then((h) => (h as string | null));
      const rpc: Promise<string | null> =
        intent.expectedNonce !== null && intent.expectedNonce !== undefined
          ? findTxByNonce(intent.ethAddress, intent.expectedNonce, intent.depositAddress, {
              timeoutMs: 240_000,
              pollMs: 4_000,
              scanBlocks: 30,
            }).then((h) => (h as string | null))
          : Promise.resolve(null);
      const found = await new Promise<string | null>((resolve) => {
        let remaining = 2;
        let done = false;
        const settle = (h: string | null) => {
          if (done) return;
          if (h) {
            done = true;
            resolve(h);
            return;
          }
          remaining -= 1;
          if (remaining === 0 && !done) {
            done = true;
            resolve(null);
          }
        };
        etherscan.then(settle).catch(() => settle(null));
        rpc.then(settle).catch(() => settle(null));
      });
      if (cancelled) return;
      if (!found) {
        // Etherscan didn't surface a matching tx within the window — wipe the
        // intent and let the user start fresh. If their tx IS on-chain they
        // can paste the hash into the manual recovery box.
        clearPendingDeposit();
        setPhase("idle");
        setStatusMsg("");
        return;
      }
      console.log("[mount-resume] recovered pending deposit tx:", found);
      clearPendingDeposit();
      setCurrentTxHash(found);
      setUniAmount(intent.uniAmount);
      setPhase("eth_monitoring");
      setStatusMsg("Waiting for Ethereum confirmation...");

      // Push it to the backend so the normal polling flow kicks in.
      try {
        const uniAmountE8s = parseDecimalToBigInt(intent.uniAmount, 8);
        const rateHint: bigint | null =
          liveRate > 0 ? BigInt(Math.round(liveRate * 1e8)) : null;
        const requestId = await directSubmitUNIDeposit({
          identity,
          ethAddress: intent.ethAddress,
          uniAmountE8s,
          txHash: found,
          rateHint,
        });
        if (cancelled) return;
        setDepositRequestId(requestId);
        startAutoPolling(requestId);
      } catch (err) {
        console.error("[mount-resume] backend submit failed:", err);
        if (cancelled) return;
        setManualTxHash(found);
        setPhase("error");
        setStatusMsg(
          `We found your broadcast tx (${found.slice(0, 14)}…) but the backend rejected the initial submit. Click "Resume monitoring" below to retry.`,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [actor, identity]);

  const phaseStep = {
    idle: 0,
    awaiting_deposit: 1,
    wallet_confirming: 1,
    eth_monitoring: 2,
    ckuni_minting: 2,
    releasing_sgldt: 3,
    success: 3,
    error: 0,
  }[phase];

  // (The block-confirmation meter now derives state from the actual tx
  // receipt + chain head via viem — no elapsed-time tracking needed.)
  const phaseLabels = [
    "Wallet Confirmation",
    "Ethereum Confirmation",
    "Releasing sGLDT to Account",
  ];

  const uniUsd =
    uniBalance && uniPrice
      ? ((Number.parseFloat(uniBalance || "0") || 0) * uniPrice).toFixed(2)
      : null;
  const ethUsd =
    ethBalance && ethPrice
      ? ((Number.parseFloat(ethBalance || "0") || 0) * ethPrice).toFixed(2)
      : null;

  // Banking.Brave top-level routing — landing, or the Minegold.Brave preview.
  // The live Minegold.Uni workflow (this file's main return) runs only when
  // the user has explicitly entered it. No auth required for landing/preview.
  if (topView === "home") {
    return (
      <BankingBraveHome
        onOpenMinegoldUni={enterMinegoldUni}
        onOpenMinegoldBrave={enterMinegoldBrave}
      />
    );
  }
  if (topView === "brave-soon") {
    return <MinegoldBraveSoon onBack={backToBankingBrave} onOpenUni={enterMinegoldUni} />;
  }

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-100 font-sans">
      {/* Login Overlay */}
      {!user && <LoginOverlay isLoggingIn={isLoggingIn} onLogin={handleLogin} />}

      {/* Nav */}
      <NavBar
        user={user}
        isAdmin={!!isAdmin}
        showAdmin={showAdmin}
        showHistory={showHistory}
        showTreasury={showTreasury}
        treasuryPanelRef={treasuryPanelRef}
        displaySGLDTBalance={displaySGLDTBalance}
        displaySGLDTLoading={displaySGLDTLoading}
        displayCkUNIBalance={displayCkUNIBalance}
        displayCkUNILoading={displayCkUNILoading}
        treasuryEthUniBalance={treasuryEthUniBalance}
        treasuryEthUniLoading={treasuryEthUniLoading}
        treasuryEthUniUnavailable={treasuryEthUniUnavailable}
        ethPrice={ethPrice}
        uniPrice={uniPrice}
        sgldtPrice={sgldtPrice}
        onBackToBankingBrave={backToBankingBrave}
        onHome={() => {
          setShowAdmin(false);
          setShowHistory(false);
          setShowProfile(false);
        }}
        onToggleTreasury={() => setShowTreasury(!showTreasury)}
        onToggleAdmin={() => {
          setShowAdmin(!showAdmin);
          setShowHistory(false);
          setShowProfile(false);
        }}
        onToggleHistory={() => {
          setShowHistory(!showHistory);
          setShowAdmin(false);
          setShowProfile(false);
        }}
        onOpenProfile={() => setShowProfile(true)}
        onLogout={handleLogout}
      />

      {/* Price feed warning banner */}
      {priceWarning && (
        <div
          data-ocid="price.warning_banner"
          className="sticky top-20 z-40 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center justify-center gap-2 text-[11px] font-semibold text-yellow-400"
        >
          <TrendingUp size={12} />
          {priceWarning}
        </div>
      )}

      {/* Wallet picker — clean multi-wallet modal that replaces the single
          "Connect Wallet" button. Closes automatically once ethAddress is
          set (connect succeeded). */}
      <ConnectWalletModal
        open={connectModalOpen && !ethAddress}
        connecting={walletConnectLog.length > 0 && !ethAddress && !walletConnectionError}
        connectError={walletConnectionError}
        onClose={() => setConnectModalOpen(false)}
        onConnect={() => {
          setWalletConnectionError(null);
          void connectEthereumWallet();
        }}
      />

      {/* Transfer Modal — top level so profile-initiated sGLDT transfers work
          even without an ETH wallet connected */}
      {transferModal && (
        <TransferModal
          token={transferModal}
          to={transferTo}
          amount={transferAmt}
          loading={transferLoading}
          onToChange={setTransferTo}
          onAmountChange={setTransferAmt}
          onClose={() => setTransferModal(null)}
          onSubmit={handleTransferSubmit}
        />
      )}

      {/* Profile Modal */}
      {showProfile && user && (
        <ProfileModal
          user={user}
          ethAddress={ethAddress}
          ethBalance={ethBalance}
          uniBalance={uniBalance}
          sgldtBalance={sgldtBalance}
          ethUsd={ethUsd}
          uniUsd={uniUsd}
          sgldtUsd={sgldtUsd}
          onClose={() => setShowProfile(false)}
          onTransferSgldt={() => {
            setShowProfile(false);
            setTransferModal("sgldt");
            setTransferTo("");
            setTransferAmt("");
          }}
        />
      )}

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {showAdmin && user ? (
          <AdminPage />
        ) : showHistory && user ? (
          <TransactionHistoryPage />
        ) : (
          <>
{/* ETH wallet connect / connected dashboard */}
            <WalletSection
              ethAddress={ethAddress}
              walletConnectLog={walletConnectLog}
              walletConnectionError={walletConnectionError}
              balanceRefreshing={balanceRefreshing}
              ethBalanceDiag={ethBalanceDiag}
              uniBalanceDiag={uniBalanceDiag}
              ethBalance={ethBalance}
              uniBalance={uniBalance}
              sgldtBalance={sgldtBalance}
              ethUsd={ethUsd}
              uniUsd={uniUsd}
              sgldtUsd={sgldtUsd}
              liveRate={liveRate}
              uniPrice={uniPrice}
              sgldtPrice={sgldtPrice}
              onOpenConnect={() => setConnectModalOpen(true)}
              onRefreshBalances={() => {
                if (ethAddress) void refreshBalances(ethAddress);
              }}
              onOpenTransfer={(token) => {
                setTransferModal(token);
                setTransferTo("");
                setTransferAmt("");
              }}
            />

            {/* Unclaimed deposits banner — safety net for deposits the frontend
                missed claiming (e.g. user closed tab after tx confirmed). */}
            {user && unclaimedDeposits.length > 0 && phase === "idle" && (
              <UnclaimedDepositsBanner
                count={unclaimedDeposits.length}
                claiming={retryPayout.isPending}
                onClaim={async () => {
                  for (const d of unclaimedDeposits) {
                    try {
                      await retryPayout.mutateAsync(d.id as bigint);
                    } catch {
                      // continue — aggregate errors shown after loop
                    }
                  }
                  toast.success("Payout(s) processed — check your sGLDT balance");
                }}
              />
            )}

{/* Refinery Widget */}
            <RefineryShell
              dimmed={!ethAddress}
              displaySGLDTBalance={displaySGLDTBalance}
              displaySGLDTLoading={displaySGLDTLoading}
              displayCkUNIBalance={displayCkUNIBalance}
              displayCkUNILoading={displayCkUNILoading}
              treasuryEthUniBalance={treasuryEthUniBalance}
              treasuryEthUniLoading={treasuryEthUniLoading}
              treasuryEthUniUnavailable={treasuryEthUniUnavailable}
              uniAmount={uniAmount}
              uniBalance={uniBalance}
              inputDisabled={isActive}
              outputDisplay={
                phase === "success" && sgldtReleased
                  ? sgldtReleased
                  : estimatedGold.toFixed(5)
              }
              onUniAmountChange={setUniAmount}
              ckuniLedgerCanisterId={CKUNI_LEDGER_CANISTER_ID}
            >
              {/* Persistent transaction timeline — visible across phases,
                  surfaces per-step timestamps/durations, survives reloads. */}
              {miningSteps.length > 0 && (
                <div className="mt-6">
                  <TransactionTimeline
                    steps={miningSteps}
                    defaultOpen={phase === "error" || phase === "success"}
                    onClear={resetSteps}
                  />
                </div>
              )}

              {/* Progress / Action */}
              <div className="mt-10">
                {phase === "success" ? (
                  <PhaseSuccess
                    sgldtReleased={sgldtReleased}
                    currentTxHash={currentTxHash}
                    onStartNew={() => {
                      setPhase("idle");
                      setSgldtReleased(null);
                      setCurrentTxHash(null);
                    }}
                  />
                ) : phase === "error" ? (
                  <PhaseError
                    statusMsg={statusMsg}
                    bridgeProgress={bridgeProgress}
                    currentTxHash={currentTxHash}
                    pollAttempt={pollAttempt}
                    retryErrorMsg={retryErrorMsg}
                    miningSteps={miningSteps}
                    manualTxHash={manualTxHash}
                    manualRecoveryBusy={manualRecoveryBusy}
                    onManualTxHashChange={setManualTxHash}
                    onFinalizeFromChain={finalizeFromChain}
                    onResumeFromTxHash={resumeFromTxHash}
                    onViewHistory={() => setShowHistory(true)}
                    onTryAgain={async () => {
                      // Reset stuck deposit on backend if we have a request ID
                      if (depositRequestId !== null && actor) {
                        try {
                          await actor.resetMiningPhase(depositRequestId);
                        } catch {
                          // Non-blocking — reset frontend state regardless
                        }
                      }
                      setDepositRequestId(null);
                      setCurrentTxHash(null);
                      setStatusMsg("");
                      setRetryErrorMsg(null);
                      setPhase("idle");
                    }}
                  />
                ) : phase === "wallet_confirming" ? (
                  <PhaseWalletConfirming
                    uniAmount={uniAmount}
                    depositAddress={depositAddress}
                    manualTxHash={manualTxHash}
                    manualRecoveryBusy={manualRecoveryBusy}
                    onManualTxHashChange={setManualTxHash}
                    onResumeFromTxHash={resumeFromTxHash}
                    onFinalizeFromChain={finalizeFromChain}
                    onCancel={() => {
                      abortRef.current = true;
                      setPhase("idle");
                      setStatusMsg("");
                    }}
                  />
                ) : phase === "eth_monitoring" ? (
                  <PhaseEthMonitoring
                    uniAmount={uniAmount}
                    bridgeProgress={bridgeProgress}
                    pollAttempt={pollAttempt}
                    currentTxHash={currentTxHash}
                    statusMsg={statusMsg}
                    checkDisabled={!actor || !depositRequestId}
                    onCheckNow={checkPayoutNow}
                    onCancel={() => {
                      abortRef.current = true;
                      setPhase("idle");
                      setStatusMsg("");
                    }}
                  />
                ) : phase === "awaiting_deposit" ? (
                  <PhaseAwaitingDeposit
                    depositAddress={depositAddress}
                    copied={copiedDepositAddress}
                    onCopyAddress={copyDepositAddress}
                    onCancel={() => {
                      abortRef.current = true;
                      setPhase("idle");
                    }}
                  />
                ) : isActive ? (
                  <PhaseReleasing
                    releasing={phase === "releasing_sgldt"}
                    phaseStep={phaseStep}
                    phaseLabels={phaseLabels}
                    statusMsg={statusMsg}
                  />
                ) : (
                  <PhaseIdle
                    uniAmount={uniAmount}
                    startDisabled={
                      !uniAmount ||
                      !ethAddress ||
                      !user ||
                      (!actor && !actorTimedOut) ||
                      liveRate <= 0 ||
                      !uniPrice ||
                      !sgldtPrice
                    }
                    showRateHint={
                      (liveRate <= 0 || !uniPrice || !sgldtPrice) &&
                      !!user &&
                      !!ethAddress
                    }
                    showConnecting={!!user && !actor && !actorTimedOut}
                    actorTimedOut={actorTimedOut}
                    showRecoveryEntry={!!user && !!ethAddress && !!actor}
                    showRecoveryPanel={showRecoveryPanel}
                    manualTxHash={manualTxHash}
                    manualRecoveryBusy={manualRecoveryBusy}
                    onStartMining={startMining}
                    onToggleRecovery={() => setShowRecoveryPanel((v) => !v)}
                    onManualTxHashChange={setManualTxHash}
                    onFinalizeFromChain={finalizeFromChain}
                    onResumeFromTxHash={resumeFromTxHash}
                  />
                )}
              </div>
            </RefineryShell>

            {/* How it works strip */}
            <HowItWorksStrip />

            <footer className="mt-10 text-center text-xs text-zinc-700">
              &copy; {new Date().getFullYear()} minegold.defi &mdash; built on{" "}
              <a
                href="https://internetcomputer.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-500 transition-colors underline underline-offset-2"
              >
                Internet Computer Protocol
              </a>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
