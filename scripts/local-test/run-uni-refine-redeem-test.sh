#!/usr/bin/env bash
# Integration test: the PRIMARY product path — the ckUNI leg (refineCkUNI /
# redeemSGLDT) round trip plus its admin treasury methods — against a local
# replica with mock ICRC-1/2 ledgers standing in for the real sGLDT and ckUNI
# ledgers. Sibling of run-bat-redeem-test.sh: same build/deploy scaffolding,
# same conventions, different leg of main.mo.
#
# main.mo hardcodes the sGLDT/ckBAT/ckUNI ledger canister ids as constants,
# so the mocks in this directory are deployed with `specified_id` pinned to
# those exact principals — see dfx.json — so the backend's `actor("...")`
# bindings (ckUNILedger / ckUNILedgerV2 at ilzky-ayaaa-aaaar-qahha-cai,
# sgldtLedger / sgldtLedgerV2 at i2s4q-syaaa-aaaan-qz4sq-cai) resolve to
# these mocks on the local replica.
#
# The backend is compiled as a LOCAL-TEST-ONLY variant of main.mo — identical
# except for one extra line granting #admin to whichever dfx identity runs
# the script — into scripts/local-test/.artifacts/ (gitignored). See the
# header of run-bat-redeem-test.sh for why.
#
# Rate freshness: refineCkUNI and redeemSGLDT both refuse when
# _uniRateIsFresh() is false, i.e. when uniRateAppliedNs (falling back to
# lastXRCSyncNs) is older than UNI_RATE_MAX_AGE_NS (6 h). There is no live
# XRC on a local replica, so the freshness stamp has to come from an admin
# path. main.mo's `setUNIExchangeRate` does exactly that — it writes
# `uniRateAppliedNs := Time.now()` right after `uniExchangeRate := rate`
# ("An admin re-anchor is a fresh rate"), so a single admin call both sets
# the known rate this script asserts against AND opens the money paths.
# (setLiveExchangeRate / syncLiveExchangeRate stamp the same field; the
# setter is used here because it is the documented re-anchor method.)
#
# Rate arithmetic asserted below is read from main.mo, not guessed:
#   _sgldtForCkUNI(ckuni_e18, rate_e8) = ckuni * rate / 1e18      (sGLDT e8s)
#   _ckuniForSGLDT(sgldt_e8s, rate_e8) = sgldt * 1e18 / rate      (ckUNI e18)
# With rate = 250_000_000 (2.5 sGLDT per UNI):
#   refine 1 ckUNI  (1e18)  -> 250_000_000 e8s (2.5 sGLDT)
#   redeem 1 sGLDT  (1e8)   -> 4e17 ckUNI     (0.4 ckUNI)
#   redeem 0.5 sGLDT (5e7)  -> 2e17 ckUNI     (0.2 ckUNI)
#
#   cd scripts/local-test && dfx start --clean --background
#   ./scripts/local-test/run-uni-refine-redeem-test.sh
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
    "// LOCAL-TEST-ONLY, injected by run-uni-refine-redeem-test.sh, never committed\n"
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
# Wipe any state left by a previous run (or by the BAT script) rather than
# upgrading onto it — stale balances, an already-anchored rate and stale
# refine/redeem records would silently break the exact-value assertions.
# NOTE: `dfx deploy --mode reinstall` with no canister name is REJECTED by
# dfx ("only valid when deploying a single canister"), so a whole-project
# reinstall silently degrades to an upgrade, which with
# --default-persistent-actors keeps every stable var. Reinstall each
# canister by name instead.
dfx deploy --identity default -qq 2>/dev/null || dfx deploy --identity default -qq
for c in backend mock_sgldt_ledger mock_ckbat_ledger mock_ckuni_ledger; do
  dfx deploy "$c" --identity default -qq --mode reinstall -y >/dev/null 2>&1 || fail "reinstall of $c failed"
