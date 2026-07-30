import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";

/// ONE-TIME migration for the 2026-07 history-taxonomy widening.
///
/// TxType gained #Redeem/#Refund and TxStatus gained #Held. Adding variant
/// tags is NOT stable-compatible for `userTransactions` because Map/List
/// nodes hold `var` fields (invariant), so the upgrade is rejected without an
/// explicit migration. This function deep-copies every stored record into the
/// widened type — old tags are a strict subset, so each record coerces as-is;
/// no data changes.
///
/// REMOVE AFTER THE MIGRATING UPGRADE SHIPS: the parameter type below must
/// match the PRE-upgrade stored taxonomy exactly, so leaving this attached
/// would make the NEXT upgrade fail its input check. Deploy once with it,
/// then delete this file and the `(with migration …)` clause in main.mo.
module {
  // The previous (deployed) taxonomy, frozen. Must stay byte-for-byte what
  // was live before this upgrade — do not "sync" these with main.mo.
  type OldTxType = { #Bridge; #Mint; #Refine; #Transfer };
  type OldTxStatus = { #Pending; #Confirmed; #Completed; #Failed };
  type OldTxRecord = {
    id : Text;
    txType : OldTxType;
    amount : Nat;
    tokenSymbol : Text;
    status : OldTxStatus;
    timestamp : Int;
    ethTxHash : ?Text;
    icpBlockIndex : ?Nat;
    errorMsg : ?Text;
    description : Text;
  };

  type NewTxType = { #Bridge; #Mint; #Refine; #Transfer; #Redeem; #Refund };
  type NewTxStatus = { #Pending; #Confirmed; #Completed; #Failed; #Held };
  type NewTxRecord = {
    id : Text;
    txType : NewTxType;
    amount : Nat;
    tokenSymbol : Text;
    status : NewTxStatus;
    timestamp : Int;
    ethTxHash : ?Text;
    icpBlockIndex : ?Nat;
    errorMsg : ?Text;
    description : Text;
  };

  public func run(
    old : {
      userTransactions : Map.Map<Principal, List.List<OldTxRecord>>;
    },
  ) : {
    userTransactions : Map.Map<Principal, List.List<NewTxRecord>>;
  } {
    let out = Map.empty<Principal, List.List<NewTxRecord>>();
    for ((user, txs) in old.userTransactions.entries()) {
      let widened = List.empty<NewTxRecord>();
      for (r in txs.values()) { widened.add(r) };
      out.add(user, widened);
    };
    { userTransactions = out };
  };
};
