import { useInternetIdentity } from "../auth";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal as DfinityPrincipal } from "@dfinity/principal";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackendActor } from "./useBackendActor";
import { useCoinGeckoPrices } from "./useCoinGeckoPrices";

// ── ICRC-1 minimal IDL for direct balance queries + transfers ────────────────

const icrc1BalanceIDL = ({ IDL }: { IDL: any }) => {
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  return IDL.Service({
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ["query"]),
  });
};

const icrc1LedgerIDL = ({ IDL }: { IDL: any }) => {
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const TransferArg = IDL.Record({
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    to: Account,
    amount: IDL.Nat,
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
  });
  const TransferError = IDL.Variant({
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    BadBurn: IDL.Record({ min_burn_amount: IDL.Nat }),
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
    TooOld: IDL.Null,
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    TemporarilyUnavailable: IDL.Null,
    GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
  });
  const TransferResult = IDL.Variant({
    Ok: IDL.Nat,
    Err: TransferError,
  });
  return IDL.Service({
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ["query"]),
    icrc1_fee: IDL.Func([], [IDL.Nat], ["query"]),
    icrc1_transfer: IDL.Func([TransferArg], [TransferResult], []),
  });
};

// ── Direct admin-transfer IDL (bypasses bindgen wrapper) ─────────────────────

const directDepositIDL = ({ IDL }: { IDL: any }) => {
  const AutoFinalizeResult = IDL.Variant({
    ok: IDL.Record({ requestId: IDL.Nat, txHash: IDL.Text }),
    alreadyExists: IDL.Record({ requestId: IDL.Nat, txHash: IDL.Text, status: IDL.Text }),
    noDepositFound: IDL.Text,
    apiError: IDL.Text,
  });
  return IDL.Service({
    submitUNIDeposit: IDL.Func(
      [IDL.Text, IDL.Nat, IDL.Text, IDL.Opt(IDL.Nat)],
      [IDL.Nat],
      [],
    ),
    verifyEthTransaction: IDL.Func([IDL.Nat], [IDL.Text], []),
    getEthBalanceOnchain: IDL.Func([IDL.Text], [IDL.Nat], []),
    getUniBalanceOnchain: IDL.Func([IDL.Text], [IDL.Nat], []),
    getWalletBalances: IDL.Func(
      [IDL.Text],
      [IDL.Record({ ethWei: IDL.Nat, uniWei: IDL.Nat })],
      [],
    ),
    autoFinalizeUNIDeposit: IDL.Func(
      [IDL.Text, IDL.Nat, IDL.Opt(IDL.Nat)],
      [AutoFinalizeResult],
      [],
    ),
  });
};

/** Direct submitUNIDeposit — creates a FRESH HttpAgent + actor for this single
 * call so the cached bindgen actor (which can carry a stale II delegation after
 * a long wait on mobile) never causes the infamous "Invalid text argument: []"
 * decode failure. Returns the backend's deposit request ID. */
