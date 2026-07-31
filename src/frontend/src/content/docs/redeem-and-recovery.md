# Redeem & recovery

Getting out matters more than getting in. This page covers every exit path
from sGLDT, and what to do when a step doesn't go as planned.

The short version: **there is always an exit, and none of them require our
permission.**

## Three ways out

Your sGLDT is a token in your vault on a ledger we don't control. That gives
you three independent exits, and only the first involves us at all.

### 1. Withdraw here — sGLDT back to ckUNI

The Withdraw button sits next to Deposit as an equal, on purpose. It redeems
sGLDT back to ckUNI at the same rate source that priced your deposit.

- Minimum: **0.1 sGLDT** (below that, ledger fees exceed the payout)
- Paid from treasury ckUNI; if the treasury is short, the withdrawal is
  declined cleanly rather than partially executed
- Current treasury ckUNI is published live on [/proof](/proof)

From ckUNI you can withdraw to Ethereum through DFINITY's minter, the same
infrastructure that brought it in.

### 2. Unwrap to GLDT at sVault — no involvement from us

sGLDT unwraps **1:1 to GLDT** at sVault. This path does not touch our
canisters, does not require our treasury to hold anything, and works whether
or not this application is running.

This is the exit that matters most if you don't trust us, which is a
perfectly reasonable position to hold about a single-operator product.

### 3. Redeem GLDT for physical gold via Gold DAO

GLDT is backed by 0.01 g of LBMA-sourced gold per token in audited Swiss
vaults. Gold DAO operates the redemption process for the metal itself.

Start at [gldt.org](https://gldt.org). This is Gold DAO's process, on Gold
DAO's terms — we don't administer it and can't expedite it.

## Recovery — when something goes wrong

### My deposit confirmed on Ethereum but no sGLDT arrived

Almost always this is just timing: the minter waits **12 Ethereum block
confirmations**, roughly three minutes.

If it's been materially longer, your funds are not lost. The minter credits
ckUNI to **your own principal** — it arrives whether or not this app is open.
Sign in and the app will show the un-refined ckUNI balance and offer to
complete the swap. You can also verify the balance directly on the ckUNI
ledger (`ilzky-ayaaa-aaaar-qahha-cai`) via the ICP dashboard, without
involving us.

### I closed the tab mid-deposit

Nothing is lost. See above — the bridge credits your principal
independently of this application's UI.

### My swap failed

The swap is atomic: if the payout leg fails, the ckUNI pull is reversed and
**your ckUNI is refunded**. You should see it back in your balance.

The most common cause is the treasury being short of sGLDT, which you can
check yourself on [/proof](/proof).

### My swap shows as "held" or "stranded"

This is the rare case where a swap failed *and* its automatic refund also
failed. The swap is recorded and held for manual resolution — it is not lost
and not silently dropped.

The live count of stranded swaps is published on [/proof](/proof) at all
times, including when it is zero. If yours is one of them, contact us with
your receipt; resolution is manual by design, because the alternative is
automated retry logic touching funds in an already-inconsistent state.

### I lost access to my vault

This is the one we cannot fix, and we would rather say so directly than bury
it.

Your vault is an Internet Identity secured by your device's passkey. There is
**no password reset and no recovery link**, because there is no account for
us to reset — only a keypair your device holds. The same property that means
nobody can freeze or seize your vault means nobody, including us, can restore
it.

**Protect against this before you need to:**

- Register **more than one passkey** on your Internet Identity — a second
  device, or a hardware key. This is the single most effective thing you can
  do, and it takes a minute.
- Add a **recovery phrase** through Internet Identity's own recovery options.
- Do both at [identity.ic0.app](https://identity.ic0.app), not here — we
  deliberately don't sit in the middle of your identity.

If you hold a meaningful balance and have exactly one passkey on exactly one
device, treat adding a second as urgent.

### The app is down, or gone

Your sGLDT does not depend on this application existing. It is a token on
sVault's ledger, and exit path 2 — unwrapping to GLDT — works with this site
switched off entirely.

That is by design, and it is the answer to "what if the operator disappears."

## Reconciling a swap yourself

Every completed swap records the settled rate and the **sGLDT ledger block
index** of the payout. That block is public. You can confirm your payout on
the ledger without trusting anything this interface displays.

Canister IDs and dashboard links for every ledger in the path are on
[/proof](/proof).

## Related

- [Risks & limitations](/docs/risks) — including what a single operator means
- [How the rate is made](/docs/rate-methodology) — what your withdrawal is
  priced at
