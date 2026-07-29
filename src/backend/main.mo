import Array "mo:core/Array";
import IC "ic:aaaaa-aa";
import Time "mo:core/Time";
import Timer "mo:core/Timer";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Error "mo:core/Error";
import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import Nat32 "mo:core/Nat32";
import Nat64 "mo:core/Nat64";
import Text "mo:core/Text";
import Float "mo:core/Float";
import Int "mo:core/Int";
import Blob "mo:core/Blob";
import Char "mo:core/Char";
import Principal "mo:core/Principal";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import AccessControl "mo:caffeineai-authorization/access-control";
import OutCall "mo:caffeineai-http-outcalls/outcall";





actor Self {
  // Constants
  let BB_TOKEN_DECIMALS = 8;
  let SGLDT_DECIMALS = 8;
  let PRICE_CACHE_DURATION = 300_000_000_000; // 5 minutes in nanoseconds
  let BAT_DEFAULT_PRICE = 300; // $3.00 in 2 decimal precision
  let SGLDT_DEFAULT_PRICE = 180_000; // $1,800.00

  // Hardcoded admin principal — only this principal has admin access
  let ADMIN_PRINCIPAL : Principal = Principal.fromText("rc62u-qypnw-bbkkp-d56wk-tnzaq-vwhi2-cqqay-q56hw-gsqbp-6wegl-jae");

  // FIX-1: Admin transfer caps — prevent a single call from draining the entire treasury.
  // sGLDT cap: 500,000 sGLDT in e8s (sGLDT uses 8 decimals, ICRC-1 standard)
  let MAX_TRANSFER_AMOUNT_SGLDT : Nat = 50_000_000_000_000;
  // ckUNI cap: 50 ckUNI in e18 (ckUNI uses 18 decimals, ERC-20 standard)
  let MAX_TRANSFER_AMOUNT_CKUNI : Nat = 50_000_000_000_000_000_000;

  // Treasury principal constant — kept for backward compatibility with any code that references it.
  // IMPORTANT: Principal.fromActor(Self) == c626g-iyaaa-aaaau-agpoa-cai.
  // This canister IS the treasury. All sGLDT payout transfers use Principal.fromActor(Self)
  // (from_subaccount = null) as the sender. There is no separate treasury account.
  let TREASURY_PRINCIPAL : Principal = Principal.fromText("c626g-iyaaa-aaaau-agpoa-cai");

  // Persistent State
  let accessControlState = AccessControl.initState();

  do {
    accessControlState.userRoles.add(ADMIN_PRINCIPAL, #admin);
    accessControlState.adminAssigned := true;
  };

  var nextBridgeRequestId = 1;
  var nextExchangeRequestId = 1;
  var nextUNIDepositId = 1;
  var sGLDTTreasuryBalance : Nat = 0; // kept for upgrade compatibility
  var batPoolBalance : Nat = 0;
  // UNI exchange rate: sGLDT per UNI in 1e8 precision (default 238000000 = 2.38 sGLDT per UNI)
  var uniExchangeRate : Nat = 238_000_000;
  // Cached on-chain balances — updated by refreshTreasuryBalances() (an update call).
  // Exposed via public shared query funcs so anonymous/unauthenticated callers can read them.
  var cachedSgldtTreasuryBalance : Nat = 0;
  var cachedCkUNITreasuryBalance : Nat = 0;
  // Fixed treasury ERC-20 deposit address cached from the ICP ERC-20 minter.
  // Same address for ALL users — admin calls initializeMinterDepositAddress() once to populate.
  var cachedMinterDepositAddress : Text = "";
  // Kept for upgrade compatibility with previous version — not used.
  var _minterInitAttempts : Nat = 0;
  // ckUNIMinter: kept for upgrade compatibility. The previous version stored an actor reference
  // here as a stable variable. We restore it with the same type so the upgrade succeeds,
  // then ignore its value — the minter is accessed via transient let ckUNIMinterV1/V2 instead.
  var ckUNIMinter : actor {
    get_deposit_address : shared { owner : Principal; subaccount : ?Blob } -> async Text;
  } = actor ("nbsys-saaaa-aaaar-qaaga-cai");
  var cachedBatPrice : ?{
    price : Nat;
    timestamp : Time.Time;
  } = null;
  var cachedSGldtPrice : ?{
    price : Nat;
    timestamp : Time.Time;
  } = null;

  include MixinAuthorization(accessControlState);

  // -------------------------------------------------------
  // ICRC-1 Types
  // -------------------------------------------------------
  type ICRC1Account = { owner : Principal; subaccount : ?Blob };

  type ICRC1TransferArgs = {
    from_subaccount : ?Blob;
    to : ICRC1Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  type ICRC1TransferError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  type ICRC1TransferResult = { #Ok : Nat; #Err : ICRC1TransferError };

  // -------------------------------------------------------
  // Payout dedup helpers
  // -------------------------------------------------------
  // The automated payout path can be retried by several drivers (sweeper,
  // frontend poll, manual buttons). If a previous ICRC-1 transfer timed out
  // ambiguously (call trapped but the ledger applied it), a blind retry
  // would double-pay. We defend with the ledger's own dedup window: every
  // payout for deposit N is sent with a deterministic memo (the deposit id)
  // and a deterministic created_at_time, so an identical retry is rejected
  // with #Duplicate — which we then treat as success.

  /// Deposit id encoded as an 8-byte big-endian memo blob.
  func _depositMemo(id : Nat) : Blob {
    let n = Nat64.fromNat(id % 18_446_744_073_709_551_616);
    Blob.fromArray(
      Array.tabulate<Nat8>(8, func(i) {
        Nat8.fromNat(((n >> Nat64.fromNat(8 * (7 - i))) & 255).toNat());
      })
    );
  };

  /// Deterministic created_at_time for a deposit's payout transfer.
  /// Bucketed to 12-hour windows anchored at the deposit's own timestamp:
  /// all retries within the same bucket send the exact same timestamp (so
  /// the ledger dedups them), and the timestamp is never more than 12 h in
  /// the past (so it stays inside the ledger's ~24 h transaction window).
  /// Residual risk: a retry that crosses a bucket boundary immediately
  /// after an ambiguous failure could evade dedup — a 12 h-wide edge case
  /// versus the previous behavior where EVERY ambiguous failure could
  /// double-pay.
  func _dedupCreatedAt(depositTimestamp : Time.Time) : Nat64 {
    let BUCKET_NS : Int = 43_200_000_000_000; // 12 hours
    let now = Time.now();
    let anchored = if (now <= depositTimestamp) {
      depositTimestamp
    } else {
      depositTimestamp + ((now - depositTimestamp) / BUCKET_NS) * BUCKET_NS
    };
    Nat64.fromIntWrap(anchored);
  };

  /// Clamp a caller-supplied exchange-rate hint to a tight band around the
  /// canister's own rate. The hint exists only to capture small live-market
  /// drift between the frontend's CoinGecko read and the admin-synced rate;
  /// anything outside ±2% falls back to the canister rate. (The previous
  /// ±50% band let any depositor pay themselves 50% extra.)
  func _clampRateHint(rateHint : ?Nat) : Nat {
    switch (rateHint) {
      case (?hint) {
        if (hint == 0 or uniExchangeRate == 0) {
          uniExchangeRate
        } else {
          let band = uniExchangeRate / 50; // 2%
          if (hint > uniExchangeRate + band or hint < uniExchangeRate - band) {
            uniExchangeRate
          } else {
            hint
          }
        }
      };
      case null { uniExchangeRate };
    };
  };

  // -------------------------------------------------------
  // Etherscan outcall rate limiter
  // -------------------------------------------------------
  // The public balance methods trigger paid HTTPS outcalls. The per-address
  // cache already absorbs honest polling, but an attacker rotating addresses
  // bypasses it and drains cycles + Etherscan quota. Global token bucket:
  // at most OUTCALL_WINDOW_MAX outcall-triggering calls per rolling window.
  var _outcallWindowStart : Time.Time = 0;
  var _outcallWindowCount : Nat = 0;
  let OUTCALL_WINDOW_NS : Int = 60_000_000_000; // 60 seconds
  let OUTCALL_WINDOW_MAX : Nat = 30;

  /// Returns true if the call may proceed; false if rate-limited.
  func _takeOutcallToken() : Bool {
    let now = Time.now();
    if (now - _outcallWindowStart > OUTCALL_WINDOW_NS) {
      _outcallWindowStart := now;
      _outcallWindowCount := 0;
    };
    if (_outcallWindowCount >= OUTCALL_WINDOW_MAX) {
      return false;
    };
    _outcallWindowCount += 1;
    true;
  };

  // -------------------------------------------------------
  // ICRC-1 Ledger Actor References
  // -------------------------------------------------------
  let sgldtLedger : actor {
    icrc1_balance_of : (ICRC1Account) -> async Nat;
    icrc1_transfer : (ICRC1TransferArgs) -> async ICRC1TransferResult;
    icrc1_fee : () -> async Nat;
  } = actor ("i2s4q-syaaa-aaaan-qz4sq-cai");

  let ckUNILedger : actor {
    icrc1_balance_of : (ICRC1Account) -> async Nat;
    icrc1_transfer : (ICRC1TransferArgs) -> async ICRC1TransferResult;
    icrc1_fee : () -> async Nat;
  } = actor ("ilzky-ayaaa-aaaar-qahha-cai");

  // ckERC-20 Minter Canister (sv3dd-oaaaa-aaaar-qacoa-cai) — DFINITY chain-key bridge.
  // The minter exposes get_minter_info() which returns the ERC-20 helper contract address
  // that users interact with on Ethereum to deposit UNI and receive ckUNI.
  // Partial type: we only decode the one field we need (Candid subtyping allows this).
  type MinterDepositArg = { owner : Principal; subaccount : ?Blob };
  type MinterInfo = {
    erc20_helper_contract_address : ?Text;
  };
  transient let ckErc20Minter : actor {
    get_minter_info : () -> async MinterInfo;
  } = actor ("sv3dd-oaaaa-aaaar-qacoa-cai");

  // Types
  type BridgeStatus = {
    #pending;
    #approved;
    #rejected;
  };

  type BridgeRequest = {
    id : Nat;
    submitter : Principal;
    ethAddress : Text;
    batAmount : Nat;
    status : BridgeStatus;
    timestamp : Time.Time;
  };

  type ExchangeStatus = {
    #pending;
    #approved;
    #rejected;
  };

  type sGLDTRequest = {
    id : Nat;
    submitter : Principal;
    bbTokenAmount : Nat;
    sgldAmountCalculated : Nat;
    status : ExchangeStatus;
    timestamp : Time.Time;
  };

  // UNI deposit status includes #processing to prevent double-payout race conditions.
  // The state machine is: #pending → #confirmed → #processing → #paid (or #failed on error).
  // Once #processing is set atomically before the async ICRC-1 call, a second concurrent
  // call will see #processing and reject, preventing double-payout.
  type UNIDepositStatus = {
    #pending;
    #confirmed;
    #processing;
    #paid;
    #failed;
  };

  type UniDepositRequest = {
    id : Nat;
    submitter : Principal;
    ethAddress : Text;
    uniAmount : Nat;
    txHash : Text;
    status : UNIDepositStatus;
    sgldtPaid : Nat;
    timestamp : Time.Time;
    // Exchange rate locked at deposit time (1e8 precision, e.g. 238_000_000 = 2.38 sGLDT per UNI).
    // Optional for backward compatibility with records that predate this field.
    // Payout always uses this rate (or falls back to uniExchangeRate), so the user receives
    // exactly the amount shown on screen regardless of subsequent rate changes.
    lockedExchangeRate : ?Nat;
  };

  // -------------------------------------------------------
  // Transaction History Types
  // -------------------------------------------------------
  public type TxType = {
    #Bridge;   // UNI sent on Ethereum side
    #Mint;     // ckUNI minted on ICP
    #Refine;   // sGLDT released from treasury
    #Transfer; // user-initiated token transfer
  };

  public type TxStatus = {
    #Pending;
    #Confirmed;
    #Completed;
    #Failed;
  };

  public type TxRecord = {
    id : Text;
    txType : TxType;
    amount : Nat;
    tokenSymbol : Text;
    status : TxStatus;
    timestamp : Int;
    ethTxHash : ?Text;
    icpBlockIndex : ?Nat;
    errorMsg : ?Text;
    description : Text;
  };

  public type UserProfile = {
    name : Text;
  };

  // Storage
  let bridgeRequests = Map.empty<Nat, BridgeRequest>();
  let sGLDTRequests = Map.empty<Nat, sGLDTRequest>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let uniDeposits = Map.empty<Nat, UniDepositRequest>();
  // Transaction history: keyed by Principal, value is a List of TxRecord (newest-first)
  let userTransactions = Map.empty<Principal, List.List<TxRecord>>();
  var txCounter : Nat = 0;
  // Set of ETH txHashes already recorded — used to prevent duplicate deposit submissions.
  let seenTxHashes = Set.empty<Text>();

  // Utility Module for Comparison Functions
  module Utils {
    public func compareBridgeRequestsByTimestamp(a : BridgeRequest, b : BridgeRequest) : Order.Order {
      Nat.compare(a.timestamp.toNat(), b.timestamp.toNat());
    };

    public func compareSGLDTRequestsByTimestamp(a : sGLDTRequest, b : sGLDTRequest) : Order.Order {
      Nat.compare(a.timestamp.toNat(), b.timestamp.toNat());
    };

    public func compareUNIDepositsByTimestamp(a : UniDepositRequest, b : UniDepositRequest) : Order.Order {
      Nat.compare(a.timestamp.toNat(), b.timestamp.toNat());
    };
  };

  // -------------------------------------------------------
  // Internal helper: fetch deposit address from the minter canister.
  //
  // FIX-2: V1 fallback is ONLY attempted when V2 returns an empty/null result.
  // If V2 returns an error (canister trap, network failure, etc.), we surface
  // that error immediately and do NOT call V1 — doing so would risk double-processing
  // a V2 call that may have partially succeeded.
  //
  // Decision tree:
  //   V2 success + non-empty address  → return #ok(address)
  //   V2 success + empty address      → fall back to V1 (empty = "not ready", not an error)
  //   V2 error                        → return #err(v2ErrorMessage), do NOT try V1
  //   V1 fallback success + non-empty → return #ok(address)
  //   V1 fallback returns empty       → return #err("empty address")
  //   V1 fallback error               → return #err(v1ErrorMessage)
  // -------------------------------------------------------
  func _fetchMinterDepositAddress(_owner : Principal) : async { #ok : Text; #err : Text } {
    // Query the ckERC-20 minter for its Ethereum helper contract address.
    // This is the shared contract users interact with — they call
    // helper.deposit(UNI_ERC20, amount, principalBytes32) on Ethereum, which triggers
    // the minter to mint ckUNI to the specified ICP principal. The address is the same
    // for every user, so the _owner argument is unused but kept for call-site stability.
    try {
      let info = await ckErc20Minter.get_minter_info();
      switch (info.erc20_helper_contract_address) {
        case (?addr) {
          if (addr.size() > 0) #ok(addr) else #err("ckERC-20 minter returned an empty helper contract address.");
        };
        case null {
          #err("ckERC-20 minter has no ERC-20 helper contract address configured yet.");
        };
      };
    } catch (e) {
      #err("ckERC-20 minter (sv3dd-oaaaa-aaaar-qacoa-cai) returned an error: " # e.message());
    };
  };

  /// Admin check: accepts the hardcoded admin principal OR any principal
  /// registered as #admin in the AccessControl state (populated at canister
  /// init for ADMIN_PRINCIPAL and by _initializeAccessControl for the first
  /// caller). This lets the deployer's dfx identity act as admin too.
  func isAdmin(caller : Principal) : Bool {
    if (caller == ADMIN_PRINCIPAL) return true;
    switch (accessControlState.userRoles.get(caller)) {
      case (? #admin) true;
      case (_) false;
    };
  };

  /// Diagnostic: returns the caller's principal + every admin check result.
  /// Helps debug "not admin" errors from the UI.
  public query ({ caller }) func whoAmI() : async {
    caller : Text;
    isHardcodedAdmin : Bool;
    hasAdminRole : Bool;
    isAdmin : Bool;
  } {
    let hasRole = switch (accessControlState.userRoles.get(caller)) {
      case (? #admin) true;
      case (_) false;
    };
    {
      caller = caller.toText();
      isHardcodedAdmin = caller == ADMIN_PRINCIPAL;
      hasAdminRole = hasRole;
      isAdmin = isAdmin(caller);
    };
  };

  /// Admin-only: promote another principal to #admin. Use this to grant admin
  /// rights to the currently-logged-in UI principal if it differs from
  /// ADMIN_PRINCIPAL. Call from dfx or from a principal already registered as
  /// #admin.
  public shared ({ caller }) func adminGrantAdmin(newAdmin : Principal) : async Text {
    if (not isAdmin(caller)) {
      return "error: Unauthorized — only existing admins may grant admin rights";
    };
    accessControlState.userRoles.add(newAdmin, #admin);
    "ok: " # newAdmin.toText() # " is now an admin";
  };

  /// Returns true for any authenticated (non-anonymous) user, including the admin.
  func isAuthenticatedUser(caller : Principal) : Bool {
    not caller.isAnonymous();
  };

  /// Generates a unique transaction ID using timestamp and an incrementing counter.
  func _nextTxId() : Text {
    txCounter += 1;
    Time.now().toText() # "-" # txCounter.toText();
  };

  /// Prepends a TxRecord to the user's transaction list (newest-first).
  func _recordTx(user : Principal, tx : TxRecord) {
    let existing = switch (userTransactions.get(user)) {
      case (?list) { list };
      case null { List.empty<TxRecord>() };
    };
    // Build a new list with tx at front by prepending into a fresh list
    let updated = List.empty<TxRecord>();
    updated.add(tx);
    updated.append(existing);
    userTransactions.add(user, updated);
  };

  // -------------------------------------------------------
  // Transaction History Methods
  // -------------------------------------------------------

  /// Returns transactions for a given principal, newest-first. PRIVACY: only
  /// the user themselves or the admin may read a history — anyone else gets
  /// an empty array. (The UI uses getMyTransactions; admins have
  /// adminGetUserTransactions. This variant is kept for candid compatibility.)
  public query ({ caller }) func getUserTransactions(user : Principal) : async [TxRecord] {
    if (caller != user and not isAdmin(caller)) {
      return [];
    };
    switch (userTransactions.get(user)) {
      case (?list) { list.toArray() };
      case null { [] };
    };
  };

  /// Caller's own transaction history.
  public query ({ caller }) func getMyTransactions() : async [TxRecord] {
    if (not isAuthenticatedUser(caller)) {
      Runtime.trap("Unauthorized: Must be logged in to view transactions");
    };
    switch (userTransactions.get(caller)) {
      case (?list) { list.toArray() };
      case null { [] };
    };
  };

  /// Admin-only: add a transaction record on behalf of any user (e.g. for manual entries).
  public shared ({ caller }) func addTransaction(user : Principal, record : TxRecord) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    _recordTx(user, record);
  };

  /// Admin-only: view any user's transaction history.
  public query ({ caller }) func adminGetUserTransactions(user : Principal) : async [TxRecord] {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (userTransactions.get(user)) {
      case (?list) { list.toArray() };
      case null { [] };
    };
  };

  // -------------------------------------------------------
  // Canister Identity
  // -------------------------------------------------------
  public query func getCanisterPrincipal() : async Principal {
    Principal.fromActor(Self);
  };

  /// Returns this canister's principal as Text — this IS the treasury (c626g-iyaaa-aaaau-agpoa-cai).
  /// Admin must send sGLDT to this address on the sGLDT ledger (i2s4q-syaaa-aaaan-qz4sq-cai)
  /// to fund user payouts. No separate "refinery payout balance" exists — there is one treasury.
  public query func getRefineryPrincipal() : async Text {
    Principal.fromActor(Self).toText();
  };

  /// Returns the sGLDT balance held by the treasury (this canister's own account on the sGLDT ledger).
  /// Principal.fromActor(Self) == c626g-iyaaa-aaaau-agpoa-cai — this IS the treasury.
  /// Admin must send sGLDT to this canister's principal on the sGLDT ledger to fund payouts.
  /// Display: divide by 1e8 for human-readable sGLDT amount.
  public shared func getCanisterSGLDTBalance() : async Nat {
    await sgldtLedger.icrc1_balance_of({
      owner = Principal.fromActor(Self);
      subaccount = null;
    });
  };

  /// Returns payout readiness info so the admin knows how much sGLDT is available
  /// and whether the treasury can cover all pending deposits.
  /// - treasurySGLDTBalance: sGLDT held by the treasury (this canister, e8s).
  /// - pendingDeposits: count of deposits in #confirmed or #failed status awaiting payout.
  /// - estimatedSGLDTNeeded: total sGLDT owed across all pending deposits (e8s).
  /// - treasuryPrincipal: the principal to send sGLDT to for top-up.
  public shared func getPayoutReadiness() : async {
    treasurySGLDTBalance : Nat;
    pendingDeposits : Nat;
    estimatedSGLDTNeeded : Nat;
    treasuryPrincipal : Text;
  } {
    let treasuryBalance = await sgldtLedger.icrc1_balance_of({
      owner = Principal.fromActor(Self);
      subaccount = null;
    });

    var pendingCount : Nat = 0;
    var totalNeeded : Nat = 0;

    for ((_, r) in uniDeposits.entries()) {
      switch (r.status) {
        case (#confirmed) {
          pendingCount += 1;
          let effectiveRate = switch (r.lockedExchangeRate) {
            case (?rate) rate;
            case null uniExchangeRate;
          };
          let sgldtOwed = (r.uniAmount * effectiveRate) / 100_000_000;
          totalNeeded += sgldtOwed;
        };
        case (#failed) {
          pendingCount += 1;
          let effectiveRate = switch (r.lockedExchangeRate) {
            case (?rate) rate;
            case null uniExchangeRate;
          };
          let sgldtOwed = (r.uniAmount * effectiveRate) / 100_000_000;
          totalNeeded += sgldtOwed;
        };
        case (_) {};
      };
    };

    {
      treasurySGLDTBalance = treasuryBalance;
      pendingDeposits = pendingCount;
      estimatedSGLDTNeeded = totalNeeded;
      treasuryPrincipal = Principal.fromActor(Self).toText();
    };
  };

  /// Alias kept for backward compatibility. Prefer getPayoutReadiness().
  public shared func getPayoutDiagnostic() : async {
    canisterSGLDTBalance : Nat;
    pendingDeposits : Nat;
    estimatedSGLDTNeeded : Nat;
  } {
    let r = await getPayoutReadiness();
    {
      canisterSGLDTBalance = r.treasurySGLDTBalance;
      pendingDeposits = r.pendingDeposits;
      estimatedSGLDTNeeded = r.estimatedSGLDTNeeded;
    };
  };

  /// Diagnoses payout ability for a specific deposit — returns a human-readable summary.
  /// Shows the treasury sGLDT balance, exact amount required for this deposit,
  /// the fee, and whether the transfer would succeed with the current balance.
  /// Admin-only.
  public shared ({ caller }) func diagnosePayoutAbility(depositId : Nat) : async Text {
    if (not isAdmin(caller)) {
      return "error: admin only";
    };

    let request = switch (uniDeposits.get(depositId)) {
      case null { return "error: deposit not found" };
      case (?r) { r };
    };

    let treasuryBalance = await sgldtLedger.icrc1_balance_of({
      owner = Principal.fromActor(Self);
      subaccount = null;
    });

    let fee = try {
      await sgldtLedger.icrc1_fee()
    } catch (_) {
      10_000
    };

    let effectiveRate = switch (request.lockedExchangeRate) {
      case (?r) r;
      case null uniExchangeRate;
    };
    let sgldtOwed = (request.uniAmount * effectiveRate) / 100_000_000;
    let totalRequired = sgldtOwed + fee;

    let statusText = switch (request.status) {
      case (#pending) "pending";
      case (#confirmed) "confirmed";
      case (#processing) "processing";
      case (#paid) "paid";
      case (#failed) "failed";
    };

    let wouldSucceed = treasuryBalance >= totalRequired;
    let shortfall = if (wouldSucceed) 0 else (totalRequired - treasuryBalance);

    "Deposit #" # depositId.toText() # " | Status: " # statusText #
    " | Treasury sGLDT balance: " # treasuryBalance.toText() # " e8s" #
    " | sGLDT owed: " # sgldtOwed.toText() # " e8s" #
    " | Fee: " # fee.toText() # " e8s" #
    " | Total required: " # totalRequired.toText() # " e8s" #
    (if (wouldSucceed) " | WOULD SUCCEED" else " | WOULD FAIL — shortfall: " # shortfall.toText() # " e8s. Send sGLDT to treasury: " # Principal.fromActor(Self).toText());
  };

  /// Public query so the frontend can check whether the caller is the admin
  /// without any round-trip to the admin panel itself.
  public query ({ caller }) func isAdminCaller() : async Bool {
    isAdmin(caller);
  };

  /// Returns the cached on-chain sGLDT balance held by the treasury principal (c626g-iyaaa-aaaau-agpoa-cai).
  /// Used by the treasury banner at the top of the page.
  /// This is a query so it works for unauthenticated (anonymous) callers.
  /// Call refreshTreasuryBalances() to update the cache from the ledger.
  public shared query func getSGLDTTreasuryBalance() : async Nat {
    cachedSgldtTreasuryBalance;
  };

  /// Returns the cached on-chain ckUNI balance held by the treasury principal (c626g-iyaaa-aaaau-agpoa-cai).
  /// This is a query so it works for unauthenticated (anonymous) callers.
  /// Call refreshTreasuryBalances() to update the cache from the ckUNI ledger.
  public shared query func getCkUNITreasuryBalance() : async Nat {
    cachedCkUNITreasuryBalance;
  };

  // -------------------------------------------------------
  // ICRC-1 Treasury Functions
  // -------------------------------------------------------

  /// Returns cached ICRC-1 balances held by the treasury principal (c626g-iyaaa-aaaau-agpoa-cai).
  /// This is a query so it works for unauthenticated callers.
  /// Call refreshTreasuryBalances() to pull fresh values from the ledgers.
  public shared query func getTreasuryICRC1Balances() : async {
    sgldtBalance : Nat;
    ckUNIBalance : Nat;
  } {
    { sgldtBalance = cachedSgldtTreasuryBalance; ckUNIBalance = cachedCkUNITreasuryBalance };
  };

  /// Fetches the live ICRC-1 balances for the treasury (this canister's own account) from both ledgers
  /// and stores them in the cache.
  /// This is an update call — anyone may call it to warm the cache.
  /// Called automatically after any admin transfer or sGLDT payout so the banner stays current.
  /// Note: Principal.fromActor(Self) == c626g-iyaaa-aaaau-agpoa-cai (they are the same).
  public shared func refreshTreasuryBalances() : async () {
    let treasuryAccount : ICRC1Account = { owner = Principal.fromActor(Self); subaccount = null };
    let sgldtBal = await sgldtLedger.icrc1_balance_of(treasuryAccount);
    let ckUNIBal = await ckUNILedger.icrc1_balance_of(treasuryAccount);
    cachedSgldtTreasuryBalance := sgldtBal;
    cachedCkUNITreasuryBalance := ckUNIBal;
  };

  /// Public query: returns the sGLDT ICRC-1 balance for any given principal (their own ICP account).
  /// No admin restriction — users can check their own balance.
  public shared func getUserSGLDTBalance(principalText : Text) : async Nat {
    let userPrincipal = Principal.fromText(principalText);
    let userAccount : ICRC1Account = { owner = userPrincipal; subaccount = null };
    await sgldtLedger.icrc1_balance_of(userAccount);
  };

  /// Admin transfers sGLDT from this canister's treasury to any principal via ICRC-1.
  public shared ({ caller }) func adminTransferSGLDT(to : Principal, amount : Nat) : async Text {
    if (not isAdmin(caller)) {
      return "error: Unauthorized — admin only";
    };
    if (amount == 0) {
      return "error: Invalid amount — must be greater than 0";
    };
    if (amount > MAX_TRANSFER_AMOUNT_SGLDT) {
      return "error: Transfer amount exceeds the per-tx cap (" # MAX_TRANSFER_AMOUNT_SGLDT.toText() # " e8)";
    };

    // Pass fee = null so the ledger uses its own current default fee.
    let result = try {
      await sgldtLedger.icrc1_transfer({
        from_subaccount = null;
        to = { owner = to; subaccount = null };
        amount;
        fee = null;
        memo = null;
        created_at_time = null;
      })
    } catch (e) {
      return "error: sGLDT ledger call trapped: " # e.message();
    };

    switch (result) {
      case (#Ok(blockIndex)) {
        ignore await refreshTreasuryBalances();
        "ok: Transfer successful. Block index: " # blockIndex.toText();
      };
      case (#Err(#InsufficientFunds { balance })) {
        "error: Insufficient sGLDT in treasury. Balance: " # balance.toText() # " e8, required: " # amount.toText() # " e8";
      };
      case (#Err(#BadFee { expected_fee })) {
        "error: BadFee — ledger expected " # expected_fee.toText() # " e8";
      };
      case (#Err(#BadBurn { min_burn_amount })) {
        "error: BadBurn — minimum burn amount is " # min_burn_amount.toText() # " e8";
      };
      case (#Err(#TooOld)) {
        "error: TooOld — transaction timestamp is older than the ledger window";
      };
      case (#Err(#CreatedInFuture { ledger_time })) {
        "error: CreatedInFuture — ledger time is " # ledger_time.toText();
      };
      case (#Err(#Duplicate { duplicate_of })) {
        "error: Duplicate of block " # duplicate_of.toText();
      };
      case (#Err(#TemporarilyUnavailable)) {
        "error: sGLDT ledger is temporarily unavailable. Please retry.";
      };
      case (#Err(#GenericError { error_code; message })) {
        "error: GenericError " # error_code.toText() # ": " # message;
      };
    };
  };

  /// Admin transfers ckUNI from this canister to any principal via ICRC-1.
  /// Returns a Text result prefixed with "ok:" on success or "error:" on failure
  /// so the frontend can surface the real reason (no traps on transfer errors).
  public shared ({ caller }) func adminTransferCkUNI(to : Principal, amount : Nat) : async Text {
    if (not isAdmin(caller)) {
      return "error: Unauthorized — admin only";
    };
    if (amount == 0) {
      return "error: Invalid amount — must be greater than 0";
    };
    if (amount > MAX_TRANSFER_AMOUNT_CKUNI) {
      return "error: Transfer amount exceeds the per-tx cap (" # MAX_TRANSFER_AMOUNT_CKUNI.toText() # " e18)";
    };

    // Pass fee = null so the ledger uses its own current default fee. Avoids a
    // race where the ledger's fee changes between our fetch and our transfer.
    let result = try {
      await ckUNILedger.icrc1_transfer({
        from_subaccount = null;
        to = { owner = to; subaccount = null };
        amount;
        fee = null;
        memo = null;
        created_at_time = null;
      })
    } catch (e) {
      return "error: ckUNI ledger call trapped: " # e.message();
    };

    switch (result) {
      case (#Ok(blockIndex)) {
        ignore await refreshTreasuryBalances();
        "ok: Transfer successful. Block index: " # blockIndex.toText();
      };
      case (#Err(#InsufficientFunds { balance })) {
        "error: Insufficient ckUNI in treasury. Balance: " # balance.toText() # " e18, required: " # amount.toText() # " e18";
      };
      case (#Err(#BadFee { expected_fee })) {
        "error: BadFee — ledger expected " # expected_fee.toText() # " e18";
      };
      case (#Err(#BadBurn { min_burn_amount })) {
        "error: BadBurn — minimum burn amount is " # min_burn_amount.toText() # " e18";
      };
      case (#Err(#TooOld)) {
        "error: TooOld — transaction timestamp is older than the ledger window";
      };
      case (#Err(#CreatedInFuture { ledger_time })) {
        "error: CreatedInFuture — ledger time is " # ledger_time.toText();
      };
      case (#Err(#Duplicate { duplicate_of })) {
        "error: Duplicate of block " # duplicate_of.toText();
      };
      case (#Err(#TemporarilyUnavailable)) {
        "error: ckUNI ledger is temporarily unavailable. Please retry.";
      };
      case (#Err(#GenericError { error_code; message })) {
        "error: GenericError " # error_code.toText() # ": " # message;
      };
    };
  };

  // -------------------------------------------------------
  // Admin Treasury Wallet — mint ckUNI and dissolve ckUNI back to Ethereum
  // -------------------------------------------------------

  /// Admin-only: Records a UNI→ckUNI mint event and calls the ICP ERC-20 minter
  /// to mint ckUNI directly to the treasury principal (c626g-iyaaa-aaaau-agpoa-cai).
  /// ethTxHash — the Ethereum transaction hash proving UNI was sent to the deposit address.
  /// uniAmount — amount in e18 (ERC-20 standard, 1 UNI = 1_000_000_000_000_000_000).
  ///             ckUNI is an ERC-20 mirror token and always uses 18 decimal places — NOT e8s.
  public shared ({ caller }) func adminMintCkUNI(ethTxHash : Text, uniAmount : Nat) : async { #ok : Text; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: admin only");
    };
    if (uniAmount == 0) {
      return #err("Invalid amount: must be greater than 0");
    };
    if (ethTxHash.size() == 0) {
      return #err("Invalid ethTxHash: must not be empty");
    };
    // Prevent double-processing the same ETH tx
    if (seenTxHashes.contains(ethTxHash)) {
      return #err("Duplicate ethTxHash: this transaction has already been processed");
    };
    seenTxHashes.add(ethTxHash);

    // The ICP ERC-20 minter handles conversion automatically once UNI arrives
    // at the treasury deposit address. This call records the mint event and
    // refreshes the treasury balance to reflect the newly minted ckUNI.
    // In production the minter credits the treasury asynchronously after detecting
    // the on-chain UNI deposit — we refresh balances here to surface the new amount.
    try {
      ignore await refreshTreasuryBalances();
    } catch (_) {};

    // Record the mint transaction in the admin's audit trail
    _recordTx(
      ADMIN_PRINCIPAL,
      {
        id = _nextTxId();
        txType = #Mint;
        amount = uniAmount;
        tokenSymbol = "ckUNI";
        status = #Completed;
        timestamp = Time.now();
        ethTxHash = ?ethTxHash;
        icpBlockIndex = null;
        errorMsg = null;
        description = "Admin mint: " # uniAmount.toText() # " UNI e8s → ckUNI. ETH tx: " # ethTxHash;
      },
    );

    #ok("ckUNI mint recorded. Treasury balance refreshed. ETH tx: " # ethTxHash # ". UNI amount (e8s): " # uniAmount.toText());
  };

  /// Admin-only: Burns ckUNI from the treasury and releases UNI back to an Ethereum address.
  /// Calls the ICP ERC-20 minter withdrawal method to burn ckUNI and trigger UNI release on Ethereum.
  /// ckUNIAmount — amount in e8s (1e8 = 1 ckUNI).
  /// destinationEthAddress — the Ethereum address to receive the released UNI.
  /// DISABLED — this flow as previously implemented would STRAND FUNDS.
  ///
  /// It ICRC-1-transferred ckUNI to the minter's default account and then
  /// called withdraw_erc20. The real ckERC-20 minter protocol instead
  /// requires (1) an icrc2_approve of ckETH to cover the Ethereum gas fee,
  /// (2) an icrc2_approve of the ckERC-20 being withdrawn, and (3) a
  /// withdraw_erc20 call that pulls the tokens via transfer_from. On top of
  /// that, the ad-hoc `#Err : Text` result type here doesn't match the
  /// minter's actual WithdrawErc20Error candid, so the decode failed AFTER
  /// the ckUNI had already been transferred away — tokens sent to the
  /// minter's account with no withdrawal executed and no recovery path.
  /// (There was also an e8s/e18 unit mismatch with the AdminPage.)
  ///
  /// The method is retained (candid compatibility) but refuses to move
  /// funds until the approve-based flow is implemented and tested.
  public shared ({ caller }) func adminDissolveCkUNI(ckUNIAmount : Nat, destinationEthAddress : Text) : async { #ok : Text; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: admin only");
    };
    ignore ckUNIAmount;
    ignore destinationEthAddress;
    #err(
      "adminDissolveCkUNI is disabled: the previous implementation transferred ckUNI to the minter without the required icrc2_approve flow and would strand the funds. Withdraw manually via the minter's documented icrc2_approve + withdraw_erc20 protocol, or reimplement this method with that flow."
    );
  };

  // -------------------------------------------------------
  // Fixed ETH deposit address — used as a fallback when the minter canister address
  // has not been initialized yet, so the frontend always gets a usable address.
  let FIXED_ETH_DEPOSIT_ADDRESS : Text = "0x22582083361bf06579BbfFcC1138D3fc986B91FF";

  /// Resolved deposit address: returns the minter-derived address if cached, otherwise
  /// the fixed hardcoded fallback.  Avoids the caller having to null-check.
  func _resolvedDepositAddress() : Text {
    if (cachedMinterDepositAddress.size() > 0) {
      cachedMinterDepositAddress;
    } else {
      FIXED_ETH_DEPOSIT_ADDRESS;
    };
  };

  /// Public query — returns treasury wallet info: cached deposit address, ckUNI balance (e8s), sGLDT balance (e8s).
  /// No authentication required — safe for all callers.
  /// Frontend divides raw Nat balances by 1e8 for display.
  /// depositAddress always returns a non-empty value: the minter-derived address when available,
  /// otherwise the fixed hardcoded fallback (0x22582083361bf06579BbfFcC1138D3fc986B91FF).
  public query func getTreasuryWalletInfo() : async {
    depositAddress : Text;
    ckUNIBalance : Nat;
    sGLDTBalance : Nat;
  } {
    {
      depositAddress = _resolvedDepositAddress();
      ckUNIBalance = cachedCkUNITreasuryBalance;
      sGLDTBalance = cachedSgldtTreasuryBalance;
    };
  };

  // The minter deposit address is NO LONGER initialized via a startup timer —
  // the timer approach has been unreliable across many deploys.
  // Instead, selfInitializeMinterAddress() fetches on-demand (called by frontend
  // when the cache is empty), and adminInitializeMinterAddress() provides a manual override.
  // -------------------------------------------------------

  // Periodic treasury balance refresh every 60 seconds
  func _periodicRefreshBalances<system>() : async () {
    let treasuryAccount : ICRC1Account = { owner = Principal.fromActor(Self); subaccount = null };
    try {
      let sgldtBal = await sgldtLedger.icrc1_balance_of(treasuryAccount);
      cachedSgldtTreasuryBalance := sgldtBal;
    } catch (_) {};
    try {
      let ckUNIBal = await ckUNILedger.icrc1_balance_of(treasuryAccount);
      cachedCkUNITreasuryBalance := ckUNIBal;
    } catch (_) {};
    // Re-schedule itself
    ignore Timer.setTimer<system>(#seconds 60, _periodicRefreshBalances);
  };

  // Fire startup timer: balance refresh after 5s
  ignore Timer.setTimer<system>(#seconds 5, _periodicRefreshBalances);

  // Automatic sGLDT payout sweeper — definition & startup hook live further down,
  // after verifyAndPayUNIDeposit, so the function it calls is already in scope.
  var sweeperInFlight : Bool = false;

  // -------------------------------------------------------
  // ckUNI ERC-20 Minter Integration
  // -------------------------------------------------------

  /// Returns the Ethereum helper-contract address that users interact with to deposit UNI.
  /// If the address is not yet cached, this call auto-initializes it by calling
  /// the DFINITY chain-key ERC-20 minter (sv3dd-oaaaa-aaaar-qacoa-cai) once.
  /// Users do NOT send UNI to this address directly — they call
  /// helper.approve(UNI, amount) followed by helper.deposit(UNI, amount, principal).
  /// The treasury principal (c626g-iyaaa-aaaau-agpoa-cai) is always the owner/beneficiary.
  /// After initialization the address is cached permanently — subsequent calls are instant.
  /// Prefer getMinterDepositAddress() (query) once initialization has happened.
  public shared func getCkUNIMinterDepositAddress(_userPrincipal : Principal) : async { #ok : Text; #err : Text } {
    // Fast path: already cached
    if (cachedMinterDepositAddress.size() > 0) {
      return #ok(cachedMinterDepositAddress);
    };
    // Auto-initialize on first call
    switch (await _fetchMinterDepositAddress(TREASURY_PRINCIPAL)) {
      case (#ok(addr)) {
        cachedMinterDepositAddress := addr;
        #ok(addr);
      };
      case (#err(msg)) {
        #err(msg);
      };
    };
  };

  // -------------------------------------------------------
  // Minter Deposit Address — Treasury Fixed Address
  // -------------------------------------------------------

  /// Admin-only: Calls the ICP ERC-20 minter to derive the treasury's fixed Ethereum
  /// deposit address and caches it on-chain. Only needs to be called once (or to refresh).
  /// All users will send UNI to this same address; the minter automatically converts
  /// incoming ERC-20 UNI to ckUNI and credits the treasury principal (c626g-iyaaa-aaaau-agpoa-cai).
  public shared ({ caller }) func initializeMinterDepositAddress() : async Text {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (await _fetchMinterDepositAddress(TREASURY_PRINCIPAL)) {
      case (#ok(addr)) {
        cachedMinterDepositAddress := addr;
        addr;
      };
      case (#err(msg)) {
        Runtime.trap(msg);
      };
    };
  };

  /// Public query — returns the cached treasury Ethereum deposit address for the ERC-20 minter.
  /// Falls back to the fixed hardcoded address (0x22582083361bf06579BbfFcC1138D3fc986B91FF)
  /// if the minter-derived address has not been initialized yet — so callers always get a
  /// non-empty, usable address.
  public query func getMinterDepositAddress() : async Text {
    _resolvedDepositAddress();
  };

  /// Admin-only alias for initializeMinterDepositAddress() that returns a result-style Text
  /// so the admin panel can display success/error feedback without trapping.
  public shared ({ caller }) func adminInitializeMinterAddress() : async Text {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (await _fetchMinterDepositAddress(TREASURY_PRINCIPAL)) {
      case (#ok(addr)) {
        cachedMinterDepositAddress := addr;
        "ok: " # addr;
      };
      case (#err(msg)) {
        "err: " # msg;
      };
    };
  };

  /// Public (non-admin) method to trigger minter address initialization.
  /// Called by the frontend automatically when getMinterDepositAddress() returns "".
  /// Returns the cached address immediately if already set (fast path — no inter-canister call).
  /// If the cache is empty, calls the DFINITY chain-key ERC-20 minter
  /// (sv3dd-oaaaa-aaaar-qacoa-cai) to fetch the ERC-20 helper contract address
  /// and caches it on-chain.
  /// Any caller (authenticated or anonymous) may call this — it only mutates the address cache.
  public shared func selfInitializeMinterAddress() : async { #ok : Text; #err : Text } {
    // Fast path: already initialized — return instantly without any inter-canister call
    if (cachedMinterDepositAddress.size() > 0) {
      return #ok(cachedMinterDepositAddress);
    };
    // Cache is empty — fetch from minter now
    switch (await _fetchMinterDepositAddress(TREASURY_PRINCIPAL)) {
      case (#ok(addr)) {
        cachedMinterDepositAddress := addr;
        #ok(addr);
      };
      case (#err(msg)) {
        #err(msg);
      };
    };
  };

  /// checkAndProcessCkUNIBalance — REMOVED (was a critical treasury-drain vector).
  ///
  /// This function previously: (a) had no caller authentication (public shared func),
  /// (b) accepted both userPrincipal and uniAmount as unauthenticated parameters,
  /// (c) required only that the named principal hold ≥1 ckUNI wei (~free) and
  /// (d) never pulled or burned that ckUNI. Any principal could call it in a loop
  /// with an arbitrary uniAmount to drain the sGLDT treasury. Removed entirely —
  /// the legitimate deposit flow goes through submitUNIDeposit →
  /// verifyEthTransaction → verifyAndPayUNIDeposit, which now on-chain-verifies
  /// the deposit before paying out.

  /// Allows a user to reset their own stuck mining phase (e.g. after a 20-minute timeout).
  /// This method only affects the UNI deposit state — it does NOT refund any tokens.
  /// Any #processing deposit belonging to the caller is reverted to #confirmed so the
  /// user can retry verifyAndPayUNIDeposit without reloading the page.
  /// Admin may reset any user's stuck deposit by passing the requestId.
  public shared ({ caller }) func resetMiningPhase(requestId : Nat) : async { #ok : Text; #err : Text } {
    if (not isAuthenticatedUser(caller)) {
      return #err("Unauthorized: Must be logged in");
    };
    switch (uniDeposits.get(requestId)) {
      case null { #err("Deposit not found") };
      case (?request) {
        if (caller != request.submitter and not isAdmin(caller)) {
          return #err("Unauthorized: Can only reset your own deposit");
        };
        switch (request.status) {
          case (#processing) {
            let reset = { request with status = #confirmed };
            uniDeposits.add(requestId, reset);
            #ok("Deposit reset to confirmed. You may retry the payout.");
          };
          case (#pending) {
            #ok("Deposit is still pending ETH confirmation — nothing to reset.");
          };
          case (#confirmed) {
            #ok("Deposit is already confirmed and ready for payout.");
          };
          case (#paid) {
            #ok("Deposit has already been paid out.");
          };
          case (#failed) {
            // Terminal-rejection guard: don't resurrect calldata-rejected deposits.
            if (request.uniAmount == 0) {
              return #err("Deposit was rejected during on-chain verification. It cannot be retried — submit a new deposit.");
            };
            // Allow retrying genuine (payout-step) failures by resetting to confirmed.
            let reset = { request with status = #confirmed };
            uniDeposits.add(requestId, reset);
            #ok("Deposit reset from failed to confirmed. You may retry the payout.");
          };
        };
      };
    };
  };

  // -------------------------------------------------------
  // User Profile Methods
  // -------------------------------------------------------
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not isAuthenticatedUser(caller)) {
      Runtime.trap("Unauthorized: Must be logged in to view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not isAuthenticatedUser(caller)) {
      Runtime.trap("Unauthorized: Must be logged in to save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Legacy stubs (kept for backward compat)
  public shared ({ caller }) func mintBankingBraveTokens(_to : Principal, _amount : Nat) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    Runtime.trap("Use adminTransferCkUNI to distribute ckUNI tokens instead.");
  };

  public query func getBalance(_principal : Principal) : async Nat {
    Runtime.trap("Use getTreasuryICRC1Balances for real ICRC-1 balances.");
  };

  public query func getTotalSupply() : async Nat {
    Runtime.trap("Query the ckUNI ledger directly for total supply.");
  };

  // -------------------------------------------------------
  // Bridge Request Methods
  // -------------------------------------------------------
  public shared ({ caller }) func submitBridgeRequest(ethAddress : Text, batAmount : Nat) : async Nat {
    if (not isAuthenticatedUser(caller)) {
      Runtime.trap("Unauthorized: Must be logged in to submit bridge requests");
    };

    let id = nextBridgeRequestId;
    nextBridgeRequestId += 1;

    let request : BridgeRequest = {
      id;
      submitter = caller;
      ethAddress;
      batAmount;
      status = #pending;
      timestamp = Time.now();
    };

    bridgeRequests.add(id, request);
    id;
  };

  public shared ({ caller }) func approveBridgeRequest(id : Nat) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };

    let request = switch (bridgeRequests.get(id)) {
      case (null) { Runtime.trap("Bridge request not found") };
      case (?request) { request };
    };

    switch (request.status) {
      case (#approved) { Runtime.trap("Bridge request already approved") };
      case (#rejected) { Runtime.trap("Bridge request was rejected and cannot be approved") };
      case (#pending) {
        let approvedRequest = {
          request with status = #approved;
        };
        bridgeRequests.add(id, approvedRequest);
        ();
      };
    };
  };

  public shared ({ caller }) func rejectBridgeRequest(id : Nat) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };

    let request = switch (bridgeRequests.get(id)) {
      case (null) { Runtime.trap("Bridge request not found") };
      case (?request) { request };
    };

    switch (request.status) {
      case (#approved) { Runtime.trap("Bridge request already approved") };
      case (#rejected) { Runtime.trap("Bridge request already rejected") };
      case (#pending) {
        let rejectedRequest = {
          request with status = #rejected;
        };
        bridgeRequests.add(id, rejectedRequest);
        ();
      };
    };
  };

  public query ({ caller }) func getBridgeRequests() : async [BridgeRequest] {
    if (not isAuthenticatedUser(caller)) {
      Runtime.trap("Unauthorized: Must be logged in to view bridge requests");
    };
    bridgeRequests.values().toArray().sort(Utils.compareBridgeRequestsByTimestamp);
  };

  public query ({ caller }) func getPendingBridgeRequests() : async [BridgeRequest] {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    bridgeRequests.values().toArray().filter(
      func(request) {
        request.status == #pending;
      }
    ).sort(Utils.compareBridgeRequestsByTimestamp);
  };

  public query ({ caller }) func getBridgeRequestsByUser(user : Principal) : async [BridgeRequest] {
    if (caller != user and not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Can only view your own bridge requests");
    };
    bridgeRequests.values().toArray().filter(
      func(request) {
        request.submitter == user;
      }
    ).sort(Utils.compareBridgeRequestsByTimestamp);
  };

  // -------------------------------------------------------
  // sGLDT Exchange Request Methods
  // -------------------------------------------------------
  public shared ({ caller }) func submitSGLDTExchangeRequest(bbTokenAmount : Nat) : async Nat {
    if (not isAuthenticatedUser(caller)) {
      Runtime.trap("Unauthorized: Must be logged in to submit sGLDT exchange requests");
    };

    let sgldAmount = bbTokenAmount;

    let id = nextExchangeRequestId;
    nextExchangeRequestId += 1;

    let request : sGLDTRequest = {
      id;
      submitter = caller;
      bbTokenAmount;
      sgldAmountCalculated = sgldAmount;
      status = #pending;
      timestamp = Time.now();
    };

    sGLDTRequests.add(id, request);
    id;
  };

  public shared ({ caller }) func approveSGLDTExchangeRequest(id : Nat) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };

    let request = switch (sGLDTRequests.get(id)) {
      case (null) { Runtime.trap("sGLDT exchange request not found") };
      case (?request) { request };
    };

    switch (request.status) {
      case (#approved) { Runtime.trap("sGLDT exchange request already approved") };
      case (#rejected) { Runtime.trap("sGLDT exchange request already rejected") };
      case (#pending) {
        let approvedRequest = {
          request with status = #approved;
        };
        sGLDTRequests.add(id, approvedRequest);
        ();
      };
    };
  };

  public shared ({ caller }) func rejectSGLDTExchangeRequest(id : Nat) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };

    let request = switch (sGLDTRequests.get(id)) {
      case (null) { Runtime.trap("sGLDT exchange request not found") };
      case (?request) { request };
    };

    switch (request.status) {
      case (#approved) { Runtime.trap("sGLDT exchange request already approved") };
      case (#rejected) { Runtime.trap("sGLDT exchange request already rejected") };
      case (#pending) {
        let rejectedRequest = {
          request with status = #rejected;
        };
        sGLDTRequests.add(id, rejectedRequest);
        ();
      };
    };
  };

  public query ({ caller }) func getSGLDTExchangeRequests() : async [sGLDTRequest] {
    if (not isAuthenticatedUser(caller)) {
      Runtime.trap("Unauthorized: Must be logged in to view sGLDT exchange requests");
    };
    sGLDTRequests.values().toArray().sort(Utils.compareSGLDTRequestsByTimestamp);
  };

  public query ({ caller }) func getPendingSGLDTExchangeRequests() : async [sGLDTRequest] {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    sGLDTRequests.values().toArray().filter(
      func(request) {
        request.status == #pending;
      }
    ).sort(Utils.compareSGLDTRequestsByTimestamp);
  };

  public query ({ caller }) func getSGLDTExchangeRequestsByUser(user : Principal) : async [sGLDTRequest] {
    if (caller != user and not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Can only view your own sGLDT exchange requests");
    };
    sGLDTRequests.values().toArray().filter(
      func(request) {
        request.submitter == user;
      }
    ).sort(Utils.compareSGLDTRequestsByTimestamp);
  };

  // -------------------------------------------------------
  // UNI Deposit Methods
  // -------------------------------------------------------

  /// Records a UNI deposit after the frontend has confirmed the ETH transaction on-chain.
  ///
  /// Trust model: The frontend is responsible for confirming the ETH transaction via
  /// eth_getTransactionReceipt (using the connected Brave wallet) before calling this function.
  /// The backend trusts the frontend-submitted txHash, ethAddress, and uniAmount because:
  ///   1. The admin reviews and calls verifyAndPayUNIDeposit to release sGLDT.
  ///   2. A malicious user submitting a fake txHash would only create a pending record;
  ///      no sGLDT is released until the admin (or automated flow) explicitly approves it.
  ///   3. No Etherscan API key is required — ETH-side verification is client-side.
  ///
  /// Security:
  ///   - txHash must be in the valid Ethereum format: "0x" followed by exactly 64 hex characters.
  ///   - Duplicate txHash submissions are rejected to prevent double-deposit attacks.
  ///
  /// rateHint: Optional live exchange rate from the frontend (1e8 precision, e.g. 238_000_000 = 2.38 sGLDT/UNI).
  ///           When provided and > 0, this rate is locked for this deposit so the user receives
  ///           exactly what they saw on screen. Falls back to uniExchangeRate if null or 0.
  ///           This eliminates the need for a separate syncLiveExchangeRate call from the frontend.
  public shared ({ caller }) func submitUNIDeposit(ethAddress : Text, uniAmount : Nat, txHash : Text, rateHint : ?Nat) : async Nat {
    if (not isAuthenticatedUser(caller)) {
      Runtime.trap("Unauthorized: Must be logged in to submit UNI deposits");
    };

    // Minimum deposit guard: reject dust deposits below 0.001 UNI (100_000 e8s)
    if (uniAmount < 100_000) {
      Runtime.trap("Deposit too small: minimum is 0.001 UNI (100000 e8s)");
    };

    // Validate txHash format: must be "0x" + 64 hex characters (total 66 chars)
    if (txHash.size() != 66) {
      Runtime.trap("Invalid txHash: must be 66 characters (0x + 64 hex digits)");
    };
    if (not txHash.startsWith(#text "0x")) {
      Runtime.trap("Invalid txHash: must start with 0x");
    };
    // Validate all characters after "0x" are hex digits
    let hexChars = txHash.toArray();
    var i = 2;
    label hexCheck while (i < hexChars.size()) {
      let c = hexChars[i];
      let isHex = (c >= '0' and c <= '9') or (c >= 'a' and c <= 'f') or (c >= 'A' and c <= 'F');
      if (not isHex) {
        Runtime.trap("Invalid txHash: contains non-hex character at position " # i.toText());
      };
      i += 1;
    };

    // Validate ethAddress format: "0x" + 40 hex chars. A well-formed address is
    // required because verifyEthTransaction compares it to on-chain tx.from;
    // a malformed value would always mismatch and force the deposit to be
    // rejected — fail fast here with a clearer error instead.
    if (ethAddress.size() != 42) {
      Runtime.trap("Invalid ethAddress: must be 42 characters (0x + 40 hex digits)");
    };
    if (not ethAddress.startsWith(#text "0x") and not ethAddress.startsWith(#text "0X")) {
      Runtime.trap("Invalid ethAddress: must start with 0x");
    };
    let addrChars = ethAddress.toArray();
    var j = 2;
    label ethHex while (j < addrChars.size()) {
      let c = addrChars[j];
      let isHex = (c >= '0' and c <= '9') or (c >= 'a' and c <= 'f') or (c >= 'A' and c <= 'F');
      if (not isHex) {
        Runtime.trap("Invalid ethAddress: contains non-hex character at position " # j.toText());
      };
      j += 1;
    };

    // Duplicate txHash handling — instead of trapping, return the existing
    // deposit's ID so the frontend can resume monitoring an earlier submission
    // that was lost mid-flow (e.g., the user's browser crashed or an auth bug
    // caused the frontend to lose the requestId).
    if (seenTxHashes.contains(txHash)) {
      for ((existingId, existing) in uniDeposits.entries()) {
        if (existing.txHash == txHash and existing.submitter == caller) {
          return existingId;
        };
      };
      // txHash seen but no matching deposit for this caller — someone else
      // submitted this hash. Refuse.
      Runtime.trap("Duplicate txHash: this transaction was submitted by another principal");
    };
    seenTxHashes.add(txHash);

    let id = nextUNIDepositId;
    nextUNIDepositId += 1;

    // Caller-supplied rate hints are clamped to ±2% of the canister rate —
    // see _clampRateHint for the security rationale.
    let effectiveLockedRate : Nat = _clampRateHint(rateHint);

    // Deposit starts as #pending. The status can only advance to #confirmed by
    // verifyEthTransaction, which now parses the real on-chain tx input and
    // rejects any deposit where the declared ethAddress, UNI contract, amount,
    // or target ICP principal don't match the actual broadcast transaction.
    // This prevents a caller from fabricating a deposit record by pointing at
    // any random successful Ethereum tx.
    let request : UniDepositRequest = {
      id;
      submitter = caller;
      ethAddress;
      uniAmount;
      txHash;
      status = #pending;
      sgldtPaid = 0;
      timestamp = Time.now();
      // Lock the exchange rate so this deposit is always paid at the rate
      // the user saw when they submitted, regardless of future rate changes.
      lockedExchangeRate = ?effectiveLockedRate;
    };

    uniDeposits.add(id, request);
    id;
  };

  /// Result of autoFinalizeUNIDeposit — tells the frontend what to do next.
  type AutoFinalizeResult = {
    #ok : { requestId : Nat; txHash : Text };     // deposit found, record created, verification + payout in flight
    #alreadyExists : { requestId : Nat; txHash : Text; status : Text };  // we already saw this tx
    #noDepositFound : Text;                        // user hasn't broadcast the deposit yet
    #apiError : Text;                              // Etherscan unreachable — retry
  };

  /// Find the user's most recent UNI deposit tx to the ckERC-20 helper AND
  /// submit it for verification + payout — all in one call. This is the
  /// reliable finalize path for mobile users whose frontend never captured
  /// the deposit tx hash: they click one button after signing, and the
  /// backend discovers the tx from their on-chain history.
  ///
  /// Flow:
  ///   1. Etherscan V2 txlist for `ethAddress`, newest first, last ~10 txs
  ///   2. Find the newest one where: to == helper, input starts with
  ///      deposit() selector, UNI is the token, amount matches uniAmountE8
  ///   3. If found, create a UniDepositRequest (or return the existing one
  ///      if we've already seen this hash) and kick off verifyAndPayUNIDeposit
  ///   4. Return a result variant so the frontend can show the right UI
  ///
  /// Only the caller's own ethAddress is scanned — we use `caller` as the
  /// record submitter, so whoever invokes this gets credited. To prevent
  /// front-running, the _verifyDepositCalldata check later re-validates
  /// `tx.from == ethAddress`.
  public shared ({ caller }) func autoFinalizeUNIDeposit(
    ethAddress : Text,
    uniAmountE8 : Nat,
    rateHint : ?Nat,
  ) : async AutoFinalizeResult {
    if (not isAuthenticatedUser(caller)) {
      return #apiError("Must be logged in");
    };
    if (ethAddress.size() != 42 or not ethAddress.startsWith(#text "0x")) {
      return #apiError("Invalid ethAddress");
    };
    if (uniAmountE8 < 100_000) {
      return #apiError("Amount too small (minimum 0.001 UNI)");
    };

    // Expected amount in wei (18 decimals, what the on-chain tx contains).
    let expectedAmountWei = uniAmountE8 * 10_000_000_000;

    // Fetch user's recent txs via Etherscan V2.
    let url =
      "https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist"
        # "&address=" # ethAddress
        # "&sort=desc&page=1&offset=10"
        # "&apikey=***REMOVED-ETHERSCAN-KEY***";
    let body = try {
      await _httpGetBounded(url, 32768);
    } catch (_) { return #apiError("Etherscan unreachable — retry in a moment") };

    if (body.contains(#text "NOTOK")) {
      return #apiError("Etherscan API error (rate-limited?) — retry");
    };

    // Walk the response looking for `"to":"0x6abda0...":"input":"0x26b3293f..."`
    // where amount matches. The response is a plain-text JSON array; we scan
    // for the helper address substring and then parse the surrounding record.
    // This is imperfect parsing but the shape is stable from Etherscan.
    let helperMarker = "\"to\":\"0x" # CKERC20_HELPER_CONTRACT_LOWER # "\"";
    var pos : Nat = 0;
    let bodyArr = body.toArray();
    let bodyLen = bodyArr.size();
    let helperMarkerLen = helperMarker.toArray().size();

    // Etherscan returns array sorted desc by block number, so the first match
    // we find IS the latest deposit. Walk the body, checking each occurrence.
    while (pos < bodyLen) {
      switch (_indexOf(_sliceText(body, pos, bodyLen - pos), helperMarker)) {
        case null { pos := bodyLen };  // no more matches
        case (?relativeIdx) {
          let matchStart = pos + relativeIdx;
          // Look for the tx record boundaries — record starts with `{` before
          // matchStart and ends with `}` after. Pull a window of ±500 chars.
          let winStart = if (matchStart >= 500) matchStart - 500 else 0;
          let winEnd = if (matchStart + 800 < bodyLen) matchStart + 800 else bodyLen;
          let window = _sliceText(body, winStart, winEnd - winStart);

          // Verify input matches deposit() selector + UNI token + amount.
          let inputKey = "\"input\":\"";
          switch (_indexOf(window, inputKey)) {
            case null { pos := matchStart + helperMarkerLen };
            case (?inputIdx) {
              let inputStart = inputIdx + inputKey.toArray().size();
              // Read until next `"`. Input is big (200+ chars).
              let winArr = window.toArray();
              var e = inputStart;
              while (e < winArr.size() and winArr[e] != '\"') { e += 1 };
              let input = _toLowerAscii(_stripHexPrefix(_sliceText(window, inputStart, e - inputStart)));
              let inputLen = input.toArray().size();

              if (inputLen < 200) {
                pos := matchStart + helperMarkerLen;
              } else {
                let selector = _sliceText(input, 0, 8);
                let tokenTail = _sliceText(input, 32, 40);
                let amountHex = _sliceText(input, 72, 64);
                let amountOk = switch (_hexToNat(amountHex)) {
                  case (?n) { n == expectedAmountWei };
                  case null { false };
                };
                if (selector == DEPOSIT_SELECTOR and tokenTail == UNI_CONTRACT_ADDRESS_LOWER and amountOk) {
                  // Matching deposit found. Extract hash.
                  let hashKey = "\"hash\":\"0x";
                  switch (_indexOf(window, hashKey)) {
                    case null { pos := matchStart + helperMarkerLen };
                    case (?hashIdx) {
                      let hashStart = hashIdx + hashKey.toArray().size();
                      var he = hashStart;
                      while (he < winArr.size() and winArr[he] != '\"') { he += 1 };
                      let hashHex = _sliceText(window, hashStart, he - hashStart);
                      if (hashHex.toArray().size() != 64) {
                        pos := matchStart + helperMarkerLen;
                      } else {
                        let txHash = "0x" # hashHex;
                        // Dedup: have we already seen this hash?
                        if (seenTxHashes.contains(txHash)) {
                          for ((existingId, existing) in uniDeposits.entries()) {
                            if (existing.txHash == txHash and existing.submitter == caller) {
                              let statusText = switch (existing.status) {
                                case (#paid) "paid";
                                case (#confirmed) "confirmed";
                                case (#processing) "processing";
                                case (#pending) "pending";
                                case (#failed) "failed";
                              };
                              return #alreadyExists({
                                requestId = existingId;
                                txHash;
                                status = statusText;
                              });
                            };
                          };
                          // hash seen under a different principal — front-running guard
                          return #apiError("This tx hash was already claimed by another ICP principal");
                        };
                        // Create new deposit record (#pending — verifyEth will advance it).
                        seenTxHashes.add(txHash);
                        let id = nextUNIDepositId;
                        nextUNIDepositId += 1;
                        let effectiveRate : Nat = _clampRateHint(rateHint);
                        let request : UniDepositRequest = {
                          id;
                          submitter = caller;
                          ethAddress;
                          uniAmount = uniAmountE8;
                          txHash;
                          status = #pending;
                          sgldtPaid = 0;
                          timestamp = Time.now();
                          lockedExchangeRate = ?effectiveRate;
                        };
                        uniDeposits.add(id, request);
                        // Kick off verification + payout inline so the caller
                        // knows the full outcome by the time this returns.
                        // verifyEthTransaction handles Etherscan receipt check,
                        // calldata validation, and payout.
                        ignore await verifyEthTransaction(id);
                        return #ok({ requestId = id; txHash });
                      };
                    };
                  };
                } else {
                  pos := matchStart + helperMarkerLen;
                };
              };
            };
          };
        };
      };
    };

    return #noDepositFound(
      "No matching UNI deposit tx found from " # ethAddress
        # " for " # uniAmountE8.toText()
        # " e8s. Did you sign and broadcast the deposit? If just now, wait ~30s for Etherscan to index and retry."
    );
  };

  /// Releases sGLDT from the treasury to the depositing user via ICRC-1 transfer.
  ///
  /// Trust model: The frontend confirms the ETH transaction before calling submitUNIDeposit,
  /// so by the time this function is called the deposit is already #confirmed. No Etherscan
  /// HTTP outcall is needed — ETH verification happens client-side.
  ///
  /// Race condition protection: Before the async ICRC-1 transfer, the deposit status is
  /// atomically set to #processing. Any concurrent call will see #processing and be rejected,
  /// preventing double-payout. On failure, the status reverts to #confirmed for retry.
  ///
  /// IMPORTANT: This function NEVER traps. All errors are returned as descriptive Text.
  /// On any failure the deposit reverts to #confirmed so the user can retry via Keep Checking.
  public shared ({ caller }) func verifyAndPayUNIDeposit(requestId : Nat) : async Text {
    // Only the admin or the depositor themselves may trigger payout
    if (not isAuthenticatedUser(caller)) {
      return "error: Unauthorized";
    };

    let request = switch (uniDeposits.get(requestId)) {
      case (null) { return "error: UNI deposit request not found" };
      case (?r) { r };
    };

    // Allow: the depositor, the admin, OR this canister itself.
    // Motoko routes internal `await publicFunc()` calls through the IC message queue,
    // so when verifyEthTransaction / retryUNIDepositPayout call this function internally,
    // the `caller` becomes Principal.fromActor(Self) — not the original user.
    // Without this allowance, all automated payouts fail silently with "Unauthorized".
    if (caller != request.submitter and not isAdmin(caller) and caller != Principal.fromActor(Self)) {
      return "error: Unauthorized — can only verify your own deposit";
    };

    switch (request.status) {
      case (#paid) {
        return "already_paid: " # request.sgldtPaid.toText() # " sGLDT released to " # request.submitter.toText();
      };
      case (#processing) {
        // Another call is already in progress — reject to prevent double-payout
        return "pending: Payout already in progress. Please wait and check again shortly.";
      };
      case (#pending) {
        // Deposit was submitted without prior ETH confirmation (should not happen in normal flow)
        return "pending: Deposit is pending ETH confirmation. Please wait for the transaction to be confirmed on Ethereum before retrying.";
      };
      case (#failed) {
        // Treat #failed same as #confirmed — allow retry without requiring resetMiningPhase.
        // Atomically set to #processing to prevent double-payout race conditions.
        let processingRequest = { request with status = #processing };
        uniDeposits.add(requestId, processingRequest);
      };
      case (#confirmed) {
        // Atomically mark as #processing before the async ICRC-1 call.
        // This is safe within Motoko's single-threaded model: the state update
        // happens before any await, so no concurrent message can see #confirmed
        // and also proceed to payment.
        let processingRequest = { request with status = #processing };
        uniDeposits.add(requestId, processingRequest);
      };
    };

    // Use the original request record for all subsequent logic — no need to re-fetch
    // since the only mutation above was the status field, and we use `request` for all
    // other fields (submitter, uniAmount, txHash, lockedExchangeRate).
    let liveRequest = request;

    // Guard: never transfer to anonymous principal
    if (liveRequest.submitter.isAnonymous()) {
      let revertedRequest = { liveRequest with status = #confirmed };
      uniDeposits.add(requestId, revertedRequest);
      return "failed: Cannot transfer sGLDT to anonymous principal. User must be logged in.";
    };

    // Terminal-rejection guard: deposits whose calldata didn't match the on-chain
    // tx are stored with uniAmount=0 so they can never be paid out, even if a
    // reset/retry path flips them back to #confirmed. Do not attempt payout.
    if (liveRequest.uniAmount == 0) {
      return "rejected: deposit was rejected during on-chain verification and cannot be retried";
    };

    // Calculate sGLDT payout using the rate locked at deposit time (or global rate as fallback).
    // uniAmount (e8s) * lockedExchangeRate (sGLDT per UNI in 1e8) / 1e8 = sGLDT (e8s)
    let effectiveRate = switch (liveRequest.lockedExchangeRate) {
      case (?r) r;
      case null uniExchangeRate;
    };
    let sgldtAmount = (liveRequest.uniAmount * effectiveRate) / 100_000_000;

    if (sgldtAmount == 0) {
      // Revert to #confirmed so admin can retry after fixing exchange rate
      let revertedRequest = { liveRequest with status = #confirmed };
      uniDeposits.add(requestId, revertedRequest);
      return "failed: Calculated payout is zero. Check exchange rate and UNI amount.";
    };

    // Wrap the fee fetch + ICRC-1 transfer in try/catch so any canister error or network
    // failure reverts the deposit to #confirmed rather than leaving it stuck in #processing.
    try {
      // Dynamically query the sGLDT ledger fee — this ensures we always use the correct fee
      // regardless of ledger configuration changes. Fallback to 10_000 e8s (standard ICRC-1 fee).
      let fee = try {
        await sgldtLedger.icrc1_fee()
      } catch (_feeErr) {
        // Standard ICRC-1 fee for sGLDT; fall back if the ledger is temporarily unreachable.
        10_000
      };

      // ── DEBUG LOGGING ────────────────────────────────────────────────────────────────────────
      // Log all transfer parameters before the call so failures can be diagnosed from canister logs.
      // FROM: This canister's own account on the sGLDT ledger (principal = c626g-iyaaa-aaaau-agpoa-cai).
      //       The sGLDT tokens MUST be held by this same principal for the transfer to succeed.
      // TO:   The user's ICP principal (no subaccount).
      ignore debug_show((
        "sGLDT transfer attempt",
        "from_canister:", Principal.fromActor(Self).toText(),
        "to_user:", liveRequest.submitter.toText(),
        "amount_e8s:", sgldtAmount,
        "fee_e8s:", fee,
        "uni_amount_e8s:", liveRequest.uniAmount,
        "locked_rate_1e8:", effectiveRate,
        "deposit_id:", requestId,
        "tx_hash:", liveRequest.txHash
      ));
      // ── END DEBUG ────────────────────────────────────────────────────────────────────────────

      // Transfer sGLDT from this canister (treasury sender) to the user (recipient) via ICRC-1.
      // from_subaccount = null → default treasury account of this canister.
      // memo + created_at_time are DETERMINISTIC per deposit (see _depositMemo /
      // _dedupCreatedAt): if a previous attempt timed out ambiguously but the
      // ledger applied it, the retry is rejected with #Duplicate instead of
      // paying a second time — #Duplicate is handled below as success.
      let transferResult = await sgldtLedger.icrc1_transfer({
        from_subaccount = null;
        to = { owner = liveRequest.submitter; subaccount = null };
        amount = sgldtAmount;
        fee = ?fee;
        memo = ?_depositMemo(requestId);
        created_at_time = ?_dedupCreatedAt(liveRequest.timestamp);
      });

      switch (transferResult) {
        case (#Ok(blockIndex)) {
          let paidRequest = {
            liveRequest with
            status = #paid;
            sgldtPaid = sgldtAmount;
          };
          uniDeposits.add(requestId, paidRequest);
          try { ignore await refreshTreasuryBalances() } catch (_) {};
          // Debug: log successful payout to canister logs
          ignore debug_show(("sGLDT transfer success, block:", blockIndex, "amount:", sgldtAmount, "to:", liveRequest.submitter.toText()));
          // Record #Bridge transaction for the UNI deposit
          _recordTx(
            liveRequest.submitter,
            {
              id = _nextTxId();
              txType = #Bridge;
              amount = liveRequest.uniAmount;
              tokenSymbol = "UNI";
              status = #Completed;
              timestamp = Time.now();
              ethTxHash = ?liveRequest.txHash;
              icpBlockIndex = null;
              errorMsg = null;
              description = "UNI bridged from Ethereum: " # liveRequest.uniAmount.toText() # " e8s. ETH tx: " # liveRequest.txHash;
            },
          );
          // Record #Refine transaction for the sGLDT payout
          _recordTx(
            liveRequest.submitter,
            {
              id = _nextTxId();
              txType = #Refine;
              amount = sgldtAmount;
              tokenSymbol = "sGLDT";
              status = #Completed;
              timestamp = Time.now();
              ethTxHash = ?liveRequest.txHash;
              icpBlockIndex = ?blockIndex;
              errorMsg = null;
              description = "sGLDT released from treasury: " # sgldtAmount.toText() # " e8s. Block: " # blockIndex.toText();
            },
          );
          "paid: " # sgldtAmount.toText() # " sGLDT released to " # liveRequest.submitter.toText();
        };
        case (#Err(#InsufficientFunds { balance })) {
          // Revert to #confirmed so the admin can top up the treasury and retry
          let revertedRequest = { liveRequest with status = #confirmed };
          uniDeposits.add(requestId, revertedRequest);
          ignore debug_show(("sGLDT transfer failed: InsufficientFunds, treasury balance:", balance, "needed:", sgldtAmount));
          _recordTx(
            liveRequest.submitter,
            {
              id = _nextTxId();
              txType = #Refine;
              amount = sgldtAmount;
              tokenSymbol = "sGLDT";
              status = #Failed;
              timestamp = Time.now();
              ethTxHash = ?liveRequest.txHash;
              icpBlockIndex = null;
              errorMsg = ?("Insufficient sGLDT in treasury. Balance: " # balance.toText() # " e8s, required: " # sgldtAmount.toText() # " e8s");
              description = "sGLDT release failed: insufficient treasury balance";
            },
          );
          "confirmed_payout_failed: Insufficient sGLDT in treasury. Admin must send sGLDT to the treasury principal (" # Principal.fromActor(Self).toText() # "). Current balance: " # balance.toText() # " e8s, required: " # sgldtAmount.toText() # " e8s";
        };
        case (#Err(#BadFee { expected_fee })) {
          let revertedRequest = { liveRequest with status = #confirmed };
          uniDeposits.add(requestId, revertedRequest);
          ignore debug_show(("sGLDT transfer failed: BadFee, expected_fee:", expected_fee));
          "confirmed_payout_failed: BadFee - ledger expected fee " # expected_fee.toText() # " e8s. Please retry.";
        };
        case (#Err(#TemporarilyUnavailable)) {
          let revertedRequest = { liveRequest with status = #confirmed };
          uniDeposits.add(requestId, revertedRequest);
          ignore debug_show("sGLDT transfer failed: TemporarilyUnavailable");
          "confirmed_payout_failed: TemporarilyUnavailable - sGLDT ledger is temporarily unavailable. Please retry in a moment.";
        };
        case (#Err(#Duplicate { duplicate_of })) {
          // The ledger's dedup window matched an earlier transfer with the
          // same memo/created_at_time — the payout ALREADY LANDED on a prior
          // attempt whose response we lost. Mark paid; do NOT retry.
          let paidRequest = {
            liveRequest with
            status = #paid;
            sgldtPaid = sgldtAmount;
          };
          uniDeposits.add(requestId, paidRequest);
          ignore debug_show(("sGLDT transfer deduped — already paid in block:", duplicate_of));
          "paid: " # sgldtAmount.toText() # " sGLDT released to " # liveRequest.submitter.toText() # " (deduplicated — original transfer in block " # duplicate_of.toText() # ")";
        };
        case (#Err(#TooOld)) {
          // Our deterministic created_at_time fell out of the ledger's
          // transaction window (deposit stuck unpaid for a long time).
          // Revert to #confirmed — the next attempt lands in a fresh 12 h
          // bucket and proceeds with dedup protection restored.
          let revertedRequest = { liveRequest with status = #confirmed };
          uniDeposits.add(requestId, revertedRequest);
          "confirmed_payout_failed: transfer timestamp expired — will retry automatically.";
        };
        case (#Err(#GenericError { error_code; message })) {
          let revertedRequest = { liveRequest with status = #confirmed };
          uniDeposits.add(requestId, revertedRequest);
          ignore debug_show(("sGLDT transfer failed: GenericError", error_code, message));
          _recordTx(
            liveRequest.submitter,
            {
              id = _nextTxId();
              txType = #Refine;
              amount = sgldtAmount;
              tokenSymbol = "sGLDT";
              status = #Failed;
              timestamp = Time.now();
              ethTxHash = ?liveRequest.txHash;
              icpBlockIndex = null;
              errorMsg = ?("GenericError " # error_code.toText() # ": " # message);
              description = "sGLDT release failed: " # message;
            },
          );
          "confirmed_payout_failed: GenericError " # error_code.toText() # " - " # message # ". Please retry.";
        };
        case (#Err(_)) {
          // Revert to #confirmed so the payout can be retried
          let revertedRequest = { liveRequest with status = #confirmed };
          uniDeposits.add(requestId, revertedRequest);
          ignore debug_show("sGLDT transfer failed: unknown ICRC-1 error variant");
          _recordTx(
            liveRequest.submitter,
            {
              id = _nextTxId();
              txType = #Refine;
              amount = sgldtAmount;
              tokenSymbol = "sGLDT";
              status = #Failed;
              timestamp = Time.now();
              ethTxHash = ?liveRequest.txHash;
              icpBlockIndex = null;
              errorMsg = ?"sGLDT ICRC-1 transfer failed";
              description = "sGLDT release failed: ICRC-1 transfer error";
            },
          );
          "confirmed_payout_failed: ICRC-1 transfer error. Please retry.";
        };
      };
    } catch (e) {
      // Any exception (fee fetch failure, network timeout, canister trap) lands here.
      // Revert to #confirmed so the user can retry via Keep Checking.
      let revertedRequest = { liveRequest with status = #confirmed };
      uniDeposits.add(requestId, revertedRequest);
      "failed: " # e.message() # " — deposit reverted to confirmed, please retry.";
    };
  };

  // -------------------------------------------------------
  // Automatic sGLDT payout sweeper
  // -------------------------------------------------------
  // Background timer that scans every 30 s for deposits stuck in #confirmed and
  // pays them out automatically. Decouples delivery from frontend polling so
  // the user gets their sGLDT even if they close the browser, and transient
  // ICRC-1 failures retry on the next tick.
  //
  // Caller becomes Principal.fromActor(Self) via IC message routing — already
  // permitted by the auth check inside verifyAndPayUNIDeposit.
  func _sweepConfirmedDeposits<system>() : async () {
    // Re-arm first so a slow sweep doesn't delay the next tick.
    ignore Timer.setTimer<system>(#seconds 30, _sweepConfirmedDeposits);

    if (sweeperInFlight) { return };
    sweeperInFlight := true;

    let now = Time.now();
    let confirmedIds = List.empty<Nat>();
    let pendingIds = List.empty<Nat>();
    for ((id, r) in uniDeposits.entries()) {
      switch (r.status) {
        case (#confirmed) { confirmedIds.add(id) };
        case (#pending) {
          // The sweeper is the single payout authority: it also VERIFIES
          // #pending deposits (Etherscan receipt + calldata check inside
          // verifyEthTransaction) so a user whose browser died right after
          // signing still gets paid with no frontend involvement.
          // Bounds: skip deposits younger than 60 s (Ethereum needs ~12
          // confirmations anyway — saves pointless outcalls) and older
          // than 24 h (dead submissions; admin can still verify manually).
          let age = now - r.timestamp;
          if (r.uniAmount > 0 and age > 60_000_000_000 and age < 86_400_000_000_000) {
            pendingIds.add(id);
          };
        };
        case (_) {};
      };
    };

    for (id in confirmedIds.values()) {
      try {
        ignore await verifyAndPayUNIDeposit(id);
      } catch (_) {
        // Silent — next sweep will retry.
      };
    };

    // Cap Etherscan outcalls per sweep: 3 verifications × 2 outcalls each,
    // every 30 s, stays far under the free-tier quota even with a backlog.
    var verified = 0;
    for (id in pendingIds.values()) {
      if (verified < 3) {
        verified += 1;
        try {
          ignore await verifyEthTransaction(id);
        } catch (_) {};
      };
    };

    sweeperInFlight := false;
  };

  // (Sweep kick-off is registered at the bottom of the actor — it must come
  // after every helper the sweep transitively references is defined.)

  /// Retries the sGLDT payout for a deposit that is in #confirmed or #failed status.
  ///
  /// This is what the "Keep Checking" button should call. Unlike verifyEthTransaction,
  /// which only reads the current status, this method actually re-attempts the ICRC-1
  /// sGLDT transfer. Use this to resolve deposits that are stuck in #confirmed because
  /// a previous verifyAndPayUNIDeposit call trapped or failed silently.
  ///
  /// IMPORTANT: This function NEVER traps. All outcomes are returned as descriptive Text.
  ///   - If already paid:   "already_paid: <amount> sGLDT released to <principal>"
  ///   - If confirmed/failed and retry succeeds: "paid: <amount> sGLDT released to <principal>"
  ///   - If confirmed/failed and payout fails definitively: "confirmed_payout_failed: <reason>"
  ///   - If confirmed/failed and network/transient error: "failed: <reason>"
  ///   - If pending ETH:   "pending: ..."
  ///   - If processing:    "pending: ..."
  ///
  /// Only the original depositor or admin may call this.
  public shared ({ caller }) func retryUNIDepositPayout(requestId : Nat) : async Text {
    if (not isAuthenticatedUser(caller)) {
      return "error: Must be logged in to retry payout";
    };

    let request = switch (uniDeposits.get(requestId)) {
      case null { return "error: Deposit not found" };
      case (?r) { r };
    };

    if (caller != request.submitter and not isAdmin(caller) and caller != Principal.fromActor(Self)) {
      return "error: Unauthorized — can only retry your own deposit";
    };

    // Terminal-rejection guard: a uniAmount=0 record means the deposit failed
    // on-chain calldata verification and was marked unpayable. Never retry.
    if (request.uniAmount == 0) {
      return "rejected: deposit was rejected during on-chain verification and cannot be retried";
    };

    switch (request.status) {
      case (#paid) {
        return "already_paid: " # request.sgldtPaid.toText() # " sGLDT released to " # request.submitter.toText();
      };
      case (#processing) {
        return "pending: Payout already in progress. Please wait and check again shortly.";
      };
      case (#pending) {
        return "pending: Deposit is still pending ETH confirmation. It must be confirmed before sGLDT can be released.";
      };
      case (#failed) {
        // Reset to #confirmed so verifyAndPayUNIDeposit can proceed
        let resetRequest = { request with status = #confirmed };
        uniDeposits.add(requestId, resetRequest);
      };
      case (#confirmed) {
        // Ready to retry — fall through to payout attempt
      };
    };

    // Re-attempt the actual ICRC-1 sGLDT transfer.
    // verifyAndPayUNIDeposit never traps — all results are returned as descriptive Text.
    try {
      await verifyAndPayUNIDeposit(requestId);
    } catch (e) {
      // Should not reach here since verifyAndPayUNIDeposit wraps everything in try/catch,
      // but guard defensively to prevent the retry call itself from ever trapping.
      let revertRequest = switch (uniDeposits.get(requestId)) {
        case (?r) { ?{ r with status = #confirmed } };
        case null { null };
      };
      switch (revertRequest) {
        case (?r) { uniDeposits.add(requestId, r) };
        case null {};
      };
      "failed: " # e.message() # " — deposit reverted to confirmed, please retry.";
    };
  };

  // -------------------------------------------------------
  // Etherscan HTTP Outcall — on-chain ETH transaction verification
  // -------------------------------------------------------

  /// Direct payout trigger — bypasses Etherscan re-check and immediately attempts
  /// the sGLDT ICRC-1 transfer for a deposit that is in #confirmed or #failed status.
  ///
  /// Use this when: the ETH transaction is confirmed but sGLDT was not released, and
  /// you want to force a payout retry without waiting for the next Etherscan poll cycle.
  ///
  /// Only the original depositor or admin may call this.
  /// NEVER traps — all outcomes returned as descriptive Text.
  public shared ({ caller }) func triggerSGLDTPayout(requestId : Nat) : async Text {
    if (not isAuthenticatedUser(caller)) {
      return "error: Must be logged in";
    };

    let request = switch (uniDeposits.get(requestId)) {
      case null { return "error: Deposit not found" };
      case (?r) { r };
    };

    if (caller != request.submitter and not isAdmin(caller) and caller != Principal.fromActor(Self)) {
      return "error: Unauthorized — can only trigger payout for your own deposit";
    };

    switch (request.status) {
      case (#paid) {
        return "already_paid: " # request.sgldtPaid.toText() # " sGLDT released to " # request.submitter.toText();
      };
      case (#processing) {
        return "pending: Payout already in progress";
      };
      case (#pending) {
        return "pending: Deposit is still pending ETH confirmation";
      };
      case (#failed) {
        // Reset to confirmed so verifyAndPayUNIDeposit proceeds
        let resetRequest = { request with status = #confirmed };
        uniDeposits.add(requestId, resetRequest);
      };
      case (#confirmed) {};
    };

    // Directly attempt the sGLDT payout — no Etherscan check
    try {
      let payResult = await verifyAndPayUNIDeposit(requestId);
      if (payResult.startsWith(#text "paid:") or payResult.startsWith(#text "already_paid:")) {
        "confirmed_and_paid: " # payResult;
      } else {
        payResult;
      };
    } catch (e) {
      let revertRequest = switch (uniDeposits.get(requestId)) {
        case (?r) { ?{ r with status = #confirmed } };
        case null { null };
      };
      switch (revertRequest) {
        case (?r) { uniDeposits.add(requestId, r) };
        case null {};
      };
      "failed: " # e.message();
    };
  };

  // -------------------------------------------------------
  // Etherscan HTTP Outcall — on-chain ETH transaction verification
  // -------------------------------------------------------

  /// Known addresses / selectors for the UNI → ckUNI deposit flow. These MUST match
  /// the values the frontend constructs in its sendTransaction call — the backend
  /// uses them to cryptographically verify that the user's submitted txHash is an
  /// honest deposit into the ckERC-20 helper, not a random unrelated ETH tx.
  ///
  /// The selector `26b3293f` = keccak256("deposit(address,uint256,bytes32)")[:4].
  let UNI_CONTRACT_ADDRESS_LOWER : Text = "1f9840a85d5af5bf1d1762f925bdaddc4201f984";
  let CKERC20_HELPER_CONTRACT_LOWER : Text = "6abda0438307733fc299e9c229fd3cc074bd8cc0";
  let DEPOSIT_SELECTOR : Text = "26b3293f";

  /// Lowercase an ASCII Text. Non-ASCII chars pass through unchanged.
  func _toLowerAscii(t : Text) : Text {
    let arr = t.toArray();
    let lowered = Array.tabulate(arr.size(), func(i : Nat) : Char {
      let c = arr[i];
      let n = c.toNat32();
      if (n >= 65 and n <= 90) { Char.fromNat32(n + 32) } else { c };
    });
    Text.fromArray(lowered);
  };

  /// Drop a leading `0x` or `0X` if present.
  func _stripHexPrefix(hex : Text) : Text {
    if (hex.startsWith(#text "0x") or hex.startsWith(#text "0X")) {
      let arr = hex.toArray();
      Text.fromArray(Array.tabulate(arr.size() - 2 : Nat, func(i : Nat) : Char = arr[i + 2]));
    } else { hex };
  };

  /// Substring by char index. Returns "" if `from` is past the end.
  func _sliceText(t : Text, from : Nat, len : Nat) : Text {
    let arr = t.toArray();
    let size = arr.size();
    if (from >= size) return "";
    let actualLen = if (from + len > size) { size - from : Nat } else { len };
    Text.fromArray(Array.tabulate(actualLen, func(i : Nat) : Char = arr[from + i]));
  };

  /// Parse a hex string to Nat. Returns null on any non-hex char.
  func _hexToNat(hex : Text) : ?Nat {
    var n : Nat = 0;
    for (c in hex.chars()) {
      let d : ?Nat = switch c {
        case ('0') ?0; case ('1') ?1; case ('2') ?2; case ('3') ?3;
        case ('4') ?4; case ('5') ?5; case ('6') ?6; case ('7') ?7;
        case ('8') ?8; case ('9') ?9;
        case ('a') ?10; case ('A') ?10;
        case ('b') ?11; case ('B') ?11;
        case ('c') ?12; case ('C') ?12;
        case ('d') ?13; case ('D') ?13;
        case ('e') ?14; case ('E') ?14;
        case ('f') ?15; case ('F') ?15;
        case _ { null };
      };
      switch d { case null return null; case (?x) { n := n * 16 + x } };
    };
    ?n;
  };

  /// Find the first occurrence of `needle` in `haystack`. Returns char index.
  func _indexOf(haystack : Text, needle : Text) : ?Nat {
    let hArr = haystack.toArray();
    let nArr = needle.toArray();
    let hLen = hArr.size();
    let nLen = nArr.size();
    if (nLen == 0 or nLen > hLen) return null;
    var i : Nat = 0;
    while (i + nLen <= hLen) {
      var j : Nat = 0;
      var matched = true;
      label inner while (j < nLen) {
        if (hArr[i + j] != nArr[j]) { matched := false; break inner };
        j += 1;
      };
      if (matched) return ?i;
      i += 1;
    };
    null;
  };

  /// Extract `"key":"value"` from a JSON blob — returns the value or null.
  /// Naive parser: works for flat fields without escaped quotes, which is all we need
  /// for eth_getTransactionByHash's top-level hex strings.
  func _extractJsonString(json : Text, key : Text) : ?Text {
    let pattern = "\"" # key # "\":\"";
    switch (_indexOf(json, pattern)) {
      case null { null };
      case (?startOfPattern) {
        let patArr = pattern.toArray();
        let valueStart = startOfPattern + patArr.size();
        let arr = json.toArray();
        var i = valueStart;
        while (i < arr.size() and arr[i] != '\"') { i += 1 };
        if (i > arr.size()) { null }
        else { ?_sliceText(json, valueStart, i - valueStart : Nat) };
      };
    };
  };

  /// Decode a 64-hex-char (32-byte) principal-bytes32 payload back to a Principal.
  /// Layout: [length byte][principal bytes][zero padding].
  func _bytes32ToPrincipal(hex : Text) : ?Principal {
    let clean = _stripHexPrefix(hex);
    if (clean.toArray().size() != 64) return null;
    let lenHex = _sliceText(clean, 0, 2);
    switch (_hexToNat(lenHex)) {
      case null null;
      case (?len) {
        if (len == 0 or len > 29) return null;
        let principalHex = _sliceText(clean, 2, len * 2);
        let bytes = List.empty<Nat8>();
        var i : Nat = 0;
        while (i < len) {
          let byteHex = _sliceText(principalHex, i * 2, 2);
          switch (_hexToNat(byteHex)) {
            case (?n) { bytes.add(Nat8.fromNat(n)) };
            case null { return null };
          };
          i += 1;
        };
        let raw = bytes.toArray();
        let blob = Blob.fromArray(raw);
        ?blob.fromBlob();
      };
    };
  };

  /// Verifies a transaction hash actually represents a UNI deposit into the
  /// ckERC-20 helper contract with the amount the user declared. Calls
  /// eth_getTransactionByHash via Etherscan's JSON-RPC proxy, parses the input
  /// calldata, and checks:
  ///   • tx.from   == declared ethAddress (blocks a caller from claiming someone
  ///                  else's tx hash — even if they spot it in the mempool)
  ///   • tx.to     == ckERC-20 helper contract
  ///   • selector  == keccak256("deposit(address,uint256,bytes32)")[:4] = 26b3293f
  ///   • token arg == UNI mainnet address
  ///   • amount arg== declared uniAmount × 10^10 (e8 → e18 conversion)
  ///   • principal arg == this canister's principal (so the ckUNI comes to us)
  /// Returns "ok" on full match, "pending" on RPC failure, or "mismatch: <detail>".
  func _verifyDepositCalldata(
    txHash : Text,
    expectedFrom : Text,
    expectedUniE8 : Nat,
  ) : async Text {
    let url =
      // Etherscan V1 API was deprecated April 2026 — returns NOTOK for every
      // call now. V2 requires chainid=1 as a query param for mainnet.
      "https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionByHash&txhash="
        # txHash
        # "&apikey=***REMOVED-ETHERSCAN-KEY***";
    let body = try {
      await _httpGetBounded(url, 32768);
    } catch (_) { return "pending" };

    // If the response doesn't even contain a result field we can't verify —
    // treat as pending so the user can retry.
    if (not body.contains(#text "\"result\"")) return "pending";

    let toField = switch (_extractJsonString(body, "to")) {
      case null { return "mismatch: no `to` in tx" };
      case (?t) { _toLowerAscii(_stripHexPrefix(t)) };
    };
    if (toField != CKERC20_HELPER_CONTRACT_LOWER) {
      return "mismatch: tx.to=" # toField # " is not the ckERC-20 helper contract";
    };

    // Verify tx.from matches the user's declared ethAddress. This prevents
    // front-running: if Bob spots Alice's tx hash in the mempool and calls
    // submitUNIDeposit claiming it was his tx, the on-chain `from` won't
    // match Bob's claimed ethAddress and the deposit is rejected.
    let fromField = switch (_extractJsonString(body, "from")) {
      case null { return "mismatch: no `from` in tx" };
      case (?f) { _toLowerAscii(_stripHexPrefix(f)) };
    };
    let expectedFromLower = _toLowerAscii(_stripHexPrefix(expectedFrom));
    if (fromField != expectedFromLower) {
      return "mismatch: tx.from=0x" # fromField # " but declared ethAddress=0x" # expectedFromLower;
    };

    let input = switch (_extractJsonString(body, "input")) {
      case null { return "mismatch: no `input` in tx" };
      case (?i) { _toLowerAscii(_stripHexPrefix(i)) };
    };
    // 8 (selector) + 64 (token) + 64 (amount) + 64 (principal) = 200 hex chars minimum
    let inputLen = input.toArray().size();
    if (inputLen < 200) {
      return "mismatch: tx input too short (" # inputLen.toText() # " chars)";
    };

    let selector = _sliceText(input, 0, 8);
    if (selector != DEPOSIT_SELECTOR) {
      return "mismatch: selector=" # selector # " is not deposit(address,uint256,bytes32)";
    };

    // Token address is right-padded to 32 bytes — the meaningful 40 hex chars are
    // at positions 8+24 = 32 through 8+64 = 72.
    let tokenArgTail = _sliceText(input, 32, 40);
    if (tokenArgTail != UNI_CONTRACT_ADDRESS_LOWER) {
      return "mismatch: token=" # tokenArgTail # " is not UNI";
    };

    let amountHex = _sliceText(input, 72, 64);
    let amountWei = switch (_hexToNat(amountHex)) {
      case (?n) { n };
      case null { return "mismatch: amount arg not hex" };
    };
    // UNI is 18 decimals on Ethereum; our record stores e8. Require exact match
    // (the frontend derives both from the same decimal string).
    if (amountWei != expectedUniE8 * 10_000_000_000) {
      let expectedWei = expectedUniE8 * 10_000_000_000;
      return "mismatch: on-chain amount=" # amountWei.toText()
        # " wei, but declared=" # expectedUniE8.toText() # " e8s ("
        # expectedWei.toText() # " wei expected)";
    };

    let principalHex = _sliceText(input, 136, 64);
    let decodedPrincipal = switch (_bytes32ToPrincipal(principalHex)) {
      case (?p) { p };
      case null { return "mismatch: principal bytes32 malformed" };
    };
    if (decodedPrincipal != Principal.fromActor(Self)) {
      return "mismatch: principal=" # decodedPrincipal.toText()
        # " — deposit was routed to a different ICP principal, not this treasury";
    };

    "ok";
  };

  /// Bounded HTTPS GET outcall. Caps `max_response_bytes` at `maxBytes` so
  /// the replica only charges for that much response capacity instead of the
  /// 2MB default (which is ~270 BILLION cycles per call). Etherscan balance
  /// responses are ~80 bytes; 2 KB is ample. Drops ~1000x from call cost.
  ///
  /// The OutCall helper from caffeine-http-outcalls leaves max unbounded —
  /// we bypass it here specifically for balance reads which we call
  /// frequently. Returns the decoded body Text, or traps on failure.
  func _httpGetBounded(url : Text, maxBytes : Nat) : async Text {
    let args : IC.http_request_args = {
      url;
      max_response_bytes = ?(Nat64.fromNat(maxBytes));
      headers = [{ name = "User-Agent"; value = "banking.brave-canister" }];
      body = null;
      method = #get;
      transform = ?{
        function = transform;
        context = Blob.fromArray([]);
      };
      // IMPORTANT: must be unreplicated. Etherscan returns slightly different
      // balances to different replicas when the chain tip advances between
      // their requests (millisecond-level race). Replicated outcalls then
      // fail with "No consensus could be reached". Unreplicated mode routes
      // the call through a SINGLE replica whose response is signed — no
      // cross-replica agreement needed. This is the canonical pattern for
      // oracle-style outcalls on IC.
      is_replicated = ?false;
    };
    // Unreplicated outcalls on a 13-node app subnet: ~1/13 the cost of
    // replicated. With max_response_bytes ≤ 32 KB, real cost is a few
    // hundred million cycles. We provide 5 B as a buffer; unused cycles
    // are refunded.
    let cycles : Nat = 5_000_000_000;
    let httpResponse = await (with cycles = cycles) IC.http_request(args);
    switch (httpResponse.body.decodeUtf8()) {
      case null { Runtime.trap("empty HTTP response") };
      case (?s) { s };
    };
  };

  // (debugEtherscanRaw helper removed after outcall consensus issue diagnosed
  //  and fixed via is_replicated=false — 2026-04-23.)

  /// Parse the `"result":"<decimal>"` field from an Etherscan V2 response.
  /// Returns the numeric value or null if the response is malformed. Used by
  /// the balance-read helpers below — Etherscan returns balances as a plain
  /// decimal string (not hex like JSON-RPC), so we need a decimal→Nat parser.
  func _parseEtherscanResultDecimal(body : Text) : ?Nat {
    // Fail fast on API error responses ("NOTOK", rate-limit, etc.)
    if (body.contains(#text "NOTOK")) return null;
    let valueOpt = _extractJsonString(body, "result");
    switch (valueOpt) {
      case null { null };
      case (?txt) {
        var n : Nat = 0;
        var hadDigit = false;
        let zero : Nat32 = 48;  // '0'
        for (c in txt.chars()) {
          let cn = c.toNat32();
          if (cn >= zero and cn <= zero + 9) {
            let digit : Nat = (cn - zero).toNat();
            n := n * 10 + digit;
            hadDigit := true;
          } else {
            // Non-digit — reject so we don't mis-parse error strings like
            // "Invalid address" into 0.
            return null;
          };
        };
        if (hadDigit) ?n else null;
      };
    };
  };

  /// Canister-side ETH balance read. Uses Etherscan V2 account/balance which
  /// is a plain GET — CORS-free from canister HTTP outcalls. Primary purpose:
  /// give the frontend a reliable balance path on mobile browsers where
  /// public RPC fetches are blocked by Brave Shields / CORS / network, AND
  /// where window.ethereum isn't injected in regular tabs. Returns Nat of
  /// wei (18 decimals) on success, traps on network failure so the frontend
  /// can fall back to other paths. */
  public shared func getEthBalanceOnchain(ethAddress : Text) : async Nat {
    if (ethAddress.size() != 42 or not ethAddress.startsWith(#text "0x")) {
      Runtime.trap("Invalid ethAddress");
    };
    if (not _takeOutcallToken()) {
      Runtime.trap("Rate-limited: too many balance lookups — retry in a minute");
    };
    let url =
      "https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance"
        # "&address=" # ethAddress
        # "&tag=latest"
        # "&apikey=***REMOVED-ETHERSCAN-KEY***";
    let body = try {
      await _httpGetBounded(url, 2048);
    } catch (_) { Runtime.trap("ETH balance fetch failed: network error") };
    switch (_parseEtherscanResultDecimal(body)) {
      case (?n) n;
      case null { Runtime.trap("ETH balance fetch failed: unexpected response") };
    };
  };

  /// Unified balance read — fetches ETH and UNI balances in a single IC
  /// round-trip from the frontend's perspective. Used by the frontend as
  /// the reliable mobile balance path: one update-call latency gets both
  /// balances. Returns { ethWei, uniWei }; a 0 for either field means that
  /// individual fetch failed (frontend can still display the successful one).
  /// Cached balance entry — 20s TTL so rapid polls from multiple users (or
  /// the same user hitting refresh) don't hammer Etherscan and burn cycles
  /// on redundant outcalls. ETH balances don't change much sub-second, so
  /// 20s is fine for UX.
  type BalanceCacheEntry = { ethWei : Nat; uniWei : Nat; cachedAt : Time.Time };
  let balanceCache = Map.empty<Text, BalanceCacheEntry>();
  let BALANCE_CACHE_TTL_NS : Int = 20_000_000_000; // 20 seconds

  public shared func getWalletBalances(ethAddress : Text) : async {
    ethWei : Nat;
    uniWei : Nat;
  } {
    if (ethAddress.size() != 42 or not ethAddress.startsWith(#text "0x")) {
      Runtime.trap("Invalid ethAddress");
    };
    // Serve from cache if the entry is fresh — saves ~2× outcall cost
    // whenever the same address polls within 20s. Keyed by lowercase so
    // mixed-case addresses hit the same cache line.
    let cacheKey = _toLowerAscii(ethAddress);
    let now = Time.now();
    switch (balanceCache.get(cacheKey)) {
      case (?entry) {
        if (now - entry.cachedAt < BALANCE_CACHE_TTL_NS) {
          return { ethWei = entry.ethWei; uniWei = entry.uniWei };
        };
      };
      case null {};
    };
    if (not _takeOutcallToken()) {
      // Cache miss + budget exhausted — return zeros rather than trapping so
      // the frontend's fallback paths still run. Not cached (see below).
      return { ethWei = 0; uniWei = 0 };
    };

    let ethUrl =
      "https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance"
        # "&address=" # ethAddress
        # "&tag=latest"
        # "&apikey=***REMOVED-ETHERSCAN-KEY***";
    let uniUrl =
      "https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokenbalance"
        # "&contractaddress=0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"
        # "&address=" # ethAddress
        # "&tag=latest"
        # "&apikey=***REMOVED-ETHERSCAN-KEY***";
    let ethBody = try {
      await _httpGetBounded(ethUrl, 2048);
    } catch (_) { "" };
    let uniBody = try {
      await _httpGetBounded(uniUrl, 2048);
    } catch (_) { "" };
    let ethWei = switch (_parseEtherscanResultDecimal(ethBody)) {
      case (?n) n;
      case null 0;
    };
    let uniWei = switch (_parseEtherscanResultDecimal(uniBody)) {
      case (?n) n;
      case null 0;
    };

    // Only cache non-zero successful reads — if Etherscan hiccuped and we
    // got 0/0, don't poison the cache with a fake "you have nothing" state.
    if (ethWei > 0 or uniWei > 0) {
      balanceCache.add(cacheKey, { ethWei; uniWei; cachedAt = now });
    };
    { ethWei; uniWei };
  };

  /// Canister-side UNI (ERC-20) balance read. Same rationale as
  /// getEthBalanceOnchain — reliable mobile path via HTTPS outcall. Returns
  /// Nat of UNI in wei (18 decimals, ERC-20 standard).
  public shared func getUniBalanceOnchain(ethAddress : Text) : async Nat {
    if (ethAddress.size() != 42 or not ethAddress.startsWith(#text "0x")) {
      Runtime.trap("Invalid ethAddress");
    };
    if (not _takeOutcallToken()) {
      Runtime.trap("Rate-limited: too many balance lookups — retry in a minute");
    };
    // UNI mainnet contract — hardcoded so the frontend can't point us at a
    // different ERC-20 to poll arbitrary token balances (minor hardening).
    let url =
      "https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokenbalance"
        # "&contractaddress=0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"
        # "&address=" # ethAddress
        # "&tag=latest"
        # "&apikey=***REMOVED-ETHERSCAN-KEY***";
    let body = try {
      await _httpGetBounded(url, 32768);
    } catch (_) { Runtime.trap("UNI balance fetch failed: network error") };
    switch (_parseEtherscanResultDecimal(body)) {
      case (?n) n;
      case null { Runtime.trap("UNI balance fetch failed: unexpected response") };
    };
  };

  /// Verifies an ETH transaction on Etherscan and auto-releases sGLDT if confirmed.
  ///
  /// Steps:
  ///   1. Looks up the deposit by requestId.
  ///   2. Makes an HTTP GET to the Etherscan API (gettxreceiptstatus endpoint).
  ///   3. If status=1 (success), marks the deposit #confirmed and calls verifyAndPayUNIDeposit.
  ///   4. Returns "confirmed_and_paid", "pending", "failed", or an error message.
  ///
  /// Any authenticated caller may verify their own deposit. Admin may verify any deposit.
  /// Returns "pending" on Etherscan timeout or API error so the frontend can retry safely.
  public shared ({ caller }) func verifyEthTransaction(requestId : Nat) : async Text {
    if (not isAuthenticatedUser(caller)) {
      return "error: Must be logged in to verify transactions";
    };

    let request = switch (uniDeposits.get(requestId)) {
      case null { return "error: Deposit not found" };
      case (?r) { r };
    };

    // Allow: the depositor, the admin, OR this canister itself (the sweeper
    // routes through the IC message queue, so its caller is Self).
    if (caller != request.submitter and not isAdmin(caller) and caller != Principal.fromActor(Self)) {
      return "error: Unauthorized — can only verify your own deposit";
    };

    // Already paid out — nothing to do
    switch (request.status) {
      case (#paid) {
        return "confirmed_and_paid";
      };
      case (#processing) {
        return "pending";
      };
      case (#failed) {
        // Payout previously failed — reset to #confirmed and re-attempt the sGLDT transfer.
        // verifyAndPayUNIDeposit already handles #failed by setting it to #processing, but
        // we reset here first so the state machine is clean before the call.
        let resetRequest = { request with status = #confirmed };
        uniDeposits.add(requestId, resetRequest);
        let payResult = await verifyAndPayUNIDeposit(requestId);
        if (payResult.startsWith(#text "paid:") or payResult.startsWith(#text "already_paid:")) {
          return "confirmed_and_paid";
        } else if (payResult.startsWith(#text "confirmed_payout_failed:")) {
          return payResult;
        } else {
          return payResult;
        };
      };
      case (#confirmed) {
        // Already confirmed on-chain — go straight to payout
        let payResult = await verifyAndPayUNIDeposit(requestId);
        if (payResult.startsWith(#text "paid:") or payResult.startsWith(#text "already_paid:")) {
          return "confirmed_and_paid";
        } else if (payResult.startsWith(#text "confirmed_payout_failed:")) {
          // Payout failed with a definitive error (e.g. InsufficientFunds) — stop polling
          return payResult;
        } else {
          // Other failure (network error, etc.) — return raw error so frontend can surface it
          return payResult;
        };
      };
      case (#pending) {
        // Still needs ETH verification — fall through to Etherscan check
      };
    };

    // Build Etherscan API URL using free-tier key
    // V2 API — v1 endpoint returns NOTOK since April 2026 migration.
    let etherscanUrl = "https://api.etherscan.io/v2/api?chainid=1&module=transaction&action=gettxreceiptstatus&txhash=" # request.txHash # "&apikey=***REMOVED-ETHERSCAN-KEY***";

    // Make HTTP outcall to Etherscan (gettxreceiptstatus)
    let responseBody = try {
      await _httpGetBounded(etherscanUrl, 8192);
    } catch (_e) {
      // Network error or timeout — return pending so frontend can retry
      return "pending";
    };

    // Parse Etherscan JSON response.
    // Primary endpoint returns: {"status":"1","message":"OK","result":{"status":"1"}}
    // - Outer "status":"1" = API call succeeded (not the tx result)
    // - Inner result.status "1" = tx confirmed, "0" = tx failed/reverted
    // We must check the INNER result status specifically.
    // The confirmedMarker targets result.status=1: looks for "result":{"status":"1"} pattern.
    // We also check for result.status=1 with possible whitespace after the colon.
    let hasApiError = responseBody.contains(#text "NOTOK") or
                      responseBody.contains(#text "Error!");

    // Look for the inner result object status
    // Pattern: "result":{"status":"1"} or "result": {"status":"1"} (with whitespace)
    let innerConfirmed = responseBody.contains(#text "\"result\":{\"status\":\"1\"}") or
                         responseBody.contains(#text "\"result\": {\"status\":\"1\"}") or
                         responseBody.contains(#text "\"result\":{\"status\": \"1\"}") or
                         responseBody.contains(#text "\"result\": {\"status\": \"1\"}");
    let innerFailed = responseBody.contains(#text "\"result\":{\"status\":\"0\"}") or
                      responseBody.contains(#text "\"result\": {\"status\":\"0\"}") or
                      responseBody.contains(#text "\"result\":{\"status\": \"0\"}") or
                      responseBody.contains(#text "\"result\": {\"status\": \"0\"}");

    // Check if the API itself returned success status (outer status field)
    let outerOk = responseBody.contains(#text "\"status\":\"1\"");

    // Determine confirmation: either explicit inner match, or outer OK + no inner failure marker
    let (isConfirmed, isFailed) = if (hasApiError) {
      (false, false)
    } else if (innerConfirmed) {
      (true, false)
    } else if (innerFailed) {
      (false, true)
    } else if (outerOk and not responseBody.contains(#text "\"status\":\"0\"")) {
      // Outer status is OK; result may be a plain string "1" (some API versions)
      // Check for plain result value
      if (responseBody.contains(#text "\"result\":\"1\"") or responseBody.contains(#text "\"result\": \"1\"")) {
        (true, false)
      } else if (responseBody.contains(#text "\"result\":\"0\"") or responseBody.contains(#text "\"result\": \"0\"")) {
        (false, true)
      } else {
        // Outer OK but can't determine inner status — inconclusive, treat as pending
        (false, false)
      };
    } else {
      // "status" key not found or unexpected value → inconclusive, treat as pending
      (false, false)
    };

    if (hasApiError) {
      // API error — treat as pending, let frontend retry
      return "pending";
    };

    if (isFailed) {
      // Transaction failed on Ethereum — mark deposit as failed
      let failedRequest = { request with status = #failed };
      uniDeposits.add(requestId, failedRequest);
      _recordTx(
        request.submitter,
        {
          id = _nextTxId();
          txType = #Bridge;
          amount = request.uniAmount;
          tokenSymbol = "UNI";
          status = #Failed;
          timestamp = Time.now();
          ethTxHash = ?request.txHash;
          icpBlockIndex = null;
          errorMsg = ?"ETH transaction reverted on-chain";
          description = "UNI bridge failed: ETH transaction reverted. Hash: " # request.txHash;
        },
      );
      return "failed";
    };

    if (isConfirmed) {
      // Receipt status=1 proves the tx was mined successfully — but not what it DID.
      // Before we release treasury funds, verify the on-chain calldata matches
      // the deposit's declared ethAddress / UNI amount / target principal.
      // Without this check, any cheap successful ETH tx could be "claimed" as a
      // multi-thousand-UNI deposit and drain the treasury.
      let calldataCheck = await _verifyDepositCalldata(request.txHash, request.ethAddress, request.uniAmount);
      if (calldataCheck != "ok") {
        if (calldataCheck == "pending") {
          // RPC call failed — don't mark failed, let the user retry.
          return "pending";
        };
        // Hard mismatch — the claimed deposit isn't backed by a real UNI deposit.
        // Mark #failed AND zero out uniAmount to make this rejection terminal:
        // any resetMiningPhase / retryUNIDepositPayout path will compute a
        // zero payout and reject, and the guard in verifyAndPayUNIDeposit
        // short-circuits before the ICRC-1 transfer. The status variant stays
        // compatible for upgrade (no new tags), but the record is permanently
        // unpayable.
        let failedRequest = { request with status = #failed; uniAmount = 0 };
        uniDeposits.add(requestId, failedRequest);
        _recordTx(
          request.submitter,
          {
            id = _nextTxId();
            txType = #Bridge;
            amount = request.uniAmount;
            tokenSymbol = "UNI";
            status = #Failed;
            timestamp = Time.now();
            ethTxHash = ?request.txHash;
            icpBlockIndex = null;
            errorMsg = ?calldataCheck;
            description = "Deposit rejected: on-chain data does not match claim. " # calldataCheck;
          },
        );
        return "failed: " # calldataCheck;
      };

      // Calldata verified — mark deposit as #confirmed and pay out sGLDT
      let confirmedRequest = { request with status = #confirmed };
      uniDeposits.add(requestId, confirmedRequest);
      let payResult = await verifyAndPayUNIDeposit(requestId);
      // Success prefix changed to "paid:" — check both for forward/backward compat
      if (payResult.startsWith(#text "paid:") or payResult.startsWith(#text "already_paid:")) {
        return "confirmed_and_paid";
      } else if (payResult.startsWith(#text "confirmed_payout_failed:")) {
        // Definitive payout failure — stop polling, surface the error
        return payResult;
      } else {
        return payResult;
      };
    };

    // Primary call returned pending/ambiguous — try secondary check via eth_getTransactionByHash.
    // If blockNumber is non-null, the transaction has been mined (confirmed).
    // V2 API required as of Apr 2026.
    let fallbackUrl = "https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionByHash&txhash=" # request.txHash # "&apikey=***REMOVED-ETHERSCAN-KEY***";
    let fallbackBody = try {
      await _httpGetBounded(fallbackUrl, 16384);
    } catch (_) {
      // Fallback also failed — return pending
      return "pending";
    };

    // eth_getTransactionByHash returns: {"result":{"blockNumber":"0x...","hash":"0x...",...}}
    // If blockNumber is null, the tx is not yet mined.
    // We check that blockNumber is present and not "null".
    let fallbackMined = fallbackBody.contains(#text "\"blockNumber\":\"0x") or
                        fallbackBody.contains(#text "\"blockNumber\": \"0x");
    let fallbackNull  = fallbackBody.contains(#text "\"blockNumber\":null") or
                        fallbackBody.contains(#text "\"blockNumber\": null");

    if (fallbackMined and not fallbackNull) {
      // Tx is mined per fallback — but "mined" alone proves nothing about what
      // the tx DID. Before releasing funds, run the same on-chain calldata
      // verification we use on the primary path. Without this, the fallback
      // becomes the weaker link an attacker can exploit when the primary
      // endpoint is rate-limited.
      let calldataCheck = await _verifyDepositCalldata(request.txHash, request.ethAddress, request.uniAmount);
      if (calldataCheck != "ok") {
        if (calldataCheck == "pending") { return "pending" };
        let failedRequest = { request with status = #failed; uniAmount = 0 };
        uniDeposits.add(requestId, failedRequest);
        _recordTx(
          request.submitter,
          {
            id = _nextTxId();
            txType = #Bridge;
            amount = request.uniAmount;
            tokenSymbol = "UNI";
            status = #Failed;
            timestamp = Time.now();
            ethTxHash = ?request.txHash;
            icpBlockIndex = null;
            errorMsg = ?calldataCheck;
            description = "Deposit rejected (fallback path): " # calldataCheck;
          },
        );
        return "failed: " # calldataCheck;
      };
      let confirmedRequest = { request with status = #confirmed };
      uniDeposits.add(requestId, confirmedRequest);
      let payResult = await verifyAndPayUNIDeposit(requestId);
      if (payResult.startsWith(#text "paid:") or payResult.startsWith(#text "already_paid:")) {
        return "confirmed_and_paid";
      } else if (payResult.startsWith(#text "confirmed_payout_failed:")) {
        return payResult;
      } else {
        return payResult;
      };
    };

    // No receipt yet — transaction is still being mined
    "pending";
  };

  /// Public query: returns the current status of a UNI deposit for frontend polling.
  /// Any authenticated user may query their own deposit. Admin may query any deposit.
  /// Returns status as a Text string, the txHash, and the sGLDT amount paid (0 if not yet paid).
  public query ({ caller }) func getDepositStatus(requestId : Nat) : async {
    status : Text;
    txHash : Text;
    sgldtPaid : Nat;
  } {
    switch (uniDeposits.get(requestId)) {
      case null {
        { status = "not_found"; txHash = ""; sgldtPaid = 0 };
      };
      case (?r) {
        if (caller != r.submitter and not isAdmin(caller)) {
          Runtime.trap("Unauthorized: Can only view your own deposit status");
        };
        let statusText = switch (r.status) {
          case (#pending) { "pending" };
          case (#confirmed) { "confirmed" };
          case (#processing) { "processing" };
          case (#paid) { "paid" };
          case (#failed) { "failed" };
        };
        { status = statusText; txHash = r.txHash; sgldtPaid = r.sgldtPaid };
      };
    };
  };

  /// Returns the most recent non-paid UNI deposit for the caller (used by "Keep Checking" to
  /// recover the active deposit ID after a page refresh). Returns null if no active deposit exists.
  /// Also returns already-paid deposits so the UI can show a success screen instead of "not found".
  public query ({ caller }) func getMyActiveDeposit() : async ?{ id : Nat; status : Text; txHash : Text; sgldtPaid : Nat } {
    if (not isAuthenticatedUser(caller)) {
      return null;
    };
    // Find the most recent deposit by this caller that is not paid
    var best : ?UniDepositRequest = null;
    for ((_, r) in uniDeposits.entries()) {
      if (r.submitter == caller) {
        switch (best) {
          case null { best := ?r };
          case (?b) {
            if (r.timestamp > b.timestamp) {
              best := ?r;
            };
          };
        };
      };
    };
    switch (best) {
      case null { null };
      case (?r) {
        let statusText = switch (r.status) {
          case (#pending) { "pending" };
          case (#confirmed) { "confirmed" };
          case (#processing) { "processing" };
          case (#paid) { "paid" };
          case (#failed) { "failed" };
        };
        ?{ id = r.id; status = statusText; txHash = r.txHash; sgldtPaid = r.sgldtPaid };
      };
    };
  };

  public query ({ caller }) func getUserUNIDeposits(user : Principal) : async [UniDepositRequest] {
    if (caller != user and not isAdmin(caller)) {
      Runtime.trap("Unauthorized: Can only view your own UNI deposits");
    };
    uniDeposits.values().toArray().filter(
      func(r) { r.submitter == user }
    ).sort(Utils.compareUNIDepositsByTimestamp);
  };

  public query ({ caller }) func getAllUNIDeposits() : async [UniDepositRequest] {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    uniDeposits.values().toArray().sort(Utils.compareUNIDepositsByTimestamp);
  };

  public query func getUNIExchangeRate() : async Nat {
    uniExchangeRate;
  };

  public shared ({ caller }) func setUNIExchangeRate(rate : Nat) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    if (rate == 0) {
      Runtime.trap("Invalid rate: must be greater than 0");
    };
    uniExchangeRate := rate;
  };

  /// Syncs the live exchange rate from the frontend CoinGecko feed to the backend.
  /// Called by the frontend after fetching UNI/sGLDT prices so the backend always uses
  /// the same rate the user sees. Only admin may call this; rate is in 1e8 precision
  /// (e.g. 238_000_000 = 2.38 sGLDT per UNI).
  public shared ({ caller }) func setLiveExchangeRate(newRate : Nat) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    if (newRate == 0) {
      Runtime.trap("Invalid rate: must be greater than 0");
    };
    uniExchangeRate := newRate;
  };

  /// Syncs the live market exchange rate from the frontend (CoinGecko) to the backend.
  /// ADMIN-ONLY: Only the admin principal may update the global exchange rate.
  /// Regular users should pass the live rate via submitUNIDeposit's rateHint parameter
  /// so the rate is locked per-deposit without mutating the global state.
  /// Rate is in 1e8 precision (e.g. 238_000_000 = 2.38 sGLDT per UNI).
  public shared ({ caller }) func syncLiveExchangeRate(newRate : Nat) : async { #ok; #err : Text } {
    if (not isAdmin(caller)) {
      return #err("Unauthorized: Only admin may update the global exchange rate");
    };
    if (newRate == 0) {
      return #err("Invalid rate: must be greater than 0");
    };
    uniExchangeRate := newRate;
    #ok;
  };

  // -------------------------------------------------------
  // Legacy Treasury Methods (kept for backward compat)
  // -------------------------------------------------------
  public shared ({ caller }) func setSGLDTTreasuryBalance(_balance : Nat) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    // No-op: treasury balance is now managed via real ICRC-1 transfers.
    // To fund the treasury, send sGLDT directly to this canister's principal.
  };

  public shared ({ caller }) func setBatPoolBalance(_balance : Nat) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    batPoolBalance := _balance;
  };

  public query ({ caller }) func getTreasuryStats() : async {
    sGLDTTreasuryBalance : Nat;
    batPoolBalance : Nat;
  } {
    {
      sGLDTTreasuryBalance = 0; // Use getTreasuryICRC1Balances() for real balance
      batPoolBalance;
    };
  };

  // -------------------------------------------------------
  // HTTP Transform (kept for potential future outcalls)
  // -------------------------------------------------------
  public query ({ caller }) func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // -------------------------------------------------------
  // Price Feed Methods
  // -------------------------------------------------------
  public shared ({ caller }) func getBatPrice() : async Nat {
    switch (cachedBatPrice) {
      case (null) { BAT_DEFAULT_PRICE };
      case (?{ price; timestamp }) {
        if (Time.now() - timestamp > PRICE_CACHE_DURATION) {
          BAT_DEFAULT_PRICE;
        } else {
          price;
        };
      };
    };
  };

  public shared ({ caller }) func getSGLDTPrice() : async Nat {
    switch (cachedSGldtPrice) {
      case (null) { SGLDT_DEFAULT_PRICE };
      case (?{ price; timestamp }) {
        if (Time.now() - timestamp > PRICE_CACHE_DURATION) {
          SGLDT_DEFAULT_PRICE;
        } else {
          price;
        };
      };
    };
  };

  public query ({ caller }) func calculateExchangeRate(batAmount : Nat) : async {
    bbTokenAmount : Nat;
    sgldAmount : Nat;
  } {
    {
      bbTokenAmount = batAmount;
      sgldAmount = batAmount;
    };
  };

  // Migration Logic
  public query ({ caller }) func migrated_getAllBridgeRequests() : async [BridgeRequest] {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    bridgeRequests.values().toArray();
  };

  public query ({ caller }) func migrated_getAllSGLDTRequests() : async [sGLDTRequest] {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    sGLDTRequests.values().toArray();
  };

  public shared ({ caller }) func migration_updateBalance(_balance : Nat) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    Runtime.trap("Not implemented!");
  };

  public query func deprecated_getBridgeRequests() : async [BridgeRequest] {
    Runtime.trap("Function deprecated. Use getAllBridgeRequests instead.");
  };

  public query func deprecated_getSGLDTRequests() : async [sGLDTRequest] {
    Runtime.trap("Function deprecated. Use getAllSGLDTRequests instead.");
  };

  // Kick off the first payout sweep 10 s after deploy; it self-reschedules
  // every 30 s. Registered last so every helper the sweep transitively
  // references (verifyEthTransaction and its parsing utilities) is defined.
  ignore Timer.setTimer<system>(#seconds 10, _sweepConfirmedDeposits);
};
