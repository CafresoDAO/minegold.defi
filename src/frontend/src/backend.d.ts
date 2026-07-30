import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Time = bigint;
export interface sGLDTRequest {
    id: bigint;
    status: ExchangeStatus;
    submitter: Principal;
    bbTokenAmount: bigint;
    sgldAmountCalculated: bigint;
    timestamp: Time;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface UniDepositRequest {
    id: bigint;
    status: UNIDepositStatus;
    uniAmount: bigint;
    ethAddress: string;
    submitter: Principal;
    lockedExchangeRate?: bigint;
    sgldtPaid: bigint;
    timestamp: Time;
    txHash: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface TxRecord {
    id: string;
    status: TxStatus;
    description: string;
    tokenSymbol: string;
    timestamp: bigint;
    txType: TxType;
    amount: bigint;
    errorMsg?: string;
    ethTxHash?: string;
    icpBlockIndex?: bigint;
}
export interface BridgeRequest {
    id: bigint;
    status: BridgeStatus;
    ethAddress: string;
    submitter: Principal;
    batAmount: bigint;
    timestamp: Time;
}
export interface UserProfile {
    name: string;
}
export enum BridgeStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum TxStatus {
    Failed = "Failed",
    Confirmed = "Confirmed",
    Completed = "Completed",
    Pending = "Pending",
    Held = "Held"
}
export enum TxType {
    Mint = "Mint",
    Refine = "Refine",
    Bridge = "Bridge",
    Transfer = "Transfer",
    Redeem = "Redeem",
    Refund = "Refund"
}
export enum UNIDepositStatus {
    pending = "pending",
    paid = "paid",
    confirmed = "confirmed",
    processing = "processing",
    failed = "failed"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    /**
     * / Admin-only: add a transaction record on behalf of any user (e.g. for manual entries).
     */
    addTransaction(user: Principal, record: TxRecord): Promise<void>;
    /**
     * / Admin-only: Burns ckUNI from the treasury and releases UNI back to an Ethereum address.
     * / Calls the ICP ERC-20 minter withdrawal method to burn ckUNI and trigger UNI release on Ethereum.
     * / ckUNIAmount — amount in e8s (1e8 = 1 ckUNI).
     * / destinationEthAddress — the Ethereum address to receive the released UNI.
     */
    adminDissolveCkUNI(ckUNIAmount: bigint, destinationEthAddress: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin-only: view any user's transaction history.
     */
    adminGetUserTransactions(user: Principal): Promise<Array<TxRecord>>;
    /**
     * / Admin-only alias for initializeMinterDepositAddress() that returns a result-style Text
     * / so the admin panel can display success/error feedback without trapping.
     */
    adminInitializeMinterAddress(): Promise<string>;
    /**
     * / Admin-only: Records a UNI→ckUNI mint event and calls the ICP ERC-20 minter
     * / to mint ckUNI directly to the treasury principal (72fnc-ziaaa-aaaai-axk4q-cai).
     * / ethTxHash — the Ethereum transaction hash proving UNI was sent to the deposit address.
     * / uniAmount — amount in e18 (ERC-20 standard, 1 UNI = 1_000_000_000_000_000_000).
     * /             ckUNI is an ERC-20 mirror token and always uses 18 decimal places — NOT e8s.
     */
    adminMintCkUNI(ethTxHash: string, uniAmount: bigint): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Admin transfers ckUNI from this canister to any principal via ICRC-1.
     */
    adminTransferCkUNI(to: Principal, amount: bigint): Promise<string>;
    /**
     * / Admin transfers sGLDT from this canister's treasury to any principal via ICRC-1.
     */
    adminTransferSGLDT(to: Principal, amount: bigint): Promise<string>;
    approveBridgeRequest(id: bigint): Promise<void>;
    approveSGLDTExchangeRequest(id: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    calculateExchangeRate(batAmount: bigint): Promise<{
        bbTokenAmount: bigint;
        sgldAmount: bigint;
    }>;
    deprecated_getBridgeRequests(): Promise<Array<BridgeRequest>>;
    deprecated_getSGLDTRequests(): Promise<Array<sGLDTRequest>>;
    /**
     * / Diagnoses payout ability for a specific deposit — returns a human-readable summary.
     * / Shows the treasury sGLDT balance, exact amount required for this deposit,
     * / the fee, and whether the transfer would succeed with the current balance.
     * / Admin-only.
     */
    diagnosePayoutAbility(depositId: bigint): Promise<string>;
    getAllUNIDeposits(): Promise<Array<UniDepositRequest>>;
    getBalance(_principal: Principal): Promise<bigint>;
    getBatPrice(): Promise<bigint>;
    getBridgeRequests(): Promise<Array<BridgeRequest>>;
    getBridgeRequestsByUser(user: Principal): Promise<Array<BridgeRequest>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCanisterPrincipal(): Promise<Principal>;
    /**
     * / Returns the sGLDT balance held by the treasury (this canister's own account on the sGLDT ledger).
     * / Principal.fromActor(Self) == 72fnc-ziaaa-aaaai-axk4q-cai — this IS the treasury.
     * / Admin must send sGLDT to this canister's principal on the sGLDT ledger to fund payouts.
     * / Display: divide by 1e8 for human-readable sGLDT amount.
     */
    getCanisterSGLDTBalance(): Promise<bigint>;
    /**
     * / Returns the Ethereum deposit address that the user should send UNI to in order
     * / to receive ckUNI on ICP. If the address is not yet cached, this call auto-initializes
     * / it by calling the ICP ERC-20 minter (nbsys-saaaa-aaaar-qaaga-cai) once.
     * / The treasury principal (72fnc-ziaaa-aaaai-axk4q-cai) is always the owner/beneficiary.
     * / After initialization the address is cached permanently — subsequent calls are instant.
     * / Prefer getMinterDepositAddress() (query) once initialization has happened.
     */
    getCkUNIMinterDepositAddress(_userPrincipal: Principal): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Returns the cached on-chain ckUNI balance held by the treasury principal (72fnc-ziaaa-aaaai-axk4q-cai).
     * / This is a query so it works for unauthenticated (anonymous) callers.
     * / Call refreshTreasuryBalances() to update the cache from the ckUNI ledger.
     */
    getCkUNITreasuryBalance(): Promise<bigint>;
    /**
     * / Public query: returns the current status of a UNI deposit for frontend polling.
     * / Any authenticated user may query their own deposit. Admin may query any deposit.
     * / Returns status as a Text string, the txHash, and the sGLDT amount paid (0 if not yet paid).
     */
    getDepositStatus(requestId: bigint): Promise<{
        status: string;
        sgldtPaid: bigint;
        txHash: string;
    }>;
    /**
     * / Public query — returns the cached treasury Ethereum deposit address for the ERC-20 minter.
     * / Falls back to the fixed hardcoded address (0x22582083361bf06579BbfFcC1138D3fc986B91FF)
     * / if the minter-derived address has not been initialized yet — so callers always get a
     * / non-empty, usable address.
     */
    getMinterDepositAddress(): Promise<string>;
    /**
     * / Returns the most recent non-paid UNI deposit for the caller (used by "Keep Checking" to
     * / recover the active deposit ID after a page refresh). Returns null if no active deposit exists.
     * / Also returns already-paid deposits so the UI can show a success screen instead of "not found".
     */
    getMyActiveDeposit(): Promise<{
        id: bigint;
        status: string;
        sgldtPaid: bigint;
        txHash: string;
    } | null>;
    /**
     * / Caller's own transaction history.
     */
    getMyTransactions(): Promise<Array<TxRecord>>;
    /**
     * / Alias kept for backward compatibility. Prefer getPayoutReadiness().
     */
    getPayoutDiagnostic(): Promise<{
        estimatedSGLDTNeeded: bigint;
        pendingDeposits: bigint;
        canisterSGLDTBalance: bigint;
    }>;
    /**
     * / Returns payout readiness info so the admin knows how much sGLDT is available
     * / and whether the treasury can cover all pending deposits.
     * / - treasurySGLDTBalance: sGLDT held by the treasury (this canister, e8s).
     * / - pendingDeposits: count of deposits in #confirmed or #failed status awaiting payout.
     * / - estimatedSGLDTNeeded: total sGLDT owed across all pending deposits (e8s).
     * / - treasuryPrincipal: the principal to send sGLDT to for top-up.
     */
    getPayoutReadiness(): Promise<{
        estimatedSGLDTNeeded: bigint;
        pendingDeposits: bigint;
        treasurySGLDTBalance: bigint;
        treasuryPrincipal: string;
    }>;
    getPendingBridgeRequests(): Promise<Array<BridgeRequest>>;
    getPendingSGLDTExchangeRequests(): Promise<Array<sGLDTRequest>>;
    /**
     * / Returns this canister's principal as Text — this IS the treasury (72fnc-ziaaa-aaaai-axk4q-cai).
     * / Admin must send sGLDT to this address on the sGLDT ledger (i2s4q-syaaa-aaaan-qz4sq-cai)
     * / to fund user payouts. No separate "refinery payout balance" exists — there is one treasury.
     */
    getRefineryPrincipal(): Promise<string>;
    getSGLDTExchangeRequests(): Promise<Array<sGLDTRequest>>;
    getSGLDTExchangeRequestsByUser(user: Principal): Promise<Array<sGLDTRequest>>;
    getSGLDTPrice(): Promise<bigint>;
    /**
     * / Returns the cached on-chain sGLDT balance held by the treasury principal (72fnc-ziaaa-aaaai-axk4q-cai).
     * / Used by the treasury banner at the top of the page.
     * / This is a query so it works for unauthenticated (anonymous) callers.
     * / Call refreshTreasuryBalances() to update the cache from the ledger.
     */
    getSGLDTTreasuryBalance(): Promise<bigint>;
    getTotalSupply(): Promise<bigint>;
    /**
     * / Returns cached ICRC-1 balances held by the treasury principal (72fnc-ziaaa-aaaai-axk4q-cai).
     * / This is a query so it works for unauthenticated callers.
     * / Call refreshTreasuryBalances() to pull fresh values from the ledgers.
     */
    getTreasuryICRC1Balances(): Promise<{
        ckUNIBalance: bigint;
        sgldtBalance: bigint;
    }>;
    getTreasuryStats(): Promise<{
        sGLDTTreasuryBalance: bigint;
        batPoolBalance: bigint;
    }>;
    /**
     * / Public query — returns treasury wallet info: cached deposit address, ckUNI balance (e8s), sGLDT balance (e8s).
     * / No authentication required — safe for all callers.
     * / Frontend divides raw Nat balances by 1e8 for display.
     * / depositAddress always returns a non-empty value: the minter-derived address when available,
     * / otherwise the fixed hardcoded fallback (0x22582083361bf06579BbfFcC1138D3fc986B91FF).
     */
    getTreasuryWalletInfo(): Promise<{
        sGLDTBalance: bigint;
        depositAddress: string;
        ckUNIBalance: bigint;
    }>;
    getUNIExchangeRate(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    /**
     * / Public query: returns the sGLDT ICRC-1 balance for any given principal (their own ICP account).
     * / No admin restriction — users can check their own balance.
     */
    getUserSGLDTBalance(principalText: string): Promise<bigint>;
    /**
     * / Returns all transactions for a given principal, newest-first. No auth restriction —
     * / the frontend passes the logged-in user's principal.
     */
    getUserTransactions(user: Principal): Promise<Array<TxRecord>>;
    getUserUNIDeposits(user: Principal): Promise<Array<UniDepositRequest>>;
    /**
     * / Admin-only: Calls the ICP ERC-20 minter to derive the treasury's fixed Ethereum
     * / deposit address and caches it on-chain. Only needs to be called once (or to refresh).
     * / All users will send UNI to this same address; the minter automatically converts
     * / incoming ERC-20 UNI to ckUNI and credits the treasury principal (72fnc-ziaaa-aaaai-axk4q-cai).
     */
    initializeMinterDepositAddress(): Promise<string>;
    /**
     * / Public query so the frontend can check whether the caller is the admin
     * / without any round-trip to the admin panel itself.
     */
    isAdminCaller(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    migrated_getAllBridgeRequests(): Promise<Array<BridgeRequest>>;
    migrated_getAllSGLDTRequests(): Promise<Array<sGLDTRequest>>;
    migration_updateBalance(_balance: bigint): Promise<void>;
    mintBankingBraveTokens(_to: Principal, _amount: bigint): Promise<void>;
    /**
     * / Fetches the live ICRC-1 balances for the treasury (this canister's own account) from both ledgers
     * / and stores them in the cache.
     * / This is an update call — anyone may call it to warm the cache.
     * / Called automatically after any admin transfer or sGLDT payout so the banner stays current.
     * / Note: Principal.fromActor(Self) == 72fnc-ziaaa-aaaai-axk4q-cai (they are the same).
     */
    refreshTreasuryBalances(): Promise<void>;
    rejectBridgeRequest(id: bigint): Promise<void>;
    rejectSGLDTExchangeRequest(id: bigint): Promise<void>;
    /**
     * / Allows a user to reset their own stuck mining phase (e.g. after a 20-minute timeout).
     * / This method only affects the UNI deposit state — it does NOT refund any tokens.
     * / Any #processing deposit belonging to the caller is reverted to #confirmed so the
     * / user can retry verifyAndPayUNIDeposit without reloading the page.
     * / Admin may reset any user's stuck deposit by passing the requestId.
     */
    resetMiningPhase(requestId: bigint): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Retries the sGLDT payout for a deposit that is in #confirmed or #failed status.
     * /
     * / This is what the "Keep Checking" button should call. Unlike verifyEthTransaction,
     * / which only reads the current status, this method actually re-attempts the ICRC-1
     * / sGLDT transfer. Use this to resolve deposits that are stuck in #confirmed because
     * / a previous verifyAndPayUNIDeposit call trapped or failed silently.
     * /
     * / IMPORTANT: This function NEVER traps. All outcomes are returned as descriptive Text.
     * /   - If already paid:   "already_paid: <amount> sGLDT released to <principal>"
     * /   - If confirmed/failed and retry succeeds: "paid: <amount> sGLDT released to <principal>"
     * /   - If confirmed/failed and payout fails definitively: "confirmed_payout_failed: <reason>"
     * /   - If confirmed/failed and network/transient error: "failed: <reason>"
     * /   - If pending ETH:   "pending: ..."
     * /   - If processing:    "pending: ..."
     * /
     * / Only the original depositor or admin may call this.
     */
    retryUNIDepositPayout(requestId: bigint): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    /**
     * / Public (non-admin) method to trigger minter address initialization.
     * / Called by the frontend automatically when getMinterDepositAddress() returns "".
     * / Returns the cached address immediately if already set (fast path — no inter-canister call).
     * / If the cache is empty, calls the ICP ERC-20 minter (nbsys-saaaa-aaaar-qaaga-cai) to fetch
     * / the fixed treasury deposit address and caches it permanently on-chain.
     * / Any caller (authenticated or anonymous) may call this — it only mutates the address cache.
     */
    selfInitializeMinterAddress(): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    setBatPoolBalance(_balance: bigint): Promise<void>;
    /**
     * / Syncs the live exchange rate from the frontend CoinGecko feed to the backend.
     * / Called by the frontend after fetching UNI/sGLDT prices so the backend always uses
     * / the same rate the user sees. Only admin may call this; rate is in 1e8 precision
     * / (e.g. 238_000_000 = 2.38 sGLDT per UNI).
     */
    setLiveExchangeRate(newRate: bigint): Promise<void>;
    setSGLDTTreasuryBalance(_balance: bigint): Promise<void>;
    setUNIExchangeRate(rate: bigint): Promise<void>;
    submitBridgeRequest(ethAddress: string, batAmount: bigint): Promise<bigint>;
    submitSGLDTExchangeRequest(bbTokenAmount: bigint): Promise<bigint>;
    /**
     * / Records a UNI deposit after the frontend has confirmed the ETH transaction on-chain.
     * /
     * / Trust model: The frontend is responsible for confirming the ETH transaction via
     * / eth_getTransactionReceipt (using the connected Brave wallet) before calling this function.
     * / The backend trusts the frontend-submitted txHash, ethAddress, and uniAmount because:
     * /   1. The admin reviews and calls verifyAndPayUNIDeposit to release sGLDT.
     * /   2. A malicious user submitting a fake txHash would only create a pending record;
     * /      no sGLDT is released until the admin (or automated flow) explicitly approves it.
     * /   3. No Etherscan API key is required — ETH-side verification is client-side.
     * /
     * / Security:
     * /   - txHash must be in the valid Ethereum format: "0x" followed by exactly 64 hex characters.
     * /   - Duplicate txHash submissions are rejected to prevent double-deposit attacks.
     * /
     * / rateHint: Optional live exchange rate from the frontend (1e8 precision, e.g. 238_000_000 = 2.38 sGLDT/UNI).
     * /           When provided and > 0, this rate is locked for this deposit so the user receives
     * /           exactly what they saw on screen. Falls back to uniExchangeRate if null or 0.
     * /           This eliminates the need for a separate syncLiveExchangeRate call from the frontend.
     */
    submitUNIDeposit(ethAddress: string, uniAmount: bigint, txHash: string, rateHint: bigint | null): Promise<bigint>;
    /**
     * / Syncs the live market exchange rate from the frontend (CoinGecko) to the backend.
     * / ADMIN-ONLY: Only the admin principal may update the global exchange rate.
     * / Regular users should pass the live rate via submitUNIDeposit's rateHint parameter
     * / so the rate is locked per-deposit without mutating the global state.
     * / Rate is in 1e8 precision (e.g. 238_000_000 = 2.38 sGLDT per UNI).
     */
    syncLiveExchangeRate(newRate: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    /**
     * / Direct payout trigger — bypasses Etherscan re-check and immediately attempts
     * / the sGLDT ICRC-1 transfer for a deposit that is in #confirmed or #failed status.
     * /
     * / Use this when: the ETH transaction is confirmed but sGLDT was not released, and
     * / you want to force a payout retry without waiting for the next Etherscan poll cycle.
     * /
     * / Only the original depositor or admin may call this.
     * / NEVER traps — all outcomes returned as descriptive Text.
     */
    triggerSGLDTPayout(requestId: bigint): Promise<string>;
    /**
     * / Releases sGLDT from the treasury to the depositing user via ICRC-1 transfer.
     * /
     * / Trust model: The frontend confirms the ETH transaction before calling submitUNIDeposit,
     * / so by the time this function is called the deposit is already #confirmed. No Etherscan
     * / HTTP outcall is needed — ETH verification happens client-side.
     * /
     * / Race condition protection: Before the async ICRC-1 transfer, the deposit status is
     * / atomically set to #processing. Any concurrent call will see #processing and be rejected,
     * / preventing double-payout. On failure, the status reverts to #confirmed for retry.
     * /
     * / IMPORTANT: This function NEVER traps. All errors are returned as descriptive Text.
     * / On any failure the deposit reverts to #confirmed so the user can retry via Keep Checking.
     */
    verifyAndPayUNIDeposit(requestId: bigint): Promise<string>;
    /**
     * / Verifies an ETH transaction on Etherscan and auto-releases sGLDT if confirmed.
     * /
     * / Steps:
     * /   1. Looks up the deposit by requestId.
     * /   2. Makes an HTTP GET to the Etherscan API (gettxreceiptstatus endpoint).
     * /   3. If status=1 (success), marks the deposit #confirmed and calls verifyAndPayUNIDeposit.
     * /   4. Returns "confirmed_and_paid", "pending", "failed", or an error message.
     * /
     * / Any authenticated caller may verify their own deposit. Admin may verify any deposit.
     * / Returns "pending" on Etherscan timeout or API error so the frontend can retry safely.
     */
    verifyEthTransaction(requestId: bigint): Promise<string>;
}
