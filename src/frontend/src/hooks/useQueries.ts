import { useInternetIdentity } from "../auth";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal as DfinityPrincipal } from "@dfinity/principal";
import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackendActor } from "./useBackendActor";

// ── Canister constants ───────────────────────────────────────────────────────

export const BACKEND_CANISTER_ID = "c626g-iyaaa-aaaau-agpoa-cai";
const TREASURY_PRINCIPAL = BACKEND_CANISTER_ID;
const SGLDT_CANISTER_ID = "i2s4q-syaaa-aaaan-qz4sq-cai";
const CKUNI_CANISTER_ID = "ilzky-ayaaa-aaaar-qahha-cai";
const IC_HOST = "https://icp-api.io";

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

// ── Direct deposit IDL (bypasses bindgen wrapper) ────────────────────────────

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
    autoFinalizeUNIDeposit: IDL.Func(
      [IDL.Text, IDL.Nat, IDL.Opt(IDL.Nat)],
      [AutoFinalizeResult],
      [],
    ),
  });
};

/** ICRC-2 approve, used to let the refinery canister pull the user's ckUNI. */
const icrc2ApproveIDL = ({ IDL }: { IDL: any }) => {
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const ApproveArgs = IDL.Record({
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    spender: Account,
    amount: IDL.Nat,
    expected_allowance: IDL.Opt(IDL.Nat),
    expires_at: IDL.Opt(IDL.Nat64),
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
  });
  const ApproveError = IDL.Variant({
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
    AllowanceChanged: IDL.Record({ current_allowance: IDL.Nat }),
    Expired: IDL.Record({ ledger_time: IDL.Nat64 }),
    TooOld: IDL.Null,
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    TemporarilyUnavailable: IDL.Null,
    GenericError: IDL.Record({ error_code: IDL.Nat, message: IDL.Text }),
  });
  return IDL.Service({
    icrc2_approve: IDL.Func(
      [ApproveArgs],
      [IDL.Variant({ Ok: IDL.Nat, Err: ApproveError })],
      [],
    ),
  });
};

/** Backend methods for the direct-refine (minter-attribution) flow. */
const refineIDL = ({ IDL }: { IDL: any }) => {
  const RefineOk = IDL.Record({
    refineId: IDL.Nat,
    sgldtPaid: IDL.Nat,
    rate: IDL.Nat,
    blockIndex: IDL.Nat,
  });
  return IDL.Service({
    getMyCkUNIPosition: IDL.Func(
      [],
      [
        IDL.Record({
          balance: IDL.Nat,
          allowance: IDL.Nat,
          minRefine: IDL.Nat,
          rate: IDL.Nat,
        }),
      ],
      [],
    ),
    refineCkUNI: IDL.Func(
      [IDL.Nat, IDL.Opt(IDL.Nat)],
      [IDL.Variant({ ok: RefineOk, err: IDL.Text })],
      [],
    ),
  });
};

export type CkUNIPosition = {
  balance: bigint;
  allowance: bigint;
  minRefine: bigint;
  rate: bigint;
};

/** Read the caller's ckUNI balance and the allowance granted to the refinery.
 *  The UI polls this to detect when the chain-key minter has credited the
 *  user (bridge complete) and whether an approve step is still outstanding. */
export async function fetchMyCkUNIPosition(
  identity: unknown,
): Promise<CkUNIPosition | null> {
  try {
    const actor = await directActor(refineIDL, { identity });
    return (await actor.getMyCkUNIPosition()) as CkUNIPosition;
  } catch (err) {
    console.warn("[refine] ckUNI position fetch failed:", err);
    return null;
  }
}

/** ckUNI ledger fee (e18). Verified against the live ledger 2026-07-30:
 *  icrc1_fee = 1_000_000_000_000_000 (0.001 ckUNI). Used as the fallback when
 *  the live query fails; the cached live value wins otherwise. */
export const CKUNI_FEE_FALLBACK = 1_000_000_000_000_000n;
let _ckuniFeeCache: bigint | null = null;

/** The ckUNI ledger fee, fetched once per session (anonymous query). */
export async function fetchCkUNIFee(): Promise<bigint> {
  if (_ckuniFeeCache !== null) return _ckuniFeeCache;
  try {
    const actor = Actor.createActor(icrc1LedgerIDL, {
      agent: getAnonymousAgent(),
      canisterId: CKUNI_CANISTER_ID,
    }) as any;
    _ckuniFeeCache = (await actor.icrc1_fee()) as bigint;
    return _ckuniFeeCache;
  } catch {
    return CKUNI_FEE_FALLBACK;
  }
}

