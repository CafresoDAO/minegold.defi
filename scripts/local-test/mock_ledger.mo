/// A deliberately tiny ICRC-1/2 ledger for LOCAL DEVELOPMENT/TEST ONLY.
///
/// Adapted from banking-brave's backend/mock_ledger.mo (same shape, same
/// dedup semantics) so the ckBAT redeem/refine round trip can be exercised
/// against `dfx start` without pulling the real sGLDT/ckBAT ledger wasms.
/// One instance of this canister is deployed per mock asset (sGLDT, ckBAT),
/// each pinned via `--specified-id` to the exact principal main.mo has
/// hardcoded for that ledger, so the backend's `actor("...")` bindings
/// resolve to these mocks on the local replica.
///
/// Never deployed to `ic` — see scripts/local-test/dfx.json and
/// scripts/local-test/run-bat-redeem-test.sh.
import Blob "mo:base/Blob";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Text "mo:base/Text";
import TrieMap "mo:base/TrieMap";
import Nat8 "mo:base/Nat8";
import Icrc "icrc";

persistent actor MockLedger {
  let FEE : Nat = 10_000;

  func key(a : Icrc.Account) : Text {
    let sub = switch (a.subaccount) {
      case null { "" };
      case (?b) {
        Text.join("", Iter.map<Nat8, Text>(Blob.toArray(b).vals(), func(n) {
          let hex = "0123456789abcdef";
          let c = Iter.toArray(hex.chars());
          Text.fromChar(c[Nat8.toNat(n) / 16]) # Text.fromChar(c[Nat8.toNat(n) % 16]);
        }));
      };
    };
    debug_show (a.owner) # "|" # sub;
  };

  var balancesStable : [(Text, Nat)] = [];
  transient var balances = TrieMap.TrieMap<Text, Nat>(Text.equal, Text.hash);
  var blockHeight : Nat = 0;

  var allowancesStable : [(Text, Nat)] = [];
  transient var allowances = TrieMap.TrieMap<Text, Nat>(Text.equal, Text.hash);

  var dedupStable : [(Text, Nat)] = [];
  transient var dedup = TrieMap.TrieMap<Text, Nat>(Text.equal, Text.hash);

  func dedupKey(kind : Text, from : Text, to : Text, amount : Nat, at : ?Nat64) : ?Text {
    switch (at) {
      case null { null };
      case (?t) {
        ?(kind # "|" # from # "|" # to # "|" # Nat.toText(amount) # "|" # Nat64.toText(t));
      };
    };
  };

  system func preupgrade() {
    dedupStable := Iter.toArray(dedup.entries());
    balancesStable := Iter.toArray(balances.entries());
    allowancesStable := Iter.toArray(allowances.entries());
  };
  system func postupgrade() {
    dedup := TrieMap.fromEntries(dedupStable.vals(), Text.equal, Text.hash);
    dedupStable := [];
    balances := TrieMap.fromEntries(balancesStable.vals(), Text.equal, Text.hash);
    balancesStable := [];
    allowances := TrieMap.fromEntries(allowancesStable.vals(), Text.equal, Text.hash);
    allowancesStable := [];
  };

  public query func icrc1_balance_of(a : Icrc.Account) : async Nat {
    switch (balances.get(key(a))) { case (?n) n; case null 0 };
  };

  public query func icrc1_fee() : async Nat { FEE };
  public query func icrc1_symbol() : async Text { "MOCK" };
  public query func icrc1_decimals() : async Nat8 { 8 };

  public shared ({ caller }) func icrc1_transfer(args : Icrc.TransferArgs) : async Icrc.TransferResult {
    let from : Icrc.Account = { owner = caller; subaccount = args.from_subaccount };
    let fromKey = key(from);
    let dk = dedupKey("xfer", fromKey, key(args.to), args.amount, args.created_at_time);
    switch (dk) {
      case (?k) {
        switch (dedup.get(k)) {
          case (?block) { return #Err(#Duplicate { duplicate_of = block }) };
          case null {};
        };
      };
      case null {};
    };
    let bal = switch (balances.get(fromKey)) { case (?n) n; case null 0 };
    let needed = args.amount + FEE;
    if (bal < needed) return #Err(#InsufficientFunds { balance = bal });
    switch (args.fee) {
      case (?f) { if (f != FEE) return #Err(#BadFee { expected_fee = FEE }) };
      case null {};
    };
    balances.put(fromKey, bal - needed);
    let toKey = key(args.to);
    let toBal = switch (balances.get(toKey)) { case (?n) n; case null 0 };
    balances.put(toKey, toBal + args.amount);
    blockHeight += 1;
    switch (dk) { case (?k) { dedup.put(k, blockHeight) }; case null {} };
    #Ok(blockHeight);
  };

  func allowKey(from : Icrc.Account, spender : Icrc.Account) : Text {
    key(from) # ">" # key(spender);
  };

  public query func icrc2_allowance(args : { account : Icrc.Account; spender : Icrc.Account }) : async { allowance : Nat; expires_at : ?Nat64 } {
    let a = switch (allowances.get(allowKey(args.account, args.spender))) { case (?n) n; case null 0 };
    { allowance = a; expires_at = null };
  };

  public shared ({ caller }) func icrc2_approve(args : Icrc.ApproveArgs) : async Icrc.ApproveResult {
    let from : Icrc.Account = { owner = caller; subaccount = args.from_subaccount };
    switch (args.fee) {
      case (?f) { if (f != FEE) return #Err(#BadFee { expected_fee = FEE }) };
      case null {};
    };
    let fromKey = key(from);
    let bal = switch (balances.get(fromKey)) { case (?n) n; case null 0 };
    if (bal < FEE) return #Err(#InsufficientFunds { balance = bal });
    balances.put(fromKey, bal - FEE);
    allowances.put(allowKey(from, args.spender), args.amount);
    blockHeight += 1;
    #Ok(blockHeight);
  };

  public shared ({ caller }) func icrc2_transfer_from(args : Icrc.TransferFromArgs) : async Icrc.TransferFromResult {
    let spender : Icrc.Account = { owner = caller; subaccount = args.spender_subaccount };
    let allowKeyStr = allowKey(args.from, spender);
    let dk = dedupKey("from", key(args.from), key(args.to), args.amount, args.created_at_time);
    switch (dk) {
      case (?k) {
        switch (dedup.get(k)) {
          case (?block) { return #Err(#Duplicate { duplicate_of = block }) };
          case null {};
        };
      };
      case null {};
    };
    let allowance = switch (allowances.get(allowKeyStr)) { case (?n) n; case null 0 };
    let needed = args.amount + FEE;
    if (allowance < needed) return #Err(#InsufficientAllowance { allowance });
    let fromKey = key(args.from);
    let bal = switch (balances.get(fromKey)) { case (?n) n; case null 0 };
    if (bal < needed) return #Err(#InsufficientFunds { balance = bal });
    switch (args.fee) {
      case (?f) { if (f != FEE) return #Err(#BadFee { expected_fee = FEE }) };
      case null {};
    };
    balances.put(fromKey, bal - needed);
    let toKey = key(args.to);
    let toBal = switch (balances.get(toKey)) { case (?n) n; case null 0 };
    balances.put(toKey, toBal + args.amount);
    allowances.put(allowKeyStr, allowance - needed);
    blockHeight += 1;
    switch (dk) { case (?k) { dedup.put(k, blockHeight) }; case null {} };
    #Ok(blockHeight);
  };

  /// Local-dev faucet. Open on purpose; this ledger never leaves dfx.
  public func mint(to : Icrc.Account, amount : Nat) : async Nat {
    let k = key(to);
    let bal = switch (balances.get(k)) { case (?n) n; case null 0 };
    balances.put(k, bal + amount);
    blockHeight += 1;
    blockHeight;
  };
}
