# Proposal: Add ckBAT (Basic Attention Token) to the ckERC20 ledger suite

**Status:** DRAFT — for Anthony to review, put under his own name, and post
to the DFINITY forum before any NNS proposal is submitted. Nothing in this
document has been posted anywhere.

**Sourcing note (2026-07-31):** the facts below were checked against live
sources — the ckERC20 minter's own dashboard, DFINITY's docs, and GitHub —
not written from memory alone. Section 8 lists exactly what was verified,
what was corrected from an earlier draft, and what still can't be confirmed
because the forum itself blocks automated access (a 403 on every fetch
attempt) and has to be read by a human.

---

## 1. One-paragraph summary

We propose that the NNS deploy a ledger suite for **ckBAT**, the chain-key
twin of Basic Attention Token (BAT), via the ckERC20 ledger suite
orchestrator — the same mechanism that onboarded the eleven ckERC20 tokens
live today (ckEURC, ckLINK, ckOCT, ckPEPE, ckSHIB, ckUNI, ckUSDC, ckUSDT,
ckWBTC, ckWSTETH, ckXAUT — confirmed live against the minter's own dashboard
on 2026-07-31; BAT is not among them). BAT is a top-100 ERC-20 with
seven-plus years of mainnet history, issued by Brave Software and earned as
advertising revenue by the Brave browser's tens of millions of monthly
users. A live ICP application (minegold.defi) is already built against the
ckERC20 minter and polls `get_minter_info` for BAT support on every visit;
the day ckBAT exists, a consumer-scale on-ramp of recurring, real-income BAT
flow onto the Internet Computer switches on with it.

The closest precedent for this proposal isn't ckUNI or ckLINK (both shipped
by DFINITY in the original batch) — it's **ckOCT**, which reached the minter
through exactly this path: a community forum post
(forum.dfinity.org/t/proposal-to-add-oct-as-a-new-ckerc20-token/32108)
followed by an NNS proposal. That thread is the right model for the post
below; it should be read directly before posting; DFINITY forum content
resists automated fetching, so this is one thing that has to be checked by
a human, not by this draft.

## 2. Token facts

| Field | Value |
|---|---|
| Token | Basic Attention Token (BAT) |
| Ethereum contract | `0x0D8775F648430679A709E98d2b0Cb6250d2887EF` |
| Decimals | 18 |
| Standard | ERC-20 (no fee-on-transfer, no rebasing, no admin mint since ICO) |
| Deployed | May 2017 |
| Supply | 1.5 billion BAT, fixed |
| Issuer | Brave Software (the Brave browser, Brave Ads, Brave Rewards) |
| Typical market rank | top-100 by capitalization; listed on every major venue |

BAT is one of the oldest continuously-operating ERC-20s in existence, with
deep spot liquidity on major centralized and decentralized venues, a Chainlink
price feed on Ethereum mainnet, and none of the contract behaviors
(fee-on-transfer, rebasing, upgradability games) that complicate chain-key
twinning.

*(Reviewer checklist before posting: re-verify the contract address against
Etherscan and basicattentiontoken.org; confirm current market-cap rank; and
re-read the ckOCT thread linked above in case the community's expectations
have shifted since it was posted.)*

## 3. Why BAT, and why it benefits the Internet Computer

**A genuinely new user funnel, not a re-shuffle of existing DeFi.** Most
ckERC20 candidates move existing DeFi liquidity between chains. BAT is
different in kind: it is *earned income*. Millions of Brave Rewards users
receive BAT every month for attention they already spend. Today that income
mostly sits idle in custodial accounts or small wallets, because doing
anything useful with $1–3/month of an ERC-20 is uneconomical on Ethereum.
Chain-key BAT puts those flows one hop away from ICP's ~zero-fee ledgers —
the only environment where using small recurring BAT income is actually
economical. That is a story about ICP's fee model that no existing ck-token
tells.