export async function directSubmitUNIDeposit(opts: {
  identity: unknown;
  ethAddress: string;
  uniAmountE8s: bigint;
  txHash: string;
  rateHint: bigint | null;
}): Promise<bigint> {
  const BACKEND_CANISTER_ID = "c626g-iyaaa-aaaau-agpoa-cai";
  const agent = await HttpAgent.create({
    identity: opts.identity as never,
    host: "https://icp-api.io",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actor = Actor.createActor(directDepositIDL, {
    agent,
    canisterId: BACKEND_CANISTER_ID,
  }) as any;
  // Scrub every arg into plain primitives that Candid accepts unambiguously.
  const cleanEth = String(opts.ethAddress).trim();
  const cleanHash = String(opts.txHash).trim();
  const rateOpt: [] | [bigint] = opts.rateHint == null ? [] : [opts.rateHint];
  return (await actor.submitUNIDeposit(
    cleanEth,
    opts.uniAmountE8s,
    cleanHash,
    rateOpt,
  )) as bigint;
}

/** Anonymous canister-side balance read. Works even when the user has no
 *  wallet injected (regular mobile browser tabs), when Brave Shields blocks
 *  public RPC fetches, and when viem's fallback transport times out — the
 *  backend canister fetches from Etherscan V2 via HTTPS outcall, bypassing
 *  every browser-level constraint. Returns wei as bigint, or null on error. */
export async function fetchEthBalanceViaCanister(ethAddress: string): Promise<bigint | null> {
  try {
    const BACKEND_CANISTER_ID = "c626g-iyaaa-aaaau-agpoa-cai";
    const agent = await HttpAgent.create({ host: "https://icp-api.io" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actor = Actor.createActor(directDepositIDL, { agent, canisterId: BACKEND_CANISTER_ID }) as any;
    const n = (await actor.getEthBalanceOnchain(String(ethAddress).trim())) as bigint;
    return n;
  } catch (err) {
    console.warn("[balance] canister ETH fetch failed:", err);
    return null;
  }
}

export type AutoFinalizeOutcome =
  | { kind: "ok"; requestId: bigint; txHash: string }
  | { kind: "alreadyExists"; requestId: bigint; txHash: string; status: string }
  | { kind: "noDepositFound"; detail: string }
  | { kind: "apiError"; detail: string };

/** Ask the backend to find the user's most recent deposit tx on-chain and
 *  finalize it (create record, verify, pay). The reliable escape hatch for
 *  mobile flows where the frontend never captured the deposit tx hash. */
export async function autoFinalizeUNIDeposit(opts: {
  identity: unknown;
  ethAddress: string;
  uniAmountE8s: bigint;
  rateHint: bigint | null;
}): Promise<AutoFinalizeOutcome> {
  const BACKEND_CANISTER_ID = "c626g-iyaaa-aaaau-agpoa-cai";
  const agent = await HttpAgent.create({
    identity: opts.identity as never,
    host: "https://icp-api.io",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actor = Actor.createActor(directDepositIDL, { agent, canisterId: BACKEND_CANISTER_ID }) as any;
  const rateOpt: [] | [bigint] = opts.rateHint == null ? [] : [opts.rateHint];
  const result = await actor.autoFinalizeUNIDeposit(
    String(opts.ethAddress).trim(),
    opts.uniAmountE8s,
    rateOpt,
  );
  // Candid variant → discriminated union
  if ("ok" in result) {
    return { kind: "ok", requestId: result.ok.requestId as bigint, txHash: result.ok.txHash as string };
  }
  if ("alreadyExists" in result) {
    return {
      kind: "alreadyExists",
      requestId: result.alreadyExists.requestId as bigint,
      txHash: result.alreadyExists.txHash as string,
      status: result.alreadyExists.status as string,
    };
  }
  if ("noDepositFound" in result) {
    return { kind: "noDepositFound", detail: result.noDepositFound as string };
  }
  return { kind: "apiError", detail: result.apiError as string };
}

/** Unified balance fetch — one IC round-trip for ETH + UNI. Returns both
 *  balances in wei; either can be 0 if that individual fetch failed. Faster
 *  than calling ETH + UNI separately because there's only one IC handshake. */
export async function fetchWalletBalancesViaCanister(
  ethAddress: string,
): Promise<{ ethWei: bigint; uniWei: bigint } | null> {
  try {
    const BACKEND_CANISTER_ID = "c626g-iyaaa-aaaau-agpoa-cai";
    const agent = await HttpAgent.create({ host: "https://icp-api.io" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actor = Actor.createActor(directDepositIDL, { agent, canisterId: BACKEND_CANISTER_ID }) as any;
    const result = (await actor.getWalletBalances(String(ethAddress).trim())) as {
      ethWei: bigint;
      uniWei: bigint;
    };
    return { ethWei: result.ethWei, uniWei: result.uniWei };
  } catch (err) {
    console.warn("[balance] unified canister fetch failed:", err);
    return null;
  }
}

export async function fetchUniBalanceViaCanister(ethAddress: string): Promise<bigint | null> {
  try {
    const BACKEND_CANISTER_ID = "c626g-iyaaa-aaaau-agpoa-cai";
    const agent = await HttpAgent.create({ host: "https://icp-api.io" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actor = Actor.createActor(directDepositIDL, { agent, canisterId: BACKEND_CANISTER_ID }) as any;
    const n = (await actor.getUniBalanceOnchain(String(ethAddress).trim())) as bigint;
    return n;
  } catch (err) {
    console.warn("[balance] canister UNI fetch failed:", err);
    return null;
  }
}

const directAdminIDL = ({ IDL }: { IDL: any }) => {
  const WhoAmI = IDL.Record({
    caller: IDL.Text,
    isHardcodedAdmin: IDL.Bool,
    hasAdminRole: IDL.Bool,
    isAdmin: IDL.Bool,
  });
  return IDL.Service({
    adminTransferCkUNI: IDL.Func([IDL.Principal, IDL.Nat], [IDL.Text], []),
    adminTransferSGLDT: IDL.Func([IDL.Principal, IDL.Nat], [IDL.Text], []),
    whoAmI: IDL.Func([], [WhoAmI], ["query"]),
    adminGrantAdmin: IDL.Func([IDL.Principal], [IDL.Text], []),
  });
};

/** Direct whoAmI — bypasses bindgen wrapper so it works without regenerating
 * the frontend declarations after adding the method to the backend. */
export async function directWhoAmI(identity: unknown): Promise<{
  caller: string;
  isHardcodedAdmin: boolean;
  hasAdminRole: boolean;
  isAdmin: boolean;
}> {
  const BACKEND_CANISTER_ID = "c626g-iyaaa-aaaau-agpoa-cai";
  const agent = await HttpAgent.create({
    identity: identity as never,
    host: "https://icp-api.io",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actor = Actor.createActor(directAdminIDL, {
    agent,
    canisterId: BACKEND_CANISTER_ID,
  }) as any;
  return (await actor.whoAmI()) as {
    caller: string;
    isHardcodedAdmin: boolean;
    hasAdminRole: boolean;
    isAdmin: boolean;
  };
}

/** Direct adminGrantAdmin — promotes a principal to admin. */
export async function directAdminGrantAdmin(identity: unknown, newAdminText: string): Promise<string> {
  const BACKEND_CANISTER_ID = "c626g-iyaaa-aaaau-agpoa-cai";
  const agent = await HttpAgent.create({
    identity: identity as never,
    host: "https://icp-api.io",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actor = Actor.createActor(directAdminIDL, {
    agent,
    canisterId: BACKEND_CANISTER_ID,
  }) as any;
  const newAdminPrincipal = DfinityPrincipal.fromText(newAdminText.trim());
  return (await actor.adminGrantAdmin(newAdminPrincipal)) as string;
}

/** Direct admin transfer — makes the update call straight through @dfinity/agent
 * with the admin's II identity, bypassing the generated bindgen wrapper. */
export async function directAdminTransfer(opts: {
  identity: unknown;
  token: "ckUNI" | "sGLDT";
  to: string;
  amount: bigint;
}): Promise<string> {
  const BACKEND_CANISTER_ID = "c626g-iyaaa-aaaau-agpoa-cai";
  const agent = await HttpAgent.create({
    identity: opts.identity as never,
    host: "https://icp-api.io",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actor = Actor.createActor(directAdminIDL, {
    agent,
    canisterId: BACKEND_CANISTER_ID,
  }) as any;
  const toPrincipal = DfinityPrincipal.fromText(opts.to.trim());
  if (opts.token === "ckUNI") {
    return (await actor.adminTransferCkUNI(toPrincipal, opts.amount)) as string;
  }
  return (await actor.adminTransferSGLDT(toPrincipal, opts.amount)) as string;
}

/** Transfer ICRC-1 tokens from the caller's own account. The `identity` is the
 * authenticated II identity (from useInternetIdentity). The ledger ICRC-1 call
 * debits the caller's account directly — no backend canister hop needed. */
export async function icrc1TransferFromCaller(opts: {
  identity: unknown;
  canisterId: string;
  to: string;
  amountE8s: bigint;
}): Promise<{ ok: true; blockIndex: bigint } | { ok: false; error: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agent = await HttpAgent.create({
    identity: opts.identity as never,
    host: "https://icp-api.io",
  });
  const actor = Actor.createActor(icrc1LedgerIDL, {
    agent,
    canisterId: opts.canisterId,
  }) as any;
  let toPrincipal: DfinityPrincipal;
  try {
    toPrincipal = DfinityPrincipal.fromText(opts.to.trim());
  } catch {
    return { ok: false, error: "Invalid principal" };
  }
  // Pass fee = null so the ledger uses its current default fee — avoids a
  // BadFee race if our cached fee differs from the ledger's live fee.
  const result = await actor.icrc1_transfer({
    from_subaccount: [],
    to: { owner: toPrincipal, subaccount: [] },
    amount: opts.amountE8s,
    fee: [],
    memo: [],
    created_at_time: [],
  });
  if ("Ok" in result) return { ok: true, blockIndex: result.Ok as bigint };
  const err = result.Err;
  if ("InsufficientFunds" in err) {
    return { ok: false, error: `Insufficient balance: ${err.InsufficientFunds.balance}` };
  }
  if ("BadFee" in err) {
    return { ok: false, error: `Bad fee. Ledger expected: ${err.BadFee.expected_fee}` };
  }
  if ("TemporarilyUnavailable" in err) {
    return { ok: false, error: "Ledger temporarily unavailable. Try again." };
  }
  if ("GenericError" in err) {
    return { ok: false, error: `GenericError ${err.GenericError.error_code}: ${err.GenericError.message}` };
  }
  return { ok: false, error: `Transfer error: ${JSON.stringify(err)}` };
}

// Singleton anonymous agent — shared across all direct ledger queries
let _anonymousAgent: HttpAgent | null = null;
function getAnonymousAgent(): HttpAgent {
  if (!_anonymousAgent) {
    _anonymousAgent = new HttpAgent({ host: "https://icp-api.io" });
    // Do NOT call fetchRootKey() in production
  }
  return _anonymousAgent;
}

const TREASURY_PRINCIPAL = "c626g-iyaaa-aaaau-agpoa-cai";
const SGLDT_CANISTER_ID = "i2s4q-syaaa-aaaan-qz4sq-cai";
const CKUNI_CANISTER_ID = "ilzky-ayaaa-aaaar-qahha-cai";

async function queryIcrc1Balance(canisterId: string): Promise<bigint> {
  const agent = getAnonymousAgent();
  const actor = Actor.createActor(icrc1BalanceIDL, {
    agent,
    canisterId,
  }) as any;
  const result = await actor.icrc1_balance_of({
    owner: DfinityPrincipal.fromText(TREASURY_PRINCIPAL),
    subaccount: [],
  });
  return result as bigint;
}

/** Query the ckUNI ledger for the treasury principal's balance.
 *
 *  This is the authoritative "has the bridge completed?" signal for the UNI →
 *  sGLDT swap flow. The ckERC-20 minter already waits for 12 Ethereum block
 *  confirmations before minting ckUNI, so once ckUNI lands in the treasury
 *  the entire Ethereum-side verification is done. Polling this balance is
 *  faster and more reliable than polling the backend's verifyEthTransaction
 *  update call (which does HTTPS outcalls to Etherscan under the hood).
 *
 *  Returns wei (ckUNI has 18 decimals, same as UNI). Throws on network
 *  failure — callers should wrap in try/catch if they intend to keep polling.
 *  Uses the anonymous agent so it works before II login, and uses a query
 *  call so the round-trip is typically <500ms. */
export async function fetchTreasuryCkUNIBalance(): Promise<bigint> {
  return queryIcrc1Balance(CKUNI_CANISTER_ID);
}

// Local enum definitions — the backend interface is called via (actor as any) since
// backend.d.ts doesn't expose these types. Keep these in sync with the Motoko backend.
export enum UserRole {
  guest = "guest",
  admin = "admin",
  user = "user",
}

export enum BridgeStatus {
  pending = "pending",
  approved = "approved",
  rejected = "rejected",
}

export enum UNIDepositStatus {
  pending = "pending",
  processing = "processing",
  confirmed = "confirmed",
  paid = "paid",
  failed = "failed",
}

// ── Formatters ────────────────────────────────────────────────────────────────

export function formatTokenAmount(value: bigint, decimals = 8): string {
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const frac = value % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, 4);
  return `${whole.toLocaleString()}.${fracStr}`;
}

export function formatPrice(value: bigint): string {
  const dollars = Number(value) / 10000;
  return dollars.toFixed(4);
}

export function formatTimestamp(ts: bigint): string {
  const ms = Number(ts / BigInt(1_000_000));
  return new Date(ms).toLocaleString();
}

export function truncatePrincipal(principal: string): string {
  if (principal.length <= 12) return principal;
  return `${principal.slice(0, 5)}...${principal.slice(-5)}`;
}

// ── Public Queries ─────────────────────────────────────────────────────────────

export function useBatPrice() {
  const { data, isLoading, isError } = useCoinGeckoPrices();
  return useQuery<bigint>({
    queryKey: ["batPrice", data?.batPrice],
    queryFn: async () => {
      const price = data?.batPrice ?? 0;
      return BigInt(Math.round(price * 10_000));
    },
    enabled: !isLoading && !isError,
    staleTime: 55_000,
    refetchInterval: 60_000,
  });
}

export function useSGLDTPrice() {
  const { data, isLoading, isError } = useCoinGeckoPrices();
  return useQuery<bigint>({
    queryKey: ["sgldtPrice", data?.sgldtPrice],
    queryFn: async () => {
      const price = data?.sgldtPrice ?? 0;
      return BigInt(Math.round(price * 10_000));
    },
    enabled: !isLoading && !isError,
    staleTime: 55_000,
    refetchInterval: 60_000,
  });
}

export function useTotalSupply() {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  return useQuery<bigint>({
    queryKey: ["totalSupply"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getTotalSupply();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
  });
}

export function useTreasuryStats() {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  return useQuery<{ sGLDTTreasuryBalance: bigint; batPoolBalance: bigint }>({
    queryKey: ["treasuryStats"],
    queryFn: async () => {
      if (!actor)
        return { sGLDTTreasuryBalance: BigInt(0), batPoolBalance: BigInt(0) };
      return actor.getTreasuryStats();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
  });
}

export function useIsAdmin() {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  const { identity } = useInternetIdentity();

  // Only run when identity is fully loaded and NOT anonymous — prevents false negatives
  // on page load when the actor is initializing with an anonymous identity.
  const isNonAnonymous = !!identity && !identity.getPrincipal().isAnonymous();

  return useQuery<boolean>({
    queryKey: ["isAdmin", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity || !isNonAnonymous) return false;
      try {
        // isAdminCaller() is the correct backend method name
        return await actor.isAdminCaller();
      } catch {
        // On any transient error, return false so the fallback principal check
        // in the UI can still grant access to the correct principal.
        return false;
      }
    },
    enabled: !!actor && !isFetching && isNonAnonymous,
    staleTime: 30_000,
    // On query error, return false (do not throw — let the UI fallback handle it)
    retry: 1,
  });
}

export function useCallerRole() {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  const { identity } = useInternetIdentity();
  return useQuery<UserRole>({
    queryKey: ["callerRole", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return UserRole.guest;
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useUserBalance(principal?: Principal) {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  return useQuery<bigint>({
    queryKey: ["balance", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return BigInt(0);
      return actor.getBalance(principal);
    },
    enabled: !!actor && !isFetching && !!principal,
  });
}

// Fetches this user's UNI deposits (all statuses). Used to surface "unclaimed"
// confirmed deposits that the auto-polling may have missed.
export function useMyUNIDeposits(principal?: Principal) {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  return useQuery<any[]>({
    queryKey: ["myUNIDeposits", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return [];
      try {
        const result = await actor.getUserUNIDeposits(principal);
        return Array.isArray(result) ? result : [];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!principal,
    refetchInterval: 30_000, // refresh every 30s while mounted
  });
}

// Retry payout for a single deposit — used by the "Claim" button on the
// pending-deposits banner.
export function useRetryUNIDepositPayout() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const qc = useQueryClient();
  return useMutation<string, Error, bigint>({
    mutationFn: async (requestId: bigint) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.verifyEthTransaction(requestId);
      return typeof result === "string" ? result : String(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myUNIDeposits"] });
      qc.invalidateQueries({ queryKey: ["sgldtTreasuryBalance"] });
    },
  });
}

export function useCalculateExchangeRate(batAmount: bigint) {
  const { data: prices, isLoading: pricesLoading } = useCoinGeckoPrices();
  const batPriceUSD = prices?.batPrice ?? 0;
  const sgldtPriceUSD = prices?.sgldtPrice ?? 0;

  return useQuery<{ bbTokenAmount: bigint; sgldAmount: bigint }>({
    queryKey: [
      "exchangeRate",
      batAmount.toString(),
      batPriceUSD,
      sgldtPriceUSD,
    ],
    queryFn: async () => {
      if (batAmount === BigInt(0) || batPriceUSD === 0 || sgldtPriceUSD === 0) {
        return { bbTokenAmount: BigInt(0), sgldAmount: BigInt(0) };
      }
      const bbTokenAmount = batAmount;
      const sgldAmount = BigInt(
        Math.round(
          (Number(batAmount) / 1e8) * (batPriceUSD / sgldtPriceUSD) * 1e8,
        ),
      );
      return { bbTokenAmount, sgldAmount };
    },
    enabled:
      !pricesLoading &&
      batPriceUSD > 0 &&
      sgldtPriceUSD > 0 &&
      batAmount > BigInt(0),
  });
}

// ── ICRC-1 Treasury Queries ───────────────────────────────────────────────────

export function useTreasuryICRC1Balances() {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  return useQuery<{ sgldtBalance: bigint; ckUNIBalance: bigint }>({
    queryKey: ["treasuryICRC1Balances"],
    queryFn: async () => {
      if (!actor) return { sgldtBalance: BigInt(0), ckUNIBalance: BigInt(0) };
      try {
        return await actor.getTreasuryICRC1Balances();
      } catch {
        return { sgldtBalance: BigInt(0), ckUNIBalance: BigInt(0) };
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
    placeholderData: { sgldtBalance: BigInt(0), ckUNIBalance: BigInt(0) },
  });
}

/** Calls refreshTreasuryBalances() via an anonymous actor (no auth required).
 *  This populates the backend's cached balances so subsequent query reads return real values.
 *  Call this on component mount before fetching treasury balance queries. */
export function useRefreshTreasuryBalances() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { createActorWithConfig } = await import(
        "@caffeineai/core-infrastructure"
      );
      const { createActor } = await import("../backend");
      const actor = (await createActorWithConfig(createActor)) as any;
      // refreshTreasuryBalances is a public update call — no admin check
      await actor.refreshTreasuryBalances();
    },
    onSuccess: () => {
      // After the cache is populated, immediately refetch all treasury balance queries
      qc.invalidateQueries({ queryKey: ["publicTreasuryBalance"] });
      qc.refetchQueries({ queryKey: ["publicTreasuryBalance"] });
      qc.invalidateQueries({ queryKey: ["publicCkUNITreasuryBalance"] });
      qc.refetchQueries({ queryKey: ["publicCkUNITreasuryBalance"] });
      qc.invalidateQueries({ queryKey: ["directSGLDTTreasuryBalance"] });
      qc.refetchQueries({ queryKey: ["directSGLDTTreasuryBalance"] });
      qc.invalidateQueries({ queryKey: ["directCkUNITreasuryBalance"] });
      qc.refetchQueries({ queryKey: ["directCkUNITreasuryBalance"] });
      qc.invalidateQueries({ queryKey: ["treasuryICRC1Balances"] });
    },
    onError: () => {
      // Silently ignore — queries will show whatever cached value the backend has
    },
  });
}

/** Public query — no auth required. Creates its own anonymous actor so it works for
 *  logged-out users without depending on the authenticated useBackendActor() hook. */
export function usePublicTreasuryBalance() {
  return useQuery<bigint>({
    queryKey: ["publicTreasuryBalance"],
    queryFn: async () => {
      try {
        const { createActorWithConfig } = await import(
          "@caffeineai/core-infrastructure"
        );
        const { createActor } = await import("../backend");
        const actor = (await createActorWithConfig(createActor)) as any;
        return await actor.getSGLDTTreasuryBalance();
      } catch {
        return BigInt(0);
      }
    },
    staleTime: 0,
    refetchInterval: 60_000,
    placeholderData: BigInt(0),
  });
}

/** Public query — no auth required. Fetches ckUNI treasury balance via anonymous actor. */
export function usePublicCkUNITreasuryBalance() {
  return useQuery<bigint>({
    queryKey: ["publicCkUNITreasuryBalance"],
    queryFn: async () => {
      try {
        const { createActorWithConfig } = await import(
          "@caffeineai/core-infrastructure"
        );
        const { createActor } = await import("../backend");
        const actor = (await createActorWithConfig(createActor)) as any;
        return await actor.getCkUNITreasuryBalance();
      } catch {
        return BigInt(0);
      }
    },
    staleTime: 0,
    refetchInterval: 60_000,
    placeholderData: BigInt(0),
  });
}

/**
 * Direct query to the sGLDT ICRC-1 ledger via an anonymous HttpAgent.
 * Bypasses the backend cache entirely — always reflects the real on-chain balance
 * for the treasury principal 72fnc-ziaaa-aaaai-axk4q-cai.
 */
export function useDirectSGLDTTreasuryBalance() {
  return useQuery<bigint>({
    queryKey: ["directSGLDTTreasuryBalance"],
    queryFn: async () => {
      try {
        return await queryIcrc1Balance(SGLDT_CANISTER_ID);
      } catch {
        return BigInt(0);
      }
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 30_000,
    placeholderData: BigInt(0),
  });
}

/**
 * Direct query to the ckUNI ICRC-1 ledger via an anonymous HttpAgent.
 * Bypasses the backend cache entirely — always reflects the real on-chain balance
 * for the treasury principal 72fnc-ziaaa-aaaai-axk4q-cai.
 */
export function useDirectCkUNITreasuryBalance() {
  return useQuery<bigint>({
    queryKey: ["directCkUNITreasuryBalance"],
    queryFn: async () => {
      try {
        return await queryIcrc1Balance(CKUNI_CANISTER_ID);
      } catch {
        return BigInt(0);
      }
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 30_000,
    placeholderData: BigInt(0),
  });
}

/**
 * Returns the treasury canister principal as a static constant.
 * This is ALWAYS '72fnc-ziaaa-aaaai-axk4q-cai' — no async fetch, no loading state.
 * @deprecated Use TREASURY_CANISTER_PRINCIPAL constant directly instead.
 */
export function useCanisterPrincipal() {
  // Static — no async fetch needed. The treasury principal never changes.
  return useQuery<string>({
    queryKey: ["canisterPrincipal"],
    queryFn: async () => TREASURY_PRINCIPAL,
    staleTime: Number.POSITIVE_INFINITY,
    initialData: TREASURY_PRINCIPAL,
  });
}

/** The treasury canister principal — static, never fetched dynamically. */
export const TREASURY_CANISTER_PRINCIPAL = TREASURY_PRINCIPAL;

export function useUNIExchangeRate() {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  return useQuery<bigint>({
    queryKey: ["uniExchangeRate"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getUNIExchangeRate();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
  });
}

export function useSetUNIExchangeRate() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rate: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.setUNIExchangeRate(rate);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["uniExchangeRate"] });
    },
  });
}

export function useAdminTransferSGLDT() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ to, amount }: { to: Principal; amount: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.adminTransferSGLDT(to, amount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treasuryICRC1Balances"] });
    },
  });
}

export function useAdminTransferCkUNI() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ to, amount }: { to: Principal; amount: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.adminTransferCkUNI(to, amount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treasuryICRC1Balances"] });
    },
  });
}

// ── User Queries ───────────────────────────────────────────────────────────────

export function useUserBridgeRequests(principal?: Principal) {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  return useQuery({
    queryKey: ["bridgeRequestsByUser", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return [];
      return actor.getBridgeRequestsByUser(principal);
    },
    enabled: !!actor && !isFetching && !!principal,
  });
}

export function useUserExchangeRequests(principal?: Principal) {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  return useQuery({
    queryKey: ["exchangeRequestsByUser", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return [];
      return actor.getSGLDTExchangeRequestsByUser(principal);
    },
    enabled: !!actor && !isFetching && !!principal,
  });
}

// ── Admin Queries ──────────────────────────────────────────────────────────────

export function useAllBridgeRequests() {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  return useQuery({
    queryKey: ["allBridgeRequests"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBridgeRequests();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllExchangeRequests() {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  return useQuery({
    queryKey: ["allExchangeRequests"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSGLDTExchangeRequests();
    },
    enabled: !!actor && !isFetching,
  });
}

export function usePendingBridgeRequests() {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  return useQuery({
    queryKey: ["pendingBridgeRequests"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingBridgeRequests();
    },
    enabled: !!actor && !isFetching,
  });
}

export function usePendingExchangeRequests() {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  return useQuery({
    queryKey: ["pendingExchangeRequests"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingSGLDTExchangeRequests();
    },
    enabled: !!actor && !isFetching,
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────────

export function useSubmitBridgeRequest() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ethAddress,
      batAmount,
    }: { ethAddress: string; batAmount: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.submitBridgeRequest(ethAddress, batAmount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bridgeRequestsByUser"] });
      qc.invalidateQueries({ queryKey: ["allBridgeRequests"] });
      qc.invalidateQueries({ queryKey: ["treasuryStats"] });
    },
  });
}

export function useSubmitExchangeRequest() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bbTokenAmount }: { bbTokenAmount: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.submitSGLDTExchangeRequest(bbTokenAmount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exchangeRequestsByUser"] });
      qc.invalidateQueries({ queryKey: ["allExchangeRequests"] });
      qc.invalidateQueries({ queryKey: ["treasuryStats"] });
    },
  });
}

export function useApproveBridgeRequest() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.approveBridgeRequest(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allBridgeRequests"] });
      qc.invalidateQueries({ queryKey: ["pendingBridgeRequests"] });
    },
  });
}

export function useRejectBridgeRequest() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.rejectBridgeRequest(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allBridgeRequests"] });
      qc.invalidateQueries({ queryKey: ["pendingBridgeRequests"] });
    },
  });
}

export function useApproveExchangeRequest() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.approveSGLDTExchangeRequest(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allExchangeRequests"] });
      qc.invalidateQueries({ queryKey: ["pendingExchangeRequests"] });
    },
  });
}

export function useRejectExchangeRequest() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.rejectSGLDTExchangeRequest(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allExchangeRequests"] });
      qc.invalidateQueries({ queryKey: ["pendingExchangeRequests"] });
    },
  });
}