/** Approve the refinery canister to pull ckUNI (e18) from the caller.
 *  Approves exactly `amount` — callers add fee headroom themselves (see
 *  computeRefineAmounts in lib/refineMath.ts). */
export async function approveCkUNIForRefinery(opts: {
  identity: unknown;
  amount: bigint;
}): Promise<{ ok: true; blockIndex: bigint } | { ok: false; error: string }> {
  const actor = await directActor(icrc2ApproveIDL, {
    identity: opts.identity,
    canisterId: CKUNI_CANISTER_ID,
  });
  const result = await actor.icrc2_approve({
    from_subaccount: [],
    spender: {
      owner: DfinityPrincipal.fromText(BACKEND_CANISTER_ID),
      subaccount: [],
    },
    amount: opts.amount,
    expected_allowance: [],
    expires_at: [],
    fee: [],
    memo: [],
    created_at_time: [],
  });
  if ("Ok" in result) return { ok: true, blockIndex: result.Ok as bigint };
  const err = result.Err;
  if ("InsufficientFunds" in err) {
    return {
      ok: false,
      error: `Not enough ckUNI to cover the approval fee (balance ${err.InsufficientFunds.balance}).`,
    };
  }
  if ("AllowanceChanged" in err) {
    return {
      ok: false,
      error: "Your ckUNI allowance changed mid-flight. Try again.",
    };
  }
  if ("TemporarilyUnavailable" in err) {
    return { ok: false, error: "ckUNI ledger temporarily unavailable. Try again." };
  }
  if ("GenericError" in err) {
    return {
      ok: false,
      error: `Approve failed (${err.GenericError.error_code}): ${err.GenericError.message}`,
    };
  }
  return { ok: false, error: `Approve failed: ${JSON.stringify(err)}` };
}

export type RefineOutcome =
  | { ok: true; refineId: bigint; sgldtPaid: bigint; rate: bigint; blockIndex: bigint }
  | { ok: false; error: string };

/** Swap ckUNI the user already holds for sGLDT. Requires a prior
 *  approveCkUNIForRefinery for at least `amount`. */
export async function refineCkUNI(opts: {
  identity: unknown;
  amount: bigint;
  rateHint: bigint | null;
}): Promise<RefineOutcome> {
  const actor = await directActor(refineIDL, { identity: opts.identity });
  const rateOpt: [] | [bigint] = opts.rateHint == null ? [] : [opts.rateHint];
  const result = await actor.refineCkUNI(opts.amount, rateOpt);
  if ("ok" in result) {
    return {
      ok: true,
      refineId: result.ok.refineId as bigint,
      sgldtPaid: result.ok.sgldtPaid as bigint,
      rate: result.ok.rate as bigint,
      blockIndex: result.ok.blockIndex as bigint,
    };
  }
  return { ok: false, error: result.err as string };
}

/** Backend methods for the redeem (sGLDT → ckUNI) exit path. */
const redeemIDL = ({ IDL }: { IDL: any }) => {
  const RedeemOk = IDL.Record({
    redeemId: IDL.Nat,
    ckuniPaid: IDL.Nat,
    rate: IDL.Nat,
    blockIndex: IDL.Nat,
  });
  return IDL.Service({
    getMySGLDTPosition: IDL.Func(
      [],
      [
        IDL.Record({
          balance: IDL.Nat,
          allowance: IDL.Nat,
          minRedeem: IDL.Nat,
          rate: IDL.Nat,
          treasuryCkUNI: IDL.Nat,
        }),
      ],
      [],
    ),
    redeemSGLDT: IDL.Func(
      [IDL.Nat, IDL.Opt(IDL.Nat)],
      [IDL.Variant({ ok: RedeemOk, err: IDL.Text })],
      [],
    ),
  });
};

export type SGLDTPosition = {
  balance: bigint;
  allowance: bigint;
  minRedeem: bigint;
  rate: bigint;
  treasuryCkUNI: bigint;
};

/** The caller's sGLDT balance, the allowance granted to the refinery, and the
 *  treasury's ckUNI liquidity — everything the redeem UI needs to gate the
 *  button and size the approve. */
