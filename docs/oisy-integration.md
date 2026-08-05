# OISY integration — what's possible, what isn't, and the order to build it

**Status:** researched 2026-08-05, not yet built. A first attempt shipped an
OISY *sign-in* button on 2026-08-05 and was reverted the same day — it could
not work. This document exists so the next attempt starts from facts.

## TL;DR

| Goal | Verdict |
|---|---|
| OISY as the **Ethereum wallet** (replaces MetaMask/Brave) | ✅ **Do this.** Works today via WalletConnect. Small, surgical change. |
| OISY as the **login / identity** | ❌ Blocked. OISY has no dApp delegation; needs backend rework *and* a privacy decision. |

The user-visible win is the first row: today a user needs a passkey **and**
MetaMask. After WalletConnect they need a passkey and **OISY** — and OISY is
also where their ckUNI and sGLDT already live, so it becomes the single
wallet in the flow.

---

## The finding that killed sign-in

OISY's own documentation:

> Since OISY requires user approval for every sensitive action (**due to no
> dApp delegation**), be mindful of the user experience.

OISY implements **ICRC-25** (permissions), **ICRC-27** (accounts),
**ICRC-21** (consent messages) and **ICRC-49** (call canister). It does
**not** implement **ICRC-34** (delegation) — the standard that lets a dapp
hold a session and sign silently. `@dfinity/oisy-wallet-signer` confirms the
list, and its clients support only `icrc1_transfer`, `icrc2_approve`,
`icrc2_approve_from`.

Consequence for *this* app specifically: every authenticated read goes
through ICRC-49 and pops a wallet approval. Our reads are caller-scoped and
polled on a 60-second timer (`getMyTransactions`, `getCallerUserProfile`,
`getMyRefines`, `getMyActiveDeposit`, …). That is an approval popup per
minute. Not a rough edge — unusable.

Two further traps, both real, both hit during the first attempt:

1. **The signer window must open inside a click handler.**
   `PostMessageTransport` sets `detectNonClickEstablishment: true` and checks
   a module-level `withinClick` flag that is only true during the synchronous
   click dispatch. `await import('@icp-sdk/signer')` in the handler breaks
   that chain and the transport rejects before opening. Static-import the
   signer, and call it with **no `await` before it**.
2. **Version seam.** `@icp-sdk/signer` v5 peer-depends on `@icp-sdk/core` v5;
   this app is on v4. Every symbol the signer imports *does* exist in 4.1.1
   (verified), so it runs — but npm needs `legacy-peer-deps` and any value
   crossing the boundary must cross **by value** (`toJSON`/`fromJSON`), never
   by instance.

---

## Phase 1 — OISY as the Ethereum wallet (build this)

OISY [integrates WalletConnect](https://docs.oisy.com/introduction/why-oisy-wallet)
and is usable as a wallet on any dapp that supports it — the same way it's
used with Uniswap. It holds ETH and ERC-20 natively.

The change is small because [`src/frontend/src/lib/eth.ts`](../src/frontend/src/lib/eth.ts)
is already provider-agnostic underneath: `getWalletClient()` wraps whatever
EIP-1193 provider it's handed in viem's `custom()`. Today the only source is
`window.ethereum`.

```
@walletconnect/ethereum-provider  →  EIP-1193 provider  →  viem custom()  →  existing code
```

Work required:

1. Add `@walletconnect/ethereum-provider`.
2. Get a **project ID** from Reown Cloud (free; account signup — operator
   action, cannot be automated).
3. In `eth.ts`, add a second provider source and make `getWalletClient()` /
   `requestWalletAddress()` choose between injected and WalletConnect.
4. In `ConnectWalletModal.tsx`, offer "OISY / WalletConnect" beside the
   existing injected option, rendering the QR / deep link.
5. Everything downstream — `approve`, `deposit(address,uint256,bytes32)`,
   `sendTransaction`, `waitForReceipt` — is unchanged. It is already
   provider-agnostic.

Nothing about the backend, the principal, or the ckUNI/sGLDT path changes.
Estimated: a focused day, plus the Reown signup.

**Test it for real.** Chain-ID handling is the classic failure here —
`getWalletClient()` deliberately does not pin `chain: mainnet` because mobile
Brave reports chain 0 during boot (see the comment in `eth.ts`). Confirm
WalletConnect + OISY reports mainnet correctly before trusting it.

## Phase 2 — OISY as identity (blocked; do not start without deciding this)

Two independent blockers, both must clear:

**(a) Reads must not require the caller.** Balance reads are already fine —
sGLDT and ckUNI live on ICRC-1 ledgers, and `icrc1_balance_of` is a public
query anyone can call with just a principal. The problem is our *own* state:
`getMyTransactions`, `getMyRefines`, `getMyRedeems`, `getMyActiveDeposit`,
`getCallerUserProfile`.

Principal-parameter variants already exist for two of these
(`getUserTransactions(user)`, `getUserProfile(user)`) — but both guard with
`if (caller != user and not isAdmin(caller))`. Relaxing that guard is a
**privacy decision, not a refactor**: it would make every user's refine and
redeem history publicly readable by principal. That directly contradicts the
receipt-sharing design, where publishing is opt-in via an unguessable token
precisely so history stays private. Do not relax it casually; the honest
alternative is a per-user read token.

**(b) OISY must ship ICRC-34**, or the writes still prompt individually.
Prompting on an actual refine or redeem is *correct* — that's a money
movement and the user should approve it. So if (a) is solved, OISY becomes
viable even without ICRC-34: silent reads, approved writes. That is the real
unlock, and it is entirely on our side.

Also note OISY permissions expire on a **7-day** lifecycle, so even a working
integration re-prompts weekly.

---

## Do not repeat

- Do not add an OISY sign-in button without solving (a) above.
- Do not `await` anything before opening the signer transport.
- Do not present II and OISY as two buttons implying two destinations —
  it's one vault, and the earlier "Create or open your vault" vs "Continue
  with OISY wallet" pairing was misleading on its own terms.
