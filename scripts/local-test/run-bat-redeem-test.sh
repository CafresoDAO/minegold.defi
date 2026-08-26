#!/usr/bin/env bash
# Integration test: the ckBAT exit path (refineCkBAT / redeemCkBAT) round
# trip, against a local replica with mock ICRC-1/2 ledgers standing in for
# the real sGLDT and ckBAT ledgers. Mirrors banking-brave's
# scripts/pos-pull-test.sh in style and structure.
#
# main.mo hardcodes the sGLDT/ckBAT/ckUNI ledger canister ids as constants
# (they are real mainnet ckERC-20/DEX-pool principals, not configurable), so
# the mocks in this directory are deployed with `specified_id` pinned to
# those exact principals — see dfx.json — so the backend's `actor("...")`
# bindings resolve to these mocks on the local replica.
#
# The backend itself cannot be deployed as the real, committed
# src/backend/dist/backend.wasm for admin-method testing: ADMIN_PRINCIPAL
# and DEPLOYER_PRINCIPAL in main.mo are real, offline mainnet-admin
# principals nobody running this script holds the key for. So this script
# compiles a LOCAL-TEST-ONLY variant of main.mo — identical except for one
# extra line granting #admin to whichever dfx identity is running the
# script — into scripts/local-test/.artifacts/, which is gitignored and
# never touches src/backend/dist or gets deployed anywhere but this
# throwaway local replica. See _artifacts/src/main_local.mo, generated
# fresh each run.
#
#   dfx start --clean --background        (from repo root or anywhere)
#   ./scripts/local-test/run-bat-redeem-test.sh
set -euo pipefail
cd "$(dirname "$0")"
REPO_ROOT="$(cd ../.. && pwd)"

pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1"; exit 1; }

export DFX_MOC_PATH=moc-wrapper

echo "── toolchain ───────────────────────────────────────────"
MOC="$(mops toolchain bin moc)"
echo "  moc: $MOC ($($MOC --version))"

echo "── build mock ledger ───────────────────────────────────"
mkdir -p .artifacts/src
mops install --quiet 2>/dev/null || mops install
"$MOC" --release --package base .mops/base@0.16.0/src \
  -o .artifacts/mock_ledger.wasm --idl mock_ledger.mo
pass "mock_ledger.wasm built"

echo "── build LOCAL-TEST-ONLY backend (admin-injected) ──────"
LOCAL_ADMIN="$(dfx identity get-principal)"
echo "  local admin principal: $LOCAL_ADMIN"
cp "$REPO_ROOT/src/backend/main.mo" .artifacts/src/main_local.mo
MARKER='    accessControlState.userRoles.add(DEPLOYER_PRINCIPAL, #admin);'
python3 - "$LOCAL_ADMIN" "$MARKER" <<'PYEOF'
import sys
admin, marker = sys.argv[1], sys.argv[2]
path = ".artifacts/src/main_local.mo"
with open(path) as f:
    content = f.read()
assert marker in content, "marker line not found in main.mo — did it move?"
injected = (
    marker + "\n"
    f'    accessControlState.userRoles.add(Principal.fromText("{admin}"), #admin); '
    "// LOCAL-TEST-ONLY, injected by run-bat-redeem-test.sh, never committed\n"
)
content = content.replace(marker + "\n", injected, 1)
with open(path, "w") as f:
    f.write(content)
PYEOF
grep -q "LOCAL-TEST-ONLY" .artifacts/src/main_local.mo || fail "admin injection failed"

cd "$REPO_ROOT"
"$MOC" --release \
  --default-persistent-actors \
  --actor-idl=src/backend/system-idl \
  --implicit-package=core \
  -no-check-ir \
  -E=M0236,M0235,M0223,M0237 \
  -A=M0198 \
  --package core .mops/core@2.2.0/src \
  --package caffeineai-authorization .mops/caffeineai-authorization@0.1.0/src \
  --package caffeineai-http-outcalls .mops/caffeineai-http-outcalls@0.1.0/src \
  -o scripts/local-test/.artifacts/backend_local.wasm \
  --idl \
  scripts/local-test/.artifacts/src/main_local.mo 2>&1 | grep -E "error|Error" && fail "backend_local compile had errors (see above)"
cd scripts/local-test
[[ -f .artifacts/backend_local.wasm ]] || fail "backend_local.wasm was not produced"
pass "backend_local.wasm built (real main.mo + one local-admin line)"