export async function fetchMySGLDTPosition(
  identity: unknown,
): Promise<SGLDTPosition | null> {
  try {
    const actor = await directActor(redeemIDL, { identity });
    return (await actor.getMySGLDTPosition()) as SGLDTPosition;
  } catch (err) {
    console.warn("[redeem] sGLDT position fetch failed:", err);
    return null;
  }
}

/** Approve the refinery canister to pull `amount` sGLDT (e8s) from the caller. */
export async function approveSGLDTForRedeem(opts: {
  identity: unknown;
  amount: bigint;
}): Promise<{ ok: true; blockIndex: bigint } | { ok: false; error: string }> {
  const actor = await directActor(icrc2ApproveIDL, {
    identity: opts.identity,
    canisterId: SGLDT_CANISTER_ID,
  });
  const result = await actor.icrc2_approve({
    from_subaccount: [],
    spender: {
      owner: DfinityPrincipal.fromText(BACKEND_CANISTER_ID),
      subaccount: [],
    },
    amount: opts.amount,
    expected_allowance: [],
    expires_at: [],
    fee: [],
    memo: [],
    created_at_time: [],
  });
  if ("Ok" in result) return { ok: true, blockIndex: result.Ok as bigint };
  const err = result.Err;
  if ("InsufficientFunds" in err) {
    return {
      ok: false,
      error: `Not enough sGLDT to cover the approval fee (balance ${err.InsufficientFunds.balance}).`,
    };
  }
  if ("TemporarilyUnavailable" in err) {
    return { ok: false, error: "sGLDT ledger temporarily unavailable. Try again." };
  }
  if ("GenericError" in err) {
    return {
      ok: false,
      error: `Approve failed (${err.GenericError.error_code}): ${err.GenericError.message}`,
    };
  }
  return { ok: false, error: `Approve failed: ${JSON.stringify(err)}` };
}

export type RedeemOutcome =
  | { ok: true; redeemId: bigint; ckuniPaid: bigint; rate: bigint; blockIndex: bigint }
  | { ok: false; error: string };

/** Swap sGLDT back into ckUNI at the oracle rate. Requires a prior
 *  approveSGLDTForRedeem for at least `amount` + the sGLDT fee. */
