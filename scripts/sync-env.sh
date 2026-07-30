#!/usr/bin/env bash
# Regenerate src/frontend/dist/env.json with the canister IDs from
# the active dfx network. Call this after any manual `dfx deploy`.
#
# Usage:
#   ./scripts/sync-env.sh            # local
#   ./scripts/sync-env.sh --ic       # mainnet
set -euo pipefail

cd "$(dirname "$0")/.."

NETWORK="local"
HOST="http://127.0.0.1:4943"
PROJECT="minegold-defi-local"

if [[ "${1:-}" == "--ic" ]]; then
  NETWORK="ic"
  HOST="https://icp-api.io"
  PROJECT="minegold-defi-ic"
fi

BACKEND_ID="$(dfx canister id backend --network "$NETWORK")"

# NOTE: ii_derivation_origin here is DOCUMENTATION ONLY. The authoritative
# value is hard-coded in src/frontend/src/auth.tsx (II_DERIVATION_ORIGIN) so
# that a bad env.json deploy can never change principal derivation. This
# script used to write the literal string "undefined" here — that drift is
# why the field must never be load-bearing.
DERIVATION_ORIGIN="https://cqyto-tiaaa-aaaau-agppa-cai.icp0.io"

cat > src/frontend/dist/env.json <<JSON
{
  "backend_host": "${HOST}",
  "backend_canister_id": "${BACKEND_ID}",
  "project_id": "${PROJECT}",
  "ii_derivation_origin": "${DERIVATION_ORIGIN}"
}
JSON

echo "wrote src/frontend/dist/env.json for network=${NETWORK}  backend=${BACKEND_ID}"