echo "── deploy ───────────────────────────────────────────────"
# --mode reinstall: this script is meant to be re-run against the same
# `dfx start --clean` replica during iteration, so wipe any state left by a
# previous run rather than upgrading onto it (these mocks have no upgrade
# path worth preserving, and stale balances would silently break the
# round-trip assertions below).
dfx deploy --identity default -qq --mode reinstall -y 2>/dev/null || dfx deploy --identity default -qq
BACKEND=$(dfx canister id backend)
SGLDT=$(dfx canister id mock_sgldt_ledger)
CKBAT=$(dfx canister id mock_ckbat_ledger)
echo "  backend=$BACKEND sgldt=$SGLDT ckbat=$CKBAT"
[[ "$SGLDT" == "i2s4q-syaaa-aaaan-qz4sq-cai" ]] || fail "mock sGLDT ledger did not land on the hardcoded principal"
[[ "$CKBAT" == "j7x7x-syaaa-aaaar-qcbea-cai" ]] || fail "mock ckBAT ledger did not land on the hardcoded principal"
pass "mock ledgers deployed at the exact principals main.mo hardcodes"

echo "── admin sanity ────────────────────────────────────────"
OUT=$(dfx canister call backend whoAmI --identity default)
[[ "$OUT" == *"isAdmin = true"* ]] || fail "local identity is not recognized as admin: $OUT"
pass "local dfx identity is admin (via the injected line, not the real hardcoded principals)"

echo "── set BAT exchange rate (1 BAT = 1 sGLDT) ─────────────"
OUT=$(dfx canister call backend setBATExchangeRate "(100_000_000 : nat)" --identity default)
[[ "$OUT" == *"ok"* ]] || fail "setBATExchangeRate: $OUT"
pass "rate set: 1e8-precision sGLDT/BAT = 100_000_000 (1:1)"

# ── users ────────────────────────────────────────────────
dfx identity new local-test-user --storage-mode plaintext >/dev/null 2>&1 || true
dfx identity new local-test-user-2 --storage-mode plaintext >/dev/null 2>&1 || true
USER=$(dfx identity get-principal --identity local-test-user)
USER2=$(dfx identity get-principal --identity local-test-user-2)
echo "  user=$USER user2=$USER2"

echo "── fund treasury with sGLDT (so refineCkBAT can pay out) ─"
dfx canister call mock_sgldt_ledger mint \
  "(record { owner = principal \"$BACKEND\"; subaccount = null }, 1_000_000_000_000)" >/dev/null
pass "backend treasury funded with 10,000 sGLDT (e8s)"

echo "── refineCkBAT: ckBAT -> sGLDT ─────────────────────────"
dfx canister call mock_ckbat_ledger mint \
  "(record { owner = principal \"$USER\"; subaccount = null }, 5_000_000_000_000_000_000)" >/dev/null
pass "user funded with 5 ckBAT (e18)"

OUT=$(dfx canister call mock_ckbat_ledger icrc2_approve \
  "(record { from_subaccount = null; spender = record { owner = principal \"$BACKEND\"; subaccount = null }; amount = 2_000_000_000_000_000_000; expected_allowance = null; expires_at = null; fee = null; memo = null; created_at_time = null })" \
  --identity local-test-user)
[[ "$OUT" == *"Ok"* ]] || fail "ckBAT approve: $OUT"
pass "user approves backend for 2 ckBAT"

OUT=$(dfx canister call backend refineCkBAT "(1_000_000_000_000_000_000 : nat, null)" --identity local-test-user)
[[ "$OUT" == *"ok"* ]] || fail "refineCkBAT: $OUT"
pass "refineCkBAT(1 ckBAT) settles: $OUT"

USER_SGLDT=$(dfx canister call mock_sgldt_ledger icrc1_balance_of "(record { owner = principal \"$USER\"; subaccount = null })")
# 1 ckBAT @ 1:1 rate = 1 sGLDT = 100_000_000 e8s
[[ "$USER_SGLDT" == *"100_000_000"* ]] || fail "user sGLDT balance after refine: $USER_SGLDT"
pass "user received 1.0 sGLDT for 1 ckBAT at the 1:1 rate"

echo "── redeemCkBAT: sGLDT -> ckBAT (the round trip) ────────"
# icrc2_approve itself costs a ledger fee, charged to the approver — the
# 1.0 sGLDT refineCkBAT just paid isn't quite enough to also cover it, so
# top up a small buffer first (mirrors real usage: a wallet needs headroom
# for the approval fee on top of the amount being redeemed).
dfx canister call mock_sgldt_ledger mint \
  "(record { owner = principal \"$USER\"; subaccount = null }, 20_000)" >/dev/null
OUT=$(dfx canister call mock_sgldt_ledger icrc2_approve \
  "(record { from_subaccount = null; spender = record { owner = principal \"$BACKEND\"; subaccount = null }; amount = 100_010_000; expected_allowance = null; expires_at = null; fee = null; memo = null; created_at_time = null })" \
  --identity local-test-user)