done
BACKEND=$(dfx canister id backend)
SGLDT=$(dfx canister id mock_sgldt_ledger)
CKUNI=$(dfx canister id mock_ckuni_ledger)
echo "  backend=$BACKEND sgldt=$SGLDT ckuni=$CKUNI"
[[ "$SGLDT" == "i2s4q-syaaa-aaaan-qz4sq-cai" ]] || fail "mock sGLDT ledger did not land on the hardcoded principal"
[[ "$CKUNI" == "ilzky-ayaaa-aaaar-qahha-cai" ]] || fail "mock ckUNI ledger did not land on the hardcoded principal"
pass "mock ledgers deployed at the exact principals main.mo hardcodes"

echo "── admin sanity ────────────────────────────────────────"
OUT=$(dfx canister call backend whoAmI --identity default)
[[ "$OUT" == *"isAdmin = true"* ]] || fail "local identity is not recognized as admin: $OUT"
pass "local dfx identity is admin (via the injected line, not the real hardcoded principals)"

# ── users ────────────────────────────────────────────────
dfx identity new local-test-user --storage-mode plaintext >/dev/null 2>&1 || true
dfx identity new local-test-user-2 --storage-mode plaintext >/dev/null 2>&1 || true
USER=$(dfx identity get-principal --identity local-test-user)
USER2=$(dfx identity get-principal --identity local-test-user-2)
echo "  user=$USER user2=$USER2"

# ── shared helpers ───────────────────────────────────────
RATE=250000000            # 2.5 sGLDT per UNI, 1e8 precision
E18=1000000000000000000
FEE=10000                 # mock ledger fee, both ledgers

bal_sgldt() { dfx canister call mock_sgldt_ledger icrc1_balance_of "(record { owner = principal \"$1\"; subaccount = null })" | tr -dc '0-9'; }
bal_ckuni() { dfx canister call mock_ckuni_ledger icrc1_balance_of "(record { owner = principal \"$1\"; subaccount = null })" | tr -dc '0-9'; }
approve() { # ledger identity amount
  dfx canister call "$1" icrc2_approve \
    "(record { from_subaccount = null; spender = record { owner = principal \"$BACKEND\"; subaccount = null }; amount = $3; expected_allowance = null; expires_at = null; fee = null; memo = null; created_at_time = null })" \
    --identity "$2"
}

echo "── 1. setUNIExchangeRate (admin) + getRateStatus ───────"
OUT=$(dfx canister call backend setUNIExchangeRate "($RATE : nat)" --identity local-test-user 2>&1 || true)
[[ "$OUT" == *"nauthorized"* || "$OUT" == *"reject"* ]] || fail "non-admin should be refused setUNIExchangeRate: $OUT"
pass "setUNIExchangeRate refuses a non-admin caller"

STATUS_BEFORE=$(dfx canister call backend getRateStatus)
[[ "$STATUS_BEFORE" == *"isFresh = false"* ]] || fail "expected the rate to be STALE on a fresh deploy (no XRC sync, no admin anchor): $STATUS_BEFORE"
pass "fresh deploy: getRateStatus.isFresh = false (staleness guard is armed before any anchor)"

OUT=$(dfx canister call backend refineCkUNI "($E18 : nat, null)" --identity local-test-user)
[[ "$OUT" == *"err"* && "$OUT" == *"paused"* ]] || fail "refineCkUNI should be paused while the rate is stale: $OUT"
pass "refineCkUNI refuses cleanly while the rate is stale (nothing pulled)"

OUT=$(dfx canister call backend setUNIExchangeRate "($RATE : nat)" --identity default)
[[ "$OUT" == "()" ]] || fail "setUNIExchangeRate: $OUT"
STATUS=$(dfx canister call backend getRateStatus)
[[ "$STATUS" == *"rate = 250_000_000"* ]] || fail "getRateStatus.rate: $STATUS"
[[ "$STATUS" == *"isFresh = true"* ]] || fail "getRateStatus.isFresh should be true after the admin re-anchor: $STATUS"
[[ "$STATUS" != *"appliedNs = 0 "* ]] || fail "getRateStatus.appliedNs should be stamped by setUNIExchangeRate: $STATUS"
pass "rate set to 250_000_000 (2.5 sGLDT/UNI); getRateStatus reports it and isFresh = true (uniRateAppliedNs stamped by the setter)"

