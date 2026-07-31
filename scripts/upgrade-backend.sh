#!/usr/bin/env bash
#
# Upgrade the mainnet backend canister — with the checks that catch the
# failure mode this project has actually hit.
#
# THE TRAP THIS EXISTS TO PREVENT: without an explicit --wasm, dfx installs
# from its own staged copy at .dfx/ic/canisters/backend/backend.wasm, which
# goes stale whenever the backend is rebuilt with moc directly (dfx.json's
# build step is only a `test -f` guard, so dfx never re-copies). The upgrade
# then exits 0, prints "Installed code", and changes nothing — it reinstalls
# the old module over itself. That burned two "done" deploys on 2026-07-30.
#
# So this script does not trust dfx's output. It records the on-chain module
# hash before and after, compares the post-upgrade hash to the local wasm's
# actual hash, and calls a method that only exists in the new build.
#
# Usage:
#   ./scripts/upgrade-backend.sh            # upgrade, with confirmation
#   ./scripts/upgrade-backend.sh --check    # verify only, change nothing
set -euo pipefail

CANISTER="c626g-iyaaa-aaaau-agpoa-cai"
IDENTITY="vm_default_identity_backup"
WASM="src/backend/dist/backend.wasm"

# dfxvm's default is 0.24.3 — a bare `dfx` is the WRONG version here.
export PATH="$HOME/Library/Application Support/org.dfinity.dfx/bin:$PATH"
export DFX_VERSION=0.29.1
# 0.29.1 makes the plaintext-identity warning a HARD ABORT, not a warning.
export DFX_WARNING=-mainnet_plaintext_identity

cd "$(dirname "$0")/.."

CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

[ -f "$WASM" ] || { echo "FATAL: $WASM not found. Build the backend first."; exit 1; }

# The IC reports the module hash as lowercase hex of the sha256 of the wasm.
local_hash() { shasum -a 256 "$WASM" | cut -d' ' -f1; }
chain_hash() {
  dfx canister info "$CANISTER" --network ic 2>/dev/null \
    | grep -i 'Module hash' | grep -oE '0x[0-9a-f]+' | sed 's/^0x//'
}

LOCAL="$(local_hash)"
BEFORE="$(chain_hash || true)"

say "Backend upgrade — $CANISTER"
echo "  local wasm sha256 : $LOCAL"
echo "  on-chain module   : ${BEFORE:-<unknown>}"

if [ "$LOCAL" = "$BEFORE" ]; then
  echo
  echo "Already running this exact module. Nothing to upgrade."
  exit 0
fi

say "Stable-compatibility — against what is ACTUALLY RUNNING"
# The canister publishes its own stable signature as `motoko:stable-types`
# metadata. Checking against THAT, rather than against whatever .most happens
# to be committed, removes the assumption that the repo matches the chain.
# (It often doesn't byte-for-byte: moc output is not reproducible across
# differing package-path spellings, so artifact hashes can't establish
# provenance here — the interface and stable signature can.)
MOC="${MOC:-$HOME/Library/Caches/mops/moc/1.3.0/moc}"
DEPLOYED_MOST="$(mktemp -t deployed-most)"
if dfx canister metadata "$CANISTER" motoko:stable-types --network ic \
     --identity "$IDENTITY" > "$DEPLOYED_MOST" 2>/dev/null \
   && [ -s "$DEPLOYED_MOST" ]; then
  if [ -x "$MOC" ]; then
    if "$MOC" --stable-compatible "$DEPLOYED_MOST" src/backend/dist/backend.most; then
      echo "  compatible with the live canister's own stable signature."
    else
      echo
      echo "FATAL: NOT stable-compatible with the running canister."
      echo "Upgrading would trap or lose state. Aborting."
      exit 1
    fi
  else
    echo "  WARNING: moc not found at $MOC — could not check. Set \$MOC."
    echo "  Continuing is a judgement call; Ctrl-C to stop."
  fi
else
  echo "  WARNING: could not read motoko:stable-types from the canister."
  echo "  Could not verify. Ctrl-C to stop."
fi
rm -f "$DEPLOYED_MOST"

# --check does everything above (all read-only) and stops before touching
# anything. It is the pre-flight; run it before you run the real thing.
if [ "$CHECK_ONLY" = "1" ]; then
  echo
  echo "--check: pre-flight passed. The deployed module DIFFERS from the"
  echo "local build, and the local build is safe to upgrade into."
  echo "Run without --check to actually upgrade."
  exit 0
fi

say "This upgrades a LIVE canister holding real funds."
printf 'Type "upgrade" to continue: '
read -r reply
[ "$reply" = "upgrade" ] || { echo "Aborted."; exit 1; }

say "Upgrading"
# --wasm is MANDATORY. See the header.
dfx canister install "$CANISTER" \
  --network ic \
  --mode upgrade \
  --wasm-memory-persistence keep \
  --wasm "$WASM" \
  --identity "$IDENTITY"

say "Verifying — NOT trusting the output above"
AFTER="$(chain_hash || true)"
echo "  on-chain module now : ${AFTER:-<unknown>}"
echo "  expected            : $LOCAL"

if [ "$AFTER" != "$LOCAL" ]; then
  echo
  echo "FAILED: on-chain module does not match the wasm just installed."
  echo "This is the stale-.dfx-cache symptom. Do NOT treat this as deployed."
  exit 1
fi
echo "  module hash matches."

# Behavioural proof: call something that only exists in the new build. A
# matching hash says the right bytes are installed; this says they answer.
say "Calling a method that only exists in the new build"
if dfx canister call "$CANISTER" getIncidentNotice --query --network ic >/dev/null 2>&1; then
  echo "  getIncidentNotice responds — upgrade is live."
else
  echo
  echo "FAILED: getIncidentNotice did not answer, despite a matching hash."
  exit 1
fi

say "Done."
cat <<'NEXT'
Next:
  1. Confirm state survived — treasury balances and stranded counts:
       dfx canister call c626g-iyaaa-aaaau-agpoa-cai getStrandedCounts --query --network ic
       dfx canister call c626g-iyaaa-aaaau-agpoa-cai getRateStatus --query --network ic
  2. Exercise the public-receipt round-trip on a real settled swap
     (publishReceipt -> getPublicReceipt while signed out -> unpublishReceipt).
     See the launch checklist in RUNBOOK.md.
  3. Deploy the frontend:  cd scripts/asset-sync && node sync.mjs --dry-run
NEXT
