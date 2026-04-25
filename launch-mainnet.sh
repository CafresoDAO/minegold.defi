#!/usr/bin/env bash
# ============================================================================
# minegold.defi — MAINNET LAUNCH SCRIPT
# ============================================================================
# Deploys the pre-built backend.wasm + frontend/dist to the Internet Computer.
#
# READ THIS FIRST:
#   - main.mo hardcodes TREASURY_PRINCIPAL = 72fnc-ziaaa-aaaai-axk4q-cai.
#     That value MUST equal Principal.fromActor(Self) on mainnet, otherwise
#     every treasury ICRC-1 call will target the wrong account.
#   - You have two options:
#       1) UPGRADE the existing canister at 72fnc-ziaaa-aaaai-axk4q-cai
#          (requires you to be a controller of that canister).
#          Use: ./launch-mainnet.sh --upgrade
#       2) Deploy a FRESH backend with a new canister ID and edit
#          TREASURY_PRINCIPAL + ADMIN_PRINCIPAL in src/backend/main.mo first,
#          then --rebuild. Use: ./launch-mainnet.sh --fresh
#
# Prerequisites:
#   - dfx installed and logged in with an identity that has cycles.
#   - A cycles wallet (`dfx identity get-wallet --network ic`) OR mainnet
#     cycles in your identity (dfx 0.16+).
#   - At least ~4 TC (trillion cycles) for a fresh deploy (~1 TC per canister).
#
# Usage:
#   ./launch-mainnet.sh --upgrade          # upgrade existing canisters
#   ./launch-mainnet.sh --fresh            # create NEW backend + frontend ids
#   ./launch-mainnet.sh --fresh --rebuild  # + rebuild from source first
# ============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MODE=""
REBUILD=0
for arg in "$@"; do
  case "$arg" in
    --upgrade) MODE="upgrade" ;;
    --fresh)   MODE="fresh"   ;;
    --rebuild) REBUILD=1      ;;
    -h|--help) sed -n '2,28p' "$0"; exit 0 ;;
    *) echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

b() { printf '\033[1m%s\033[0m\n' "$*"; }
g() { printf '\033[32m%s\033[0m\n' "$*"; }
y() { printf '\033[33m%s\033[0m\n' "$*"; }
r() { printf '\033[31m%s\033[0m\n' "$*" >&2; }
step() { echo; b "▸ $*"; }

if [[ -z "$MODE" ]]; then
  r "Must specify --upgrade or --fresh. See --help."
  exit 1
fi

# ---- prereqs ----------------------------------------------------------------
step "Checking prerequisites"
for t in dfx node pnpm; do
  command -v "$t" >/dev/null 2>&1 || { r "Missing: $t"; exit 1; }
done
IDENTITY="$(dfx identity whoami)"
PRINCIPAL="$(dfx identity get-principal)"
echo "  identity:  ${IDENTITY}"
echo "  principal: ${PRINCIPAL}"

# ---- cycles check -----------------------------------------------------------
step "Checking mainnet connectivity & cycles"
if ! dfx ping ic >/dev/null 2>&1; then
  r "Cannot reach the Internet Computer. Check your network."
  exit 1
fi
# non-fatal: print wallet balance if one exists
if dfx identity get-wallet --network ic >/dev/null 2>&1; then
  WALLET="$(dfx identity get-wallet --network ic)"
  BALANCE="$(dfx wallet --network ic balance 2>/dev/null || echo 'unknown')"
  echo "  wallet:    ${WALLET}"
  echo "  balance:   ${BALANCE}"
else
  y "  ⚠ No cycles wallet linked. dfx will try to charge the identity directly."
  y "     Get cycles: https://internetcomputer.org/docs/current/developer-docs/getting-started/cycles/cycles-faucet"
fi

# ---- optional rebuild -------------------------------------------------------
if (( REBUILD )); then
  step "Rebuilding backend + frontend from source"
  command -v mops >/dev/null || { r "mops required for --rebuild. Install: npm i -g ic-mops"; exit 1; }
  (cd src/backend  && mops install && mops build)
  (cd src/frontend && pnpm install --prefer-offline && pnpm build)