echo "── 8. getCyclesHealth sanity ───────────────────────────"
OUT=$(dfx canister call backend getCyclesHealth --identity local-test-user)
[[ "$OUT" == *"balance = "* && "$OUT" == *"measuredBurnPerDay = "* && "$OUT" == *"daysRemaining = "* && "$OUT" == *"snapshotCount = "* && "$OUT" == *"warning = "* ]] \
  || fail "getCyclesHealth did not return the expected record: $OUT"
BAL_CYCLES=$(echo "$OUT" | sed -n 's/.*balance = \([0-9_]*\).*/\1/p' | tr -d '_')
[[ -n "$BAL_CYCLES" && "$BAL_CYCLES" -gt 0 ]] || fail "getCyclesHealth.balance should be > 0: $OUT"
pass "getCyclesHealth returns a full record without trapping (balance=$BAL_CYCLES, no snapshots yet => burn/days 0)"

echo "── fund treasury with sGLDT (so refineCkUNI can pay out) ─"
dfx canister call mock_sgldt_ledger mint \
  "(record { owner = principal \"$BACKEND\"; subaccount = null }, 1_000_000_000_000)" >/dev/null
pass "backend treasury funded with 10,000 sGLDT (e8s)"

echo "── 2. refineCkUNI: ckUNI -> sGLDT (happy path) ─────────"
dfx canister call mock_ckuni_ledger mint \
  "(record { owner = principal \"$USER\"; subaccount = null }, 5_000_000_000_000_000_000)" >/dev/null
pass "user funded with 5 ckUNI (e18)"

OUT=$(approve mock_ckuni_ledger local-test-user 3_000_000_000_000_000_000)
[[ "$OUT" == *"Ok"* ]] || fail "ckUNI approve: $OUT"
pass "user approves backend for 3 ckUNI"

SGLDT_BEFORE=$(bal_sgldt "$USER")
CKUNI_BEFORE=$(bal_ckuni "$USER")
OUT=$(dfx canister call backend refineCkUNI "($E18 : nat, null)" --identity local-test-user)
[[ "$OUT" == *"ok"* ]] || fail "refineCkUNI: $OUT"
[[ "$OUT" == *"sgldtPaid = 250_000_000"* ]] || fail "refineCkUNI sgldtPaid should be 250_000_000 (1e18 * 250_000_000 / 1e18): $OUT"
[[ "$OUT" == *"rate = 250_000_000"* ]] || fail "refineCkUNI should settle at the canister rate: $OUT"
pass "refineCkUNI(1 ckUNI, null) settles: $OUT"

SGLDT_AFTER=$(bal_sgldt "$USER")
CKUNI_AFTER=$(bal_ckuni "$USER")
[[ $((SGLDT_AFTER - SGLDT_BEFORE)) -eq 250000000 ]] || fail "user sGLDT delta after refine: got $((SGLDT_AFTER - SGLDT_BEFORE)), want 250_000_000"
[[ $((CKUNI_BEFORE - CKUNI_AFTER)) -eq $((E18 + FEE)) ]] || fail "user ckUNI delta after refine: got $((CKUNI_BEFORE - CKUNI_AFTER)), want 1e18 + fee"
TREASURY_CKUNI=$(bal_ckuni "$BACKEND")
[[ "$TREASURY_CKUNI" -eq "$E18" ]] || fail "treasury ckUNI after refine: got $TREASURY_CKUNI, want 1e18"
pass "user received exactly 2.5 sGLDT (250_000_000 e8s) for 1 ckUNI; ckUNI landed in the treasury"

echo "── 4b. refineCkUNI with an IN-band rateHint settles at the CANISTER rate ─"
# The _settleRate fix: a hint inside ±2% is honoured as a quote but must NOT
# become the settlement price (that was the +4%/cycle round-trip drain).
HINT_IN=252000000   # +0.8%
OUT=$(dfx canister call backend refineCkUNI "($E18 : nat, opt ($HINT_IN : nat))" --identity local-test-user)
[[ "$OUT" == *"ok"* ]] || fail "refineCkUNI with in-band hint: $OUT"
[[ "$OUT" == *"rate = 250_000_000"* && "$OUT" == *"sgldtPaid = 250_000_000"* ]] \
  || fail "in-band hint must settle at the canister rate (250_000_000), not the hint ($HINT_IN): $OUT"
