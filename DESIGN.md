# Design Brief

This describes the design as it is actually built. Every rule below is
enforced somewhere in `src/frontend/src/index.css` or in the components, and
the reasoning is recoverable from `CHANGELOG.md`. Where a rule was adopted by
reversing an earlier decision, that is said rather than smoothed over.

## Direction

A bank's interface, not a crypto app's. The product converts one asset into
another and holds nothing; the design's job is to make that legible and to
avoid manufacturing excitement around someone's money.

## Tone

Plain, declarative, and willing to state limits in place. Copy names the
uncomfortable thing where a user meets it — the deposit minimum appears next
to the deposit field, not in a footnote. Numbers are presented with their
provenance and their age; a cached figure is never passed off as live.

## Differentiation

Most applications in this category signal trustworthiness through polish.
This one signals it through disclosure: `/proof` and `/status` are linked
from the landing page, the changelog and incident log are published verbatim,
and the counts that look bad when they are non-zero are published at zero
too, so that watching them means something.

## The two-word vocabulary

One fixed metaphor, chosen once and not varied:

- **Vault** — the user's Internet Identity, opened by a passkey.
- **Wallet** — the user's Ethereum wallet.

"Principal", "canister", and "subnet" do not appear in default UI. They are
available on `/proof` and in the docs, where a reader has opted into them.

## Colour

Semantic before decorative. The palette that carries meaning is the trust
scale, and it is the one to preserve:

| Token | Meaning |
|---|---|
| `--trust-verified` | Verifiable on-chain, right now |
| `--trust-attested` | Operator-stated — take our word for it |
| `--trust-unknown` | Stale, unavailable, or not yet known |
| `--trust-fault` | Actively wrong |

The distinction between *verified* and *attested* is the single most
important thing the colour system encodes. It must survive any restyle.

Brand colour is royal blue (`--bb-brand`) with gold reserved for the settled
state and for gold-denominated figures. Per-token accents (`--token-eth`,
`--token-uni`, `--token-ckuni`, `--token-bat`) identify assets consistently
across surfaces.

Both themes are first-class. Light-mode text tokens carry their measured
contrast ratios as comments; `--bb-text-muted` is AAA on white and
`--bb-text-dim` is AA. Keep the ratios when changing the values.

## Typography

- `--font-display` — Fraunces, for headings only
- `--font-sans` — Geist, for everything else
- `--font-mono` — Geist Mono, for anything a user might verify character by
  character: addresses, principals, tx hashes, block indices

Monospace is a correctness signal, not an aesthetic one. Anything checkable
against a block explorer is set in it.

## Structure

Deposit and Withdraw are equal-rank peers. Withdraw is a button beside
Deposit, and at a zero balance it is **disabled rather than hidden** — a
visible exit is what makes a deposit safe to make. This reversed an earlier
design where Withdraw was a small link.

## Motion

Four eases, named for what they describe: `--ease-strike`, `--ease-settle`,
`--ease-descend`, `--ease-exit`. Motion confirms state changes and never
narrates them.

## Constraints

These are prohibitions, and each replaced something that shipped:

- **No storytelling chrome on the money path.** No "Gold Mined!" toast, no
  gradient success header, no narrative strip. A settled deposit says
  "Deposit settled".
- **No surprise signatures.** Every wallet signature is explained before it
  is requested.
- **Approval sizing is exact-amount by default.** Unlimited approval is an
  explicit opt-in with the tradeoff stated in place and a revoke.cash link
  beside it.
- **Degrade per-item, not per-page.** When one read fails the rest still
  render; a failed figure shows "—", never a zero. A dropped response must
  never be displayable as a confirmed zero balance.
- **One status vocabulary.** Refines, redeems and transfers share a single
  settlement-status taxonomy so two surfaces cannot disagree about one fact.

## Signature detail

The proof band: live treasury figures on the landing page, readable without
signing in, each labelled with whether it is verified or attested and when it
was last read. It is the product's argument in one component — the claim and
the means of checking it, in the same place.
