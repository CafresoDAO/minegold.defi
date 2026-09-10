# minegold.defi — the on-chain gold refinery

Turn your tokens into gold, on-chain. Bridge UNI or BAT from Ethereum through
DFINITY's chain-key minter — your keys, your account, at every step — and
refine it into **sGLDT**, a 1:1 wrapper of Gold DAO's physically backed GLDT.

A **Banking.Brave** protocol on the Internet Computer.

- **Live app:** https://cqyto-tiaaa-aaaau-agppa-cai.icp0.io (soon: banking.cafreso.com → banking.brave)
- **Proof & transparency:** https://cqyto-tiaaa-aaaau-agppa-cai.icp0.io/proof

## What actually backs the gold

The chain is short and every link is checkable:

1. **sGLDT** is a 1:1 wrapper of **GLDT**, minted/unwrapped at
   [sVault](https://svault.io). The sGLDT ledger's own on-chain name is
   literally `"sGLDT - GLDT Wrapper"`. Wrapping exists for fees: an sGLDT
   transfer costs 0.00001 vs GLDT's 0.10 — 10,000× cheaper, which is what
   makes small refines economical.
2. **GLDT** is [Gold DAO](https://gldt.org)'s token: each GLDT is backed by
   0.01 g of physical gold — LBMA-sourced, held in audited Swiss vaults,
   redeemable for metal through Gold DAO.
3. So: **your browser rewards / your tokens → sGLDT → GLDT → vaulted
   physical gold.** Unwrap at sVault any time; redeem GLDT for metal via
   Gold DAO. New to GLDT? Start at **https://gldt.org**.

## How a refine works

1. Sign in with Internet Identity (a passkey — no seed phrase, no custodian).
2. Connect an Ethereum wallet (MetaMask / Brave Wallet).
3. Approve + deposit UNI to DFINITY's ckERC-20 helper. After 12 Ethereum
   blocks the minter credits **ckUNI to your own ICP principal** — not to us.
4. The refinery pulls the ckUNI you approved (ICRC-2, exact amount) and pays
   sGLDT from its treasury at the oracle rate, atomically: if the payout
   can't happen, your ckUNI is refunded automatically.

The exit is symmetric: redeem sGLDT → ckUNI at the same oracle rate, then
withdraw ckUNI → native UNI through DFINITY's standard minter. You are never
locked in.

**Auto-refine (BAT).** Brave pays ad rewards monthly; a swap you have to
come back for mostly doesn't happen. One standing ICRC-2 approval on the
ckBAT ledger plus a switch in the app, and an hourly pass refines whatever
ckBAT lands in your account through the same pay-or-refund path. The
approval is the authorisation — revoke it and the sweeper stops.

## Risks & limitations (read this)

- **Unaudited.** No third-party audit of this code has been performed.
- **Single operator.** One person controls the backend canister and sets the
  sGLDT/USD reference leg of the rate (sGLDT trades on one ICPSwap pool the
  exchange-rate canister can't see). The UNI/USD and BAT/USD legs come from
  DFINITY's Exchange Rate Canister — a 3-hour heartbeat plus an on-demand
  refresh whenever someone quotes against a rate older than an hour — with a
  ±30% jump guard, a median-of-5 window, and a 6-hour staleness cutoff after
  which both refines and redeems refuse to settle rather than use a stale
  price.
- **Treasury liquidity bounds payouts.** Refines pay from the treasury's
  sGLDT; redeems pay from its ckUNI or ckBAT. Balances are public and shown
  live at `/proof`. If the treasury can't cover a swap, your deposit is
  auto-refunded — never taken.
- **Stranded records.** A swap whose refund *also* fails is held as a
  "stranded" record for manual resolution — funds are recorded, nothing is
  silently dropped, and the count is published at `/proof`.
- sGLDT's peg to GLDT is sVault's contract, and GLDT's gold backing is Gold
  DAO's — verify both independently; we link them, we don't control them.

## Canister IDs (mainnet)

| Canister | ID | Role |
| --- | --- | --- |
| Frontend | `cqyto-tiaaa-aaaau-agppa-cai` | this UI, served on-chain |
| Refinery backend | `c626g-iyaaa-aaaau-agpoa-cai` | treasury + atomic swaps |
| sGLDT ledger | `i2s4q-syaaa-aaaan-qz4sq-cai` | the GLDT wrapper (sVault) |
| ckUNI ledger | `ilzky-ayaaa-aaaar-qahha-cai` | your bridged UNI, in your account |
| ckBAT ledger | `j7x7x-syaaa-aaaar-qcbea-cai` | your bridged BAT, in your account |
| ckERC-20 minter | `sv3dd-oaaaa-aaaar-qacoa-cai` | DFINITY's bridge — not our code |
| Exchange Rate Canister | `uf6dk-hyaaa-aaaaq-qaaaq-cai` | UNI/USD and BAT/USD oracle (DFINITY) |

## Development

```bash
# frontend — typecheck, unit tests, build (this is exactly what CI runs)
cd src/frontend && npm ci && npm run typecheck && npm test && npm run build

# backend (Motoko, moc 1.3.0 via mops). `dfx build backend` does NOT compile —
# dfx.json's build step is only a "do the artifacts exist" guard — and
# `mops build` is not a mops command. This is the real recipe:
cd src/backend
export DFX_MOC_PATH=moc-wrapper          # lets `mops toolchain bin moc` resolve
MOC=$(mops toolchain bin moc)            # ~/Library/Caches/mops/moc/1.3.0/moc
mops install
$MOC --release --default-persistent-actors --actor-idl=system-idl \
  --implicit-package=core -no-check-ir -E=M0236,M0235,M0223,M0237 -A=M0198 \
  $(mops sources) -o dist/backend.wasm --idl --stable-types main.mo

# before ANY backend upgrade: confirm the stable-variable layout is compatible
# with what is running (grab the live .most from the last deployed commit)
$MOC --stable-compatible <live>.most dist/backend.most

# local end-to-end harness (own replica on :4955, mock ledgers at the real
# mainnet principals, real main.mo with one injected admin grant)
cd ../../scripts/local-test && dfx start --clean --background && \
  ./run-bat-redeem-test.sh && ./run-uni-refine-redeem-test.sh; dfx stop
```

Deploy notes (the full operator detail lives in `RUNBOOK.md`):

- **Backend** upgrades use dfx 0.29.1 and **must** pass
  `--wasm-memory-persistence keep` — the canister uses enhanced orthogonal
  persistence and the replica rejects an upgrade without it. Verify by
  module hash afterwards, never by dfx's exit code.
- **Frontend** is a standard dfx asset canister since 2026-08-27 (it was
  reinstalled from `dist/` then; the previous module rejected upgrades).
  `dfx deploy frontend --network ic` now works; `scripts/asset-sync/sync.mjs`
  remains as the surgical alternative.
- **Cycles.** The backend's real burn is far above the figure
  `dfx canister status` calls "idle" — see `RUNBOOK.md §1`. `getCyclesHealth`
  on the backend reports measured burn and runway; `/proof` shows it.

## Minegold.Brave — BAT is live

The same refinery for BAT — Brave pays you BAT for the ads you already see;
the refinery turns it into gold. DFINITY lists ckBAT on the chain-key minter,
so BAT → ckBAT → sGLDT and the redeem back to ckBAT run on the identical
code path as UNI. The landing page still checks the minter live on every
visit rather than trusting this sentence.