pass "in-band hint (+0.8%) accepted, settled at the canister's 250_000_000 — the hint never steers the price"

echo "── 3. refineCkUNI with NO allowance -> clean #err ──────"
dfx canister call mock_ckuni_ledger mint \
  "(record { owner = principal \"$USER2\"; subaccount = null }, 1_000_000_000_000_000_000)" >/dev/null
U2_BEFORE=$(bal_ckuni "$USER2")
OUT=$(dfx canister call backend refineCkUNI "($E18 : nat, null)" --identity local-test-user-2)
[[ "$OUT" == *"err"* && "$OUT" == *"Approval too small"* ]] || fail "expected a clean allowance #err (not a trap): $OUT"
U2_AFTER=$(bal_ckuni "$USER2")
[[ "$U2_BEFORE" -eq "$U2_AFTER" ]] || fail "no-allowance refine must not move funds: $U2_BEFORE -> $U2_AFTER"
pass "refineCkUNI refuses cleanly with no allowance (#err 'Approval too small', balance untouched)"

echo "── 4. refineCkUNI with an out-of-band rateHint (>2%) ───"
HINT_OUT=260000000  # +4%, outside the ±2% band of 250_000_000 (band = 5_000_000)
CKUNI_BEFORE=$(bal_ckuni "$USER")
OUT=$(dfx canister call backend refineCkUNI "($E18 : nat, opt ($HINT_OUT : nat))" --identity local-test-user)
[[ "$OUT" == *"err"* && "$OUT" == *"moved more than 2%"* ]] || fail "expected the ±2% _settleRate refusal: $OUT"
[[ "$OUT" == *"rate is now 250000000"* ]] || fail "refusal should quote the current canister rate: $OUT"
CKUNI_AFTER=$(bal_ckuni "$USER")
[[ "$CKUNI_BEFORE" -eq "$CKUNI_AFTER" ]] || fail "out-of-band hint must not move funds: $CKUNI_BEFORE -> $CKUNI_AFTER"
pass "out-of-band hint (+4%) refused: '$OUT' — nothing pulled"

echo "── 5. redeemSGLDT: sGLDT -> ckUNI (the round trip) ─────"
# The user holds 5.0 sGLDT from the two refines. icrc2_approve costs a
# ledger fee (charged to the approver), so approve amount + fee.
OUT=$(approve mock_sgldt_ledger local-test-user 100_010_000)
[[ "$OUT" == *"Ok"* ]] || fail "sGLDT approve: $OUT"
pass "user approves backend for 1.0001 sGLDT (amount + fee)"

CKUNI_BEFORE=$(bal_ckuni "$USER")
SGLDT_BEFORE=$(bal_sgldt "$USER")
OUT=$(dfx canister call backend redeemSGLDT "(100_000_000 : nat, null)" --identity local-test-user)
[[ "$OUT" == *"ok"* ]] || fail "redeemSGLDT: $OUT"
[[ "$OUT" == *"ckuniPaid = 400_000_000_000_000_000"* ]] || fail "redeemSGLDT ckuniPaid should be 4e17 (1e8 * 1e18 / 250_000_000): $OUT"
pass "redeemSGLDT(1.0 sGLDT, null) settles: $OUT"

CKUNI_AFTER=$(bal_ckuni "$USER")
SGLDT_AFTER=$(bal_sgldt "$USER")
[[ $((CKUNI_AFTER - CKUNI_BEFORE)) -eq 400000000000000000 ]] || fail "ckUNI delta after redeem: got $((CKUNI_AFTER - CKUNI_BEFORE)), want 4e17"
[[ $((SGLDT_BEFORE - SGLDT_AFTER)) -eq $((100000000 + FEE)) ]] || fail "sGLDT delta after redeem: got $((SGLDT_BEFORE - SGLDT_AFTER)), want 1e8 + fee"
pass "user received exactly 0.4 ckUNI (4e17) for 1.0 sGLDT at 2.5 sGLDT/UNI"