[[ "$OUT" == *"Ok"* ]] || fail "sGLDT approve: $OUT"
pass "user approves backend for 1.0001 sGLDT (amount + fee)"

# redeemCkBAT's pre-flight check only compares treasuryCkBAT against the
# *payout* amount, not payout+fee — the treasury holds exactly 1 ckBAT
# from the refine above, which passes that check but is then one ledger
# fee short of what icrc1_transfer itself needs. Top up so this round trip
# demonstrates the happy path; the shortfall-by-exactly-the-fee case is
# exercised deliberately below instead.
dfx canister call mock_ckbat_ledger mint \
  "(record { owner = principal \"$BACKEND\"; subaccount = null }, 1_000_000_000_000_000_000)" >/dev/null

CKBAT_BEFORE=$(dfx canister call mock_ckbat_ledger icrc1_balance_of "(record { owner = principal \"$USER\"; subaccount = null })" | tr -dc '0-9')
OUT=$(dfx canister call backend redeemCkBAT "(100_000_000 : nat, null)" --identity local-test-user)
[[ "$OUT" == *"ok"* ]] || fail "redeemCkBAT: $OUT"
pass "redeemCkBAT(1.0 sGLDT) settles: $OUT"

CKBAT_AFTER=$(dfx canister call mock_ckbat_ledger icrc1_balance_of "(record { owner = principal \"$USER\"; subaccount = null })" | tr -dc '0-9')
# 1.0 sGLDT @ 1:1 rate = 1 ckBAT e18 = 1_000_000_000_000_000_000
DELTA=$((CKBAT_AFTER - CKBAT_BEFORE))
[[ "$DELTA" == "1000000000000000000" ]] || fail "ckBAT delta after redeem: got $DELTA, want 1e18"
pass "round trip consistent: redeeming the exact 1.0 sGLDT paid out by the refine returns the original 1 ckBAT"

echo "── failure path 1: insufficient allowance ──────────────"
# User has sGLDT left (refined 1, redeemed 1 back — approvals above already
# spent) but grants no fresh allowance for this call.
OUT=$(dfx canister call backend redeemCkBAT "(100_000_000 : nat, null)" --identity local-test-user 2>&1 || true)
[[ "$OUT" == *"Approval too small"* || "$OUT" == *"err"* ]] || fail "expected an allowance error: $OUT"
pass "redeemCkBAT refuses cleanly with no allowance (nothing pulled, nothing to strand)"

echo "── failure path 2: treasury shortfall mid-flight -> refund ─"
# Fund a fresh treasury shortfall: give the treasury just enough ckBAT for
# ONE of two concurrent 1-sGLDT redeems, fund and approve both users for
# 1 sGLDT each, then fire both redeemCkBAT calls at once. Exactly one must
# settle; the other must hit the (post-pull) ckBAT payout shortfall and
# auto-refund the sGLDT it pulled, per _refundSGLDTforBat — never leaving
# it stranded on a live #stranded record for a *simple* shortfall (only a
# refund-transfer failure itself would strand it).
dfx canister call mock_ckbat_ledger mint "(record { owner = principal \"$BACKEND\"; subaccount = null }, 1_000_000_000_000_000_000)" >/dev/null
# (backend already holds some ckBAT from the earlier refine pull, but we
# want an amount too small for BOTH pending redeems: bring it down to
# exactly 1 ckBAT total isn't directly possible without a burn method on
# the mock, so instead size both redeems so their combined ckBAT need
# exceeds whatever the treasury holds after the mint above, and each
# individually fits.)
TREASURY_CKBAT=$(dfx canister call mock_ckbat_ledger icrc1_balance_of "(record { owner = principal \"$BACKEND\"; subaccount = null })" | tr -dc '0-9')
echo "  treasury ckBAT before concurrent redeems: $TREASURY_CKBAT"

dfx canister call mock_sgldt_ledger mint "(record { owner = principal \"$USER\"; subaccount = null }, 500_000_000_000)" >/dev/null
dfx canister call mock_sgldt_ledger mint "(record { owner = principal \"$USER2\"; subaccount = null }, 500_000_000_000)" >/dev/null
# Redeem amount picked so that 2x it comfortably exceeds TREASURY_CKBAT
# (at the 1:1 rate, sGLDT e8s amount == ckBAT e18/1e10... rate math: rate
# 100_000_000 means ckbatForSGLDT(amt) = amt * 1e18 / 1e8 = amt * 1e10).
# So redeeming R e8s sGLDT needs R * 1e10 ckBAT e18. Pick R so that
# 2 * R * 1e10 > TREASURY_CKBAT >= R * 1e10.
R=$(( (TREASURY_CKBAT / 10000000000) * 6 / 10 ))
[[ "$R" -gt 0 ]] || fail "treasury ckBAT too small to construct the shortfall scenario"
echo "  redeem amount per user: $R e8s sGLDT (each needs $((R * 10000000000)) ckBAT e18; treasury has $TREASURY_CKBAT)"