export function useSetSGLDTTreasuryBalance() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (balance: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.setSGLDTTreasuryBalance(balance);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treasuryStats"] });
    },
  });
}

export function useSetBatPoolBalance() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (balance: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.setBatPoolBalance(balance);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treasuryStats"] });
    },
  });
}

export function useMintBankingBraveTokens() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ to, amount }: { to: Principal; amount: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.mintBankingBraveTokens(to, amount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["totalSupply"] });
    },
  });
}

export function useAllUNIDeposits() {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  const { identity } = useInternetIdentity();
  return useQuery({
    queryKey: ["allUNIDeposits", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return [];
      try {
        return await actor.getAllUNIDeposits();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes("Unauthorized") ||
          msg.includes("not authorized") ||
          msg.includes("admin")
        ) {
          throw new Error("Admin authentication required to view deposits.");
        }
        throw err;
      }
    },
    enabled:
      !!actor &&
      !isFetching &&
      !!identity &&
      !identity.getPrincipal().isAnonymous(),
    refetchInterval: 30_000,
    retry: 2,
  });
}

// ── Transaction History Hooks ─────────────────────────────────────────────────

export function useMyTransactions() {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  const { identity } = useInternetIdentity();
  return useQuery({
    queryKey: ["myTransactions", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return [];
      try {
        const txs = await actor.getMyTransactions();
        // Sort newest-first by timestamp (bigint nanoseconds)
        return [...txs].sort(
          (a: { timestamp: bigint }, b: { timestamp: bigint }) =>
            b.timestamp > a.timestamp ? 1 : b.timestamp < a.timestamp ? -1 : 0,
        );
      } catch {
        return [];
      }
    },
    enabled:
      !!actor &&
      !isFetching &&
      !!identity &&
      !identity.getPrincipal().isAnonymous(),
    refetchInterval: 30_000,
  });
}

