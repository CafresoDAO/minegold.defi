# Proposal: Add ckBAT (Basic Attention Token) to the ckERC20 ledger suite

**Status:** DRAFT — for Anthony to review, put under his own name, and post
to the DFINITY forum. Nothing in this document has been posted anywhere.

**Sourcing note (2026-07-31):** this draft is built on a full read of the
real precedent — the ckOCT thread on forum.dfinity.org, all 39 posts, read
directly (with Anthony's help getting past the forum's login wall, which
blocks automated fetching entirely). Section 8 lists exactly what that
thread confirmed, what it changed from an earlier draft of this document,
and what's still open.

---

## 1. One-paragraph summary

We propose that the NNS deploy a ledger suite for **ckBAT**, the chain-key
twin of Basic Attention Token (BAT), via the ckERC20 ledger suite
orchestrator — the same mechanism that added the eleven ckERC20 tokens live
today (confirmed against the minter's own dashboard, 2026-07-31): ckEURC,
ckLINK, ckOCT, ckPEPE, ckSHIB, ckUNI, ckUSDC, ckUSDT, ckWBTC, ckWSTETH,
ckXAUT. BAT is not among them. BAT is a top-100 ERC-20 with seven-plus years
of mainnet history, issued by Brave Software and earned as advertising
revenue by the Brave browser's tens of millions of monthly users. A live ICP
application (minegold.defi) is already built against the ckERC20 minter and
polls `get_minter_info` for BAT support on every visit; the day ckBAT
exists, a consumer-scale on-ramp of recurring, real-income BAT flow onto the
Internet Computer switches on with it.

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

*(Reviewer checklist before posting: re-verify the contract address against
Etherscan and basicattentiontoken.org, and re-verify current market rank —
both cheap, both worth doing fresh right before posting.)*

## 3. The real precedent: ckOCT

The closest precedent for this proposal is **ckOCT**
(forum.dfinity.org/t/proposal-to-add-oct-as-a-new-ckerc20-token/32108,
Jun 2024) — not ckUNI or ckLINK, which DFINITY shipped in the original
batch. ckOCT reached the minter through exactly the path this document
proposes: a community forum post, iteration with reviewers, then an NNS
proposal submitted by a community member. Reading the full 39-post thread
changed several things about how this document is written — see section 8.

**What actually happened, in order:**

1. Omnity's founder (`toliuyi`) posted the case for ckOCT to the forum,
   linking a technical proposal that had *already been submitted*.
2. **CodeGov, an independent neuron-holder reviewer group, initially voted
   to reject it** — not for a technical flaw, but because the proposal
   arrived with no prior forum announcement and came from a proposer ID
   that had never submitted anything before. Their own words: *"the
   proposal came out of the blue without notice and there were too many
   unknowns to be comfortable voting to adopt."* This is a sourced,
   concrete case that skipping the forum-first step has a real cost, not
   an inferred one.
2. A DFINITY engineer (`Manu`) and a CodeGov reviewer (`Zane`) then worked
   through the technical details in public — principally the
   `git_commit_hash` argument, which had confused reviewers on the prior
   ckLINK proposal too.
3. A separate reviewer (`tiago89`) raised a **relevance bar**: *"I confess
   I would still reject a non-top-20 coin"* absent a pre-approval Motion
   proposal for new tokens generally. The proposer (`toliuyi`) pushed back
   directly — *"Why top 20 and not top 100 or 1000?... Leave the business
   value judgment to others"* — and no Motion-proposal requirement was
   ever adopted. This is a live, unresolved opinion, not a rule, and BAT's
   position is stronger here than OCT's was: BAT is a top-100 token with
   an eight-year history and a household-name issuer (Brave), where OCT
   was a recent rebrand of a much smaller project.
4. The fee argument converged on a **guidance range of roughly $0.005–
   $0.015 (0.5–1.5 cents)**, based on trailing average price to avoid
   short-term volatility, explicitly adjustable later by a follow-up
   proposal if the token's price moves a lot.
5. `gregory-demay` (DFINITY) reviewed the final assembled proposal text
   and replied: *"The proposal looks correct to me! Good luck with the
   submission!"* — DFINITY's sign-off came from a team member responding
   in the thread, not a separate formal approval step.
6. **The community member (`juliansun`, not DFINITY) submitted the NNS
   proposal directly**, using their own neuron. It was adopted as
   **NNS proposal 130405** (confirmed via a linked dashboard URL in the
   thread), reusing the exact orchestrator commit and ledger/index wasm
   hashes from the immediately preceding ckERC20 proposal (ckPEPE, 130755)
   — which itself reused them from ckUSDC (129750). Reusing an
   already-verified wasm build, rather than pulling a fresh one, is the
   pattern every proposal in this chain follows: it means reviewers verify
   one build once, not once per token.

**Why this matters for Anthony specifically:** step 6 is the important one.
The proposal wasn't submitted by DFINITY or handed off to some other
neuron-holder — it was submitted by a member of the community with a
qualifying neuron. Anthony already holds one staked over six months. That
means, after the forum round converges, **he can submit the actual NNS
proposal himself** — this is not a step that has to be delegated.

## 4. What is being requested, mechanically

A single NNS upgrade proposal targeting the ledger suite orchestrator
(`vxkom-oyaaa-aaaar-qafda-cai`), spawning the ckBAT ledger, index canister
and archive. Below is the argument shape, adapted directly from the ckOCT
proposal actually submitted and adopted — same fields, same conventions,
BAT's own values substituted:

```
Target canister: vxkom-oyaaa-aaaar-qafda-cai
Previous ledger suite orchestrator proposal: [the most recent ckERC20
  addition at time of submission — reuse ITS git_commit_hash and wasm
  hashes verbatim, exactly as ckOCT reused ckPEPE's]

git fetch
git checkout <same commit hash as the previous ckERC20 proposal>
cd rs/ethereum/ledger-suite-orchestrator
didc encode -d ledger_suite_orchestrator.did -t '(OrchestratorArg)' \
  '(variant { AddErc20Arg = record {
     contract = record {
       chain_id = 1;
       address = "0x0D8775F648430679A709E98d2b0Cb6250d2887EF"
     };
     ledger_init_arg = record {
       minting_account = record { owner = principal "sv3dd-oaaaa-aaaar-qacoa-cai" };
       fee_collector_account = opt record {
         owner = principal "sv3dd-oaaaa-aaaar-qacoa-cai";
         subaccount = opt blob "\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\0f\ee";
       };
       feature_flags = opt record { icrc2 = true };
       decimals = opt 18;
       max_memo_length = opt 80;
       transfer_fee = <e18s equivalent of ~$0.005-0.015 at time of
         submission — compute fresh, do not reuse OCT's literal number>;
       token_symbol = "ckBAT";
       token_name = "ckBAT";
       token_logo = "data:image/svg+xml;base64,<BAT mark, base64-encoded>";
       initial_balances = vec {};
       maximum_number_of_accounts = null;
       accounts_overflow_trim_quantity = null
     };
     git_commit_hash = "<same as above>";
     ledger_compressed_wasm_hash = "<same as previous ckERC20 proposal>";
     index_compressed_wasm_hash = "<same as previous ckERC20 proposal>";
   }})'
```

`sv3dd-oaaaa-aaaar-qacoa-cai` is the ckETH/ckERC20 minter — the same
minting account and fee-collector subaccount convention every other
ckERC20 token uses. The minter's own supported-token list separately needs
BAT added so deposits mint ckBAT to the depositor's principal and
withdrawals burn back to Ethereum; the thread doesn't show that step in
detail, so confirm it's still bundled with the orchestrator proposal or
handled separately before finalizing.

**Before finalizing:** check the *current* `get_minter_info` list and the
most recent forum ckERC20 addition — reuse whatever commit/wasm hashes that
one used, not ckOCT's, which are almost two years old now.

## 5. Anticipated questions

**"Is there enough liquidity/relevance?"** Addressed directly in section 3
— this exact question was raised on ckOCT by one reviewer, disputed by the
proposer, and never became a formal bar. BAT is a stronger case than OCT
was on this specific point.

**"Who maintains demand after listing?"** minegold.defi activates
immediately, and its operator intends to fund Brave Ads campaigns — paid in
BAT — reaching BAT earners inside the browser they earn in.

**"Why now?"** Brave's payout infrastructure is shifting toward
self-custody. A standing, neutral, on-chain bridge for BAT positions ICP as
the natural place those flows land, before that behavior calcifies
elsewhere.

## 6. Suggested forum post (short form)

> **Title: Proposal to add ckBAT (Basic Attention Token) to the ckERC20 suite**
>
> I'd like to gauge community support for adding ckBAT via the ledger suite
> orchestrator, following the same path as the ckOCT proposal
> (forum.dfinity.org/t/proposal-to-add-oct-as-a-new-ckerc20-token/32108).
>
> BAT (`0x0D8775F648430679A709E98d2b0Cb6250d2887EF`, 18 decimals, deployed
> 2017, fixed 1.5B supply) is the token Brave browser users earn as ad
> revenue — recurring, real-income flows from one of the largest crypto
> user bases in existence. Those flows are uneconomical to use on Ethereum
> at their natural size ($1–3/month per user); on ICP's fee model they are
> not.
>
> There's a live mainnet application already built against the minter and
> truth-gated on `get_minter_info` BAT support (minegold.defi, which
> refines ckERC20 assets into gold-backed sGLDT), so the listing activates
> a shipped product on day one.
>
> I hold a neuron with the standing to submit the NNS proposal myself once
> there's rough consensus on the parameters (fee range, wasm version to
> reuse) — happy to iterate here first, the way the ckOCT thread did.

