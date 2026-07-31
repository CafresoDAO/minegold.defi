# Changelog

Every change that affects money, custody, or what we claim. This file is
published verbatim on the product's status page.

Incidents are kept separately, in `INCIDENTS.md`, and appear alongside this
log. **The rule there is: post before the fix, every time.** An incident log
that only ever gains entries after resolution is marketing, not disclosure.

Dates are ISO. Newest first.

---

## 2026-07-31 — Shareable receipts, and an incident banner

*Backend built and verified; not yet deployed.*

- **Receipts can be shared without exposing who they belong to.** Publishing a
  receipt mints a random 32-byte token; anyone with the link sees the amounts,
  rate, status and ledger blocks — and no principal. Links are revocable.
- **Sharing is opt-in, and stays that way.** The share link is keyed on an
  unguessable token rather than the record's id. Sequential ids would have
  made every receipt readable by counting upward, and because a receipt
  carries its ledger payout block, that would have exposed every user's
  account and amounts.
- **Added an operator incident banner** readable by anyone. It exists so
  disclosing an incident doesn't require a full frontend deploy — if the
  honest path is the slow path, it stops being taken under pressure.
  Editing an open notice preserves its original raise time.

## 2026-07-31 — Documentation

- **Published `/docs`** — four pages, readable without signing in: how it
  works, risks & limitations, how the rate is made, redeem & recovery.
- **Risks page states the uncomfortable things by name**: unaudited, a single
  controller who can upgrade the backend, one operator-set leg of the
  exchange rate, payouts gated on treasury liquidity.
- **Fixed a metadata drift class.** The route manifest claimed to be the
  single source of truth for page metadata, but the root route's meta was
  hand-maintained and had gone stale — it still described the product as "A
  Banking.Brave protocol" after the two were separated. The root is now
  generated from the manifest like every other route.

## 2026-07-30 — Banking grammar, and separating the brands

- **Deposit and Withdraw are now equal-rank peers.** Withdraw was a small
  link; it is now a button beside Deposit, disabled rather than hidden at a
  zero balance. A visible exit is what makes a deposit safe to make.
- **Removed storytelling chrome** from the money path — the "Gold Mined!"
  toast, the gradient success header, the narrative strip. A settled deposit
  now says "Deposit settled".
- **Published treasury policy on `/proof`** — settlement is atomic and final,
  inventory risk is the operator's and never yours, no leverage or lending or
  yield schemes on treasury assets. Written before there was any pressure to
  have one, which is the only time writing it is credible.
- **Separated Banking.Brave and minegold.defi.** They are distinct products:
  Banking.Brave is the institution, powered by CafresoDAO; minegold.defi is
  an application in that ecosystem. Banking.Brave now appears as footer
  attribution rather than as this product's brand.
- **Rewrote `/brave`** from a "Minegold.Brave protocol" story into a calm BAT
  intake status page that checks DFINITY's minter live on every load.

## 2026-07-30 — I6: a front door instead of a wall

- **A stranger at `/` now gets a landing page**, not a sign-in prompt. Every
  claim, the live proof band, and `/proof` itself are readable without a
  passkey.
- Signing out returns to the landing page rather than to a login wall.

## 2026-07-30 — I5: one status taxonomy, one ledger

- Unified transaction history: refines, redeems and transfers in a single
  ledger view with one settlement-status vocabulary.
- Trust components (provenance, custody, coverage, receipts) built once and
  reused, so two surfaces can no longer disagree about the same fact.

## 2026-07-30 — I3/I4: design foundation and onboarding

- One fixed metaphor: **vault** (your passkey) and **wallet** (your Ethereum
  wallet). No "principal" or "canister" in default UI.
- No surprise signatures: every wallet signature is explained before it is
  requested.
- Approval sizing is **exact-amount by default**; unlimited approval is an
  explicit opt-in with the tradeoff stated in place, and a revoke.cash link.

## 2026-07-30 — I2: the honesty pass

- **Published `/proof`**: live treasury liquidity with a refresh that re-reads
  both ledgers, refine coverage against pending demand, the full rate formula
  with oracle provenance, and every canister in the money path with who
  controls it.
- **Stranded swaps are published even at zero.** A count that only appears
  when it is non-zero teaches people not to look at it.
- `/proof` degrades per-query rather than blanking the whole page when one
  read fails.

## 2026-07-30 — I0/I1: safety and real URLs

- **Pinned the Internet Identity derivation origin.** This is permanent: it
  is what keeps every existing vault reachable. It must never change, and it
  is deliberately a different constant from the site's canonical origin.
- Real paths replaced hash routing, with per-route metadata so links unfurl
  as themselves.
- Hardened the deploy path: explicit content types, and per-asset replacement
  so an interrupted deploy can't leave the site half-served.

## 2026-07-29 — The exit path

- **Added redeem: sGLDT → ckUNI.** Until this shipped the refinery only ran
  one way, which meant the product could not honestly be described as
  something you could get out of.
- Added the on-chain XRC oracle for the UNI/USD leg of the rate.
- **Minter attribution**: deposits now credit ckUNI directly to the user's own
  principal. The refinery became a pure ICP-side swap, and a deposit stopped
  being able to go missing in transit.

---

## Before this log

Earlier history exists in the repository but predates the decision to keep a
public changelog. It is not reconstructed here — writing entries after the
fact, from memory, would produce exactly the kind of tidy narrative this file
exists to avoid.