/**
 * @deprecated Removed — the refinery now uses a fixed ETH deposit address (TREASURY_ETH_ADDRESS).
 * Kept here as a historical reference only. Not exported.
 */
// function useGetCkUNIMinterAddress(_userPrincipalText: string | null) { ... }

/**
 * @deprecated Removed — auto-init is no longer needed since the deposit address is hardcoded.
 * Kept here as a historical reference only. Not exported.
 */
// function useAutoInitMinterAddress() { ... }

/** Admin mutation: force-refresh the treasury minter deposit address (ignores cache). */
export function useAdminInitializeMinterAddress() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const qc = useQueryClient();
  return useMutation<string>({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      const result: string = await actor.adminInitializeMinterAddress();
      return result ?? "";
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ckuniMinterAddress"] });
    },
  });
}

export function useAdminGetUserTransactions(userPrincipalText: string | null) {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  const { identity } = useInternetIdentity();
  return useQuery({
    queryKey: ["adminUserTransactions", userPrincipalText],
    queryFn: async () => {
      if (!actor || !userPrincipalText) return [];
      try {
        const { Principal } = await import("@icp-sdk/core/principal");
        const p = Principal.fromText(userPrincipalText);
        const txs = await actor.adminGetUserTransactions(p);
        return [...txs].sort(
          (a: { timestamp: bigint }, b: { timestamp: bigint }) =>
            b.timestamp > a.timestamp ? 1 : b.timestamp < a.timestamp ? -1 : 0,
        );
      } catch {
        return [];
      }
    },
    enabled:
      !!actor &&
      !isFetching &&
      !!identity &&
      !!userPrincipalText &&
      !identity.getPrincipal().isAnonymous(),
  });
}