## 7. What we (minegold.defi) commit to alongside the listing

- Ship BAT intake the week the minter lists BAT (the code path exists today).
- Publish treasury policy for BAT inventory on our public proof page before
  the first BAT deposit is accepted.
- Fund Brave Ads campaigns, paid in BAT, marketing the on-ramp to Brave
  Rewards users — demand generation for the ck-twin at our own cost.

## 8. What was verified, and how

**Read directly, full thread (39/39 posts), via Anthony's own logged-in
forum session** — the forum returns a login wall to every anonymous fetch
attempt, so this required his browser access, not a workaround:
- The complete ckOCT precedent as summarized in section 3: the initial
  CodeGov rejection and its stated reason, the git_commit_hash discussion,
  the unresolved "top 20" relevance objection and the proposer's rebuttal,
  the fee-range convergence (~0.5–1.5 cents), DFINITY's sign-off, and —
  critically — that the actual NNS proposal was submitted by a community
  neuron-holder, not DFINITY.
- The full, real `didc encode` argument text from the proposal that was
  actually submitted and adopted, field-for-field.
- The real adopted proposal number, 130405, and the wasm-reuse chain
  (129750 → 130755 → 130405) — confirmed via dashboard links posted
  directly in the thread, not reconstructed.

**Verified independently via the live minter dashboard**
(`sv3dd-oaaaa-aaaar-qacoa-cai.raw.icp0.io/dashboard`), separate from the
forum and from minegold.defi's own UI claim: the current 11-token
supported list, BAT absent.

**Corrected from an earlier draft of this document:** that draft (a) cited
ckUNI/ckLINK as precedent instead of the much closer ckOCT case; (b)
asserted, without a source, that a forum post is a *documented DFINITY
requirement* before any technical step — the thread shows it's not a
formal rule, but skipping it got a real proposal rejected on a first pass,
which is a stronger and more specific argument than the one originally
made; (c) implied someone else typically submits the actual NNS proposal
on a community member's behalf — the ckOCT precedent shows a community
neuron-holder submitted directly, which is exactly Anthony's position.

**Still not independently confirmed:** whether the minter's supported-token
list needs a separate action beyond the orchestrator proposal (the ckOCT
thread doesn't cover that half explicitly), and whether the fee-range
guidance from mid-2024 still reflects current thinking — worth a quick
check of the most recent ckERC20 addition's thread before finalizing.

---

*Prepared for Anthony (anthony@cafreso.com), minegold.defi / Banking.Brave,
powered by CafresoDAO.*
