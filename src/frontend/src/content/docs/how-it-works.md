# How it works

minegold.defi takes a token you already hold on Ethereum and converts it into
sGLDT — a token backed, through two wrappers, by physical gold in a Swiss
vault. This page explains every step of that path, including the parts that
are other people's infrastructure rather than ours.

If you only read one other page, make it [Risks & limitations](/docs/risks).

## The short version

1. You sign in with a passkey. That creates your **vault** — an account only
   your device's biometrics can open.
2. You connect the Ethereum **wallet** holding your UNI.
3. You deposit. Two signatures in your wallet, then Ethereum confirms.
4. sGLDT lands in your vault. You can withdraw it back to ckUNI at any time.

Four steps, about three minutes — most of which is Ethereum confirming, not
us doing anything.

## The long version

### Step 1 — Your vault is not an account with us

Signing in creates an Internet Identity: a keypair your device holds and your
biometrics unlock. We never see a password, and there is no account for us to
freeze, because there is no account — there is a principal that owns balances
on public ledgers.

The practical consequence is worth being blunt about: **we cannot recover your
vault for you.** There is no reset link. That is the direct cost of there
being no one who can seize it either. See
[Redeem & recovery](/docs/redeem-and-recovery) for what this means in
practice.

### Step 2 — Your UNI crosses to the Internet Computer, and we don't carry it

This is the part people assume is the risky bit, and it is the part we have
the least to do with.

Your UNI is bridged by **DFINITY's chain-key ERC-20 minter**
(`sv3dd-oaaaa-aaaar-qacoa-cai`) — NNS-governed infrastructure, not our code.
You send UNI to its helper contract on Ethereum. After **12 Ethereum block
confirmations** (roughly three minutes), the minter credits **ckUNI to your
own principal** on the ckUNI ledger.

Two things follow from that, and both matter:

- The bridged ckUNI is **yours**, sitting in your account on a DFINITY-run
  ledger, before this application touches it. We are not a custodian of it.
- Because it lands in your account automatically, **a deposit cannot go
  missing in transit**. If you close the tab mid-flow, the ckUNI still
  arrives. The next time you sign in, the app sees the un-refined balance and
  offers to continue.

### Step 3 — The swap is atomic, or it doesn't happen

When you confirm the deposit, the refinery backend
(`c626g-iyaaa-aaaau-agpoa-cai`) does two things as one unit: it pulls your
ckUNI, and it pays you sGLDT from treasury inventory at the current rate.

If the payout leg fails for any reason — most plausibly the treasury being
short of sGLDT — the pull is reversed and **your ckUNI is refunded**. There is
no state in which we hold your tokens and owe you gold.

Because ICRC ledgers charge their fee on top of the amount moved, and this
flow moves through two ledger operations, the smallest deposit worth making
is **0.005 UNI**. Below that, fees consume the deposit. The app enforces this
rather than letting you make a losing trade.

In the rare case where even the refund fails, the swap is recorded as
**stranded** and held for manual resolution. Nothing is silently dropped, and
the live count of stranded swaps is published on
[/proof](/proof) — including when it is zero, which is when publishing it
means something.

### Step 4 — What you're actually holding

sGLDT is a 1:1 wrapper of **GLDT**, Gold DAO's token. Each GLDT is backed by
**0.01 g of LBMA-sourced physical gold** held in audited Swiss vaults.

The wrapper exists for one unglamorous reason: transfer fees. GLDT costs 0.10
per transfer; sGLDT costs 0.00001 — about 10,000× cheaper. For a product
doing many small conversions, that difference is the difference between
viable and not.

You can unwrap sGLDT to GLDT at sVault whenever you like, and Gold DAO's own
process lets you redeem GLDT for metal. Neither of those is ours: **sVault's
contract holds the peg, and Gold DAO holds the gold.** We link to them; we
don't control them.

## Who controls what

The single most useful thing you can know about a financial application is
which parts its operator can change. Here is ours, in full:

| Component | Controlled by |
|---|---|
| Refinery backend (the treasury) | **The operator** — one person |
| Frontend canister | **The operator** — one person |
| ckUNI ledger | DFINITY (NNS) |
| ckERC-20 minter | DFINITY (NNS) |
| Exchange Rate Canister (the UNI/USD oracle) | DFINITY (NNS) |
| sGLDT ledger | Gold DAO / sVault |

Every one of those canister IDs, and the operator's single controller
principal, is listed on [/proof](/proof) with dashboard links. You can verify
each claim with `dfx canister info` without asking us anything.

## What this application never does

- It never takes custody of your gold. Settled sGLDT is in your vault, not
  ours.
- It never has a path to your Ethereum wallet beyond the approval you sign,
  which you can revoke at [revoke.cash](https://revoke.cash) at any time.
- It never quotes you a price it can't honour: the rate is read from the
  canister, and the swap either settles at that rate or refunds.

## Next

- [The rate, in full](/docs/rate-methodology) — the exact formula, its two
  inputs, and which one is operator-set.
- [Redeem & recovery](/docs/redeem-and-recovery) — getting out, and what to do
  when something goes wrong.
- [Risks & limitations](/docs/risks) — the honest list.