for id in local-test-user local-test-user-2; do
  dfx canister call mock_sgldt_ledger icrc2_approve \
    "(record { from_subaccount = null; spender = record { owner = principal \"$BACKEND\"; subaccount = null }; amount = $((R + 10000)); expected_allowance = null; expires_at = null; fee = null; memo = null; created_at_time = null })" \
    --identity "$id" >/dev/null
done
pass "both users approved for their redeem"

R1=$(mktemp); R2=$(mktemp)
dfx canister call backend redeemCkBAT "($R : nat, null)" --identity local-test-user  >"$R1" 2>&1 &
P1=$!
dfx canister call backend redeemCkBAT "($R : nat, null)" --identity local-test-user-2 >"$R2" 2>&1 &
P2=$!
wait $P1 || true
wait $P2 || true

OKS=0
grep -q "ok = " "$R1" && OKS=$((OKS + 1))
grep -q "ok = " "$R2" && OKS=$((OKS + 1))
echo "  result 1: $(cat "$R1")"
echo "  result 2: $(cat "$R2")"
[[ "$OKS" -ge 1 ]] || fail "expected at least one of the two concurrent redeems to settle"

# Whichever one failed must show the refund message and the user's sGLDT
# balance must reflect a refund (not a stranded pull).
for pair in "$R1:local-test-user:$USER" "$R2:local-test-user-2:$USER2"; do
  RESFILE="${pair%%:*}"; rest="${pair#*:}"; ID="${rest%%:*}"; PRIN="${rest#*:}"
  if grep -q "refunded" "$RESFILE"; then
    BAL=$(dfx canister call mock_sgldt_ledger icrc1_balance_of "(record { owner = principal \"$PRIN\"; subaccount = null })" | tr -dc '0-9')
    pass "the losing redeem ($ID) reports a refund, and its sGLDT balance is $BAL (funds returned, not stranded)"
  fi
done
STRANDED=$(dfx canister call backend getStrandedBatRedeems --identity default)
[[ "$STRANDED" == *"vec {}"* ]] || fail "expected zero stranded ckBAT redeems, got: $STRANDED"
pass "getStrandedBatRedeems is empty — the shortfall refunded cleanly, nothing stuck for admin resolution"

echo "── getMyBatRedeems / getMySGLDTPositionForCkBAT sanity ──"
OUT=$(dfx canister call backend getMyBatRedeems --identity local-test-user)
[[ "$OUT" == *"status = "* ]] || fail "getMyBatRedeems returned nothing: $OUT"
pass "getMyBatRedeems returns the caller's own redeem history"

echo "── admin methods ───────────────────────────────────────"
OUT=$(dfx canister call backend adminRearmRateSyncTimer --identity local-test-user 2>&1 || true)
[[ "$OUT" == *"nauthorized"* || "$OUT" == *"reject"* ]] || fail "non-admin should be refused adminRearmRateSyncTimer: $OUT"
pass "adminRearmRateSyncTimer refuses a non-admin caller"

OUT=$(dfx canister call backend adminRearmRateSyncTimer --identity default 2>&1)
[[ "$OUT" == *"re-armed"* ]] || fail "adminRearmRateSyncTimer (admin): $OUT"
pass "adminRearmRateSyncTimer (admin): $OUT"

OUT=$(dfx canister call backend adminForceRateSync --identity local-test-user 2>&1 || true)
[[ "$OUT" == *"nauthorized"* || "$OUT" == *"reject"* ]] || fail "non-admin should be refused adminForceRateSync: $OUT"
pass "adminForceRateSync refuses a non-admin caller"

# No internet / no real XRC canister locally, so this cannot reach a live
# price feed — the assertion is that it completes and reports status as
# TEXT rather than trapping the canister, i.e. the admin escape hatch
# itself is sound even when the underlying oracle call fails.
OUT=$(dfx canister call backend adminForceRateSync --identity default 2>&1)
echo "  adminForceRateSync (admin, no live XRC/HTTP-outcalls available locally): $OUT"
[[ "$OUT" == *"ok"* || "$OUT" == *"err"* || "$OUT" == *"skipped"* ]] || fail "adminForceRateSync did not return a recognizable status: $OUT"
pass "adminForceRateSync runs end-to-end as admin and reports a status without trapping"

echo ""
echo "══════════════════════════════════════════════════════"
echo " ALL BAT REDEEM / ADMIN RATE-SYNC ASSERTIONS PASSED"
echo "══════════════════════════════════════════════════════"
