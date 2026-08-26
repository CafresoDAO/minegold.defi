/// Minimal ICRC-1/2 types shared by mock_ledger.mo and the local test
/// scripts. Mirrors the equivalent module in banking-brave's local test
/// harness (backend/icrc.mo) — same shape, so anyone who has read that one
/// recognizes this immediately.
module {
  public type Subaccount = Blob;

  public type Account = {
    owner : Principal;
    subaccount : ?Subaccount;
  };

  public type TransferArgs = {
    from_subaccount : ?Subaccount;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  public type TransferError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  public type TransferResult = {
    #Ok : Nat;
    #Err : TransferError;
  };

  public type TransferFromArgs = {
    spender_subaccount : ?Subaccount;
    from : Account;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  public type TransferFromError = {
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

  public type TransferFromResult = {
    #Ok : Nat;
    #Err : TransferFromError;
  };

  public type ApproveArgs = {
    from_subaccount : ?Subaccount;
    spender : Account;
    amount : Nat;
    expected_allowance : ?Nat;
    expires_at : ?Nat64;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  public type ApproveError = {
    #BadFee : { expected_fee : Nat };
    #InsufficientFunds : { balance : Nat };
    #AllowanceChanged : { current_allowance : Nat };
    #Expired : { ledger_time : Nat64 };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  public type ApproveResult = {
    #Ok : Nat;
    #Err : ApproveError;
  };
}
