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

  // The canister's sole controller (the dfx deploy identity). A controller
  // can already replace this entire module, so app-level admin is a strict
  // subset of the power it holds — granting it here just lets ops methods
  // (setSGLDTUsdPrice, getStrandedRefines, …) be called from the CLI.
  let DEPLOYER_PRINCIPAL : Principal = Principal.fromText("xip3r-mhzcr-csb7y-ilqf5-4tpge-dka64-jv2ow-zon7z-key3x-77kf3-mae");

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
    accessControlState.userRoles.add(DEPLOYER_PRINCIPAL, #admin);
    accessControlState.adminAssigned := true;
  };

  var nextBridgeRequestId = 1;
  var nextExchangeRequestId = 1;
  var nextUNIDepositId = 1;
  var sGLDTTreasuryBalance : Nat = 0; // kept for upgrade compatibility
  var batPoolBalance : Nat = 0;

  /// Etherscan API key, admin-set post-deploy via `setEtherscanApiKey`.
  /// NOT a literal on purpose: this repo is open source, and a key baked
  /// into the source would be published the moment the repo is. Empty
  /// until an admin sets it — every call site below degrades to "pending"
  /// rather than trapping when it's unset, so a fresh deploy still boots.
  var etherscanApiKey : Text = "";
  // UNI exchange rate: sGLDT per UNI in 1e8 precision (default 238000000 = 2.38 sGLDT per UNI)
  var uniExchangeRate : Nat = 238_000_000;
  // Cached on-chain balances — updated by refreshTreasuryBalances() (an update call).
  // Exposed via public shared query funcs so anonymous/unauthenticated callers can read them.
  var cachedSgldtTreasuryBalance : Nat = 0;
  var cachedCkUNITreasuryBalance : Nat = 0;
  // When the two balances above were last pulled from the ledgers (ns since
  // epoch, 0 = never). Lets /proof age-stamp the figures instead of passing
  // cached values off as live.
  var treasuryBalancesCachedAt : Int = 0;
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

  // ICRC-2 — the direct-refine path. The user holds ckUNI in their OWN account
  // (the ckERC-20 minter mints it there when they deposit with their own
  // principal encoded), approves this canister as spender, and refineCkUNI
  // pulls it with icrc2_transfer_from. No Ethereum oracle is involved.
  type ICRC2TransferFromArgs = {
    spender_subaccount : ?Blob;
    from : ICRC1Account;
    to : ICRC1Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  type ICRC2TransferFromError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #InsufficientAllowance : { allowance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  type ICRC2TransferFromResult = { #Ok : Nat; #Err : ICRC2TransferFromError };

  type ICRC2AllowanceArgs = { account : ICRC1Account; spender : ICRC1Account };
  type ICRC2Allowance = { allowance : Nat; expires_at : ?Nat64 };

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

  // Same ledger, ICRC-2 view. It is a separate `transient` binding rather than
  // extra methods on ckUNILedger above because that one is a persistent
  // variable: widening its type is an upgrade-incompatible change, and Motoko
  // will not implicitly drop it either. Declaring the richer interface
  // transiently sidesteps both — a canister id is a constant, so there is
  // nothing here worth persisting. (Mirrors the existing ckUNIMinter V1/V2
  // split.) Future ledger-interface growth should extend THIS binding.
  transient let ckUNILedgerV2 : actor {
    icrc1_fee : () -> async Nat;
    icrc1_balance_of : (ICRC1Account) -> async Nat;
    icrc1_transfer : (ICRC1TransferArgs) -> async ICRC1TransferResult;
    icrc2_transfer_from : (ICRC2TransferFromArgs) -> async ICRC2TransferFromResult;
    icrc2_allowance : (ICRC2AllowanceArgs) -> async ICRC2Allowance;
  } = actor ("ilzky-ayaaa-aaaar-qahha-cai");

  // Same V1/V2 split as ckUNILedgerV2 above: sgldtLedger is a persisted
  // binding whose type cannot widen across upgrades, so the ICRC-2 methods
  // the redeem path needs live on this transient sibling.
  transient let sgldtLedgerV2 : actor {
    icrc1_fee : () -> async Nat;
    icrc1_balance_of : (ICRC1Account) -> async Nat;
    icrc1_transfer : (ICRC1TransferArgs) -> async ICRC1TransferResult;
    icrc2_transfer_from : (ICRC2TransferFromArgs) -> async ICRC2TransferFromResult;
    icrc2_allowance : (ICRC2AllowanceArgs) -> async ICRC2Allowance;
  } = actor ("i2s4q-syaaa-aaaan-qz4sq-cai");

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

  // -------------------------------------------------------
  // Exchange Rate Canister (XRC) — on-chain UNI/USD oracle
  // -------------------------------------------------------
  // The XRC (uf6dk-hyaaa-aaaaq-qaaaq-cai) aggregates prices across many
  // exchanges under IC consensus, replacing the admin's manual CoinGecko
  // sync for the volatile leg of the rate. The sGLDT/USD leg stays an
  // admin-set reference (sGLDT trades on one DEX pool the XRC can't see).
  //   uniExchangeRate = UNI/USD ÷ sGLDT/USD
  // The XRC's candid names an Asset field `class`, a Motoko keyword, so the
  // binding uses the candid hash label _1213757496_ (= hash("class")).
  type XRCAssetClass = { #Cryptocurrency; #FiatCurrency };
  type XRCAsset = { symbol : Text; _1213757496_ : XRCAssetClass };
  type XRCRequest = {
    base_asset : XRCAsset;
    quote_asset : XRCAsset;
    timestamp : ?Nat64;
  };
  // Partial ExchangeRate record — candid subtyping lets us decode only the
  // fields we use (same trick as MinterInfo above).
  type XRCExchangeRate = {
    rate : Nat64;
    timestamp : Nat64;
    metadata : { decimals : Nat32 };
  };
  // The error variant must be complete: candid decoding fails on an
  // unrecognized tag, unlike missing record fields.
  type XRCError = {
    #AnonymousPrincipalNotAllowed;
    #Pending;
    #CryptoBaseAssetNotFound;
    #CryptoQuoteAssetNotFound;
    #StablecoinRateNotFound;
    #StablecoinRateTooFewRates;
    #StablecoinRateZeroRate;
    #ForexInvalidTimestamp;
    #ForexBaseAssetNotFound;
    #ForexQuoteAssetNotFound;
    #ForexAssetsNotFound;
    #RateLimited;
    #NotEnoughQueriedSources;
    #InconsistentRatesReceived;
    #Other : { code : Nat32; description : Text };
  };
  type XRCResult = { #Ok : XRCExchangeRate; #Err : XRCError };
  transient let xrc : actor {
    get_exchange_rate : (XRCRequest) -> async XRCResult;
  } = actor ("uf6dk-hyaaa-aaaaq-qaaaq-cai");

  /// Cycles the XRC charges per get_exchange_rate call.
  let XRC_CALL_CYCLES : Nat = 1_000_000_000;
  /// Minimum gap between XRC calls — callers inside this window are no-ops,
  /// so public refreshExchangeRate can't be used to drain cycles.
  let XRC_MIN_SYNC_GAP_NS : Int = 60_000_000_000;
  /// Auto-sync cadence: hourly (~0.7T cycles/month).
  let XRC_AUTO_SYNC_SECONDS : Nat = 3_600;

  /// USD per sGLDT in 1e8 precision, admin-set. 0 = unset: XRC syncs then
  /// only record UNI/USD telemetry and leave uniExchangeRate untouched.
  var sgldtUsdPriceE8 : Nat = 0;
  /// Last UNI/USD reading from the XRC (1e8 precision), 0 = never synced.
  var lastUniUsdPriceE8 : Nat = 0;
  /// When the last XRC call was attempted (ns), and its error if it failed.
  var lastXRCSyncNs : Int = 0;
  var lastXRCError : Text = "";

  func _xrcRateToE8(rate : Nat64, decimals : Nat32) : Nat {
    let r = rate.toNat();
    let d = decimals.toNat();
    if (d >= 8) { r / (10 ** (d - 8 : Nat)) } else { r * (10 ** (8 - d : Nat)) };
  };

  /// Pull UNI/USD from the XRC and recompute uniExchangeRate. A ±30% jump
  /// guard rejects wild readings — a bad oracle sample can't instantly
  /// reprice the refinery; a genuine larger move needs one admin
  /// setUNIExchangeRate to re-anchor, after which syncs resume tracking.
  func _syncRateFromXRC() : async () {
    let now = Time.now();
    if (now - lastXRCSyncNs < XRC_MIN_SYNC_GAP_NS) { return };
    // Stamp before awaiting so concurrent callers inside the gap are no-ops.
    lastXRCSyncNs := now;
    try {
      let result = await (with cycles = XRC_CALL_CYCLES) xrc.get_exchange_rate({
        base_asset = { symbol = "UNI"; _1213757496_ = #Cryptocurrency };
        quote_asset = { symbol = "USD"; _1213757496_ = #FiatCurrency };
        timestamp = null;
      });
      switch (result) {
        case (#Ok(r)) {
          let uniUsdE8 = _xrcRateToE8(r.rate, r.metadata.decimals);
          if (uniUsdE8 == 0) {
            lastXRCError := "XRC returned a zero UNI/USD rate";
            return;
          };
          lastUniUsdPriceE8 := uniUsdE8;
          lastXRCError := "";
          if (sgldtUsdPriceE8 > 0) {
            let newRate = uniUsdE8 * 100_000_000 / sgldtUsdPriceE8;
            if (newRate == 0) {
              lastXRCError := "Computed rate rounds to zero — check sGLDT USD price";
            } else if (
              uniExchangeRate > 0 and (newRate * 10 > uniExchangeRate * 13 or newRate * 13 < uniExchangeRate * 10)
            ) {
              lastXRCError := "Jump guard: XRC-derived rate " # newRate.toText() # " deviates >30% from current " # uniExchangeRate.toText() # "; not applied";
            } else {
              uniExchangeRate := newRate;
            };
          };
        };
        case (#Err(e)) { lastXRCError := debug_show (e) };
      };
    } catch (e) { lastXRCError := e.message() };
  };

  /// Hourly self-rescheduling sync. Rescheduled before the await so a failed
  /// sync can never kill the timer chain.
  func _periodicRateSync() : async () {
    ignore Timer.setTimer<system>(#seconds XRC_AUTO_SYNC_SECONDS, _periodicRateSync);
    await _syncRateFromXRC();
  };

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
  // Direct refine (ckUNI → sGLDT) — the minter-attribution flow
  // -------------------------------------------------------
  // The user's ckUNI is minted straight to their own principal by the ckERC-20
  // minter, which only mints after 12 Ethereum block confirmations verified by
  // chain-key consensus. That makes the ckUNI balance itself the proof the
  // bridge completed — there is no Ethereum transaction for us to verify, no
  // Etherscan dependency, and no tx hash to capture or lose.
  type RefineStatus = {
    #pulled; // ckUNI moved into the treasury, sGLDT not yet sent
    #paid; // sGLDT delivered
    #refunded; // sGLDT failed, ckUNI returned to the user
    #stranded; // sGLDT failed AND the refund failed — needs admin resolution
  };

  type RefineRecord = {
    id : Nat;
    user : Principal;
    ckuniAmount : Nat; // e18, as pulled from the user
    sgldtPaid : Nat; // e8s
    rate : Nat; // 1e8-precision sGLDT per UNI used for this refine
    status : RefineStatus;
    timestamp : Time.Time;
    pullBlock : ?Nat;
    payBlock : ?Nat;
    errorMsg : ?Text;
  };

  /// The reverse leg: sGLDT pulled from the user, ckUNI paid from treasury.
  /// Shares RefineStatus — the lifecycle is identical with the tokens swapped.
  type RedeemRecord = {
    id : Nat;
    user : Principal;
    sgldtAmount : Nat; // e8s, as pulled from the user
    ckuniPaid : Nat; // e18
    rate : Nat; // 1e8-precision sGLDT per UNI used for this redeem
    status : RefineStatus;
    timestamp : Time.Time;
    pullBlock : ?Nat;
    payBlock : ?Nat;
    errorMsg : ?Text;
  };

  // -------------------------------------------------------
  // Transaction History Types
  // -------------------------------------------------------
  public type TxType = {
    #Bridge;   // UNI sent on Ethereum side
    #Mint;     // ckUNI minted on ICP
    #Refine;   // sGLDT released from treasury
    #Transfer; // user-initiated token transfer
    #Redeem;   // sGLDT swapped back into ckUNI (the exit path)
    #Refund;   // a failed swap's deposit returned to the user
  };

  public type TxStatus = {
    #Pending;
    #Confirmed;
    #Completed;
    #Failed;
    #Held;     // swap AND refund both failed — recorded for manual resolution
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
  // Direct-refine records (ckUNI → sGLDT), keyed by refine id.
  let refines = Map.empty<Nat, RefineRecord>();
  var nextRefineId : Nat = 0;
  // Redeem records (sGLDT → ckUNI), keyed by redeem id.
  let redeems = Map.empty<Nat, RedeemRecord>();
  var nextRedeemId : Nat = 0;
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

  /// Admin-only: set the Etherscan API key used to verify Ethereum
  /// deposits and read wallet balances. Not readable back by design — see
  /// `etherscanApiKeySet` for a yes/no check that doesn't expose the value.
  public shared ({ caller }) func setEtherscanApiKey(key : Text) : async Bool {
    if (not isAdmin(caller)) { return false };
    etherscanApiKey := key;
    true;
  };

  /// Whether an Etherscan key is configured, without exposing it. A fresh
  /// deploy starts with this false — every Etherscan call site degrades to
  /// "pending" rather than trapping, but ETH balance reads and deposit
  /// verification won't complete until an admin sets a real key.
  public query func etherscanApiKeySet() : async Bool {
    etherscanApiKey != "";
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
    // Extra field is candid-safe: old clients decode records by width
    // subtyping and simply drop it. 0 = the cache has never been warmed.
    cachedAtNs : Int;
  } {
    {
      sgldtBalance = cachedSgldtTreasuryBalance;
      ckUNIBalance = cachedCkUNITreasuryBalance;
      cachedAtNs = treasuryBalancesCachedAt;
    };
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
    treasuryBalancesCachedAt := Time.now();
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

  // (Banking.Brave-era BB-token stubs mintBankingBraveTokens/getBalance/
  // getTotalSupply deleted 2026-07-30 — every one only trapped with a
  // redirect message. Real balances live on the ICRC-1 ledgers.)

  // (Bridge-request methods deleted 2026-07-30: submitBridgeRequest recorded
  // a row and moved NO tokens — first-generation scaffolding superseded by
  // the chain-key deposit flow. The `bridgeRequests` stable map is retained
  // untouched for upgrade compatibility and historical data.)

  // (sGLDT exchange-request methods deleted 2026-07-30 — the manual
  // admin-approval exchange predates refineCkUNI/redeemSGLDT and moved no
  // tokens itself. The `sGLDTRequests` stable map is retained untouched.)

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
        # "&apikey=" # etherscanApiKey;
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
        # "&apikey=" # etherscanApiKey;
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
        # "&apikey=" # etherscanApiKey;
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
        # "&apikey=" # etherscanApiKey;
    let uniUrl =
      "https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokenbalance"
        # "&contractaddress=0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"
        # "&address=" # ethAddress
        # "&tag=latest"
        # "&apikey=" # etherscanApiKey;
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
        # "&apikey=" # etherscanApiKey;
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
    let etherscanUrl = "https://api.etherscan.io/v2/api?chainid=1&module=transaction&action=gettxreceiptstatus&txhash=" # request.txHash # "&apikey=" # etherscanApiKey;

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
    let fallbackUrl = "https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionByHash&txhash=" # request.txHash # "&apikey=" # etherscanApiKey;
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
  // =======================================================
  // DIRECT REFINE — ckUNI → sGLDT (minter-attribution flow)
  // =======================================================

  /// Smallest refine we accept: 0.001 UNI in e18. Below this the ckUNI ledger
  /// fee dominates and a failed payout could not be refunded cleanly.
  let MIN_REFINE_CKUNI : Nat = 1_000_000_000_000_000;

  /// sGLDT (e8s) owed for a given ckUNI amount (e18) at a 1e8-precision rate.
  ///   ckuni_e18 / 1e18 = whole UNI;  whole UNI * rate = sGLDT e8s
  /// so the whole thing collapses to (ckuni * rate) / 1e18. Nat division
  /// truncates, which rounds in the treasury's favour — never the user's.
  func _sgldtForCkUNI(ckuniAmount : Nat, rate : Nat) : Nat {
    (ckuniAmount * rate) / 1_000_000_000_000_000_000;
  };

  /// Read the caller's ckUNI balance and the allowance they have granted this
  /// canister. The UI polls this to decide when the bridge has completed (the
  /// minter credited them) and whether an approve step is still needed.
  public shared ({ caller }) func getMyCkUNIPosition() : async {
    balance : Nat;
    allowance : Nat;
    minRefine : Nat;
    rate : Nat;
  } {
    if (caller.isAnonymous()) {
      return { balance = 0; allowance = 0; minRefine = MIN_REFINE_CKUNI; rate = uniExchangeRate };
    };
    let me = Principal.fromActor(Self);
    let bal = try {
      await ckUNILedgerV2.icrc1_balance_of({ owner = caller; subaccount = null });
    } catch (_) { 0 };
    let allow = try {
      let a = await ckUNILedgerV2.icrc2_allowance({
        account = { owner = caller; subaccount = null };
        spender = { owner = me; subaccount = null };
      });
      a.allowance;
    } catch (_) { 0 };
    { balance = bal; allowance = allow; minRefine = MIN_REFINE_CKUNI; rate = uniExchangeRate };
  };

  /// Refine ckUNI the caller already holds into sGLDT.
  ///
  /// Prerequisites, both performed by the user — not by us:
  ///   1. They deposited UNI on Ethereum with THEIR OWN principal encoded in
  ///      the ckERC-20 helper call, so the minter minted ckUNI directly to
  ///      them once chain-key consensus saw 12 block confirmations.
  ///   2. They called icrc2_approve on the ckUNI ledger naming this canister
  ///      as spender for at least `amount` plus the ckUNI transfer fee.
  ///
  /// There is deliberately NO Ethereum verification here. The minter already
  /// did it under chain-key consensus; the ckUNI in the user's account is the
  /// proof. That removes the Etherscan oracle, the tx-hash capture race, and
  /// every recovery path built to work around them.
  ///
  /// Failure handling: if the sGLDT payout fails after the ckUNI was pulled,
  /// the ckUNI is refunded. If the refund also fails the record is marked
  /// #stranded — the funds sit in the treasury and the record carries
  /// everything an admin needs to make the user whole.
  public shared ({ caller }) func refineCkUNI(amount : Nat, rateHint : ?Nat) : async {
    #ok : { refineId : Nat; sgldtPaid : Nat; rate : Nat; blockIndex : Nat };
    #err : Text;
  } {
    if (not isAuthenticatedUser(caller)) {
      return #err("Sign in with Internet Identity before refining.");
    };
    if (amount < MIN_REFINE_CKUNI) {
      return #err("Amount too small. Minimum refine is 0.001 ckUNI.");
    };

    let rate = _clampRateHint(rateHint);
    let sgldtAmount = _sgldtForCkUNI(amount, rate);
    if (sgldtAmount == 0) {
      return #err("Calculated payout is zero — check the exchange rate.");
    };

    let me = Principal.fromActor(Self);

    // ── Step 1: pull the ckUNI from the user into the treasury ──
    // fee = null lets the ledger apply its own current fee, avoiding a BadFee
    // race if our cached value drifts. The ledger debits amount + fee from the
    // user and decrements their allowance atomically, so two concurrent calls
    // cannot both succeed on the same approval — the ledger is the arbiter.
    let pullResult = try {
      await ckUNILedgerV2.icrc2_transfer_from({
        spender_subaccount = null;
        from = { owner = caller; subaccount = null };
        to = { owner = me; subaccount = null };
        amount = amount;
        fee = null;
        memo = null;
        created_at_time = null;
      });
    } catch (e) {
      return #err("Could not reach the ckUNI ledger: " # e.message());
    };

    let pullBlock = switch (pullResult) {
      case (#Ok(b)) { b };
      case (#Err(#InsufficientAllowance { allowance })) {
        return #err(
          "Approval too small. Approve at least " # amount.toText()
          # " ckUNI (current allowance: " # allowance.toText() # ")."
        );
      };
      case (#Err(#InsufficientFunds { balance })) {
        return #err(
          "Not enough ckUNI. Your balance is " # balance.toText()
          # " but " # amount.toText() # " was requested. If you just deposited on "
          # "Ethereum, the chain-key minter needs ~12 block confirmations."
        );
      };
      case (#Err(#BadFee { expected_fee })) {
        return #err("ckUNI ledger fee mismatch; expected " # expected_fee.toText() # ". Try again.");
      };
      case (#Err(#TemporarilyUnavailable)) {
        return #err("ckUNI ledger temporarily unavailable. Try again shortly.");
      };
      case (#Err(#GenericError { message; error_code })) {
        return #err("ckUNI transfer failed (" # error_code.toText() # "): " # message);
      };
      case (#Err(_)) {
        return #err("ckUNI transfer was rejected by the ledger.");
      };
    };

    // The ckUNI is ours from here on. Every path below must either pay the
    // user or return their funds.
    nextRefineId += 1;
    let refineId = nextRefineId;
    let startedAt = Time.now();
    refines.add(
      refineId,
      {
        id = refineId;
        user = caller;
        ckuniAmount = amount;
        sgldtPaid = 0;
        rate = rate;
        status = #pulled;
        timestamp = startedAt;
        pullBlock = ?pullBlock;
        payBlock = null;
        errorMsg = null;
      },
    );

    _recordTx(
      caller,
      {
        id = _nextTxId();
        txType = #Mint;
        amount = amount;
        tokenSymbol = "ckUNI";
        status = #Completed;
        timestamp = startedAt;
        ethTxHash = null;
        icpBlockIndex = ?pullBlock;
        errorMsg = null;
        description = "ckUNI received by the refinery: " # amount.toText() # " e18. Block: " # pullBlock.toText();
      },
    );

    // ── Step 2: pay the sGLDT ──
    let sgldtFee = try { await sgldtLedger.icrc1_fee() } catch (_) { 10_000 };
    let payResult = try {
      await sgldtLedger.icrc1_transfer({
        from_subaccount = null;
        to = { owner = caller; subaccount = null };
        amount = sgldtAmount;
        fee = ?sgldtFee;
        memo = ?_depositMemo(refineId);
        created_at_time = ?_dedupCreatedAt(startedAt);
      });
    } catch (e) {
      #Err(#GenericError { error_code = 0; message = e.message() });
    };

    switch (payResult) {
      case (#Ok(payBlock)) {
        refines.add(
          refineId,
          {
            id = refineId;
            user = caller;
            ckuniAmount = amount;
            sgldtPaid = sgldtAmount;
            rate = rate;
            status = #paid;
            timestamp = startedAt;
            pullBlock = ?pullBlock;
            payBlock = ?payBlock;
            errorMsg = null;
          },
        );
        _recordTx(
          caller,
          {
            id = _nextTxId();
            txType = #Refine;
            amount = sgldtAmount;
            tokenSymbol = "sGLDT";
            status = #Completed;
            timestamp = Time.now();
            ethTxHash = null;
            icpBlockIndex = ?payBlock;
            errorMsg = null;
            description = "sGLDT released from treasury: " # sgldtAmount.toText() # " e8s. Block: " # payBlock.toText();
          },
        );
        try { ignore await refreshTreasuryBalances() } catch (_) {};
        #ok({ refineId = refineId; sgldtPaid = sgldtAmount; rate = rate; blockIndex = payBlock });
      };
      case (#Err(payErr)) {
        // Payout failed — give the ckUNI back rather than holding it hostage.
        let reason = switch (payErr) {
          case (#InsufficientFunds { balance }) {
            "The refinery is out of sGLDT (treasury holds " # balance.toText()
            # " e8s, needed " # sgldtAmount.toText() # " e8s)";
          };
          case (#GenericError { message; error_code }) {
            "sGLDT ledger error " # error_code.toText() # ": " # message;
          };
          case (#TemporarilyUnavailable) { "The sGLDT ledger is temporarily unavailable" };
          case (#BadFee { expected_fee }) { "sGLDT fee mismatch, expected " # expected_fee.toText() };
          case (_) { "The sGLDT transfer was rejected by the ledger" };
        };
        await _refundCkUNI(refineId, caller, amount, rate, startedAt, pullBlock, reason);
      };
    };
  };

  /// Return pulled ckUNI to the user after a failed sGLDT payout. The treasury
  /// absorbs the ledger fee, so the user is made whole minus nothing — we send
  /// back the full pulled amount less the single ckUNI transfer fee, which the
  /// ledger charges the sender (us).
  func _refundCkUNI(
    refineId : Nat,
    user : Principal,
    amount : Nat,
    rate : Nat,
    startedAt : Time.Time,
    pullBlock : Nat,
    reason : Text,
  ) : async { #ok : { refineId : Nat; sgldtPaid : Nat; rate : Nat; blockIndex : Nat }; #err : Text } {
    let ckFee = try { await ckUNILedgerV2.icrc1_fee() } catch (_) { 0 };

    func markStranded(detail : Text) {
      refines.add(
        refineId,
        {
          id = refineId;
          user = user;
          ckuniAmount = amount;
          sgldtPaid = 0;
          rate = rate;
          status = #stranded;
          timestamp = startedAt;
          pullBlock = ?pullBlock;
          payBlock = null;
          errorMsg = ?(reason # " | refund failed: " # detail);
        },
      );
      _recordTx(
        user,
        {
          id = _nextTxId();
          txType = #Refine;
          amount = amount;
          tokenSymbol = "ckUNI";
          status = #Held;
          timestamp = Time.now();
          ethTxHash = null;
          icpBlockIndex = null;
          errorMsg = ?(reason # " | refund failed: " # detail);
          description = "Refine failed and the ckUNI refund did not go through. Refine #" # refineId.toText() # " is held for admin resolution.";
        },
      );
    };

    if (amount <= ckFee) {
      markStranded("amount is below the ckUNI transfer fee");
      return #err(reason # ". Your ckUNI could not be auto-refunded (below the ledger fee) — refine #" # refineId.toText() # " has been flagged for support.");
    };

    let refundAmount = amount - ckFee;
    let refundResult = try {
      await ckUNILedgerV2.icrc1_transfer({
        from_subaccount = null;
        to = { owner = user; subaccount = null };
        amount = refundAmount;
        fee = ?ckFee;
        memo = ?_depositMemo(refineId);
        created_at_time = ?_dedupCreatedAt(startedAt);
      });
    } catch (e) {
      #Err(#GenericError { error_code = 0; message = e.message() });
    };

    switch (refundResult) {
      // #Duplicate means an earlier attempt already landed — the user has
      // their ckUNI back, so this is a successful refund, not a failure.
      case (#Ok(_) or #Err(#Duplicate(_))) {
        refines.add(
          refineId,
          {
            id = refineId;
            user = user;
            ckuniAmount = amount;
            sgldtPaid = 0;
            rate = rate;
            status = #refunded;
            timestamp = startedAt;
            pullBlock = ?pullBlock;
            payBlock = null;
            errorMsg = ?reason;
          },
        );
        _recordTx(
          user,
          {
            id = _nextTxId();
            txType = #Refund;
            amount = refundAmount;
            tokenSymbol = "ckUNI";
            status = #Completed;
            timestamp = Time.now();
            ethTxHash = null;
            icpBlockIndex = null;
            errorMsg = ?reason;
            description = "Refine could not complete; " # refundAmount.toText() # " e18 ckUNI was refunded to your account.";
          },
        );
        #err(reason # ". Your ckUNI has been refunded — you can try again once the treasury is topped up.");
      };
      case (#Err(refundErr)) {
        markStranded(debug_show (refundErr));
        #err(reason # ". Automatic refund also failed — refine #" # refineId.toText() # " has been flagged for support with your funds recorded.");
      };
    };
  };

  /// The caller's own refine history, newest-first.
  public query ({ caller }) func getMyRefines() : async [RefineRecord] {
    let out = List.empty<RefineRecord>();
    for ((_, r) in refines.entries()) {
      if (r.user == caller) { out.add(r) };
    };
    let arr = out.toArray();
    arr.sort(func(a : RefineRecord, b : RefineRecord) : Order.Order { Int.compare(b.timestamp, a.timestamp) });
  };

  /// PUBLIC transparency counter for /proof: how many refines and redeems are
  /// currently held as #stranded (swap failed AND auto-refund failed, awaiting
  /// manual resolution). Counts only — the records themselves stay admin-gated
  /// because they carry principals and amounts. Publishing the count (even at
  /// 0) is deliberate: "nothing is silently dropped" must be checkable.
  public query func getStrandedCounts() : async {
    strandedRefines : Nat;
    strandedRedeems : Nat;
  } {
    var rf : Nat = 0;
    var rd : Nat = 0;
    for ((_, r) in refines.entries()) {
      switch (r.status) { case (#stranded) { rf += 1 }; case (_) {} };
    };
    for ((_, r) in redeems.entries()) {
      switch (r.status) { case (#stranded) { rd += 1 }; case (_) {} };
    };
    { strandedRefines = rf; strandedRedeems = rd };
  };

  /// Admin view: every refine that ended #stranded and needs manual resolution.
  public query ({ caller }) func getStrandedRefines() : async [RefineRecord] {
    if (not isAdmin(caller)) { return [] };
    let out = List.empty<RefineRecord>();
    for ((_, r) in refines.entries()) {
      switch (r.status) {
        case (#stranded) { out.add(r) };
        case (_) {};
      };
    };
    out.toArray();
  };

  // =======================================================
  // PUBLIC RECEIPTS — opt-in, unguessable, revocable
  // =======================================================
  // Receipts are private by default. `publishReceipt` mints a random token
  // for one record the caller owns; `getPublicReceipt` resolves that token to
  // a view with the owner's principal stripped out. `unpublishReceipt`
  // revokes it.
  //
  // WHY A TOKEN AND NOT THE RECORD ID — this is the whole design decision:
  //
  // Refine and redeem ids are sequential integers. An endpoint keyed on them
  // would let anyone walk 1..n and read every swap this canister has ever
  // settled. Worse, a receipt carries its sGLDT ledger `payBlock`, and that
  // block is public — so each receipt is enough to find the recipient's
  // account on the ledger. Sequential ids would therefore quietly turn
  // "shareable receipt" into "enumerate every user and their amounts".
  //
  // The token is 32 bytes from `raw_rand`, so a receipt is reachable only by
  // someone who was given the link. That is what makes sharing an explicit
  // act by the owner rather than a property of every record by default.

  type ReceiptKind = { #refine; #redeem };

  /// A receipt with the identifying field — `user` — absent by construction
  /// rather than by filtering. `errorMsg` is also omitted: it is operational
  /// text written for the operator, not a field we want to publish verbatim.
  type PublicReceipt = {
    kind : ReceiptKind;
    /// e18 ckUNI for a refine; e8s sGLDT for a redeem.
    amountIn : Nat;
    /// e8s sGLDT for a refine; e18 ckUNI for a redeem.
    amountOut : Nat;
    rate : Nat;
    status : RefineStatus;
    timestamp : Time.Time;
    pullBlock : ?Nat;
    payBlock : ?Nat;
  };

  /// share token → the record it points at.
  let publicReceipts = Map.empty<Text, (ReceiptKind, Nat)>();
  /// "rf-3" / "rd-7" → its share token. Makes publish idempotent and lets
  /// unpublish find the token without scanning the whole map.
  let receiptShareTokens = Map.empty<Text, Text>();

  func _receiptKey(kind : ReceiptKind, id : Nat) : Text {
    switch (kind) {
      case (#refine) { "rf-" # id.toText() };
      case (#redeem) { "rd-" # id.toText() };
    };
  };

  let HEX_DIGITS : [Char] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

  func _toHex(bytes : Blob) : Text {
    var out = "";
    for (b in bytes.toArray().values()) {
      let n = b.toNat();
      out #= HEX_DIGITS[n / 16].toText();
      out #= HEX_DIGITS[n % 16].toText();
    };
    out;
  };

  /// Does this caller own that record? Ownership is checked here rather than
  /// trusted from the frontend — publishing someone else's receipt would
  /// expose their ledger block.
  func _ownsReceipt(caller : Principal, kind : ReceiptKind, id : Nat) : Bool {
    switch (kind) {
      case (#refine) {
        switch (refines.get(id)) {
          case (?r) { r.user == caller };
          case null { false };
        };
      };
      case (#redeem) {
        switch (redeems.get(id)) {
          case (?r) { r.user == caller };
          case null { false };
        };
      };
    };
  };

  /// Mint (or return) the share token for one of the caller's own receipts.
  /// Idempotent: publishing twice returns the same token rather than
  /// scattering live links for the same record.
  public shared ({ caller }) func publishReceipt(kind : ReceiptKind, id : Nat) : async {
    #ok : Text;
    #err : Text;
  } {
    if (not isAuthenticatedUser(caller)) {
      return #err("Sign in with Internet Identity before sharing a receipt.");
    };
    if (not _ownsReceipt(caller, kind, id)) {
      // Deliberately the same message whether the record is missing or
      // belongs to someone else — distinguishing them would confirm the
      // existence of other people's records.
      return #err("No such receipt in your vault.");
    };

    let key = _receiptKey(kind, id);
    switch (receiptShareTokens.get(key)) {
      case (?existing) { return #ok(existing) };
      case null {};
    };

    let token = _toHex(await IC.raw_rand());
    publicReceipts.add(token, (kind, id));
    receiptShareTokens.add(key, token);
    #ok(token);
  };

  /// Revoke a share link. The receipt stays in the owner's own history; only
  /// the public token stops resolving.
  public shared ({ caller }) func unpublishReceipt(kind : ReceiptKind, id : Nat) : async {
    #ok : ();
    #err : Text;
  } {
    if (not isAuthenticatedUser(caller)) {
      return #err("Sign in with Internet Identity first.");
    };
    if (not _ownsReceipt(caller, kind, id)) {
      return #err("No such receipt in your vault.");
    };
    let key = _receiptKey(kind, id);
    switch (receiptShareTokens.get(key)) {
      case (?token) {
        publicReceipts.remove(token);
        receiptShareTokens.remove(key);
      };
      case null {};
    };
    #ok(());
  };

  /// Has the caller already shared this receipt, and under what token? Lets
  /// the UI show "shared" state without minting a link as a side effect of
  /// looking.
  public query ({ caller }) func getReceiptShareToken(kind : ReceiptKind, id : Nat) : async ?Text {
    if (not _ownsReceipt(caller, kind, id)) { return null };
    receiptShareTokens.get(_receiptKey(kind, id));
  };

  /// PUBLIC, anonymous-callable. Resolves a share token to a receipt with no
  /// principal in it. An unknown or revoked token returns null — and returns
  /// it identically, so probing can't distinguish "never existed" from
  /// "revoked".
  public query func getPublicReceipt(token : Text) : async ?PublicReceipt {
    switch (publicReceipts.get(token)) {
      case null { null };
      case (?(kind, id)) {
        switch (kind) {
          case (#refine) {
            switch (refines.get(id)) {
              case null { null };
              case (?r) {
                ?{
                  kind = #refine;
                  amountIn = r.ckuniAmount;
                  amountOut = r.sgldtPaid;
                  rate = r.rate;
                  status = r.status;
                  timestamp = r.timestamp;
                  pullBlock = r.pullBlock;
                  payBlock = r.payBlock;
                };
              };
            };
          };
          case (#redeem) {
            switch (redeems.get(id)) {
              case null { null };
              case (?r) {
                ?{
                  kind = #redeem;
                  amountIn = r.sgldtAmount;
                  amountOut = r.ckuniPaid;
                  rate = r.rate;
                  status = r.status;
                  timestamp = r.timestamp;
                  pullBlock = r.pullBlock;
                  payBlock = r.payBlock;
                };
              };
            };
          };
        };
      };
    };
  };

  // =======================================================
  // INCIDENT NOTICE — operator-raised, publicly readable
  // =======================================================
  // Lets the operator raise a banner on every surface WITHOUT a frontend
  // rebuild and asset sync. That matters because the incident rule published
  // on /status is "post before the fix": if disclosing required a full
  // deploy, the honest thing would be the slow thing, and under pressure the
  // slow thing quietly stops happening.
  //
  // Text only, no severity field — "sev-3" makes a problem sound handled;
  // describing the actual impact does not.

  type IncidentNotice = {
    message : Text;
    /// When the notice was raised, not when the incident began.
    sinceNs : Time.Time;
    /// Optional deep link, e.g. "/status".
    url : ?Text;
  };

  var incidentNotice : ?IncidentNotice = null;

  /// PUBLIC. null = nothing being reported right now.
  public query func getIncidentNotice() : async ?IncidentNotice {
    incidentNotice;
  };

  /// Admin-only. Pass null to clear.
  public shared ({ caller }) func setIncidentNotice(message : ?Text, url : ?Text) : async {
    #ok : ();
    #err : Text;
  } {
    if (not isAdmin(caller)) { return #err("Admin only.") };
    switch (message) {
      case null { incidentNotice := null };
      case (?m) {
        let trimmed = m.trim(#char ' ');
        if (trimmed == "") { return #err("Message cannot be empty — pass null to clear.") };
        incidentNotice := ?{
          message = trimmed;
          // Preserve the original raise time across edits, so updating the
          // wording of an open incident doesn't reset how long it has been
          // open. Under-reporting duration is exactly the wrong direction.
          sinceNs = switch (incidentNotice) {
            case (?existing) { existing.sinceNs };
            case null { Time.now() };
          };
          url = url;
        };
      };
    };
    #ok(());
  };

  // =======================================================
  // REDEEM — sGLDT → ckUNI (the exit path)
  // =======================================================
  // The mirror image of refineCkUNI: pull sGLDT via ICRC-2, pay ckUNI from
  // the treasury at the same oracle rate, refund the sGLDT if the payout
  // fails, strand for admin resolution if even the refund fails. Once the
  // user holds ckUNI they can bridge back to native UNI on Ethereum through
  // DFINITY's standard minter withdrawal — no custom Ethereum leg needed.

  /// Smallest redeem: 0.1 sGLDT (e8s). Below this the ckUNI payout would be
  /// dominated by the ckUNI ledger fee.
  let MIN_REDEEM_SGLDT : Nat = 10_000_000;

  /// ckUNI (e18) owed for a given sGLDT amount (e8s) at a 1e8-precision
  /// sGLDT-per-UNI rate:
  ///   sgldt_e8s / 1e8 = whole sGLDT;  whole sGLDT / (rate/1e8) = whole UNI
  /// which collapses to sgldt * 1e18 / rate. Truncation rounds in the
  /// treasury's favour, mirroring _sgldtForCkUNI.
  func _ckuniForSGLDT(sgldtAmount : Nat, rate : Nat) : Nat {
    (sgldtAmount * 1_000_000_000_000_000_000) / rate;
  };

  /// The caller's sGLDT balance and the allowance granted to this canister,
  /// plus what the treasury could currently pay out. The UI uses this to
  /// gate the redeem button and size the approve step.
  public shared ({ caller }) func getMySGLDTPosition() : async {
    balance : Nat;
    allowance : Nat;
    minRedeem : Nat;
    rate : Nat;
    treasuryCkUNI : Nat;
  } {
    let me = Principal.fromActor(Self);
    let treasuryBal = try {
      await ckUNILedgerV2.icrc1_balance_of({ owner = me; subaccount = null });
    } catch (_) { 0 };
    if (caller.isAnonymous()) {
      return {
        balance = 0;
        allowance = 0;
        minRedeem = MIN_REDEEM_SGLDT;
        rate = uniExchangeRate;
        treasuryCkUNI = treasuryBal;
      };
    };
    let bal = try {
      await sgldtLedgerV2.icrc1_balance_of({ owner = caller; subaccount = null });
    } catch (_) { 0 };
    let allow = try {
      let a = await sgldtLedgerV2.icrc2_allowance({
        account = { owner = caller; subaccount = null };
        spender = { owner = me; subaccount = null };
      });
      a.allowance;
    } catch (_) { 0 };
    {
      balance = bal;
      allowance = allow;
      minRedeem = MIN_REDEEM_SGLDT;
      rate = uniExchangeRate;
      treasuryCkUNI = treasuryBal;
    };
  };

  /// Redeem sGLDT back into ckUNI at the oracle rate. Prerequisite: the user
  /// has icrc2_approve'd this canister on the sGLDT ledger for at least
  /// `amount` plus the sGLDT transfer fee.
  public shared ({ caller }) func redeemSGLDT(amount : Nat, rateHint : ?Nat) : async {
    #ok : { redeemId : Nat; ckuniPaid : Nat; rate : Nat; blockIndex : Nat };
    #err : Text;
  } {
    if (not isAuthenticatedUser(caller)) {
      return #err("Sign in with Internet Identity before redeeming.");
    };
    if (amount < MIN_REDEEM_SGLDT) {
      return #err("Amount too small. Minimum redeem is 0.1 sGLDT.");
    };

    let rate = _clampRateHint(rateHint);
    if (rate == 0) {
      return #err("Exchange rate unavailable — try again shortly.");
    };
    let ckuniAmount = _ckuniForSGLDT(amount, rate);
    if (ckuniAmount == 0) {
      return #err("Calculated payout is zero — check the exchange rate.");
    };

    let me = Principal.fromActor(Self);

    // Cheap pre-check: refuse before pulling funds if the treasury clearly
    // can't pay. The authoritative check is still the payout transfer itself
    // (which refunds on failure); this just avoids a pointless pull+refund
    // fee cycle in the common out-of-liquidity case.
    let treasuryCkUNI = try {
      await ckUNILedgerV2.icrc1_balance_of({ owner = me; subaccount = null });
    } catch (_) { 0 };
    if (treasuryCkUNI < ckuniAmount) {
      return #err(
        "The treasury doesn't hold enough ckUNI for this redeem right now (has "
        # treasuryCkUNI.toText() # " e18, needs " # ckuniAmount.toText() # " e18). Try a smaller amount or come back later."
      );
    };

    // ── Step 1: pull the sGLDT from the user ──
    let pullResult = try {
      await sgldtLedgerV2.icrc2_transfer_from({
        spender_subaccount = null;
        from = { owner = caller; subaccount = null };
        to = { owner = me; subaccount = null };
        amount = amount;
        fee = null;
        memo = null;
        created_at_time = null;
      });
    } catch (e) {
      return #err("Could not reach the sGLDT ledger: " # e.message());
    };

    let pullBlock = switch (pullResult) {
      case (#Ok(b)) { b };
      case (#Err(#InsufficientAllowance { allowance })) {
        return #err(
          "Approval too small. Approve at least " # amount.toText()
          # " sGLDT e8s (current allowance: " # allowance.toText() # ")."
        );
      };
      case (#Err(#InsufficientFunds { balance })) {
        return #err(
          "Not enough sGLDT. Your balance is " # balance.toText()
          # " e8s but " # amount.toText() # " e8s was requested."
        );
      };
      case (#Err(#BadFee { expected_fee })) {
        return #err("sGLDT ledger fee mismatch; expected " # expected_fee.toText() # ". Try again.");
      };
      case (#Err(#TemporarilyUnavailable)) {
        return #err("sGLDT ledger temporarily unavailable. Try again shortly.");
      };
      case (#Err(#GenericError { message; error_code })) {
        return #err("sGLDT transfer failed (" # error_code.toText() # "): " # message);
      };
      case (#Err(_)) {
        return #err("sGLDT transfer was rejected by the ledger.");
      };
    };

    // The sGLDT is ours from here on — pay or refund, never keep.
    nextRedeemId += 1;
    let redeemId = nextRedeemId;
    let startedAt = Time.now();
    redeems.add(
      redeemId,
      {
        id = redeemId;
        user = caller;
        sgldtAmount = amount;
        ckuniPaid = 0;
        rate = rate;
        status = #pulled;
        timestamp = startedAt;
        pullBlock = ?pullBlock;
        payBlock = null;
        errorMsg = null;
      },
    );

    _recordTx(
      caller,
      {
        id = _nextTxId();
        txType = #Redeem;
        amount = amount;
        tokenSymbol = "sGLDT";
        status = #Completed;
        timestamp = startedAt;
        ethTxHash = null;
        icpBlockIndex = ?pullBlock;
        errorMsg = null;
        description = "sGLDT received for redemption: " # amount.toText() # " e8s. Block: " # pullBlock.toText();
      },
    );

    // ── Step 2: pay the ckUNI ──
    let ckFee = try { await ckUNILedgerV2.icrc1_fee() } catch (_) { 0 };
    let payResult = try {
      await ckUNILedgerV2.icrc1_transfer({
        from_subaccount = null;
        to = { owner = caller; subaccount = null };
        amount = ckuniAmount;
        fee = ?ckFee;
        memo = ?_depositMemo(redeemId);
        created_at_time = ?_dedupCreatedAt(startedAt);
      });
    } catch (e) {
      #Err(#GenericError { error_code = 0; message = e.message() });
    };

    switch (payResult) {
      case (#Ok(payBlock)) {
        redeems.add(
          redeemId,
          {
            id = redeemId;
            user = caller;
            sgldtAmount = amount;
            ckuniPaid = ckuniAmount;
            rate = rate;
            status = #paid;
            timestamp = startedAt;
            pullBlock = ?pullBlock;
            payBlock = ?payBlock;
            errorMsg = null;
          },
        );
        _recordTx(
          caller,
          {
            id = _nextTxId();
            txType = #Redeem;
            amount = ckuniAmount;
            tokenSymbol = "ckUNI";
            status = #Completed;
            timestamp = Time.now();
            ethTxHash = null;
            icpBlockIndex = ?payBlock;
            errorMsg = null;
            description = "ckUNI released from treasury: " # ckuniAmount.toText() # " e18. Block: " # payBlock.toText();
          },
        );
        try { ignore await refreshTreasuryBalances() } catch (_) {};
        #ok({ redeemId = redeemId; ckuniPaid = ckuniAmount; rate = rate; blockIndex = payBlock });
      };
      case (#Err(payErr)) {
        let reason = switch (payErr) {
          case (#InsufficientFunds { balance }) {
            "The treasury is out of ckUNI (holds " # balance.toText()
            # " e18, needed " # ckuniAmount.toText() # " e18)";
          };
          case (#GenericError { message; error_code }) {
            "ckUNI ledger error " # error_code.toText() # ": " # message;
          };
          case (#TemporarilyUnavailable) { "The ckUNI ledger is temporarily unavailable" };
          case (#BadFee { expected_fee }) { "ckUNI fee mismatch, expected " # expected_fee.toText() };
          case (_) { "The ckUNI transfer was rejected by the ledger" };
        };
        await _refundSGLDT(redeemId, caller, amount, rate, startedAt, pullBlock, reason);
      };
    };
  };

  /// Return pulled sGLDT after a failed ckUNI payout — the treasury absorbs
  /// the sGLDT transfer fee. Mirrors _refundCkUNI.
  func _refundSGLDT(
    redeemId : Nat,
    user : Principal,
    amount : Nat,
    rate : Nat,
    startedAt : Time.Time,
    pullBlock : Nat,
    reason : Text,
  ) : async { #ok : { redeemId : Nat; ckuniPaid : Nat; rate : Nat; blockIndex : Nat }; #err : Text } {
    let sgldtFee = try { await sgldtLedgerV2.icrc1_fee() } catch (_) { 10_000 };

    func markStranded(detail : Text) {
      redeems.add(
        redeemId,
        {
          id = redeemId;
          user = user;
          sgldtAmount = amount;
          ckuniPaid = 0;
          rate = rate;
          status = #stranded;
          timestamp = startedAt;
          pullBlock = ?pullBlock;
          payBlock = null;
          errorMsg = ?(reason # " | refund failed: " # detail);
        },
      );
      _recordTx(
        user,
        {
          id = _nextTxId();
          txType = #Redeem;
          amount = amount;
          tokenSymbol = "sGLDT";
          status = #Held;
          timestamp = Time.now();
          ethTxHash = null;
          icpBlockIndex = null;
          errorMsg = ?(reason # " | refund failed: " # detail);
          description = "Redeem failed and the sGLDT refund did not go through. Redeem #" # redeemId.toText() # " is held for admin resolution.";
        },
      );
    };

    if (amount <= sgldtFee) {
      markStranded("amount is below the sGLDT transfer fee");
      return #err(reason # ". Your sGLDT could not be auto-refunded (below the ledger fee) — redeem #" # redeemId.toText() # " has been flagged for support.");
    };

    let refundAmount = amount - sgldtFee;
    let refundResult = try {
      await sgldtLedgerV2.icrc1_transfer({
        from_subaccount = null;
        to = { owner = user; subaccount = null };
        amount = refundAmount;
        fee = ?sgldtFee;
        memo = ?_depositMemo(redeemId);
        created_at_time = ?_dedupCreatedAt(startedAt);
      });
    } catch (e) {
      #Err(#GenericError { error_code = 0; message = e.message() });
    };

    switch (refundResult) {
      case (#Ok(_) or #Err(#Duplicate(_))) {
        redeems.add(
          redeemId,
          {
            id = redeemId;
            user = user;
            sgldtAmount = amount;
            ckuniPaid = 0;
            rate = rate;
            status = #refunded;
            timestamp = startedAt;
            pullBlock = ?pullBlock;
            payBlock = null;
            errorMsg = ?reason;
          },
        );
        _recordTx(
          user,
          {
            id = _nextTxId();
            txType = #Refund;
            amount = refundAmount;
            tokenSymbol = "sGLDT";
            status = #Completed;
            timestamp = Time.now();
            ethTxHash = null;
            icpBlockIndex = null;
            errorMsg = ?reason;
            description = "Redeem could not complete; " # refundAmount.toText() # " e8s sGLDT was refunded to your account.";
          },
        );
        #err(reason # ". Your sGLDT has been refunded — you can try again once the treasury holds enough ckUNI.");
      };
      case (#Err(refundErr)) {
        markStranded(debug_show (refundErr));
        #err(reason # ". Automatic refund also failed — redeem #" # redeemId.toText() # " has been flagged for support with your funds recorded.");
      };
    };
  };

  /// The caller's own redeem history, newest-first.
  public query ({ caller }) func getMyRedeems() : async [RedeemRecord] {
    let out = List.empty<RedeemRecord>();
    for ((_, r) in redeems.entries()) {
      if (r.user == caller) { out.add(r) };
    };
    let arr = out.toArray();
    arr.sort(func(a : RedeemRecord, b : RedeemRecord) : Order.Order { Int.compare(b.timestamp, a.timestamp) });
  };

  /// Admin view: every redeem that ended #stranded.
  public query ({ caller }) func getStrandedRedeems() : async [RedeemRecord] {
    if (not isAdmin(caller)) { return [] };
    let out = List.empty<RedeemRecord>();
    for ((_, r) in redeems.entries()) {
      switch (r.status) {
        case (#stranded) { out.add(r) };
        case (_) {};
      };
    };
    out.toArray();
  };

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

  /// Full rate provenance for the UI and ops: where the current rate came
  /// from and how fresh the on-chain oracle reading is.
  public query func getRateStatus() : async {
    rate : Nat;
    uniUsdE8 : Nat;
    sgldtUsdE8 : Nat;
    lastSyncNs : Int;
    lastError : Text;
    autoSyncSeconds : Nat;
  } {
    {
      rate = uniExchangeRate;
      uniUsdE8 = lastUniUsdPriceE8;
      sgldtUsdE8 = sgldtUsdPriceE8;
      lastSyncNs = lastXRCSyncNs;
      lastError = lastXRCError;
      autoSyncSeconds = XRC_AUTO_SYNC_SECONDS;
    };
  };

  /// Force an XRC sync now. Any logged-in user may call — the 60s internal
  /// gap makes it cycle-safe, and a fresher rate benefits everyone equally.
  public shared ({ caller }) func refreshExchangeRate() : async {
    rate : Nat;
    uniUsdE8 : Nat;
    lastError : Text;
  } {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in to refresh the exchange rate");
    };
    await _syncRateFromXRC();
    { rate = uniExchangeRate; uniUsdE8 = lastUniUsdPriceE8; lastError = lastXRCError };
  };

  /// Admin: set the USD reference price of sGLDT (1e8 precision). This is the
  /// slow leg of the rate — the XRC handles the volatile UNI leg from then
  /// on. Setting it recomputes the rate immediately from the last XRC
  /// reading, without the jump guard (an explicit admin action re-anchors).
  public shared ({ caller }) func setSGLDTUsdPrice(priceE8 : Nat) : async () {
    if (not isAdmin(caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    sgldtUsdPriceE8 := priceE8;
    if (priceE8 > 0 and lastUniUsdPriceE8 > 0) {
      let newRate = lastUniUsdPriceE8 * 100_000_000 / priceE8;
      if (newRate > 0) { uniExchangeRate := newRate };
    };
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

  // (Legacy treasury methods deleted 2026-07-30: setSGLDTTreasuryBalance was
  // a no-op, setBatPoolBalance wrote a var nothing reads, getTreasuryStats
  // hardcoded its sGLDT leg to 0. Use getTreasuryICRC1Balances.)

  // -------------------------------------------------------
  // HTTP Transform (kept for potential future outcalls)
  // -------------------------------------------------------
  public query ({ caller }) func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // (Legacy price-feed methods deleted 2026-07-30: getBatPrice/getSGLDTPrice
  // read caches that were never written — they always returned the hardcoded
  // defaults — and calculateExchangeRate was the identity function. The live
  // rate lives in getRateStatus.)

  // (migrated_* / migration_updateBalance / deprecated_* stubs deleted
  // 2026-07-30 — every one either duplicated a live query or trapped.)

  // Kick off the first payout sweep 10 s after deploy; it self-reschedules
  // every 30 s. Registered last so every helper the sweep transitively
  // references (verifyEthTransaction and its parsing utilities) is defined.
  ignore Timer.setTimer<system>(#seconds 10, _sweepConfirmedDeposits);

  // First XRC rate sync 20 s after deploy; self-reschedules hourly.
  ignore Timer.setTimer<system>(#seconds 20, _periodicRateSync);
};