echo "── 5a. redeemSGLDT: out-of-band hint refused, nothing pulled ─"
OUT=$(approve mock_sgldt_ledger local-test-user 100_010_000)
[[ "$OUT" == *"Ok"* ]] || fail "sGLDT approve: $OUT"
SGLDT_BEFORE=$(bal_sgldt "$USER")
OUT=$(dfx canister call backend redeemSGLDT "(100_000_000 : nat, opt (240_000_000 : nat))" --identity local-test-user)
[[ "$OUT" == *"err"* && "$OUT" == *"moved more than 2%"* ]] || fail "expected the ±2% refusal on redeem (-4% hint): $OUT"
SGLDT_AFTER=$(bal_sgldt "$USER")
[[ "$SGLDT_BEFORE" -eq "$SGLDT_AFTER" ]] || fail "out-of-band redeem hint must not move funds"
pass "redeemSGLDT refuses a -4% hint (the cheap-exit half of the old drain) with nothing pulled"

echo "── 5b. redeemSGLDT: treasury shortfall caught by the pre-check ─"
# Treasury ckUNI is ~1.6 ckUNI; ask for 10 sGLDT (= 4 ckUNI). The pre-flight
# balance check must refuse BEFORE pulling any sGLDT.
SGLDT_BEFORE=$(bal_sgldt "$USER")
OUT=$(dfx canister call backend redeemSGLDT "(1_000_000_000 : nat, null)" --identity local-test-user)
[[ "$OUT" == *"err"* && "$OUT" == *"hold enough ckUNI"* ]] || fail "expected the treasury pre-check refusal: $OUT"
SGLDT_AFTER=$(bal_sgldt "$USER")
[[ "$SGLDT_BEFORE" -eq "$SGLDT_AFTER" ]] || fail "pre-check refusal must not pull sGLDT: $SGLDT_BEFORE -> $SGLDT_AFTER"
pass "oversized redeem refused by the pre-check with the user's sGLDT untouched (allowance still standing)"

echo "── 5c. redeemSGLDT: shortfall AFTER the pull -> auto-refund ─"
# redeemSGLDT's pre-check compares treasury ckUNI against the *payout* only,
# not payout + ledger fee. So trim the treasury (via adminTransferCkUNI, the
# only outbound path) to EXACTLY the payout for a 0.5 sGLDT redeem (2e17):
# the pre-check passes, the sGLDT is pulled, the ckUNI transfer then fails
# one fee short, and _refundSGLDT must return the sGLDT (minus one fee the
# treasury cannot cover) rather than stranding it.
R=50000000                          # 0.5 sGLDT e8s
PAYOUT=200000000000000000           # _ckuniForSGLDT(5e7, 2.5e8) = 2e17
TREASURY_CKUNI=$(bal_ckuni "$BACKEND")
TRIM=$((TREASURY_CKUNI - PAYOUT - FEE))
[[ "$TRIM" -gt 0 ]] || fail "treasury too small to construct the shortfall ($TREASURY_CKUNI)"
OUT=$(dfx canister call backend adminTransferCkUNI "(principal \"$USER2\", $TRIM : nat)" --identity default)
[[ "$OUT" == *"ok: Transfer successful"* ]] || fail "adminTransferCkUNI (trim): $OUT"
TREASURY_CKUNI=$(bal_ckuni "$BACKEND")
[[ "$TREASURY_CKUNI" -eq "$PAYOUT" ]] || fail "treasury ckUNI should be exactly $PAYOUT, got $TREASURY_CKUNI"
echo "  treasury ckUNI trimmed to exactly the payout: $TREASURY_CKUNI e18 (one fee short of transferable)"