**An application is already waiting.** minegold.defi — a live mainnet
application built on the ckERC20 minter (it launched on ckUNI) — refines
bridged ERC-20 assets into sGLDT, a 1:1 wrapper of Gold DAO's
physically-backed GLDT. Its BAT intake is fully built and *truth-gated*: the
UI reads `get_minter_info` from `sv3dd-oaaaa-aaaar-qacoa-cai` live and tells
users BAT is not yet supported. This proposal is the unlock for a shipped
product, not a speculative listing.

**Ecosystem fit.** ICP already hosts the destination assets (GLDT/sGLDT and
the DEX venues they trade on). ckBAT completes an end-to-end consumer story
that runs entirely on public, verifiable infrastructure: browser ad revenue
→ chain-key bridge → gold-backed token — with every hop auditable on a
public ledger.

**Precedent.** ckOCT shows the path works for a community-proposed token
with a narrower user base than BAT's. What BAT lacked until now was an ICP
application creating pull — not community support or technical fitness.

## 4. What is being requested, mechanically

Adding a token is a single NNS upgrade proposal targeting the **ledger
suite orchestrator** (`vxkom-oyaaa-aaaar-qafda-cai`), which then spawns the
ckBAT ledger, index canister and archive — no new code, only canister
configuration. Per the orchestrator's own documentation, the proposal's
install argument specifies, at minimum:

