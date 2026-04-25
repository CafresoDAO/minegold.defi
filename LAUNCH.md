# minegold.defi — Launch Guide

This document walks you through taking `minegold.defi` from a cold checkout to a live dApp on the **Internet Computer Protocol (ICP)**, both on a local replica and on mainnet.

The project was originally exported from [Caffeine](https://caffeine.ai/). It ships with pre-built artifacts (`src/backend/dist/backend.wasm` and `src/frontend/dist/`), which means you can deploy **without** the Caffeine-forked Motoko compiler — the canonical DFINITY `dfx` SDK is enough. That is what the scripts in this repo use.

---

## What you are launching

`minegold.defi` is a cross-chain DeFi refinery:

1. A user connects an Ethereum wallet (e.g. Brave) and sends **UNI** (Uniswap ERC-20) to a fixed deposit address on Ethereum.
2. The ICP **ERC-20 minter canister** (`nbsys-saaaa-aaaar-qaaga-cai`) mints **ckUNI** (chain-key UNI) on the Internet Computer, credited to the project's treasury.
3. The backend releases **sGLDT** (synthetic gold-backed tokens) to the user via an ICRC-1 transfer at the current UNI → sGLDT exchange rate.
4. Admins can mint, dissolve, and audit via a built-in admin panel. Users see their full transaction history, live CoinGecko price feeds, and wallet balances.

Two canisters compose the dApp:

| Canister  | Type   | Source                      |
| --------- | ------ | --------------------------- |
| `backend` | Motoko | `src/backend/main.mo`       |
| `frontend`| Assets | `src/frontend/dist/`        |

Plus Internet Identity (`rdmx6-jaaaa-aaaaa-aaadq-cai` on mainnet, deployed locally by the launch script).

---

## Prerequisites

Install these on your development machine:

| Tool    | Version  | Install                                                                                              |
| ------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `dfx`   | ≥ 0.24.0 | `sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"`                                     |
| Node.js | ≥ 20     | https://nodejs.org                                                                                    |
| `pnpm`  | ≥ 9      | `corepack enable && corepack prepare pnpm@latest --activate` or `npm i -g pnpm`                      |
| `mops`  | ≥ 1.11   | `npm i -g ic-mops` — only needed if you want to **rebuild** the Motoko backend                       |

You will know everything is ready when:

```
dfx --version     # dfx 0.24.x
node --version    # v20 or newer
pnpm --version    # 9 or newer
```

---

## Option A — Local deploy (recommended first step)

```bash
cd minegold.defi
chmod +x launch.sh launch-mainnet.sh scripts/sync-env.sh   # first time only
./launch.sh
```

What `launch.sh` does:

1. Verifies prereqs and the pre-built artifacts.
2. Starts a clean local replica on `127.0.0.1:4943`.
3. Deploys Internet Identity, the backend canister, and the frontend asset canister.
4. Injects the freshly-assigned canister IDs into `src/frontend/dist/env.json`.
5. Attempts to assign your dfx identity the `admin` role on the backend.
6. Prints the URLs of the running dApp.

Useful flags:

```bash
./launch.sh --clean       # stop dfx, wipe .dfx/, redeploy from scratch
./launch.sh --reinstall   # reinstall canisters (clears their state)
./launch.sh --rebuild     # rebuild backend (mops build) + frontend (pnpm build) first
```

### Expected output

At the end you'll see something like:

```
  Frontend:            http://<frontend-id>.localhost:4943
  Backend canister:    <backend-id>
  Internet Identity:   http://<ii-id>.localhost:4943
```

Open the frontend URL in a browser — you should see the minegold.defi home page, be able to click "Connect with Internet Identity", and land on a working wallet / exchange / history UI.

### Known caveats on local

- The hooks in `src/frontend/src/hooks/useQueries.ts` query the **mainnet** ICRC-1 ledgers (sGLDT at `i2s4q-syaaa-aaaan-qz4sq-cai`, ckUNI at `ilzky-ayaaa-aaaar-qahha-cai`) over `https://icp-api.io`. You will see **real** treasury balances even on local. This is by design — the dApp reads mainnet ledgers as a source of truth.
- Etherscan and CoinGecko calls are HTTP outcalls initiated by the backend. They require an internet-connected replica (they work with `dfx start`).
- The admin principal is hardcoded in `main.mo` (line 34). On local deploys, your dfx identity is *not* that principal, so the `ADMIN_PRINCIPAL` comparison fails. `launch.sh` calls `assignCallerUserRole` to try to grant your principal the `admin` role via the in-canister ACL, which will work for role-gated methods — but the stricter `isAdmin(caller)` checks (which compare against the hardcoded constant) will still refuse you. To unlock admin features locally, edit `src/backend/main.mo`:
  ```
  let ADMIN_PRINCIPAL : Principal = Principal.fromText("<your-dfx-principal>");
  ```
  then `./launch.sh --rebuild`.

### Stopping

```bash
dfx stop
```

---

## Option B — Deploy to ICP mainnet

You have two paths. Pick one before running the mainnet script.

### Path 1: Upgrade the existing Caffeine-hosted canister (fastest)

If you were a Caffeine customer and the canister `72fnc-ziaaa-aaaai-axk4q-cai` already exists with you as a controller:

```bash
# one-time: make your dfx identity a controller of that canister (from Caffeine panel)
dfx identity whoami
dfx identity get-principal                 # add this principal as a controller in Caffeine

# import the existing canister id into dfx
dfx canister --network ic id backend       # should print 72fnc-ziaaa-aaaai-axk4q-cai
# if it doesn't, tell dfx about it:
echo '{"backend":{"ic":"72fnc-ziaaa-aaaai-axk4q-cai"}}' > canister_ids.json

./launch-mainnet.sh --upgrade
```

This preserves the treasury invariant (because `Principal.fromActor(Self)` still equals the hardcoded `TREASURY_PRINCIPAL`).

### Path 2: Deploy a fresh canister (independent of Caffeine)

If you want to run your own sovereign deployment, you must **edit `src/backend/main.mo` before the first deploy** so the hardcoded principals match the identities you control.

1. Pick your future backend canister id.
   ```bash
   dfx canister --network ic create backend
   NEW_BACKEND_ID=$(dfx canister --network ic id backend)
   echo "$NEW_BACKEND_ID"
   ```
2. Edit `src/backend/main.mo`:
   - Line 34 — `ADMIN_PRINCIPAL` → **your own** dfx identity principal (`dfx identity get-principal`).
   - Line 46 — `TREASURY_PRINCIPAL` → `$NEW_BACKEND_ID`.
3. Rebuild and deploy:
   ```bash
   ./launch-mainnet.sh --fresh --rebuild
   ```

⚠️ If you deploy fresh **without** editing these principals, every treasury ICRC-1 call will target the Caffeine-owned canister, which means your users' deposits will be credited to someone else's account. Don't skip step 2.

### Prerequisites for mainnet

- A dfx identity with access to cycles:
  ```bash
  dfx identity new minegold-prod        # or use an existing one
  dfx identity use minegold-prod
  dfx identity get-principal
  ```
- Cycles: roughly **4 TC (trillion cycles)** for a first-time deploy.
  - Easiest: convert ICP to cycles via a cycles-ledger or Plug, then top up with `dfx cycles top-up`.
  - Or use the [cycles faucet](https://internetcomputer.org/docs/current/developer-docs/getting-started/cycles/cycles-faucet) (one-time, ~10 TC).

### Running the mainnet script

```bash
./launch-mainnet.sh --upgrade          # Path 1
./launch-mainnet.sh --fresh --rebuild  # Path 2
```

The script:

1. Verifies dfx, node, pnpm are available and that you are online.
2. Prints your identity, principal, and wallet/cycle balance.
3. (With `--rebuild`) runs `mops build` and `pnpm build`.
4. Checks the treasury invariant in `main.mo` and prompts before proceeding on `--fresh`.
5. Deploys the backend and updates `env.json` with the live canister id.
6. Deploys the asset canister with `dist/`.
7. Prints the public URLs.

### Post-launch checklist

After `./launch-mainnet.sh` finishes:

1. **Initialize the ERC-20 minter deposit address** (one-time per backend canister):
   ```bash
   dfx canister call --network ic backend selfInitializeMinterAddress
   ```
2. **Fund the treasury with sGLDT** so user deposits have something to pay out:
   - On the sGLDT ledger (`i2s4q-syaaa-aaaan-qz4sq-cai`), transfer your desired liquidity to the backend canister's principal.
   - From another tool (e.g. NNS dApp, Plug):
     ```
     recipient: <backend canister id>
     ledger:    i2s4q-syaaa-aaaan-qz4sq-cai
     ```
3. **Warm the treasury cache**:
   ```bash
   dfx canister call --network ic backend refreshTreasuryBalances
   dfx canister call --network ic backend getTreasuryWalletInfo
   ```
4. **Top up cycles** periodically so the backend canister keeps running:
   ```bash
   dfx cycles top-up --network ic <backend-id> 2_000_000_000_000
   dfx cycles top-up --network ic <frontend-id> 1_000_000_000_000
   ```
5. **Smoke-test**:
   - Visit `https://<frontend-id>.icp0.io`.
   - Log in with Internet Identity.
   - Go to the Exchange page. Paste a small test UNI deposit (Sepolia-originated test funds if you want risk-free).
   - Watch the admin panel for `#pending` → `#confirmed` → `#paid`.

---

## Common operations

Once deployed, these `dfx canister call` invocations cover day-to-day ops. Replace `--network ic` with nothing (or `--network local`) for local.

| Goal                                      | Call                                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| Am I the admin?                           | `dfx canister call --network ic backend isAdminCaller`                                        |
| Treasury balances (cached)                | `dfx canister call --network ic backend getTreasuryWalletInfo`                                |
| Refresh treasury balances from ledgers    | `dfx canister call --network ic backend refreshTreasuryBalances`                              |
| See pending UNI deposits                  | `dfx canister call --network ic backend getAllUNIDeposits`                                    |
| Mint ckUNI for a confirmed ETH tx (admin) | `dfx canister call --network ic backend adminMintCkUNI '("0x…", 1_000_000_000_000_000_000)'`  |
| Retry a stuck payout                      | `dfx canister call --network ic backend retryUNIDepositPayout '(42)'`                         |
| Diagnose a deposit                        | `dfx canister call --network ic backend diagnosePayoutAbility '(42)'`                         |
| Payout readiness                          | `dfx canister call --network ic backend getPayoutReadiness`                                   |
| Upgrade backend code                      | `dfx deploy backend --network ic --mode upgrade`                                              |

---

## Troubleshooting

**`dfx: command not found`** — rerun the installer or add `$HOME/.local/share/dfx/bin` to your PATH.

**`Pre-built backend artifacts missing`** on `dfx deploy` — `./launch.sh --rebuild` (needs mops), or copy `src/backend/dist/backend.wasm` back from a clean clone.

**Frontend loads but shows "CANISTER_ID_BACKEND is not set"** — `./scripts/sync-env.sh` (local) or `./scripts/sync-env.sh --ic` and refresh.

**`Unauthorized: admin only`** on every admin call — the hardcoded `ADMIN_PRINCIPAL` in `main.mo` doesn't match your dfx identity. Edit it and redeploy (or upgrade with `--mode upgrade`).

**Treasury balance is always 0 after a transfer** — call `refreshTreasuryBalances`, then `getTreasuryWalletInfo`. If still 0, double-check that the sGLDT you sent went to the backend canister's principal (which IS the treasury) and not some other address.

**"Proxy response (403)" when installing tools** — your network blocks npm/GitHub. Install from a permissive network, or vendor the artifacts offline.

**Etherscan polling always returns "pending"** — HTTP outcalls can fail when the replica can't reach Etherscan. Verify with `verifyEthTransaction` manually after a minute, or use `retryUNIDepositPayout` once the transaction is known-good.

**Cycles running low** — the canister logs will warn. Set up a cron job:
```bash
# .github/workflows/topup.yml or a local cron
dfx cycles top-up --network ic <backend-id>  1_000_000_000_000
```

---

## File map

```
minegold.defi/
├── dfx.json                ← NEW: canonical DFINITY SDK config (uses pre-built wasm + dist)
├── launch.sh               ← NEW: one-command local deploy
├── launch-mainnet.sh       ← NEW: mainnet deploy (--upgrade or --fresh)
├── scripts/
│   └── sync-env.sh         ← NEW: regenerate dist/env.json after a manual dfx deploy
├── LAUNCH.md               ← NEW: this file
│
├── deploy.sh               ← Caffeine's icp-cli-based deploy (kept for reference)
├── Dockerfile              ← Caffeine's reproducible build image
├── icp.yaml                ← Caffeine icp-cli manifest
├── caffeine.toml           ← Caffeine project manifest
├── mops.toml               ← Motoko package spec
│
├── src/
│   ├── backend/
│   │   ├── main.mo         ← 2268 LOC Motoko — all dApp logic
│   │   ├── dist/
│   │   │   ├── backend.wasm ← pre-built, deployed by dfx
│   │   │   └── backend.did
│   │   └── system-idl/
│   └── frontend/
│       ├── src/            ← React 19 + Vite + Tailwind + shadcn
│       └── dist/           ← pre-built SPA
```

The Caffeine files (`deploy.sh`, `icp.yaml`, `Dockerfile`, `caffeine.toml`) are left in place so you retain the option of pushing back to Caffeine's hosted platform in the future. They are **not** used by `launch.sh` / `launch-mainnet.sh`.
