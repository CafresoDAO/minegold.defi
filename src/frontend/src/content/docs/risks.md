# Risks & limitations

This page exists because a financial application that only publishes its
strengths is telling you something by omission. Everything below is a real
limitation of minegold.defi as it stands today. None of it is hypothetical
boilerplate.

If any single item here is unacceptable to you, that is a correct reason not
to use this product, and we would rather you learn it here than afterwards.

## The four that matter most

### 1. The code is unaudited

No third party has audited the refinery backend. Not a firm, not a formal
verification pass, not a bug bounty with a meaningful payout.

What partially offsets this: the money path is short, the treasury logic is
atomic-with-refund rather than multi-step, and every canister is inspectable
on-chain. What does not offset it: none of that is the same thing as an
audit, and we will not present it as though it were.

### 2. One person controls the treasury

The refinery backend and the frontend canister have exactly **one
controller** — a single principal, published in full on [/proof](/proof).

That person can upgrade the backend. Practically, that means the honest
statement is: *the protections described on this site are enforced by code
that one person can change.* Time-locks, an SNS, or multi-party control would
change that. None of them exist today.

This is the risk that most deserves your attention, because it is the one
that no amount of on-chain verification eliminates. You can verify what the
code does right now. You cannot verify what it will do after the next
upgrade.

### 3. One leg of the exchange rate is operator-set

The rate is UNI/USD from DFINITY's Exchange Rate Canister, divided by an
**sGLDT/USD reference the operator sets**. The oracle leg is independent
infrastructure. The reference leg is not.

The reason it is operator-set rather than fetched is genuine rather than
convenient: sGLDT trades on a single ICPSwap pool that the XRC cannot see. It
has to come from somewhere, and today it comes from us.

The guardrails on this are real, but they are guardrails, not independence:

- Oracle readings that jump **±30%** from the current rate are rejected
  outright; a genuine larger move requires a deliberate operator re-anchor.
- Rate hints sent by the UI are clamped to **±2%** of the canister's own
  rate, so a tampered frontend cannot move the price it settles at.
- Administrative transfers are capped at **500,000 sGLDT / 50 ckUNI** per
  transaction.

[The full formula, with its provenance](/docs/rate-methodology), is published
separately.

### 4. Payouts depend on treasury liquidity

Your deposit is paid from sGLDT the treasury already holds. If the treasury
is short, **your deposit is refunded** — this is the designed behaviour, not
a failure mode.

But refunded is not the same as filled. If liquidity runs out, the product
stops working until it is topped up. Current coverage is shown live on
[/proof](/proof), and we would rather you watch that number than take our
word for its health.

## What we depend on that we don't control

A failure in any of these breaks this product, and we could not fix it:

| Dependency | Run by | What breaks if it fails |
|---|---|---|
| ckERC-20 minter | DFINITY (NNS) | Deposits stop bridging |
| ckUNI ledger | DFINITY (NNS) | Bridged funds inaccessible |
| Exchange Rate Canister | DFINITY (NNS) | Rate goes stale; swaps gate off |
| sGLDT ledger | sVault | Payouts and withdrawals halt |
| GLDT / physical backing | Gold DAO | The gold claim itself |

The sGLDT dependency is worth stating twice: **sGLDT's peg is sVault's
contract, and GLDT's gold backing is Gold DAO's.** We integrate them. If
either fails, holding sGLDT is not a claim on us that we could honour.

## Smaller, but real

- **Ethereum finality takes time.** Roughly three minutes at 12 block
  confirmations. During that window the rate can move; the swap settles at
  the rate current when it executes, not when you started.
- **Gas is yours.** Deposits require ETH for gas. On a small deposit, gas can
  be a large fraction of the value. The app refuses to start a swap it can
  see you can't afford, but it cannot make Ethereum cheap.
- **Going back to Ethereum needs ckETH, which we don't give you.** Taking
  ckUNI out to an Ethereum address burns ckETH for gas at DFINITY's minter.
  Someone who only ever deposited UNI won't hold any, so that specific leg
  requires a separate purchase. Detailed, with the two exits that avoid it
  entirely, in [Redeem & recovery](/docs/redeem-and-recovery).
- **The operator's own ckUNI→Ethereum tool is switched off.** `adminDissolveCkUNI`
  in the backend refuses to move funds: an earlier version sent ckUNI to the
  minter without the approval flow the minter actually requires, which would
  have stranded it. Rather than leave a method that loses money, it returns an
  error and treasury withdrawals to Ethereum are done by hand. This constrains
  *our* treasury management, not your exits — the three routes out on
  [Redeem & recovery](/docs/redeem-and-recovery) don't go through it.
- **Minimums exist because fees do.** 0.005 UNI to deposit, 0.1 sGLDT to
  withdraw. Below those, ledger fees eat the transaction.
- **Stranded swaps require a human.** If a swap fails *and* its refund fails,
  it is held as a stranded record for manual resolution. The count is
  published live on [/proof](/proof), at zero as well as above it.
- **Your vault cannot be recovered by us.** No password reset exists. See
  [Redeem & recovery](/docs/redeem-and-recovery).
- **Gold has a price, and it moves.** Nothing here protects you from the gold
  price falling. This is a conversion, not a yield product, and there is no
  return being promised.

## What is not a risk here, and why

Stated so the list above reads as a real assessment rather than a defensive
one:

- **We cannot spend your settled sGLDT.** Once a swap settles, the tokens are
  in your vault on a ledger we don't control. Our treasury's health stops
  mattering to you at that moment.
- **We cannot lose your deposit in transit.** The bridge credits ckUNI to
  your own principal before we touch it. Closing the tab does not lose funds.
- **We cannot quietly change your price.** The settlement rate comes from the
  canister, with the UI clamped to ±2% of it.
- **There is no leverage, lending, or yield scheme** operating on treasury
  assets. The [treasury policy](/proof) states this, and it was published
  before there was any pressure to have one.

## How to verify all of this yourself

Every claim on this page is checkable without our cooperation:

- Canister IDs, controllers, and live treasury balances: [/proof](/proof)
- Controller verification: `dfx canister info <canister-id>`
- Ledger balances and blocks: the ICP dashboard links on /proof
- The gold backing: [gldt.org](https://gldt.org)

If you find something on this page that is no longer true, that is a bug and
we want to hear about it.