// ── User sGLDT Balance ────────────────────────────────────────────────────────

export function useUserSGLDTBalance(principalText?: string) {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  return useQuery<bigint>({
    queryKey: ["userSGLDTBalance", principalText],
    queryFn: async () => {
      if (!actor || !principalText) return BigInt(0);
      try {
        // Call getUserSGLDTBalance on the backend which proxies icrc1_balance_of
        return await actor.getUserSGLDTBalance(principalText);
      } catch {
        return BigInt(0);
      }
    },
    enabled: !!actor && !isFetching && !!principalText,
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
}

// ── Treasury Wallet Info ──────────────────────────────────────────────────────

/**
 * Public query — no auth needed. Returns treasury deposit address, ckUNI balance (e18), sGLDT balance (e8s).
 * Divide raw ckUNI Nat balance by 1e18 for display (18 decimals, matching ERC-20).
 * Divide raw sGLDT Nat balance by 1e8 for display (8 decimals, ICRC-1 standard).
 */
export function useGetTreasuryWalletInfo() {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  return useQuery<{
    depositAddress: string;
    ckUNIBalance: bigint;
    sGLDTBalance: bigint;
  }>({
    queryKey: ["treasuryWalletInfo"],
    queryFn: async () => {
      if (!actor)
        return {
          depositAddress: "",
          ckUNIBalance: BigInt(0),
          sGLDTBalance: BigInt(0),
        };
      try {
        return await actor.getTreasuryWalletInfo();
      } catch {
        return {
          depositAddress: "",
          ckUNIBalance: BigInt(0),
          sGLDTBalance: BigInt(0),
        };
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
    staleTime: 0,
    placeholderData: {
      depositAddress: "",
      ckUNIBalance: BigInt(0),
      sGLDTBalance: BigInt(0),
    },
  });
}

/** Admin mutation: calls adminMintCkUNI(ethTxHash, uniAmountInE8s) — mints ckUNI to treasury. */
export function useAdminMintCkUNI() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const qc = useQueryClient();
  return useMutation<string, Error, { ethTxHash: string; uniAmount: bigint }>({
    mutationFn: async ({ ethTxHash, uniAmount }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.adminMintCkUNI(ethTxHash, uniAmount);
      if ("ok" in result) return result.ok as string;
      if ("err" in result) throw new Error(result.err as string);
      return "";
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treasuryWalletInfo"] });
      qc.invalidateQueries({ queryKey: ["treasuryICRC1Balances"] });
      qc.invalidateQueries({ queryKey: ["directCkUNITreasuryBalance"] });
    },
  });
}

/** Admin mutation: calls adminDissolveCkUNI(ckUNIAmountInE8s, destEthAddress) — burns ckUNI, releases UNI on ETH. */
export function useAdminDissolveCkUNI() {
  const { actor: actorRaw } = useBackendActor();
  const actor = actorRaw as any;
  const qc = useQueryClient();
  return useMutation<
    string,
    Error,
    { ckUNIAmount: bigint; destinationEthAddress: string }
  >({
    mutationFn: async ({ ckUNIAmount, destinationEthAddress }) => {
      if (!actor) throw new Error("Not connected");
      const result = await actor.adminDissolveCkUNI(
        ckUNIAmount,
        destinationEthAddress,
      );
      if ("ok" in result) return result.ok as string;
      if ("err" in result) throw new Error(result.err as string);
      return "";
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treasuryWalletInfo"] });
      qc.invalidateQueries({ queryKey: ["treasuryICRC1Balances"] });
      qc.invalidateQueries({ queryKey: ["directCkUNITreasuryBalance"] });
    },
  });
}

/**
 * Returns the refinery canister's own sGLDT balance (e8s).
 * This is the balance the refinery uses to pay out users — NOT the treasury canister balance.
 * Admin should top up sGLDT to the refinery canister principal on the sGLDT ledger.
 */
export function useCanisterSGLDTBalance() {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  return useQuery<bigint>({
    queryKey: ["canisterSGLDTBalance"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      try {
        return await actor.getCanisterSGLDTBalance();
      } catch {
        return BigInt(0);
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
    staleTime: 0,
    placeholderData: BigInt(0),
  });
}

/**
 * Returns payout diagnostic info from the backend:
 * - canisterSGLDTBalance: refinery canister's sGLDT balance in e8s
 * - pendingDeposits: number of deposits awaiting payout
 * - estimatedSGLDTNeeded: total sGLDT owed to pending deposits in e8s
 */
export function usePayoutDiagnostic() {
  const { actor: actorRaw, isFetching } = useBackendActor();
  const actor = actorRaw as any;
  return useQuery<{
    canisterSGLDTBalance: bigint;
    pendingDeposits: bigint;
    estimatedSGLDTNeeded: bigint;
  }>({
    queryKey: ["payoutDiagnostic"],
    queryFn: async () => {
      if (!actor)
        return {
          canisterSGLDTBalance: BigInt(0),
          pendingDeposits: BigInt(0),
          estimatedSGLDTNeeded: BigInt(0),
        };
      try {
        return await actor.getPayoutDiagnostic();
      } catch {
        return {
          canisterSGLDTBalance: BigInt(0),
          pendingDeposits: BigInt(0),
          estimatedSGLDTNeeded: BigInt(0),
        };
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
    staleTime: 0,
    placeholderData: {
      canisterSGLDTBalance: BigInt(0),
      pendingDeposits: BigInt(0),
      estimatedSGLDTNeeded: BigInt(0),
    },
  });
}
