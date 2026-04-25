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
  Activity,
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Loader2,
  Lock,
  LogOut,
  Send,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserCircle2,
  Wallet,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PhaseSuccess } from "./components/phases/PhaseSuccess";
import { PhaseWalletConfirming } from "./components/phases/PhaseWalletConfirming";
import { PixelAxeAnimation } from "./components/PixelAxeAnimation";
import { BlockConfirmationMeter } from "./components/BlockConfirmationMeter";
import { ConnectWalletModal } from "./components/ConnectWalletModal";
import { CrossChainFlow } from "./components/CrossChainFlow";
import { TransactionTimeline } from "./components/TransactionTimeline";
import { GoldCTA } from "./components/ui/GoldCTA";
import { WorkflowStepper } from "./components/WorkflowStepper";
import { useBackendActor } from "./hooks/useBackendActor";
import {
  autoFinalizeUNIDeposit,
  directSubmitUNIDeposit,
  fetchTreasuryCkUNIBalance,
  formatTokenAmount,
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
function safeBalance(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "" || val === "NaN")
    return "0.0000";
  const n = typeof val === "number" ? val : Number.parseFloat(String(val));
  return Number.isNaN(n) || !Number.isFinite(n) ? "0.0000" : String(val);
}

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

const StatCard = ({
  title,
  value,
  sub,
  icon,
}: {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
}) => (
  <div
    data-ocid="stat.card"
    className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl hover:border-zinc-700 transition-all group"
  >
    <div className="flex justify-between items-start mb-4">
      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
        {title}
      </span>
      <div className="p-2 bg-zinc-800 rounded-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
    </div>
    <div className="text-2xl font-black text-white">{value}</div>
    <div className="text-xs text-zinc-400 mt-1 font-medium">{sub}</div>
  </div>
);

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
  const [depositRequestId, setDepositRequestIdState] = useState<bigint | null>(
    () => {
      try {
        const stored = localStorage.getItem(DEPOSIT_ID_KEY);
        return stored ? BigInt(stored) : null;
      } catch {
        return null;
      }
    },
  );
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

  const [miningSteps, setMiningSteps] = useState<MiningStep[]>(() => {
    try {
      const raw = localStorage.getItem(MINING_STEPS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as MiningStep[];
      if (!Array.isArray(parsed)) return [];
      // Drop stale timelines to prevent a months-old run from resurfacing.
      const newest = parsed.reduce((n, s) => Math.max(n, s.updatedAt ?? 0), 0);
      if (newest && Date.now() - newest > MINING_STEPS_TTL_MS) {
        localStorage.removeItem(MINING_STEPS_KEY);
        return [];
      }
      return parsed;
    } catch {
      return [];
    }
  });
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
    ckUNISnapshotRef.current = 0n;
    depositAmountWeiRef.current = 0n;
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

  // Snapshot of treasury ckUNI balance at the moment the user's deposit is
  // broadcast. The bridge-completion signal is `currentBalance - snapshot
  // >= user's depositAmountWei`. Held in a ref (not state) because the
  // polling tick closure needs the latest value without triggering re-renders.
  const ckUNISnapshotRef = useRef<bigint>(0n);
  // User's deposit amount in wei (18 decimals — same as UNI). Snapshot at
  // deposit-broadcast time so the polling tick can compute progress.
  const depositAmountWeiRef = useRef<bigint>(0n);
  // 0..1 progress (treasury ckUNI delta / expected). Drives a real bar,
  // not a spinner — users see concrete movement as the bridge processes.
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
   *  NEW DESIGN (2026-05): monitors the ckUNI ledger directly instead of
   *  polling the backend's verifyEthTransaction update call. The signal we
   *  actually care about is "has the ckERC-20 minter credited ckUNI to the
   *  treasury yet?" — that's what tells us the bridge completed. Reading
   *  the ledger's icrc1_balance_of is a query call (free, ~500ms), whereas
   *  verifyEthTransaction triggers HTTPS outcalls to Etherscan (slow,
   *  rate-limited, hardcoded free-tier API key).
   *
   *  Flow:
   *   1. Snapshot treasury ckUNI balance BEFORE this function runs (done
   *      in startMining, right before the deposit sendTransaction).
   *   2. This loop polls icrc1_balance_of(treasury) every 3s (6s after
   *      the first minute) and computes delta vs snapshot.
   *   3. When delta >= deposit amount wei, the bridge completed → call
   *      backend's retryUNIDepositPayout ONCE to release sGLDT.
   *   4. On success, stopWithSuccess with the real paid amount.
   *
   *  Progress bar in the UI reads bridgeProgress (0..1), which updates
   *  every tick. Users see concrete movement, not a spinner. */
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
          // ── Step 1: poll the ckUNI ledger for treasury balance ──
          const currentBalance = await fetchTreasuryCkUNIBalance();
          const snapshot = ckUNISnapshotRef.current;
          const target = depositAmountWeiRef.current;
          const delta = currentBalance > snapshot ? currentBalance - snapshot : 0n;

          // Update the visible progress bar — capped at 100%.
          // BigInt → number safe here because target is ≤ 18 decimals and
          // never exceeds what fits in a Number.
          if (target > 0n) {
            const progress = Number((delta * 10000n) / target) / 10000;
            setBridgeProgress(Math.min(1, Math.max(0, progress)));
          }

          // ── Step 2: bridge completed when delta covers our deposit ──
          if (target > 0n && delta >= target) {
            // ckUNI has landed in the treasury — the bridge portion is
            // done. Hit the backend's payout path ONCE to release sGLDT.
            // We use retryUNIDepositPayout rather than verifyEthTransaction
            // because the deposit is already recorded (autoFinalize ran
            // earlier in startMining) and we just need to finalize payout.
            try {
              const payoutResult = await (
                actor as unknown as {
                  retryUNIDepositPayout: (id: bigint) => Promise<string>;
                }
              ).retryUNIDepositPayout(requestId);
              const raw = typeof payoutResult === "string"
                ? payoutResult
                : String(payoutResult ?? "");
              const status = raw.toLowerCase();

              // ── Terminal success ──
              if (status.includes("paid") || status.includes("success")) {
                const amountMatch =
                  raw.match(/[:\s](\d+\.?\d*)\s*sgldt/i) ??
                  raw.match(/paid[:\s]+(\d+\.?\d*)/i);
                setBridgeProgress(1);
                await stopWithSuccess(amountMatch ? amountMatch[1] : null);
                return;
              }

              // ── Definitive payout failure ──
              if (status.includes("payout_failed:")) {
                const reason = raw.replace(/^.*payout_failed:\s*/i, "").trim();
                const isFunds =
                  reason.toLowerCase().includes("insufficientfunds") ||
                  reason.toLowerCase().includes("insufficient");
                stopWithError(
                  isFunds
                    ? "Refinery is out of sGLDT right now. Your ckUNI is in the treasury — contact support for a manual payout."
                    : `Release failed: ${reason || "Unknown error"}`,
                );
                return;
              }

              // Transient error — surface but keep polling until deadline
              if (raw.trim().length > 0) {
                setRetryErrorMsg(`Payout still pending: ${raw.trim()}`);
              }
              if (Date.now() - pollStartedAtRef.current > POLL_DEADLINE_MS) {
                stopWithError(
                  `ckUNI reached the treasury but sGLDT release is taking longer than expected. Deposit ID ${requestId.toString()} is safe — tap "Check now" to retry.`,
                );
              }
            } catch (err) {
              console.warn("[mining] retryUNIDepositPayout threw:", err);
              // Network hiccup — keep polling, we'll retry next tick
            }
            return;
          }

          // Still waiting — balance hasn't moved enough yet. The ckERC-20
          // minter needs 12 Ethereum block confirmations (~2-3 min) before
          // it processes the deposit, so a long wait here is normal.
        } catch (err) {
          // icrc1_balance_of query failed — likely transient network issue.
          // Keep polling silently; we'll catch up on the next tick.
          console.warn("[mining] ckUNI balance query failed:", err);
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
  const [currentTxHash, setCurrentTxHashState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TX_HASH_KEY) ?? null;
    } catch {
      return null;
    }
  });
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
      // ── Snapshot treasury ckUNI balance BEFORE the deposit ──
      // This is the baseline the polling loop diffs against to detect when
      // the ckERC-20 minter credits our deposit to the treasury. Query call,
      // typically <500ms — worth the pre-sign delay for a clean baseline.
      // If the query fails, we use 0 as the snapshot (the worst case: the
      // loop detects completion slightly early if there was pre-existing
      // treasury balance, which is harmless — the backend's own calldata
      // verification is still the authoritative gate on actual sGLDT payout).
      try {
        ckUNISnapshotRef.current = await fetchTreasuryCkUNIBalance();
        console.log("[mining] snapshot ckUNI balance:", ckUNISnapshotRef.current.toString());
      } catch (err) {
        console.warn("[mining] ckUNI snapshot failed, using 0:", err);
        ckUNISnapshotRef.current = 0n;
      }
      depositAmountWeiRef.current = amountWei;
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

      // Now phase into ETH monitoring while we wait for the canister to see
      // the tx land on-chain.
      setPhase("eth_monitoring");
      setStatusMsg("Watching Ethereum for your deposit…");
      updateStep("deposit-sign", "Deposit broadcast — canister is watching Ethereum", "active");

      // Poll autoFinalize until the canister sees the tx or we give up.
      // Etherscan indexes confirmed txs ~15-30s after broadcast. With 12
      // block confirmations required by the ckERC-20 helper (~2.5 min at
      // 12s/block), we give this 6 minutes tops.
      const POLL_INTERVAL_MS = 5_000;
      const POLL_DEADLINE_MS = 6 * 60_000;
      const pollStarted = Date.now();
      const rateHintNat: bigint | null = liveRate > 0 ? BigInt(Math.round(liveRate * 1e8)) : null;
      const amountE8s = parseDecimalToBigInt(uniAmount, 8);

      let finalizedRequestId: bigint | null = null;
      let finalizedHash: string | null = null;

      while (Date.now() - pollStarted < POLL_DEADLINE_MS) {
        if (abortRef.current) {
          clearPendingDeposit();
          return;
        }
        try {
          if (!identity) break;
          const result = await autoFinalizeUNIDeposit({
            identity,
            ethAddress,
            uniAmountE8s: amountE8s,
            rateHint: rateHintNat,
          });
          if (result.kind === "ok" || result.kind === "alreadyExists") {
            finalizedRequestId = result.requestId;
            finalizedHash = result.txHash;
            break;
          }
          // noDepositFound / apiError → keep waiting
          console.log("[mining] canister poll:", result.kind, "detail" in result ? result.detail : "");
        } catch (err) {
          console.warn("[mining] autoFinalize poll threw:", err);
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      if (!finalizedRequestId) {
        updateStep(
          "deposit-sign",
          "Canister couldn't find your deposit in 6 min — manually finalize below",
          "error",
        );
        clearPendingDeposit();
        setPhase("error");
        setStatusMsg(
          "The canister hasn't seen your deposit land on Ethereum within 6 minutes. Common causes: (1) wallet app backgrounded before broadcasting, (2) the block is still propagating, (3) ad blockers are throttling our RPC lookups. If you see the tx in your wallet's activity tab it IS on-chain — tap 'Finalize my deposit' below to resume. Otherwise try Mine again.",
        );
        return;
      }

      console.log("[mining] autoFinalize found deposit:", { hash: finalizedHash, requestId: finalizedRequestId.toString() });
      updateStep("deposit-sign", "Deposit confirmed on Ethereum", "done", finalizedHash?.slice(0, 14) + "…");
      setCurrentTxHash(finalizedHash);
      setDepositRequestId(finalizedRequestId);
      clearPendingDeposit();
      txHash = (finalizedHash ?? "0x") as `0x${string}`;

      // Start verify+payout polling — autoFinalize already kicked off the
      // backend flow, so this just waits for it to complete. Wrap in
      // try/catch so that if the polling setup throws (shouldn't happen,
      // but defensive), the user sees a clear error instead of being stuck
      // forever in eth_monitoring.
      try {
        startAutoPolling(finalizedRequestId);
        setStatusMsg("Releasing sGLDT — this is the last step…");
      } catch (pollErr) {
        console.error("[mining] startAutoPolling threw:", pollErr);
        setPhase("error");
        setStatusMsg(
          "Polling setup failed — your deposit is recorded (ID " +
            finalizedRequestId.toString() +
            "). Tap 'Finalize my deposit' below to resume.",
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

  // On mount: if a depositRequestId is in localStorage and phase is idle,
  // check the deposit status and auto-resume polling if still pending.
  // This ensures users don't lose their progress on page refresh.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once when actor becomes available; depositRequestId/phase/startAutoPolling are read from closure
  useEffect(() => {
    if (!actor || !depositRequestId) return;

    const checkOnMount = async () => {
      try {
        const verifyResult = await actor.verifyEthTransaction(depositRequestId);
        const status =
          typeof verifyResult === "string" ? verifyResult.toLowerCase() : "";

        if (status.includes("paid") || status.includes("success")) {
          // Already paid — show success screen
          setPhase("success");
          setStatusMsg("Transaction confirmed — sGLDT released!");
          setSgldtReleased((prev) => prev ?? "check your wallet");
          setDepositRequestId(null);
          return;
        }

        if (status.includes("failed") || status.includes("rejected")) {
          // Hard failure — clear and let user try again
          setDepositRequestId(null);
          return;
        }

        // Pending or confirmed — resume the animation and auto-polling
        if (
          status.includes("pending") ||
          status.includes("confirmed") ||
          status.includes("processing")
        ) {
          setPhase("eth_monitoring");
          setStatusMsg("Waiting for Ethereum confirmation...");
          startAutoPolling(depositRequestId);
        }
      } catch {
        // Actor not ready or method error — don't resume, let user start fresh
      }
    };

    // Only auto-resume if phase is still idle (user hasn't started a new swap)
    if (phase === "idle") {
      checkOnMount();
    }
  }, [actor]); // Run once when actor becomes available

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
      {!user && (
        <div
          data-ocid="login.modal"
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 text-center shadow-2xl">
            {/* Gold pickaxe icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-600 to-yellow-400 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/30">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 34 L30 8" stroke="#3B1F00" strokeWidth="5" strokeLinecap="square"/>
                <path d="M6 34 L30 8" stroke="#7B4513" strokeWidth="3" strokeLinecap="square"/>
                <rect x="24" y="4" width="14" height="6" rx="1" fill="#FFFFF0"/>
                <rect x="24" y="4" width="14" height="2" rx="1" fill="white"/>
                <path d="M36 2 L40 6 L36 10 L32 6 Z" fill="#F0F0F0"/>
                <path d="M24 10 L20 14 L24 14 Z" fill="#D8D8D8"/>
                <circle cx="8" cy="32" r="3" fill="#FFD700" opacity="0.9"/>
                <circle cx="13" cy="30" r="2" fill="#FFD700" opacity="0.6"/>
              </svg>
            </div>
            <h1 className="text-3xl font-black text-white mb-1">
              minegold<span className="text-yellow-400">.defi</span>
            </h1>
            <p className="text-xs text-yellow-500/60 font-mono uppercase tracking-widest mb-3">Cross-Chain Gold Refinery</p>
            <p className="text-zinc-400 text-sm mb-6 px-4">
              Swap UNI (Ethereum) for sGLDT (synthetic gold) via the Internet Computer Protocol. Trustless. On-chain.
            </p>
            {/* How it works — 3 steps */}
            <div className="grid grid-cols-3 gap-2 mb-6 text-left">
              {[
                { n: "1", title: "Connect", sub: "ICP + ETH wallets" },
                { n: "2", title: "Deposit", sub: "UNI via ckERC-20" },
                { n: "3", title: "Receive", sub: "sGLDT on ICP" },
              ].map((step) => (
                <div key={step.n} className="bg-zinc-800/60 border border-zinc-700/50 rounded-2xl p-3">
                  <div className="text-[10px] font-black text-yellow-500/60 mb-1">STEP {step.n}</div>
                  <div className="text-xs font-bold text-white">{step.title}</div>
                  <div className="text-[9px] text-zinc-500 mt-0.5">{step.sub}</div>
                </div>
              ))}
            </div>
            <GoldCTA
              data-ocid="login.primary_button"
              onClick={handleLogin}
              loading={isLoggingIn}
              size="lg"
              leadingIcon={
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-label="ICP"
                >
                  <circle cx="12" cy="12" r="12" fill="url(#icpGrad)" />
                  <defs>
                    <radialGradient id="icpGrad" cx="30%" cy="30%" r="80%">
                      <stop offset="0%" stopColor="#f15a24" />
                      <stop offset="50%" stopColor="#9b2bff" />
                      <stop offset="100%" stopColor="#29abe2" />
                    </radialGradient>
                  </defs>
                  <text
                    x="12"
                    y="16"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill="white"
                    fontFamily="monospace"
                  >
                    ICP
                  </text>
                </svg>
              }
              trailingIcon={null}
            >
              {isLoggingIn ? "Signing in…" : "Sign in with Internet Identity"}
            </GoldCTA>

          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#080808]/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={backToBankingBrave}
              aria-label="Back to Banking.Brave"
              title="Back to Banking.Brave"
              className="flex items-center gap-2 cursor-pointer bg-transparent border-none p-0 group"
            >
              <div
                className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform"
                style={{ background: "#1D4ED8" }}
              >
                <img
                  src="/bankingbrave.png"
                  alt="Banking.Brave"
                  className="w-[115%] h-[115%] object-cover"
                />
              </div>
              <span className="hidden sm:block text-sm font-black tracking-tight" style={{ color: "var(--bb-brand)" }}>
                Banking<span style={{ color: "var(--bb-text)" }}>.Brave</span>
              </span>
            </button>
            <span className="text-zinc-700">/</span>
            <button
              type="button"
              className="flex items-center gap-3 cursor-pointer bg-transparent border-none p-0"
              onClick={() => {
                setShowAdmin(false);
                setShowHistory(false);
                setShowProfile(false);
              }}
              aria-label="minegold.defi home"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-yellow-600 to-yellow-400 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-900/30">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M3 17 L15 4" stroke="#3B1F00" strokeWidth="2.5" strokeLinecap="square"/>
                  <rect x="12" y="2" width="7" height="3" rx="0.5" fill="white" opacity="0.95"/>
                  <path d="M18 1 L20 3 L18 5 L16 3 Z" fill="white" opacity="0.85"/>
                  <path d="M12 5 L10 7 L12 7 Z" fill="white" opacity="0.7"/>
                  <circle cx="4" cy="16" r="1.5" fill="#FFD700" opacity="0.9"/>
                </svg>
              </div>
              <span className="text-base sm:text-lg font-bold tracking-tight">
                minegold<span className="text-yellow-400">.defi</span>
              </span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <button
                type="button"
                data-ocid="nav.profile.link"
                onClick={() => setShowProfile(true)}
                className="hidden md:flex flex-col items-end mr-2 text-[10px] text-zinc-500 uppercase tracking-tighter hover:text-pink-400 transition-colors cursor-pointer"
              >
                <span className="font-bold text-pink-500">
                  {user.identityType}
                </span>
                <span>{user.principal.slice(0, 12)}...</span>
              </button>
            )}
            {/* Treasury panel button + dropdown */}
            <div className="relative hidden sm:block" ref={treasuryPanelRef}>
              <button
                type="button"
                data-ocid="nav.treasury.button"
                onClick={() => setShowTreasury(!showTreasury)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  showTreasury
                    ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-300"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                }`}
                title="Treasury Balances"
              >
                <Coins size={12} />
                Treasury
              </button>
              {showTreasury && (
                <div
                  data-ocid="nav.treasury.panel"
                  className="absolute right-0 top-full mt-2 w-64 bg-zinc-950 border border-zinc-700 rounded-2xl shadow-2xl z-50 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                      Treasury Holdings
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                          <span className="text-[9px] font-black text-yellow-400">
                            S
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-zinc-300">
                          sGLDT
                        </span>
                      </div>
                      <span
                        data-ocid="treasury.panel.sgldt_balance"
                        className="text-[12px] font-black text-yellow-300 font-mono"
                      >
                        {displaySGLDTLoading
                          ? "..."
                          : (Number(displaySGLDTBalance) / 1e8).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <span className="text-[9px] font-black text-blue-400">
                            U
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-zinc-300">
                          ckUNI
                        </span>
                      </div>
                      <span
                        data-ocid="treasury.panel.ckuni_balance"
                        className="text-[12px] font-black text-blue-300 font-mono"
                      >
                        {displayCkUNILoading
                          ? "..."
                          : (Number(displayCkUNIBalance) / 1e18).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 4,
                                maximumFractionDigits: 4,
                              },
                            )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-pink-500/5 border border-pink-500/20 rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center">
                          <span className="text-[9px] font-black text-pink-400">
                            U
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-zinc-300">
                            UNI (ETH)
                          </span>
                          <p className="text-[8px] text-zinc-600 font-mono leading-none mt-0.5">
                            0x2258...B91FF
                          </p>
                        </div>
                      </div>
                      <span
                        data-ocid="treasury.panel.eth_uni_balance"
                        className="text-[12px] font-black text-pink-300 font-mono"
                        title={
                          treasuryEthUniUnavailable
                            ? "Balance temporarily unavailable"
                            : undefined
                        }
                      >
                        {treasuryEthUniLoading
                          ? "..."
                          : treasuryEthUniUnavailable
                            ? "—"
                            : (treasuryEthUniBalance ?? "0.0000")}
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] text-zinc-600 mt-3 text-center">
                    Principal: c626g-iyaaa-aaaau-agpoa-cai
                  </p>
                </div>
              )}
            </div>
            {/* Live price ticker */}
            <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold text-zinc-500 mr-2">
              {ethPrice && (
                <span>
                  ETH{" "}
                  <span className="text-blue-400">
                    $
                    {ethPrice.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </span>
              )}
              {uniPrice && (
                <span>
                  UNI <span className="text-white">${uniPrice.toFixed(2)}</span>
                </span>
              )}
              {sgldtPrice && (
                <span>
                  sGLDT{" "}
                  <span className="text-yellow-400">
                    ${sgldtPrice.toFixed(4)}
                  </span>
                </span>
              )}
            </div>
            {user && isAdmin && (
              <button
                type="button"
                data-ocid="nav.admin.button"
                onClick={() => {
                  setShowAdmin(!showAdmin);
                  setShowHistory(false);
                  setShowProfile(false);
                }}
                className="w-11 h-11 inline-flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors text-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
                title={showAdmin ? "Back to Refinery" : "Admin Panel"}
                aria-label={showAdmin ? "Back to Refinery" : "Open admin panel"}
                aria-pressed={showAdmin}
              >
                {showAdmin ? <XCircle size={18} /> : <Settings size={18} />}
              </button>
            )}
            {user && (
              <button
                type="button"
                data-ocid="nav.history.button"
                onClick={() => {
                  setShowHistory(!showHistory);
                  setShowAdmin(false);
                  setShowProfile(false);
                }}
                className={`w-11 h-11 inline-flex items-center justify-center border rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400 ${
                  showHistory
                    ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-400"
                    : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400"
                }`}
                title="Transaction History"
                aria-label="Transaction history"
                aria-pressed={showHistory}
              >
                <Clock size={18} />
              </button>
            )}
            {user && (
              <button
                type="button"
                data-ocid="nav.profile.button"
                onClick={() => setShowProfile(true)}
                className="w-11 h-11 inline-flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors text-zinc-400 md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
                title="Your Profile"
                aria-label="Open your profile"
              >
                <UserCircle2 size={18} />
              </button>
            )}
            {user && (
              <button
                type="button"
                data-ocid="nav.logout.button"
                onClick={handleLogout}
                className="w-11 h-11 inline-flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors text-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={18} />
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </nav>

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

      {/* Profile Modal */}
      {showProfile && user && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          data-ocid="profile.modal"
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] p-8 w-full max-w-md relative">
            <button
              type="button"
              data-ocid="profile.close_button"
              onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400"
            >
              <XCircle size={18} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-pink-400 rounded-xl flex items-center justify-center">
                <UserCircle2 size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Your Identity</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">
                  {user.identityType}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                  Principal ID
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-mono text-zinc-300 break-all flex-1">
                    {user.principal}
                  </p>
                  <button
                    type="button"
                    data-ocid="profile.copy.button"
                    onClick={() => {
                      navigator.clipboard.writeText(user.principal);
                      setCopiedPrincipal(true);
                      setTimeout(() => setCopiedPrincipal(false), 2000);
                    }}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 transition-colors shrink-0"
                    title="Copy to clipboard"
                  >
                    {copiedPrincipal ? (
                      <CheckCircle2 size={14} className="text-green-400" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>
              {ethAddress && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                    ETH Wallet
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-mono text-zinc-300 break-all flex-1">
                      {ethAddress}
                    </p>
                    <button
                      type="button"
                      data-ocid="profile.copy_eth.button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(ethAddress);
                          setCopiedEthAddress(true);
                          setTimeout(() => setCopiedEthAddress(false), 2000);
                        } catch {
                          try {
                            const ta = document.createElement("textarea");
                            ta.value = ethAddress;
                            ta.style.position = "fixed";
                            ta.style.opacity = "0";
                            document.body.appendChild(ta);
                            ta.select();
                            document.execCommand("copy");
                            document.body.removeChild(ta);
                            setCopiedEthAddress(true);
                            setTimeout(() => setCopiedEthAddress(false), 2000);
                          } catch {
                            toast.error(
                              "Could not copy — please copy manually",
                            );
                          }
                        }
                      }}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 transition-colors shrink-0"
                      title="Copy ETH address"
                    >
                      {copiedEthAddress ? (
                        <CheckCircle2 size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {ethBalance !== null && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                    ETH Balance
                  </p>
                  <p className="text-sm font-bold text-white">
                    {safeBalance(ethBalance)}{" "}
                    <span className="text-blue-400">ETH</span>
                    {ethUsd && (
                      <span className="text-xs text-zinc-500 ml-2">
                        (~${ethUsd})
                      </span>
                    )}
                  </p>
                </div>
              )}
              {uniBalance !== null && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                    UNI Balance
                  </p>
                  <p className="text-sm font-bold text-white">
                    {safeBalance(uniBalance)}{" "}
                    <span className="text-pink-400">UNI</span>
                    {uniUsd && (
                      <span className="text-xs text-zinc-500 ml-2">
                        (~${uniUsd})
                      </span>
                    )}
                  </p>
                </div>
              )}
              {/* sGLDT Balance */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                  sGLDT Balance
                </p>
                <p className="text-sm font-bold text-white">
                  {sgldtBalance ?? "0.0000"}{" "}
                  <span className="text-yellow-500">sGLDT</span>
                  {sgldtUsd && (
                    <span className="text-xs text-zinc-500 ml-2">
                      (~${sgldtUsd})
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  data-ocid="profile.transfer_sgldt.button"
                  onClick={() => {
                    setShowProfile(false);
                    setTransferModal("sgldt");
                    setTransferTo("");
                    setTransferAmt("");
                  }}
                  className="mt-2 flex items-center gap-1 text-[10px] font-bold text-yellow-500 hover:text-yellow-400 transition-colors"
                >
                  <Send size={10} /> Transfer sGLDT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {showAdmin && user ? (
          <AdminPage />
        ) : showHistory && user ? (
          <TransactionHistoryPage />
        ) : (
          <>
            {/* ETH Wallet Connect */}
            {!ethAddress ? (
              <div className="mb-12 bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 p-8 rounded-[2rem]">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="max-w-md text-center md:text-left">
                    <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                      <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Step 1 of 2</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">
                      Connect Ethereum Wallet
                    </h2>
                    <p className="text-zinc-500 text-sm">
                      Link MetaMask or Brave Wallet to authorize your UNI deposit into the gold refinery.
                    </p>
                  </div>
                  <GoldCTA
                    data-ocid="wallet.connect.primary_button"
                    onClick={() => setConnectModalOpen(true)}
                    size="md"
                    fullWidth={false}
                    leadingIcon={<Wallet />}
                    trailingIcon={null}
                    className="w-full md:w-auto md:px-10"
                  >
                    Connect Wallet
                  </GoldCTA>
                </div>
                {walletConnectLog.length > 0 && (
                  <details
                    className="mt-4 rounded-2xl border border-zinc-800 bg-black/40 overflow-hidden group"
                    open={!!walletConnectionError}
                  >
                    <summary className="cursor-pointer select-none list-none flex items-center justify-between gap-2 px-4 py-2.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-zinc-300 transition-colors">
                      <span>Connection diagnostics</span>
                      <span className="text-[9px] font-normal text-zinc-600 normal-case tracking-normal">
                        {walletConnectLog.length}{" "}
                        {walletConnectLog.length === 1 ? "entry" : "entries"}
                        <span className="ml-2 inline-block transition-transform group-open:rotate-90">
                          ›
                        </span>
                      </span>
                    </summary>
                    <div className="border-t border-zinc-800 px-4 py-3 space-y-1 max-h-40 overflow-y-auto font-mono text-[11px]">
                      {walletConnectLog.map((line, i) => (
                        <div
                          key={`${i}-${line.slice(0, 20)}`}
                          className="text-zinc-400 break-all"
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <>
                {/* Wallet connection error — shown on mobile when all retries fail */}
                {walletConnectionError && (
                  <div
                    data-ocid="wallet.connection_error"
                    className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 flex items-start gap-3 text-xs text-amber-400 font-medium"
                  >
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div>{walletConnectionError}</div>
                      <button
                        type="button"
                        disabled={balanceRefreshing}
                        onClick={() => refreshBalances(ethAddress)}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold disabled:opacity-50"
                      >
                        {balanceRefreshing ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <ArrowRightLeft size={10} />
                        )}
                        Retry balance fetch
                      </button>
                    </div>
                  </div>
                )}
                {/* Balance diagnostic — visible compact readout of which path
                    succeeded for each balance. Helps diagnose mobile failures
                    without Web Inspector. */}
                {(ethBalanceDiag || uniBalanceDiag) && (
                  <details className="mb-3 text-[10px] font-mono">
                    <summary className="cursor-pointer text-zinc-500 hover:text-zinc-400 select-none">
                      ▸ Balance path diagnostics{ethBalanceDiag?.source ? ` · ETH=${ethBalanceDiag.source}` : ""}{uniBalanceDiag?.source ? ` · UNI=${uniBalanceDiag.source}` : ""}
                    </summary>
                    <div className="mt-2 bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-zinc-400 space-y-1">
                      {ethBalanceDiag && (
                        <div>
                          <span className="text-zinc-500">ETH ·&nbsp;</span>
                          {["wallet", "rpc", "canister"].map((k) => {
                            const o = ethBalanceDiag.outcomes[k];
                            const color =
                              o === "ok" ? "text-emerald-400"
                                : o === "null" ? "text-zinc-500"
                                  : o === "err" ? "text-red-400" : "text-zinc-700";
                            return (
                              <span key={k} className={`mr-2 ${color}`}>
                                {k}={o ?? "…"}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {uniBalanceDiag && (
                        <div>
                          <span className="text-zinc-500">UNI ·&nbsp;</span>
                          {["wallet", "rpc", "canister"].map((k) => {
                            const o = uniBalanceDiag.outcomes[k];
                            const color =
                              o === "ok" ? "text-emerald-400"
                                : o === "null" ? "text-zinc-500"
                                  : o === "err" ? "text-red-400" : "text-zinc-700";
                            return (
                              <span key={k} className={`mr-2 ${color}`}>
                                {k}={o ?? "…"}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={balanceRefreshing}
                        onClick={() => refreshBalances(ethAddress)}
                        className="mt-2 w-full py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold disabled:opacity-50"
                      >
                        {balanceRefreshing ? "Refreshing…" : "Refresh now"}
                      </button>
                    </div>
                  </details>
                )}
                {/* Wallet Stats Dashboard */}
                <div
                  data-ocid="wallet.stats.card"
                  className="mb-6 bg-gradient-to-br from-zinc-900 via-zinc-900 to-black border border-yellow-500/20 rounded-[2rem] overflow-hidden shadow-xl shadow-yellow-500/5"
                >
                  <div className="px-6 pt-5 pb-3 border-b border-zinc-800/70 flex items-center gap-2">
                    <Wallet size={14} className="text-yellow-500" />
                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">
                      Connected Wallet
                    </span>
                    <span className="ml-auto text-[10px] font-mono text-zinc-600">
                      {ethAddress.slice(0, 6)}...{ethAddress.slice(-4)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-zinc-800/70">
                    {/* ETH Balance */}
                    <div className="p-5">
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                        ETH Balance
                      </div>
                      <div className="text-xl font-black text-blue-400">
                        {ethBalance !== null ? (
                          safeBalance(ethBalance)
                        ) : (
                          <span className="text-zinc-600">&mdash;</span>
                        )}
                      </div>
                      {ethUsd && (
                        <div className="text-xs text-zinc-400 mt-1">
                          ${ethUsd} USD
                        </div>
                      )}
                      <button
                        type="button"
                        data-ocid="wallet.eth.transfer_button"
                        onClick={() => {
                          setTransferModal("eth");
                          setTransferTo("");
                          setTransferAmt("");
                        }}
                        className="mt-3 flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Send size={10} /> Transfer ETH
                      </button>
                    </div>
                    {/* UNI Balance */}
                    <div className="p-5">
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                        UNI Balance
                      </div>
                      <div className="text-xl font-black text-pink-400">
                        {uniBalance !== null ? (
                          safeBalance(uniBalance)
                        ) : (
                          <span className="text-zinc-600">&mdash;</span>
                        )}
                      </div>
                      {uniUsd && (
                        <div className="text-xs text-zinc-400 mt-1">
                          ${uniUsd} USD
                        </div>
                      )}
                      <button
                        type="button"
                        data-ocid="wallet.uni.transfer_button"
                        onClick={() => {
                          setTransferModal("uni");
                          setTransferTo("");
                          setTransferAmt("");
                        }}
                        className="mt-3 flex items-center gap-1 text-[10px] font-bold text-pink-400 hover:text-pink-300 transition-colors"
                      >
                        <Send size={10} /> Transfer UNI
                      </button>
                    </div>
                    {/* sGLDT Balance */}
                    <div className="p-5">
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                        sGLDT Balance
                      </div>
                      <div className="text-xl font-black text-yellow-500">
                        {sgldtBalance ?? (
                          <span className="text-zinc-600">&mdash;</span>
                        )}
                      </div>
                      {sgldtUsd && (
                        <div className="text-xs text-zinc-400 mt-1">
                          ${sgldtUsd} USD
                        </div>
                      )}
                      <button
                        type="button"
                        data-ocid="wallet.sgldt.transfer_button"
                        onClick={() => {
                          setTransferModal("sgldt");
                          setTransferTo("");
                          setTransferAmt("");
                        }}
                        className="mt-3 flex items-center gap-1 text-[10px] font-bold text-yellow-500 hover:text-yellow-400 transition-colors"
                      >
                        <Send size={10} /> Transfer sGLDT
                      </button>
                    </div>
                    {/* Exchange Rate */}
                    <div className="p-5">
                      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                        Exchange Rate
                      </div>
                      <div className="text-xl font-black text-yellow-400">
                        {liveRate > 0 ? (
                          liveRate.toFixed(4)
                        ) : (
                          <span className="text-zinc-600">&mdash;</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        sGLDT per UNI
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transfer Modal */}
                {transferModal && (
                  <div
                    data-ocid="wallet.transfer.modal"
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                  >
                    <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] p-8 w-full max-w-md relative">
                      <button
                        type="button"
                        data-ocid="wallet.transfer.close_button"
                        onClick={() => setTransferModal(null)}
                        className="absolute top-4 right-4 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400"
                      >
                        <XCircle size={18} />
                      </button>
                      <div className="flex items-center gap-3 mb-6">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            transferModal === "eth"
                              ? "bg-blue-500/20"
                              : transferModal === "uni"
                                ? "bg-pink-500/20"
                                : "bg-yellow-500/20"
                          }`}
                        >
                          <Send
                            size={20}
                            className={
                              transferModal === "eth"
                                ? "text-blue-400"
                                : transferModal === "uni"
                                  ? "text-pink-400"
                                  : "text-yellow-500"
                            }
                          />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-white">
                            Transfer{" "}
                            {transferModal === "eth"
                              ? "ETH"
                              : transferModal === "uni"
                                ? "UNI"
                                : "sGLDT"}
                          </h2>
                          <p className="text-xs text-zinc-500">
                            {transferModal === "sgldt"
                              ? "ICP Principal required"
                              : "Ethereum address required"}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label
                            htmlFor="transfer-address"
                            className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block"
                          >
                            {transferModal === "sgldt"
                              ? "Recipient ICP Principal"
                              : "Recipient ETH Address"}
                          </label>
                          <input
                            id="transfer-address"
                            type="text"
                            data-ocid="wallet.transfer.address_input"
                            value={transferTo}
                            onChange={(e) => setTransferTo(e.target.value)}
                            placeholder={
                              transferModal === "sgldt"
                                ? "aaaaa-bbbbb-ccccc..."
                                : "0x..."
                            }
                            className="w-full bg-zinc-900 border border-zinc-700 focus:border-yellow-500/60 text-white placeholder:text-zinc-600 rounded-xl px-4 py-3 text-sm font-mono outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="transfer-amount"
                            className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block"
                          >
                            Amount (
                            {transferModal === "eth"
                              ? "ETH"
                              : transferModal === "uni"
                                ? "UNI"
                                : "sGLDT"}
                            )
                          </label>
                          <input
                            id="transfer-amount"
                            type="number"
                            data-ocid="wallet.transfer.amount_input"
                            value={transferAmt}
                            min="0"
                            step="0.0001"
                            onChange={(e) => setTransferAmt(e.target.value)}
                            placeholder="0.0000"
                            className="w-full bg-zinc-900 border border-zinc-700 focus:border-yellow-500/60 text-white placeholder:text-zinc-600 rounded-xl px-4 py-3 text-sm font-mono outline-none transition-colors"
                          />
                        </div>
                        <GoldCTA
                          data-ocid="wallet.transfer.submit_button"
                          onClick={handleTransferSubmit}
                          disabled={
                            !transferTo ||
                            !transferAmt ||
                            Number.parseFloat(transferAmt) <= 0
                          }
                          loading={transferLoading}
                          size="md"
                          leadingIcon={<Send />}
                          trailingIcon={null}
                        >
                          {transferLoading ? "Submitting…" : "Confirm Transfer"}
                        </GoldCTA>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stat Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
                  <StatCard
                    title="Linked Address"
                    value={`${ethAddress.slice(0, 6)}...${ethAddress.slice(-4)}`}
                    sub="Ethereum Mainnet"
                    icon={<Activity className="text-pink-500" />}
                  />
                  <StatCard
                    title="UNI Balance"
                    value={
                      uniBalance !== null ? safeBalance(uniBalance) : "..."
                    }
                    sub={uniUsd ? `\u2248 $${uniUsd} USD` : "Uniswap ERC-20"}
                    icon={<Coins className="text-pink-400" />}
                  />
                  <StatCard
                    title="Exchange Rate"
                    value={liveRate.toFixed(4)}
                    sub={`UNI $${uniPrice?.toFixed(2) ?? "\u2014"} / sGLDT $${sgldtPrice?.toFixed(4) ?? "\u2014"}`}
                    icon={<ArrowRightLeft className="text-zinc-500" />}
                  />
                </div>
              </>
            )}

            {/* Unclaimed deposits banner — safety net for deposits the frontend
                missed claiming (e.g. user closed tab after tx confirmed). */}
            {user && unclaimedDeposits.length > 0 && phase === "idle" && (
              <div className="mb-6 rounded-3xl border border-yellow-500/40 bg-yellow-500/10 backdrop-blur p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-yellow-300 mb-1">
                    {unclaimedDeposits.length === 1
                      ? "1 unclaimed deposit ready to mint sGLDT"
                      : `${unclaimedDeposits.length} unclaimed deposits ready to mint sGLDT`}
                  </p>
                  <p className="text-xs text-yellow-200/70">
                    Your UNI deposit is confirmed on Ethereum. Claim your sGLDT now — this takes ~5 seconds.
                  </p>
                </div>
                <GoldCTA
                  data-ocid="deposits.claim.button"
                  loading={retryPayout.isPending}
                  onClick={async () => {
                    for (const d of unclaimedDeposits) {
                      try {
                        await retryPayout.mutateAsync(d.id as bigint);
                      } catch {
                        // continue — aggregate errors shown after loop
                      }
                    }
                    toast.success("Payout(s) processed — check your sGLDT balance");
                  }}
                  size="md"
                  fullWidth={false}
                  trailingIcon={null}
                  className="w-full sm:w-auto"
                >
                  {retryPayout.isPending ? "Claiming…" : "Claim sGLDT"}
                </GoldCTA>
              </div>
            )}

            {/* Refinery Widget */}
            <div
              className={`transition-all duration-700 ${
                !ethAddress
                  ? "opacity-30 pointer-events-none scale-95 grayscale"
                  : ""
              }`}
            >
              <div className="refinery-panel bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-6 sm:p-10">
                  <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                    <div>
                      <h2 className="text-3xl font-black bg-gradient-to-r from-white to-zinc-600 bg-clip-text text-transparent italic">
                        THE REFINERY
                      </h2>
                      {/* Treasury balances — shown directly below the heading */}
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          {displaySGLDTLoading ? (
                            <span className="text-[10px] text-zinc-600 font-mono">
                              Loading treasury…
                            </span>
                          ) : (
                            <span
                              className="text-[11px] font-semibold font-mono text-emerald-400/90"
                              data-ocid="refinery.treasury_balance"
                            >
                              <span className="text-emerald-300">
                                {formatTokenAmount(displaySGLDTBalance)}
                              </span>{" "}
                              sGLDT available
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                          {displayCkUNILoading ? (
                            <span className="text-[10px] text-zinc-600 font-mono">
                              Loading…
                            </span>
                          ) : (
                            <span
                              className="text-[11px] font-semibold font-mono text-blue-400/90"
                              data-ocid="refinery.ckuni_balance"
                            >
                              <span className="text-blue-300">
                                {formatTokenAmount(displayCkUNIBalance, 18)}
                              </span>{" "}
                              ckUNI minted
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0" />
                          {treasuryEthUniLoading ? (
                            <span className="text-[10px] text-zinc-600 font-mono">
                              Loading…
                            </span>
                          ) : (
                            <span
                              className="text-[11px] font-semibold font-mono text-pink-400/90"
                              data-ocid="refinery.eth_uni_balance"
                              title={
                                treasuryEthUniUnavailable
                                  ? "Balance temporarily unavailable"
                                  : undefined
                              }
                            >
                              <span className="text-pink-300">
                                {treasuryEthUniUnavailable
                                  ? "—"
                                  : (treasuryEthUniBalance ?? "0.0000")}
                              </span>{" "}
                              UNI on ETH
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
                          UNI &rarr; sGLDT
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="bg-black border border-zinc-800 px-4 py-2 rounded-xl text-[10px] font-bold text-zinc-400">
                        GAS: ~0.002 ETH
                      </div>
                      <div className="text-[9px] text-blue-500/60 font-mono">
                        via ICP ERC-20 Minter
                      </div>
                    </div>
                  </header>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    {/* Input UNI */}
                    <div className="lg:col-span-2 group">
                      <div className="bg-black/50 p-6 sm:p-8 rounded-3xl border border-zinc-800 group-focus-within:border-pink-500/40 transition-all">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">
                            From (Ethereum)
                          </span>
                          <span className="text-xs text-pink-500 font-bold">
                            UNI
                          </span>
                        </div>
                        <input
                          data-ocid="refinery.uni.input"
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          aria-label="UNI amount to swap"
                          className="bg-transparent text-3xl sm:text-4xl font-bold w-full outline-none text-white placeholder:text-zinc-600 focus-visible:placeholder:text-zinc-500 tabular-nums min-w-0"
                          value={uniAmount}
                          onChange={(e) => {
                            let val = e.target.value.trim();
                            // Reject scientific notation, letters, and other invalid chars
                            // Allow: digits, one decimal point, optional leading "."
                            if (!/^\d*\.?\d*$/.test(val)) return;
                            // Collapse a leading "." into "0."
                            if (val.startsWith(".")) val = `0${val}`;
                            // Allow empty or partial-input intermediate states
                            if (val === "" || val === "0" || val.endsWith(".")) {
                              setUniAmount(val);
                              return;
                            }
                            const raw = Number.parseFloat(val);
                            if (Number.isNaN(raw) || raw < 0) {
                              setUniAmount("");
                              return;
                            }
                            const max = Number.parseFloat(uniBalance ?? "");
                            if (Number.isFinite(max) && raw > max) {
                              // Clamp to balance without losing user precision
                              setUniAmount(uniBalance ?? "");
                              return;
                            }
                            // Preserve the user's typed string — avoids precision loss
                            // from Number→string conversion.
                            setUniAmount(val);
                          }}
                          disabled={isActive}
                        />
                        {uniBalance && (
                          <button
                            type="button"
                            onClick={() => setUniAmount(uniBalance)}
                            className="mt-2 px-3 py-2 text-xs text-pink-500 font-bold hover:underline hover:bg-pink-500/5 rounded-md -ml-1"
                          >
                            MAX: {uniBalance} UNI
                          </button>
                        )}
                        {uniBalance &&
                          Number.parseFloat(uniAmount) >
                            Number.parseFloat(uniBalance) && (
                            <p className="mt-1.5 text-xs text-red-400 font-semibold">
                              Exceeds your UNI balance
                            </p>
                          )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center justify-center lg:col-span-1 py-4 lg:py-0">
                      <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-yellow-500 shadow-xl">
                        <ArrowRightLeft size={24} />
                      </div>
                    </div>

                    {/* Output sGLDT */}
                    <div className="lg:col-span-2 group">
                      <div className="bg-yellow-500/[0.03] p-6 sm:p-8 rounded-3xl border border-yellow-500/10 transition-all">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[10px] font-black text-yellow-600 tracking-widest uppercase">
                            To (ICP Network)
                          </span>
                          <span className="text-xs text-yellow-500 font-bold">
                            sGLDT
                          </span>
                        </div>
                        <div className="text-4xl font-bold text-yellow-500 truncate">
                          {phase === "success" && sgldtReleased
                            ? sgldtReleased
                            : estimatedGold.toFixed(5)}
                        </div>
                      </div>
                    </div>
                  </div>

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
                      <div
                        data-ocid="refinery.error_state"
                        className="space-y-4"
                      >
                        {statusMsg === "still_processing" ? (
                          /* Soft state: ETH confirmed but backend still processing — auto-polling */
                          <>
                            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 flex items-start gap-4">
                              <div className="shrink-0">
                                <PixelAxeAnimation label="" />
                              </div>
                              <div className="flex-1 pt-1">
                                <p className="font-bold text-amber-400 mb-1">
                                  Ethereum Transaction Confirmed
                                </p>
                                <p className="text-sm text-zinc-400 mb-2">
                                  Still mining — checking your sGLDT release
                                  automatically every 3 seconds.
                                </p>
                                {currentTxHash && (
                                  <a
                                    href={`https://etherscan.io/tx/${currentTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 underline transition-colors"
                                    data-ocid="refinery.etherscan_processing.link"
                                  >
                                    <Activity size={11} />
                                    View on Etherscan
                                  </a>
                                )}
                                <p className="text-[10px] text-zinc-600 mt-2 font-mono animate-pulse">
                                  Checking transaction... (attempt {pollAttempt}
                                  )
                                </p>
                              </div>
                            </div>
                            {/* Payout-specific error message — shown if a payout attempt fails */}
                            {retryErrorMsg && (
                              <div
                                data-ocid="refinery.retry_error.error_state"
                                className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 flex items-start gap-3"
                              >
                                <XCircle
                                  className="text-red-400 flex-shrink-0 mt-0.5"
                                  size={18}
                                />
                                <div>
                                  <p className="text-sm font-semibold text-red-400 mb-0.5">
                                    Payout Error
                                  </p>
                                  <p className="text-xs text-zinc-400">
                                    {retryErrorMsg}
                                  </p>
                                  {retryErrorMsg
                                    .toLowerCase()
                                    .includes("too low") && (
                                    <p className="text-xs text-zinc-500 mt-1">
                                      The treasury needs to be topped up with
                                      sGLDT before this payout can complete.
                                      Your deposit is safe — retrying
                                      automatically.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            <button
                              type="button"
                              data-ocid="refinery.view_history.button"
                              onClick={() => setShowHistory(true)}
                              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold h-12 rounded-2xl transition-all text-sm"
                            >
                              View Transaction History
                            </button>
                          </>
                        ) : (
                          /* Hard error state */
                          <>
                            <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-5 flex items-start gap-3">
                              <XCircle
                                className="text-red-400 flex-shrink-0 mt-0.5"
                                size={20}
                              />
                              <div>
                                <p className="font-bold text-red-400 mb-1">
                                  Error
                                </p>
                                <p className="text-sm text-zinc-400">
                                  {statusMsg}
                                </p>
                                {currentTxHash && (
                                  <a
                                    href={`https://etherscan.io/tx/${currentTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 underline transition-colors"
                                    data-ocid="refinery.etherscan_error.link"
                                  >
                                    <Activity size={11} />
                                    Track on Etherscan
                                  </a>
                                )}
                              </div>
                            </div>
                            {/* Step tracker + manual recovery panel */}
                            {miningSteps.length > 0 && (
                              <div className="rounded-2xl bg-zinc-900 border border-zinc-700/50 p-4 space-y-2">
                                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                  Progress
                                </div>
                                {miningSteps.map((s) => (
                                  <div key={s.id} className="flex items-start gap-2 text-xs">
                                    <span className="mt-0.5 shrink-0 text-sm">
                                      {s.status === "done" ? "✅" : s.status === "error" ? "❌" : s.status === "active" ? "⏳" : "⚪"}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className={
                                        s.status === "done" ? "text-emerald-400"
                                        : s.status === "error" ? "text-red-400"
                                        : s.status === "active" ? "text-yellow-400"
                                        : "text-zinc-500"
                                      }>
                                        {s.label}
                                      </div>
                                      {s.detail && (
                                        <div className="text-[10px] text-zinc-500 font-mono break-all mt-0.5">
                                          {s.detail}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* PRIMARY recovery — one-click finalize.
                                Same button as in wallet_confirming, placed
                                here too because that's where users land if
                                the automated hash-capture race fails. */}
                            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/40 p-4 space-y-2">
                              <div className="flex items-start gap-2">
                                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                                <div className="text-[11px] text-emerald-300 leading-relaxed">
                                  <strong className="block text-emerald-200 mb-0.5">Already signed your deposit?</strong>
                                  Tap below — we'll find your deposit on Ethereum and finalize it automatically.
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={manualRecoveryBusy}
                                onClick={finalizeFromChain}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                                data-ocid="refinery.finalize_from_chain.error_button"
                              >
                                {manualRecoveryBusy ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Searching Ethereum…
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={16} />
                                    Finalize my deposit
                                  </>
                                )}
                              </button>
                            </div>
                            <details className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4">
                              <summary className="cursor-pointer text-xs font-bold text-yellow-400 select-none">
                                Paste tx hash manually (advanced)
                              </summary>
                              <div className="mt-3 space-y-2">
                                <p className="text-[11px] text-zinc-400 leading-relaxed">
                                  Rarely needed — the green button above is the fastest path. Use this
                                  only if you want to explicitly paste a specific deposit hash.
                                </p>
                                <input
                                  type="text"
                                  value={manualTxHash}
                                  onChange={(e) => setManualTxHash(e.target.value)}
                                  placeholder="0x…"
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-yellow-300 font-mono placeholder:text-zinc-600"
                                />
                                <button
                                  type="button"
                                  disabled={manualRecoveryBusy || !manualTxHash}
                                  onClick={() => resumeFromTxHash(manualTxHash)}
                                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 rounded-lg disabled:opacity-50 text-sm"
                                >
                                  {manualRecoveryBusy ? (
                                    <Loader2 className="w-4 h-4 mx-auto animate-spin" />
                                  ) : (
                                    "Resume monitoring"
                                  )}
                                </button>
                              </div>
                            </details>
                            <GoldCTA
                              data-ocid="refinery.try_again.button"
                              tone="neutral"
                              size="md"
                              trailingIcon={null}
                              onClick={async () => {
                                // Reset stuck deposit on backend if we have a request ID
                                if (depositRequestId !== null && actor) {
                                  try {
                                    await actor.resetMiningPhase(
                                      depositRequestId,
                                    );
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
                            >
                              Try Again
                            </GoldCTA>
                          </>
                        )}
                      </div>
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
                      /* Waiting for Ethereum on-chain confirmation — new rich
                         visualization: stepper + cross-chain flow + live block
                         meter + prominent pixel mining animation. */
                      <div
                        data-ocid="refinery.eth_monitoring.loading_state"
                        className="space-y-4"
                      >
                        <WorkflowStepper currentStep={2} />
                        <CrossChainFlow phase="bridge" amount={uniAmount} />

                        {/* Calm monitoring hero — the pixel axe is now a
                         *  subordinate decorative element, scaled down to
                         *  ~140px and stripped of its arcade HUD + status
                         *  label. The real status signal is the bridge
                         *  progress card immediately below. The clean card
                         *  surface and neutral border (no more fluorescent
                         *  yellow) tone the whole surface down. */}
                        <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden p-5 flex items-center gap-5">
                          <div className="shrink-0 scale-90 sm:scale-100 origin-left">
                            <PixelAxeAnimation
                              label=""
                              compact
                              pollPing={pollAttempt > 0 ? pollAttempt : undefined}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                              Status
                            </p>
                            <p className="font-bold text-white text-sm sm:text-base mb-1 leading-snug">
                              {bridgeProgress >= 1
                                ? "Releasing sGLDT"
                                : bridgeProgress > 0
                                  ? "Minting ckUNI to treasury"
                                  : "Awaiting Ethereum confirmations"}
                            </p>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">
                              The chain-key minter waits for 12 Ethereum
                              blocks, then credits ckUNI to the treasury.
                              sGLDT releases automatically on arrival.
                            </p>
                          </div>
                        </div>

                        {/* Bridge progress — treasury ckUNI delta as a live
                         *  0→100% bar. Driven by icrc1_balance_of queries
                         *  every 3-6s, so movement reflects actual on-chain
                         *  state, not a simulated countdown. */}
                        <div
                          className="rounded-2xl border border-zinc-800 bg-black/30 p-4 space-y-2"
                          aria-live="polite"
                          aria-atomic="true"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" aria-hidden />
                              <span className="text-[11px] font-black text-zinc-300 uppercase tracking-widest truncate">
                                Bridge progress
                              </span>
                            </div>
                            <span
                              className="text-[11px] font-mono font-bold text-zinc-200 tabular-nums"
                              data-ocid="refinery.bridge.progress_pct"
                            >
                              {Math.round(bridgeProgress * 100)}%
                            </span>
                          </div>
                          <div
                            className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(bridgeProgress * 100)}
                            aria-label="Bridge progress: percent of your UNI deposit credited to the ICP treasury as ckUNI"
                          >
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-sky-300 transition-[width] duration-500 ease-out"
                              style={{
                                width: `${Math.max(2, Math.round(bridgeProgress * 100))}%`,
                              }}
                            />
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">
                            {bridgeProgress >= 1
                              ? "ckUNI received — finalizing sGLDT release (under 10 s)."
                              : bridgeProgress > 0
                                ? "Minter is crediting ckUNI to the treasury. Typically finishes within a minute of the 12th Ethereum confirmation."
                                : "Waiting for 12 Ethereum confirmations before the minter releases ckUNI. Typically 3–5 minutes."}
                          </p>
                          <p className="text-[10px] text-zinc-500 leading-relaxed">
                            Safe to close this tab — your deposit is recorded
                            and the canister will finalize on its own.
                          </p>
                        </div>

                        {/* Live block confirmation meter — pulls REAL data
                            from viem publicClient.getTransactionReceipt +
                            getBlockNumber. Shows the Ethereum-side
                            confirmations count alongside the bridge progress
                            so the user sees both halves of the journey. */}
                        <BlockConfirmationMeter txHash={currentTxHash} />

                        {/* Etherscan link + tx hash */}
                        {currentTxHash && (
                          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">
                                Deposit Tx
                              </div>
                              <code className="text-[11px] text-blue-300 font-mono truncate block">
                                {currentTxHash.slice(0, 14)}…{currentTxHash.slice(-8)}
                              </code>
                            </div>
                            <a
                              href={`https://etherscan.io/tx/${currentTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-300 hover:text-blue-200 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl transition-colors"
                              data-ocid="refinery.etherscan.link"
                            >
                              <Activity size={11} />
                              Etherscan ↗
                            </a>
                          </div>
                        )}

                        {statusMsg && (
                          <div className="text-center text-xs text-zinc-500 font-medium">
                            {statusMsg}
                          </div>
                        )}

                        {/* Manual status check — useful on mobile when the
                         *  browser has throttled the polling interval and
                         *  the user wants to force an immediate recheck.
                         *  Calls the SAME retryUNIDepositPayout path the
                         *  auto-poll uses, so behavior is identical. */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <GoldCTA
                            data-ocid="refinery.check_now.button"
                            tone="info"
                            size="md"
                            trailingIcon={null}
                            disabled={!actor || !depositRequestId}
                            onClick={async () => {
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
                            }}
                          >
                            Check now
                          </GoldCTA>
                          <GoldCTA
                            data-ocid="refinery.cancel.button"
                            tone="neutral"
                            size="md"
                            trailingIcon={null}
                            onClick={() => {
                              abortRef.current = true;
                              setPhase("idle");
                              setStatusMsg("");
                            }}
                          >
                            Cancel monitoring
                          </GoldCTA>
                        </div>
                      </div>
                    ) : phase === "awaiting_deposit" ? (
                      /* Legacy fallback phase — should not show in normal flow */
                      <div
                        data-ocid="refinery.awaiting_deposit_state"
                        className="space-y-4"
                      >
                        <div className="flex items-center gap-2 px-1">
                          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
                          <p className="font-bold text-yellow-400 text-sm">
                            Waiting for your deposit on Ethereum...
                          </p>
                        </div>
                        <div className="rounded-2xl bg-zinc-900 border border-zinc-700 p-4">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">
                            Send UNI to this address
                          </p>
                          <div className="flex items-center gap-2">
                            <code
                              className="flex-1 text-xs text-yellow-300 font-mono break-all leading-relaxed"
                              data-ocid="refinery.deposit_address"
                            >
                              {depositAddress}
                            </code>
                            <button
                              type="button"
                              data-ocid="refinery.copy_deposit_address.button"
                              onClick={copyDepositAddress}
                              aria-label="Copy deposit address"
                              className="shrink-0 w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center transition-colors"
                            >
                              {copiedDepositAddress ? (
                                <CheckCircle2
                                  size={15}
                                  className="text-emerald-400"
                                />
                              ) : (
                                <Copy size={15} className="text-zinc-400" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            data-ocid="refinery.cancel.button"
                            onClick={() => {
                              abortRef.current = true;
                              setPhase("idle");
                            }}
                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold h-14 rounded-2xl transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : isActive ? (
                      /* Phase: releasing_sgldt — sGLDT being transferred */
                      <div
                        data-ocid="refinery.mining.loading_state"
                        className="space-y-6"
                      >
                        {phase === "releasing_sgldt" && (
                          <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-4 flex items-center gap-4">
                            <div className="shrink-0 bg-zinc-900/80 rounded-xl p-1">
                              <PixelAxeAnimation label="" success={true} />
                            </div>
                            <div>
                              <p className="font-bold text-yellow-400 text-sm">
                                Releasing sGLDT to Your Account
                              </p>
                              <p className="text-xs text-zinc-400 mt-1">
                                ETH transaction confirmed — sGLDT is being
                                transferred from the treasury to your ICP
                                account.
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
                          <span>{phaseLabels[phaseStep - 1] ?? statusMsg}</span>
                          <span className="text-pink-500">
                            {Math.round((phaseStep / 3) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden p-0.5">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 via-yellow-400 to-pink-600 rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(255,0,122,0.3)]"
                            style={{ width: `${(phaseStep / 3) * 100}%` }}
                          />
                        </div>
                        <div className="text-center text-xs text-zinc-500 font-medium">
                          {statusMsg}
                        </div>
                        <div className="flex justify-center">
                          <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-bold italic">
                            <Loader2 size={12} className="animate-spin" />
                            Processing on ICP...
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <GoldCTA
                          data-ocid="refinery.start.primary_button"
                          onClick={startMining}
                          disabled={
                            !uniAmount ||
                            !ethAddress ||
                            !user ||
                            (!actor && !actorTimedOut) ||
                            liveRate <= 0 ||
                            !uniPrice ||
                            !sgldtPrice
                          }
                          aria-label="Mine sGLDT by depositing UNI"
                          size="lg"
                          className="shadow-2xl"
                        >
                          ⛏ Mine sGLDT
                        </GoldCTA>
                        {(liveRate <= 0 || !uniPrice || !sgldtPrice) && user && ethAddress && (
                          <p className="mt-2 text-center text-xs text-amber-400">
                            Waiting for live exchange rate before enabling swap…
                          </p>
                        )}
                        {user && !actor && !actorTimedOut && (
                          <p className="mt-2 text-center text-xs text-zinc-500 animate-pulse">
                            Connecting to canister...
                          </p>
                        )}
                        {actorTimedOut && (
                          <div className="mt-2 text-center space-y-2">
                            <p className="text-xs text-red-400">
                              Unable to reach the refinery. Please refresh the
                              page.
                            </p>
                            <button
                              type="button"
                              onClick={() => window.location.reload()}
                              className="text-xs text-zinc-400 underline underline-offset-2 hover:text-white transition-colors"
                            >
                              Retry
                            </button>
                          </div>
                        )}

                        {/* Recover-a-previous-deposit panel — shown only when
                         *  the user is authenticated + has wallet connected +
                         *  is idle. Hidden behind a subtle text button so it
                         *  doesn't clutter the primary flow. Covers two
                         *  scenarios: (a) the user sent UNI but the frontend
                         *  never recorded the deposit on the canister (tab
                         *  killed mid-flow, network drop, older version of
                         *  the dApp) — hit "Scan Ethereum" to have the
                         *  canister find the tx by address; (b) user has the
                         *  specific txHash — paste it in for a direct verify
                         *  + finalize. Both paths run the same canister
                         *  verification as the happy-path flow, so the
                         *  verification guarantees are identical.  */}
                        {user && ethAddress && actor && (
                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={() => setShowRecoveryPanel((v) => !v)}
                              className="w-full text-center text-[11px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors py-2"
                              data-ocid="refinery.recovery.toggle"
                              aria-expanded={showRecoveryPanel}
                            >
                              {showRecoveryPanel
                                ? "Hide recovery options"
                                : "Already sent UNI? Recover a previous deposit"}
                            </button>

                            {showRecoveryPanel && (
                              <div className="mt-3 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-4">
                                <div>
                                  <p className="text-[11px] font-black text-blue-300 uppercase tracking-widest mb-1">
                                    Recover a previous deposit
                                  </p>
                                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                                    If you sent UNI to the bridge but the dApp
                                    didn't track the swap, enter the same UNI
                                    amount above, then either scan for your
                                    recent tx or paste its hash. The canister
                                    re-verifies the calldata and releases your
                                    sGLDT.
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  data-ocid="refinery.recovery.scan"
                                  onClick={finalizeFromChain}
                                  disabled={
                                    manualRecoveryBusy ||
                                    !uniAmount ||
                                    Number.parseFloat(uniAmount || "0") <= 0
                                  }
                                  className="w-full min-h-[48px] rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-200 font-bold text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {manualRecoveryBusy
                                    ? "Searching Ethereum…"
                                    : "Scan Ethereum for my deposit"}
                                </button>

                                <div className="flex items-center gap-3">
                                  <span className="flex-1 h-px bg-zinc-800" />
                                  <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
                                    or
                                  </span>
                                  <span className="flex-1 h-px bg-zinc-800" />
                                </div>

                                <div className="space-y-2">
                                  <label
                                    htmlFor="recovery-tx-hash"
                                    className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest"
                                  >
                                    Paste your deposit tx hash
                                  </label>
                                  <input
                                    id="recovery-tx-hash"
                                    type="text"
                                    inputMode="text"
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    value={manualTxHash}
                                    onChange={(e) =>
                                      setManualTxHash(e.target.value)
                                    }
                                    placeholder="0x… 64 hex chars"
                                    className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-blue-400/60"
                                  />
                                  <button
                                    type="button"
                                    data-ocid="refinery.recovery.tx_submit"
                                    onClick={() => resumeFromTxHash(manualTxHash)}
                                    disabled={
                                      manualRecoveryBusy ||
                                      !manualTxHash ||
                                      !uniAmount ||
                                      Number.parseFloat(uniAmount || "0") <= 0
                                    }
                                    className="w-full min-h-[44px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {manualRecoveryBusy
                                      ? "Verifying…"
                                      : "Verify & release sGLDT"}
                                  </button>
                                </div>

                                {(!uniAmount ||
                                  Number.parseFloat(uniAmount || "0") <= 0) && (
                                  <p className="text-[10px] text-amber-400 text-center">
                                    Enter the UNI amount you deposited in the
                                    input above — the canister needs it to
                                    match the on-chain tx.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Widget Footer */}
                <div className="bg-black/40 border-t border-zinc-800 p-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">
                  <span className="flex items-center gap-1">
                    <Lock size={10} /> ckUNI Ledger:{" "}
                    {CKUNI_LEDGER_CANISTER_ID.slice(0, 20)}...
                  </span>
                  <span className="hidden sm:block text-zinc-800">|</span>
                  <span className="flex items-center gap-1">
                    <Activity size={10} /> ICP ERC-20 Minter: sv3dd-oaaaa...
                  </span>
                </div>
              </div>
            </div>

            {/* How it works strip */}
            <div className="mt-12 rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6 sm:p-8">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-5 text-center">How the Refinery Works</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                  { icon: "🔗", step: "1", title: "Sign In", desc: "Authenticate with Internet Identity — no seed phrase, no custodian." },
                  { icon: "💼", step: "2", title: "Connect Wallet", desc: "Link MetaMask or Brave Wallet on Ethereum mainnet." },
                  { icon: "⛏", step: "3", title: "Approve & Deposit", desc: "Approve UNI spend, then the ckERC-20 helper pulls funds on-chain." },
                  { icon: "🪙", step: "4", title: "Receive sGLDT", desc: "sGLDT (synthetic gold) lands in your ICP account automatically." },
                ].map((s) => (
                  <div key={s.step} className="flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg">{s.icon}</div>
                    <div className="text-[9px] font-black text-yellow-500/60 uppercase tracking-widest">Step {s.step}</div>
                    <div className="text-sm font-bold text-white">{s.title}</div>
                    <div className="text-[11px] text-zinc-500 leading-relaxed">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>

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
