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
  // then ignore its value — the minter is reached through the transient `ckErc20Minter`
  // binding below. (This comment used to name `ckUNIMinterV1/V2`, which never existed.)
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

  // ── Etherscan remnants: dead code, live stable signature ──────────────
  //
  // The Etherscan verification and balance-read surface was deleted in full
  // (2026-08-05). Nothing below is read or written by any remaining code.
  //
  // They stay because they are STILL IN THE RUNNING CANISTER'S stable
  // signature, and Motoko refuses to discard a stable variable implicitly:
  //   Compatibility error [M0169], the stable variable `etherscanApiKey` of
  //   the previous version cannot be implicitly discarded.
  // Deleting them outright makes `moc --stable-compatible` fail against the
  // deployed canister, which is exactly the check scripts/upgrade-backend.sh
  // runs before it will install anything. Keeping them means this deletion
  // changes ZERO stable state — the safest shape for an upgrade of a canister
  // holding real funds.
  //
  // Dropping them for real needs an explicit Motoko migration function. That
  // is a separate, deliberate change; it should not ride along with a code
  // deletion. When it happens it also clears `etherscanApiKey`, which today
  // still holds the (now unreachable, unused) key in canister memory.
  //
  // Under `--default-persistent-actors` even `let` bindings are stable, which
  // is why the constants below must be restored too, not just the `var`s.
  var etherscanApiKey : Text = "";
  var _outcallWindowStart : Time.Time = 0;
  var _outcallWindowCount : Nat = 0;
  let OUTCALL_WINDOW_NS : Int = 60_000_000_000;
  let OUTCALL_WINDOW_MAX : Nat = 30;
  let UNI_CONTRACT_ADDRESS_LOWER : Text = "1f9840a85d5af5bf1d1762f925bdaddc4201f984";
  let CKERC20_HELPER_CONTRACT_LOWER : Text = "6abda0438307733fc299e9c229fd3cc074bd8cc0";
  let DEPOSIT_SELECTOR : Text = "26b3293f";
  let BALANCE_CACHE_TTL_NS : Int = 20_000_000_000;
  type BalanceCacheEntry = { ethWei : Nat; uniWei : Nat; cachedAt : Time.Time };
  let balanceCache = Map.empty<Text, BalanceCacheEntry>();

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
  // nothing here worth persisting. (Same split as the persistent `ckUNIMinter`
  // var and the transient `ckErc20Minter` binding.) Future ledger-interface
  // growth should extend THIS binding.
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
  /// the legitimate deposit flow is now refineCkUNI: the ckERC-20 minter
  /// credits ckUNI to the user's own principal under chain-key consensus, and
  /// refining pulls it via icrc2_transfer_from. (This note used to name
  /// submitUNIDeposit → verifyEthTransaction; both were deleted 2026-08-05.)

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



  /// Releases sGLDT from the treasury to the depositing user via ICRC-1 transfer.
  ///
  /// Only reachable for deposit records created before the minter-attribution
  /// switch; nothing creates new ones. It pays out a record that is already
  /// #confirmed and performs no Ethereum verification of its own — the code
  /// that did (verifyEthTransaction, via Etherscan) was deleted 2026-08-05.
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
    // so when retryUNIDepositPayout or the sweeper call this function internally,
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

    let confirmedIds = List.empty<Nat>();
    for ((id, r) in uniDeposits.entries()) {
      switch (r.status) {
        case (#confirmed) { confirmedIds.add(id) };
        // #pending used to be verified here via Etherscan. That path is gone
        // (see the deletion note above `verifyAndPayUNIDeposit`): nothing can
        // create a #pending record any more, and no Ethereum oracle remains to
        // promote one. Any #pending left over from the treasury-attribution
        // era is resolved by an admin, not by this timer.
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

    sweeperInFlight := false;
  };

  // (Sweep kick-off is registered at the bottom of the actor — it must come
  // after every helper the sweep transitively references is defined.)

  /// Retries the sGLDT payout for a deposit that is in #confirmed or #failed status.
  ///
  /// This is what the "Keep Checking" button calls: it re-attempts the ICRC-1
  /// sGLDT transfer, rather than only reading status. Use it to resolve deposits
  /// stuck in #confirmed because a previous verifyAndPayUNIDeposit call trapped
  /// or failed silently.
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
  // Legacy deposit-record payout (no Ethereum reads remain)
  // -------------------------------------------------------

  /// Direct payout trigger — immediately attempts the sGLDT ICRC-1 transfer for
  /// a deposit that is in #confirmed or #failed status.
  ///
  /// Use this when: sGLDT was not released for an already-confirmed record and
  /// you want to force a retry without waiting for the next 30 s sweep.
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

    // Directly attempt the sGLDT payout
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
  /// Regular users pass the live rate via refineCkUNI's rateHint parameter so the
  /// rate is locked per-refine without mutating the global state.
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


  // (Legacy price-feed methods deleted 2026-07-30: getBatPrice/getSGLDTPrice
  // read caches that were never written — they always returned the hardcoded
  // defaults — and calculateExchangeRate was the identity function. The live
  // rate lives in getRateStatus.)

  // (migrated_* / migration_updateBalance / deprecated_* stubs deleted
  // 2026-07-30 — every one either duplicated a live query or trapped.)

  // Kick off the first payout sweep 10 s after deploy; it self-reschedules
  // every 30 s. Registered last so every helper the sweep transitively
  // references (verifyAndPayUNIDeposit and the ledger bindings) is defined.
  ignore Timer.setTimer<system>(#seconds 10, _sweepConfirmedDeposits);

  // First XRC rate sync 20 s after deploy; self-reschedules hourly.
  ignore Timer.setTimer<system>(#seconds 20, _periodicRateSync);
};