OUT=$(approve mock_sgldt_ledger local-test-user $((R + FEE)))
[[ "$OUT" == *"Ok"* ]] || fail "sGLDT approve: $OUT"
SGLDT_BEFORE=$(bal_sgldt "$USER")
CKUNI_BEFORE=$(bal_ckuni "$USER")
OUT=$(dfx canister call backend redeemSGLDT "($R : nat, null)" --identity local-test-user)
echo "  result: $OUT"
[[ "$OUT" == *"err"* && "$OUT" == *"out of ckUNI"* ]] || fail "expected the post-pull ckUNI shortfall: $OUT"
[[ "$OUT" == *"has been refunded"* ]] || fail "expected the auto-refund message: $OUT"
SGLDT_AFTER=$(bal_sgldt "$USER")
CKUNI_AFTER=$(bal_ckuni "$USER")
# Pull debits R + fee; refund returns R - fee. Net user cost: 2 fees.
[[ $((SGLDT_BEFORE - SGLDT_AFTER)) -eq $((2 * FEE)) ]] || fail "refund arithmetic: user lost $((SGLDT_BEFORE - SGLDT_AFTER)) e8s, expected exactly 2 ledger fees ($((2 * FEE)))"
[[ "$CKUNI_BEFORE" -eq "$CKUNI_AFTER" ]] || fail "no ckUNI should have been paid on a failed redeem"
pass "post-pull shortfall auto-refunded: user is down exactly two ledger fees, principal returned, no ckUNI paid"

STRANDED=$(dfx canister call backend getStrandedRedeems --identity default)
[[ "$STRANDED" == *"vec {}"* ]] || fail "expected zero stranded redeems, got: $STRANDED"
pass "getStrandedRedeems is empty — the shortfall refunded cleanly, nothing stuck for admin resolution"

echo "── 7. getMyRefines / getMyRedeems ──────────────────────"
OUT=$(dfx canister call backend getMyRefines --identity local-test-user)
N_PAID=$(grep -o "variant { paid }" <<<"$OUT" | wc -l | tr -d ' ')
[[ "$N_PAID" -eq 2 ]] || fail "getMyRefines: expected 2 #paid refines, got $N_PAID: $OUT"
[[ "$OUT" == *"ckuniAmount = 1_000_000_000_000_000_000"* && "$OUT" == *"sgldtPaid = 250_000_000"* ]] || fail "getMyRefines record fields: $OUT"
[[ "$OUT" != *"stranded"* && "$OUT" != *"refunded"* ]] || fail "getMyRefines should contain only #paid records: $OUT"
pass "getMyRefines: exactly the caller's two #paid refines (1e18 ckUNI -> 250_000_000 e8s each)"

OUT=$(dfx canister call backend getMyRefines --identity local-test-user-2)
[[ "$OUT" == *"vec {}"* ]] || fail "user2 never refined successfully; getMyRefines should be empty: $OUT"
pass "getMyRefines is caller-scoped (user2 sees nothing)"

OUT=$(dfx canister call backend getMyRedeems --identity local-test-user)
N_PAID=$(grep -o "variant { paid }" <<<"$OUT" | wc -l | tr -d ' ')
N_REF=$(grep -o "variant { refunded }" <<<"$OUT" | wc -l | tr -d ' ')
[[ "$N_PAID" -eq 1 && "$N_REF" -eq 1 ]] || fail "getMyRedeems: expected 1 #paid + 1 #refunded, got paid=$N_PAID refunded=$N_REF: $OUT"
[[ "$OUT" == *"ckuniPaid = 400_000_000_000_000_000"* ]] || fail "getMyRedeems #paid record should carry ckuniPaid = 4e17: $OUT"
[[ "$OUT" == *"out of ckUNI"* ]] || fail "getMyRedeems #refunded record should carry the failure reason: $OUT"
[[ "$OUT" != *"stranded"* ]] || fail "getMyRedeems should hold no #stranded record: $OUT"
pass "getMyRedeems: one #paid (4e17 ckUNI) and one #refunded (reason recorded), statuses correct"

echo "── 6. adminTransferCkUNI / adminTransferSGLDT ──────────"
OUT=$(dfx canister call backend adminTransferCkUNI "(principal \"$USER2\", 1_000_000 : nat)" --identity local-test-user)
[[ "$OUT" == *"Unauthorized"* ]] || fail "non-admin should be refused adminTransferCkUNI: $OUT"
pass "adminTransferCkUNI refuses a non-admin caller: $OUT"

