# minegold.defi — the on-chain gold refinery

Turn your tokens into gold, on-chain. Bridge UNI from Ethereum through
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

## Risks & limitations (read this)

- **Unaudited.** No third-party audit of this code has been performed.
- **Single operator.** One person controls the backend canister and sets the
  sGLDT/USD reference leg of the rate (sGLDT trades on one ICPSwap pool the
  exchange-rate canister can't see). The UNI/USD leg comes from DFINITY's
  Exchange Rate Canister, synced hourly, with a ±30% jump guard.
- **Treasury liquidity bounds payouts.** Refines pay from the treasury's
  sGLDT; redeems pay from its ckUNI. Balances are public and shown live at
  `/proof`. If the treasury can't cover a swap, your deposit is auto-refunded
  — never taken.
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
| ckERC-20 minter | `sv3dd-oaaaa-aaaar-qacoa-cai` | DFINITY's bridge — not our code |
| Exchange Rate Canister | `uf6dk-hyaaa-aaaaq-qaaaq-cai` | UNI/USD oracle (DFINITY) |

## Development

```bash
# frontend
cd src/frontend && pnpm install && pnpm build

# backend (Motoko) — mops + moc via dfx 0.29.1
dfx build backend
```

Deploy notes:

- **Backend** upgrades go through dfx 0.29.1 with
  `--wasm-memory-persistence` (stable-compatible upgrade path).
- **Frontend** is NOT deployed with `dfx deploy` — the installed asset
  module predates dfx's and rejects reinstall. Sync `dist/` over the
  standard asset API instead: `node scripts/asset-sync/sync.mjs`
  (`--dry-run` to preview, `--only <substring>` for surgical deploys).
  Content types for extensionless files are declared in that script.

## What's next

**Minegold.Brave**: the same refinery for BAT — Brave pays you BAT for the
ads you already see; the refinery turns it into gold. Gated honestly on
DFINITY listing ckBAT on the chain-key minter; the app checks the minter
live and says exactly where that stands.
