#!/usr/bin/env bash
# ============================================================================
# minegold.defi — LOCAL LAUNCH SCRIPT
# ============================================================================
# One-command local deploy using the canonical DFINITY SDK (dfx).
# Skips Motoko compilation by deploying the pre-built backend.wasm.
#
# Usage:
#   ./launch.sh                 # full local deploy
#   ./launch.sh --clean         # stop replica, wipe state, redeploy
#   ./launch.sh --reinstall     # force reinstall of canisters (lose state)
#   ./launch.sh --rebuild       # rebuild frontend & backend from source first
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---- flags ------------------------------------------------------------------
CLEAN=0
REINSTALL=0
REBUILD=0
for arg in "$@"; do
  case "$arg" in
    --clean)     CLEAN=1 ;;
    --reinstall) REINSTALL=1 ;;
    --rebuild)   REBUILD=1 ;;
    -h|--help)
      sed -n '2,14p' "$0"; exit 0 ;;
    *)
      echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

# ---- pretty output ----------------------------------------------------------
b() { printf '\033[1m%s\033[0m\n' "$*"; }
g() { printf '\033[32m%s\033[0m\n' "$*"; }
y() { printf '\033[33m%s\033[0m\n' "$*"; }
r() { printf '\033[31m%s\033[0m\n' "$*" >&2; }
step() { echo; b "▸ $*"; }

# ---- prereqs ----------------------------------------------------------------
step "Checking prerequisites"
missing=()
command -v dfx  >/dev/null 2>&1 || missing+=("dfx")
command -v node >/dev/null 2>&1 || missing+=("node")
command -v pnpm >/dev/null 2>&1 || missing+=("pnpm")
if (( ${#missing[@]} )); then
  r "Missing: ${missing[*]}"
  r "See LAUNCH.md for install instructions."
  exit 1
fi
echo "  dfx  $(dfx --version 2>/dev/null | awk '{print $2}')"
echo "  node $(node --version)"
echo "  pnpm $(pnpm --version)"

# ---- optional rebuild from source ------------------------------------------
if (( REBUILD )); then
  step "Rebuilding backend from source (requires moc + mops)"
  if ! command -v mops >/dev/null 2>&1; then
    r "mops not found. Install with: npm i -g ic-mops"
    exit 1
  fi
  (cd src/backend && mops install && mops build)

  step "Rebuilding frontend"
  (cd src/frontend && pnpm install --prefer-offline && pnpm build)
fi

# ---- verify prebuilt artifacts ---------------------------------------------
step "Verifying build artifacts"
[[ -f src/backend/dist/backend.wasm ]] || { r "Missing src/backend/dist/backend.wasm — run: ./launch.sh --rebuild"; exit 1; }
[[ -f src/backend/dist/backend.did  ]] || { r "Missing src/backend/dist/backend.did";  exit 1; }
[[ -f src/frontend/dist/index.html  ]] || { r "Missing src/frontend/dist/index.html — run: ./launch.sh --rebuild"; exit 1; }
g "  ✓ backend.wasm ($(wc -c < src/backend/dist/backend.wasm | awk '{printf "%.1f KiB",$1/1024}'))"
g "  ✓ frontend/dist"

# ---- replica ---------------------------------------------------------------
if (( CLEAN )); then
  step "Stopping any existing replica + wiping state"
  dfx stop || true
  rm -rf .dfx
fi

step "Starting local replica"
if dfx ping local >/dev/null 2>&1; then
  echo "  replica already running"
else
  dfx start --clean --background --host 127.0.0.1:4943
  # give the replica a moment to accept connections
  for i in {1..30}; do
    dfx ping local >/dev/null 2>&1 && break
    sleep 1
  done
fi

# ---- deploy ----------------------------------------------------------------
DEPLOY_FLAGS=()
(( REINSTALL )) && DEPLOY_FLAGS+=(--mode reinstall -y)

step "Deploying Internet Identity (local)"
dfx deploy "${DEPLOY_FLAGS[@]}" internet_identity

step "Deploying backend"
dfx deploy "${DEPLOY_FLAGS[@]}" backend

step "Regenerating frontend env.json with deployed canister IDs"
BACKEND_ID="$(dfx canister id backend)"
II_ID="$(dfx canister id internet_identity)"
REPLICA_HOST="http://127.0.0.1:4943"

cat > src/frontend/dist/env.json <<JSON
{
  "backend_host": "${REPLICA_HOST}",
  "backend_canister_id": "${BACKEND_ID}",
  "project_id": "minegold-defi-local",
  "ii_derivation_origin": "undefined"
}
JSON
g "  ✓ src/frontend/dist/env.json  → backend_canister_id=${BACKEND_ID}"

step "Deploying frontend (asset canister)"
dfx deploy "${DEPLOY_FLAGS[@]}" frontend

FRONTEND_ID="$(dfx canister id frontend)"

# ---- bootstrap: make the deployer the admin --------------------------------
step "Bootstrapping admin role for current identity"
MY_PRINCIPAL="$(dfx identity get-principal)"
set +e
dfx canister call backend assignCallerUserRole "(principal \"${MY_PRINCIPAL}\", variant { admin })" >/dev/null 2>&1
RC=$?
set -e
if (( RC == 0 )); then
  g "  ✓ ${MY_PRINCIPAL} now has admin role on the backend canister"
else
  y "  ⚠ assignCallerUserRole failed — main.mo hardcodes a specific ADMIN_PRINCIPAL."
  y "     Local admin features won't be reachable unless you edit"
  y "     src/backend/main.mo → ADMIN_PRINCIPAL and rebuild (--rebuild)."
  y "     Your identity principal is: ${MY_PRINCIPAL}"
fi

# ---- done ------------------------------------------------------------------
echo
b "════════════════════════════════════════════════════════════════════════"
g "  minegold.defi is LIVE on your local replica"
b "════════════════════════════════════════════════════════════════════════"
echo
echo "  Frontend:            http://${FRONTEND_ID}.localhost:4943"
echo "  Backend canister:    ${BACKEND_ID}"
echo "  Internet Identity:   http://${II_ID}.localhost:4943"
echo "  Candid UI:           http://127.0.0.1:4943/?canisterId=$(dfx canister id __Candid_UI 2>/dev/null || echo '<install dfx 0.15+>')&id=${BACKEND_ID}"
echo
echo "  Your principal:      ${MY_PRINCIPAL}"
echo
echo "  Stop the replica:    dfx stop"
echo "  Tail backend logs:   dfx canister logs backend"
echo