OUT=$(dfx canister call backend adminTransferSGLDT "(principal \"$USER2\", 1_000_000 : nat)" --identity local-test-user)
[[ "$OUT" == *"Unauthorized"* ]] || fail "non-admin should be refused adminTransferSGLDT: $OUT"
pass "adminTransferSGLDT refuses a non-admin caller: $OUT"

# Per-tx caps from main.mo: MAX_TRANSFER_AMOUNT_CKUNI = 50 ckUNI e18,
# MAX_TRANSFER_AMOUNT_SGLDT = 500,000 sGLDT e8. One unit over each.
OUT=$(dfx canister call backend adminTransferCkUNI "(principal \"$USER2\", 50_000_000_000_000_000_001 : nat)" --identity default)
[[ "$OUT" == *"exceeds the per-tx cap"* ]] || fail "adminTransferCkUNI over cap should be refused: $OUT"
pass "adminTransferCkUNI refuses 50 ckUNI + 1 wei (over MAX_TRANSFER_AMOUNT_CKUNI)"

OUT=$(dfx canister call backend adminTransferSGLDT "(principal \"$USER2\", 50_000_000_000_001 : nat)" --identity default)
[[ "$OUT" == *"exceeds the per-tx cap"* ]] || fail "adminTransferSGLDT over cap should be refused: $OUT"
pass "adminTransferSGLDT refuses 500,000 sGLDT + 1 e8 (over MAX_TRANSFER_AMOUNT_SGLDT)"

OUT=$(dfx canister call backend adminTransferCkUNI "(principal \"$USER2\", 0 : nat)" --identity default)
[[ "$OUT" == *"Invalid amount"* ]] || fail "adminTransferCkUNI(0) should be refused: $OUT"
pass "adminTransferCkUNI refuses a zero amount"

# Valid small transfers. The treasury holds exactly 2e17 ckUNI after 5c,
# which is enough for 1e16 + fee.
U2_CKUNI_BEFORE=$(bal_ckuni "$USER2")
OUT=$(dfx canister call backend adminTransferCkUNI "(principal \"$USER2\", 10_000_000_000_000_000 : nat)" --identity default)
[[ "$OUT" == *"ok: Transfer successful"* ]] || fail "adminTransferCkUNI (valid): $OUT"
U2_CKUNI_AFTER=$(bal_ckuni "$USER2")
[[ $((U2_CKUNI_AFTER - U2_CKUNI_BEFORE)) -eq 10000000000000000 ]] || fail "recipient ckUNI delta: got $((U2_CKUNI_AFTER - U2_CKUNI_BEFORE)), want 1e16"
pass "adminTransferCkUNI(0.01 ckUNI) succeeds and the recipient's ckUNI moves by exactly 1e16"

U2_SGLDT_BEFORE=$(bal_sgldt "$USER2")
OUT=$(dfx canister call backend adminTransferSGLDT "(principal \"$USER2\", 1_000_000 : nat)" --identity default)
[[ "$OUT" == *"ok: Transfer successful"* ]] || fail "adminTransferSGLDT (valid): $OUT"
U2_SGLDT_AFTER=$(bal_sgldt "$USER2")
[[ $((U2_SGLDT_AFTER - U2_SGLDT_BEFORE)) -eq 1000000 ]] || fail "recipient sGLDT delta: got $((U2_SGLDT_AFTER - U2_SGLDT_BEFORE)), want 1_000_000"
pass "adminTransferSGLDT(0.01 sGLDT) succeeds and the recipient's sGLDT moves by exactly 1_000_000"

# Insufficient treasury must come back as a Text error, not a trap.
OUT=$(dfx canister call backend adminTransferCkUNI "(principal \"$USER2\", 40_000_000_000_000_000_000 : nat)" --identity default)
[[ "$OUT" == *"Insufficient ckUNI in treasury"* ]] || fail "adminTransferCkUNI beyond treasury should report InsufficientFunds as text: $OUT"
pass "adminTransferCkUNI beyond the treasury balance reports 'Insufficient ckUNI in treasury' without trapping"

echo ""
echo "══════════════════════════════════════════════════════"
echo " ALL ckUNI REFINE / REDEEM / ADMIN-TRANSFER ASSERTIONS PASSED"
echo "══════════════════════════════════════════════════════"