fi

# ---- verify artifacts -------------------------------------------------------
step "Verifying build artifacts"
[[ -f src/backend/dist/backend.wasm ]] || { r "Missing backend.wasm — pass --rebuild"; exit 1; }
[[ -f src/frontend/dist/index.html  ]] || { r "Missing frontend/dist — pass --rebuild"; exit 1; }
g "  ✓ artifacts present"

# ---- treasury sanity check --------------------------------------------------
step "Hardcoded-principal sanity check in src/backend/main.mo"
HARDCODED_ADMIN="$(awk '/ADMIN_PRINCIPAL[[:space:]]*:/,/Principal\.fromText/' src/backend/main.mo | grep -oE 'fromText\("[^"]+"\)' | head -1 | sed 's/.*"\(.*\)".*/\1/' || true)"
HARDCODED_TREASURY="$(awk '/TREASURY_PRINCIPAL[[:space:]]*:/,/Principal\.fromText/' src/backend/main.mo | grep -oE 'fromText\("[^"]+"\)' | head -1 | sed 's/.*"\(.*\)".*/\1/' || true)"
echo "  ADMIN_PRINCIPAL    = ${HARDCODED_ADMIN:-<not found>}"
echo "  TREASURY_PRINCIPAL = ${HARDCODED_TREASURY:-<not found>}"
echo "  YOUR dfx principal = ${PRINCIPAL}"
if [[ "$MODE" == "fresh" ]]; then
  y "  --fresh mode: make sure you edited main.mo so TREASURY_PRINCIPAL"
  y "  matches the NEW canister id once dfx assigns it, otherwise every"
  y "  ICRC-1 treasury call will target the wrong account. See LAUNCH.md."
  read -r -p "  Continue? [y/N] " ok
  [[ "$ok" =~ ^[Yy]$ ]] || exit 1
fi

# ---- deploy -----------------------------------------------------------------
DEPLOY_FLAGS=(--network ic)
if [[ "$MODE" == "upgrade" ]]; then
  DEPLOY_FLAGS+=(--mode upgrade)
fi

step "Deploying backend to mainnet"
dfx deploy backend "${DEPLOY_FLAGS[@]}"
BACKEND_ID="$(dfx canister id backend --network ic)"
echo "  backend canister id: ${BACKEND_ID}"

step "Injecting canister IDs into frontend env.json"
cat > src/frontend/dist/env.json <<JSON
{
  "backend_host": "https://icp-api.io",
  "backend_canister_id": "${BACKEND_ID}",
  "project_id": "minegold-defi-ic",
  "ii_derivation_origin": "undefined"
}
JSON
g "  ✓ env.json updated"

step "Deploying frontend to mainnet"
dfx deploy frontend "${DEPLOY_FLAGS[@]}"
FRONTEND_ID="$(dfx canister id frontend --network ic)"

# ---- done -------------------------------------------------------------------
echo
b "════════════════════════════════════════════════════════════════════════"
g "  minegold.defi is LIVE on the Internet Computer"
b "════════════════════════════════════════════════════════════════════════"
echo
echo "  Frontend:  https://${FRONTEND_ID}.icp0.io"
echo "  Backend:   ${BACKEND_ID}   (https://${BACKEND_ID}.icp0.io)"
echo "  Candid:    https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=${BACKEND_ID}"
echo
y "  Post-launch checklist (see LAUNCH.md for details):"
echo "    1. Call  dfx canister call --network ic backend selfInitializeMinterAddress"
echo "    2. Fund the treasury with sGLDT — send to principal ${BACKEND_ID}"
echo "       on the sGLDT ledger (i2s4q-syaaa-aaaan-qz4sq-cai)."
echo "    3. Fund the canister with cycles:"
echo "         dfx cycles top-up --network ic ${BACKEND_ID} 2_000_000_000_000"
echo
