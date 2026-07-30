# Proposal: Add ckBAT (Basic Attention Token) to the ckERC20 ledger suite

**Status:** DRAFT — for Anthony to review, put under his own name, and post
to the DFINITY forum (Governance → "Adding new ckERC20 tokens") before any
NNS proposal is submitted. Nothing in this document has been posted
anywhere.

---

## 1. One-paragraph summary

We propose that the NNS deploy a ledger suite for **ckBAT**, the chain-key
twin of Basic Attention Token (BAT), via the ckERC20 ledger suite
orchestrator — the same mechanism that onboarded ckUNI, ckLINK, ckPEPE and
the other ckERC20 tokens. BAT is a top-100 ERC-20 with seven-plus years of
mainnet history, issued by Brave Software and earned as advertising revenue
by the Brave browser's tens of millions of monthly users. A live ICP
application (minegold.defi) is already built against the ckERC20 minter and
polls `get_minter_info` for BAT support on every visit; the day ckBAT
exists, a consumer-scale on-ramp of recurring, real-income BAT flow onto
the Internet Computer switches on with it.

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
Etherscan and basattentiontoken.org; confirm current market-cap rank; and
check the ckERC20 onboarding docs for the current proposal template —
DFINITY has iterated on the process since the first batch of tokens.)*

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

**Precedent.** ckUNI and ckLINK were added with comparable or weaker
consumer stories. BAT's holder base is broader than either; what it lacked
until now was an ICP application creating pull.

## 4. What is being requested, mechanically

Per the established ckERC20 process:

1. An NNS proposal instructing the **ledger suite orchestrator**
   (`vxkom-oyaaa-aaaar-qafda-cai`) to spawn the ckBAT ledger, index canister
   and archive, managed identically to the existing ckERC20 suites.
2. The ckERC20 minter (`sv3dd-oaaaa-aaaar-qacoa-cai`) adds BAT
   (`0x0D8775F648430679A709E98d2b0Cb6250d2887EF`, 18 decimals) to its
   supported tokens, so deposits via the standard helper contract mint ckBAT
   1:1 to the depositor's principal, and burns withdraw to Ethereum.

No new trust assumptions: the same threshold-ECDSA custody, the same
minter, the same helper contract users already rely on for every other
ckERC20 asset.

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
> orchestrator, following the same path as ckUNI/ckLINK.
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

---

*Prepared for Anthony (anthony@cafreso.com), minegold.defi / Banking.Brave,
powered by CafresoDAO. Draft only — verify all addresses and the current
onboarding template before posting.*