export async function redeemSGLDT(opts: {
  identity: unknown;
  amount: bigint;
  rateHint: bigint | null;
}): Promise<RedeemOutcome> {
  const actor = await directActor(redeemIDL, { identity: opts.identity });
  const rateOpt: [] | [bigint] = opts.rateHint == null ? [] : [opts.rateHint];
  const result = await actor.redeemSGLDT(opts.amount, rateOpt);
  if ("ok" in result) {
    return {
      ok: true,
      redeemId: result.ok.redeemId as bigint,
      ckuniPaid: result.ok.ckuniPaid as bigint,
      rate: result.ok.rate as bigint,
      blockIndex: result.ok.blockIndex as bigint,
    };
  }
  return { ok: false, error: result.err as string };
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

// ── Direct actor factory ─────────────────────────────────────────────────────

type IdlFactory = ({ IDL }: { IDL: any }) => any;

/** Create a fresh actor for a single direct call. A fresh HttpAgent per call
 *  means a cached bindgen actor carrying a stale II delegation (common after a
 *  long wait on mobile) can never poison the request. Pass `identity` for
 *  authenticated update calls; omit it for anonymous calls. */
async function directActor(
  idl: IdlFactory,
  opts: { identity?: unknown; canisterId?: string } = {},
): Promise<any> {
  const agent = await HttpAgent.create({
    ...(opts.identity != null ? { identity: opts.identity as never } : {}),
    host: IC_HOST,
  });
  return Actor.createActor(idl, {
    agent,
    canisterId: opts.canisterId ?? BACKEND_CANISTER_ID,
  }) as any;
}

// Singleton anonymous agent — shared across all direct ledger queries
let _anonymousAgent: HttpAgent | null = null;
function getAnonymousAgent(): HttpAgent {
  if (!_anonymousAgent) {
    _anonymousAgent = new HttpAgent({ host: IC_HOST });
    // Do NOT call fetchRootKey() in production
  }
  return _anonymousAgent;
}

async function queryIcrc1Balance(canisterId: string): Promise<bigint> {
  const actor = Actor.createActor(icrc1BalanceIDL, {
    agent: getAnonymousAgent(),
    canisterId,
  }) as any;
  const result = await actor.icrc1_balance_of({
    owner: DfinityPrincipal.fromText(TREASURY_PRINCIPAL),
    subaccount: [],
  });
  return result as bigint;
}

// ── Direct deposit calls ─────────────────────────────────────────────────────

/** Direct submitUNIDeposit — registers the deposit with the backend; the
 *  backend sweeper takes it from there (verify on Ethereum, then pay out).
 *  Returns the backend's deposit request ID. */
// (directSubmitUNIDeposit / autoFinalizeUNIDeposit are deleted: they fed the
// treasury-attribution recovery flows, whose backend verifier rejects every
// deposit made since the minter-attribution switch. verifyEthTransaction in
// directDepositIDL stays — useRetryUNIDepositPayout still drives payouts for
// PRE-EXISTING deposit records via the UnclaimedDepositsBanner.)

// ── Direct admin calls ───────────────────────────────────────────────────────

/** Direct whoAmI — bypasses bindgen wrapper so it works without regenerating
 *  the frontend declarations after adding the method to the backend. */
export async function directWhoAmI(identity: unknown): Promise<{
  caller: string;
  isHardcodedAdmin: boolean;
  hasAdminRole: boolean;
  isAdmin: boolean;
}> {
  const actor = await directActor(directAdminIDL, { identity });
  return (await actor.whoAmI()) as {
    caller: string;
    isHardcodedAdmin: boolean;
    hasAdminRole: boolean;
    isAdmin: boolean;
  };
}

/** Direct adminGrantAdmin — promotes a principal to admin. */
export async function directAdminGrantAdmin(identity: unknown, newAdminText: string): Promise<string> {
  const actor = await directActor(directAdminIDL, { identity });
  const newAdminPrincipal = DfinityPrincipal.fromText(newAdminText.trim());
  return (await actor.adminGrantAdmin(newAdminPrincipal)) as string;
}

/** Direct admin transfer — makes the update call straight through @dfinity/agent
 *  with the admin's II identity, bypassing the generated bindgen wrapper. */
export async function directAdminTransfer(opts: {
  identity: unknown;
  token: "ckUNI" | "sGLDT";
  to: string;
  amount: bigint;
}): Promise<string> {
  const actor = await directActor(directAdminIDL, { identity: opts.identity });
  const toPrincipal = DfinityPrincipal.fromText(opts.to.trim());
  if (opts.token === "ckUNI") {
    return (await actor.adminTransferCkUNI(toPrincipal, opts.amount)) as string;
  }
  return (await actor.adminTransferSGLDT(toPrincipal, opts.amount)) as string;
}

/** Transfer ICRC-1 tokens from the caller's own account. The `identity` is the
 *  authenticated II identity (from useInternetIdentity). The ledger ICRC-1 call
 *  debits the caller's account directly — no backend canister hop needed. */
export async function icrc1TransferFromCaller(opts: {
  identity: unknown;
  canisterId: string;
  to: string;
  amountE8s: bigint;
}): Promise<{ ok: true; blockIndex: bigint } | { ok: false; error: string }> {
  const actor = await directActor(icrc1LedgerIDL, {
    identity: opts.identity,
    canisterId: opts.canisterId,
  });
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

// ── Status enums (kept in sync with the Motoko backend) ──────────────────────

export enum BridgeStatus {
  pending = "pending",
  approved = "approved",
  rejected = "rejected",
}

// ── Formatters ───────────────────────────────────────────────────────────────

export function formatTokenAmount(value: bigint, decimals = 8): string {
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const frac = value % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, 4);
  return `${whole.toLocaleString()}.${fracStr}`;
}

export function formatTimestamp(ts: bigint): string {
  const ms = Number(ts / BigInt(1_000_000));
  return new Date(ms).toLocaleString();
}

// ── Auth / role queries ──────────────────────────────────────────────────────

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

// ── Deposit queries ──────────────────────────────────────────────────────────

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

// ── Treasury balance queries ─────────────────────────────────────────────────

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
 * for the treasury principal.
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
 * for the treasury principal.
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

// ── Exchange rate ────────────────────────────────────────────────────────────

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

// ── Transaction history ──────────────────────────────────────────────────────

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

// ── User sGLDT balance ───────────────────────────────────────────────────────

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

// ── Treasury wallet info ─────────────────────────────────────────────────────

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

// ── Admin mutations ──────────────────────────────────────────────────────────

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

/** Admin mutation: calls adminDissolveCkUNI(ckUNIAmountInE8s, destEthAddress).
 *  NOTE: the backend currently returns #err — the dissolve path is disabled
 *  until the icrc2_approve-based minter withdrawal flow is implemented. */
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