| Field | Value for BAT |
|---|---|
| `chain_id` | 1 (Ethereum mainnet) |
| `address` | `0x0D8775F648430679A709E98d2b0Cb6250d2887EF` |
| `decimals` | 18 — must match the value the contract's own `decimals()` returns |
| `token_symbol` | `ckBAT` (ASCII, ≤20 chars, `ck` prefix — required format) |
| `token_name` | Chain-key Basic Attention Token |
| `transfer_fee` | per DFINITY guidance, ~$0.001–0.01 equivalent, ideally a power of 10 |
| `token_logo` | a data URL (BAT's mark is freely available) |
| `minting_account` / `fee_collector_account` | orchestrator-controlled, as for every other ckERC20 |

The ckUSDC listing (NNS proposal 129750) is the canonical technical example
of this argument shape, though the orchestrator's syntax has since evolved
in minor ways — worth a fresh diff against the current orchestrator source
before anything is finalized.

Separately, the ckERC20 **minter** (`sv3dd-oaaaa-aaaar-qacoa-cai`) adds BAT
to its supported-token list so deposits via the standard helper contract
mint ckBAT 1:1 to the depositor's principal, and withdrawals burn back to
Ethereum. No new trust assumptions: the same threshold-ECDSA custody, the
same minter, the same helper contract users already rely on for every other
ckERC20 asset.

**Who actually submits the NNS proposal.** This is worth flagging plainly:
submitting the *forum post* costs nothing and needs no special standing —
anyone can write it. Submitting the *NNS proposal itself* requires a neuron
with a dissolve delay of at least six months, and a deposit is charged
against that neuron's balance if the proposal is rejected. In practice
(ckOCT's path), the forum post is what a non-neuron-holder does first; a
DFINITY team member or another neuron-holder who agrees with it typically
submits the technical proposal afterward. So the realistic sequence for
Anthony is: post to the forum, make the case, and expect the technical
proposal to be submitted by someone else if the case lands — not
necessarily by minegold.defi directly, unless a suitably staked neuron is
already in hand.

## 5. Anticipated questions

**"Is there enough liquidity to justify it?"** BAT's spot liquidity across
major venues is deep and old; the Chainlink BAT/USD and BAT/ETH feeds have
run for years. The relevant question for a ck-twin is redemption safety
(can holders always exit to Ethereum mainnet), and that is a function of the
minter's design, not of BAT's order books — which nonetheless comfortably
exceed several already-listed ckERC20 tokens.

**"Who maintains demand after listing?"** At least one shipped application
(minegold.defi) activates immediately, and its operator intends to run paid
Brave Ads campaigns — reaching BAT earners inside the browser they earn in —
denominated in BAT itself. Demand generation is aligned with the token's own
user base rather than hoped-for.

**"Why now?"** Brave's payout infrastructure is shifting toward
self-custody. A standing, neutral, on-chain bridge for BAT positions ICP as
the natural place those flows land, before that behavior calcifies
elsewhere.

## 6. Suggested forum post (short form)

> **Title: Proposal to add ckBAT (Basic Attention Token) to the ckERC20 suite**
>
> I'd like to gauge community support for adding ckBAT via the ledger suite
> orchestrator, following the same path as the recent ckOCT proposal.
>
> BAT (`0x0D8775F648430679A709E98d2b0Cb6250d2887EF`, 18 decimals, deployed
> 2017, fixed 1.5B supply) is the token Brave browser users earn as ad
> revenue — recurring, real-income flows from one of the largest crypto
> user bases in existence. Those flows are uneconomical to use on Ethereum
> at their natural size ($1–3/month per user); on ICP's fee model they are
> not. That makes ckBAT a genuinely new consumer funnel for the IC rather
> than a reshuffling of existing DeFi liquidity.
>
> There is a live mainnet application already built against the minter and
> truth-gated on `get_minter_info` BAT support (minegold.defi, which
> refines ckERC20 assets into gold-backed sGLDT), so the listing activates
> a shipped product on day one.
>
> Happy to put together the formal proposal if there's support — and to
> hear objections I haven't considered.

## 7. What we (minegold.defi) commit to alongside the listing

- Ship BAT intake the week the minter lists BAT (the code path exists today).
- Publish treasury policy for BAT inventory on our public proof page before
  the first BAT deposit is accepted.
- Fund Brave Ads campaigns, paid in BAT, marketing the on-ramp to Brave
  Rewards users — demand generation for the ck-twin at our own cost.

## 8. What was actually checked, and what wasn't

Honesty about sourcing, since a proposal built on unverified claims wastes
the community's time:

**Verified live, this session:**
- The full current ckERC20 supported-token list, fetched directly from the
  minter's dashboard (`sv3dd-oaaaa-aaaar-qacoa-cai.raw.icp0.io/dashboard`) —
  11 tokens, BAT not among them. This is independent of, and confirms, what
  the minegold.defi app's own `get_minter_info` check already shows.
- That ckOCT is a real, named, community-proposed precedent
  (forum.dfinity.org/t/proposal-to-add-oct-as-a-new-ckerc20-token/32108) —
  confirmed to exist via search and via DFINITY's own docs listing ckOCT as
  supported; its full text could not be read (see below).
- The AddErc20Arg field list and constraints (decimals must match the
  contract, `ck`-prefixed symbol ≤20 ASCII chars, transfer-fee guidance,
  data-URL logo) — from the ledger-suite-orchestrator's own README on
  GitHub.
- The neuron requirement to submit an NNS proposal (≥6-month dissolve
  delay, a deposit at risk on rejection) — from DFINITY community
  documentation on the proposal process generally.

**Corrected from an earlier draft of this document:** that draft asserted,
as if it were a documented DFINITY rule, that a specific forum post must
precede any technical steps. No primary source found in this session states
that as a formal requirement — it's clearly standard *practice* (it's
exactly how ckOCT went), so the advice to post first stands, but it's no
longer presented as a rule this document verified.

**Could not verify — needs a human on the forum:** the ckOCT thread's full
content (what pushback it got, how long it took, what final proposal number
resulted), and whether the current orchestrator's argument syntax has
drifted from the ckUSDC example (129750) cited above. forum.dfinity.org
returns 403 to automated fetches; someone will need to actually open the
thread in a browser.

---

*Prepared for Anthony (anthony@cafreso.com), minegold.defi / Banking.Brave,
powered by CafresoDAO. Draft only — read the ckOCT thread directly and
re-verify addresses before posting.*
