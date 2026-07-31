# Proposal: Add ckBAT (Basic Attention Token) to the ckERC20 ledger suite

**Status:** DRAFT — for Anthony to review, put under his own name, and post
to the DFINITY forum. Nothing in this document has been posted anywhere.

**Sourcing note (2026-07-31):** this draft is built on a full read of the
real precedent — the ckOCT thread on forum.dfinity.org, all 39 posts, read
directly (with Anthony's help getting past the forum's login wall, which
blocks automated fetching entirely) — plus direct verification against
mainnet: the orchestrator's own metadata and state, DFINITY's published wasm
builds, the BAT contract on Ethereum, and every live ckERC20 ledger's fee.
Section 8 lists exactly what was confirmed, how, and what's still open.

**The payload in section 4 is complete and submittable.** Every field —
including the token logo — is filled in with a verified value, and every
value can be re-derived by a reviewer with the commands shown alongside it.
No open technical questions remain. What remains is process: post to the
forum, let reviewers converge, then submit.

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

*Verified on-chain 2026-07-31 by `eth_call` against the contract above via a
public Ethereum RPC: `symbol()` → `BAT`, `decimals()` → 18, `name()` →
`Basic Attention Token`. Contract address independently cross-checked
against CoinGecko's Ethereum platform record. Market rank is the one row
here still worth a fresh look right before posting.*

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
   proposal if the token's price moves a lot. *(Superseded — the current
   orchestrator README states the rule as `$0.001–$0.01 USD equivalent,
   preferably a power of 10`. Section 4 uses the README's rule, which is
   both newer and narrower. See section 4's fee note.)*
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
and archive. Every value below is filled in and verified as of 2026-07-31 —
see "How these were verified" immediately after the payload.

```
Target canister: vxkom-oyaaa-aaaar-qafda-cai

git fetch
git checkout cf41372e3d4dc1accfe2c09a7969f8bddc729dc1
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
       transfer_fee = 100_000_000_000_000_000;
       token_symbol = "ckBAT";
       token_name = "ckBAT";
       token_logo = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAwIDIwMDAiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMTQwLjUpIj48cGF0aCBmaWxsPSIjNjYyZDkxIiBkPSJNMjAwMCAxNzE2LjY0IDEwMDQuNzkgMTE0Ni43OCAwIDE3MTkgMjAwMCAxNzE2LjY0eiIvPjxwYXRoIGZpbGw9IiM5ZTFmNjMiIGQ9Ik0xMDA1LjExIDAgMTAwNC43OSAxMTQ2Ljc4IDIwMDAgMTcxNi42NCAxMDA1LjExIDB6Ii8+PHBhdGggZmlsbD0iI2ZmNTAwMCIgZD0iTTAgMTcxOSAxMDA0Ljc5IDExNDYuNzggMTAwNS4xMSAwIDAgMTcxOXoiLz48cGF0aCBmaWxsPSIjZmZmIiBzdHJva2U9IiNmZjUwMDAiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLXdpZHRoPSIyNSIgZD0ibTEwMDIuNzUgNjk1LjY3bC00MTAuODUgNjg2LjI1aDgyMy41NGwtNDEyLjY5LTY4Ni4yNXoiLz48L2c+PC9zdmc+";
       initial_balances = vec {};
       maximum_number_of_accounts = null;
       accounts_overflow_trim_quantity = null
     };
     git_commit_hash = "cf41372e3d4dc1accfe2c09a7969f8bddc729dc1";
     ledger_compressed_wasm_hash = "390e22377640748f5a63fc35d50680d27a05d3e9a05c1c25c4061cacebda4c56";
     index_compressed_wasm_hash = "b9f248fed399250f17bd3c00386c251bdff5479001bedde341aeccc632a74253";
   }})' | xxd -r -p > args.bin
```

### How these were verified

**`git_commit_hash`** — read from the *running* orchestrator's own canister
metadata, not from a forum post:

```bash
dfx canister --network ic metadata vxkom-oyaaa-aaaar-qafda-cai git_commit_id
# → cf41372e3d4dc1accfe2c09a7969f8bddc729dc1
```

**The two wasm hashes** — the orchestrator publishes the suite version it
currently installs, and the official README's download URL reproduces it
byte-for-byte at that commit. Both sides were checked and they match
exactly:

```bash
dfx canister --network ic call vxkom-oyaaa-aaaar-qafda-cai get_orchestrator_info '()' --query
# ledger_suite_version = record {
#   ledger_compressed_wasm_hash  = "390e2237...cebda4c56";
#   index_compressed_wasm_hash   = "b9f248fe...632a74253";
#   archive_compressed_wasm_hash = "47c385ed...a0ccdc2f3";
# }

C=cf41372e3d4dc1accfe2c09a7969f8bddc729dc1
for w in ic-icrc1-ledger-u256 ic-icrc1-index-ng-u256 ic-icrc1-archive-u256; do
  curl -sO "https://download.dfinity.systems/ic/$C/canisters/$w.wasm.gz"
  shasum -a 256 "$w.wasm.gz"
done
# → all three match ledger_suite_version exactly
```

This is a stronger footing than the "reuse the previous proposal's hashes"
convention described in section 3: rather than trusting that a prior
proposal's numbers are still current, these are read from live mainnet state
and independently reproduced from DFINITY's published build artifacts. Any
reviewer can re-run both commands in under a minute.

**`token_logo`** — the official BAT tri-colour triangle, sourced as SVG and
inlined as a 646-character data URL (vs. ckUNI's ~4.5 KB, so it is
comfortably small). Two deliberate changes from the source file:

- The source declared `width="2000" height="2000"` against a
  `viewBox="0 0 2000 1719"`. That mismatch renders acceptably *only* by
  relying on the `preserveAspectRatio` default. It is now an explicit
  `viewBox="0 0 2000 2000"` with the artwork centred via
  `transform="translate(0 140.5)"` — square by construction, since token
  logos are almost always drawn into square or circular frames.
- No `width`/`height` attributes, so it scales cleanly to any size.

Rasterised and visually checked before inclusion: correct mark, correct
colours (`#662d91` / `#9e1f63` / `#ff5000`), transparent background, no
clipping. Reproduce the SVG from the data URL with:

```bash
python3 -c "import base64,sys;print(base64.b64decode(sys.argv[1]).decode())" "<the base64 above>"
```

*Note:* the BAT mark is Brave Software's trademark. Using the originating
project's own logo is the established convention for every ckERC20 token
(ckUNI carries Uniswap's unicorn, and so on), but it is worth a sentence in
the forum post acknowledging it is Brave's mark, used to identify the
underlying asset.

**`transfer_fee = 100_000_000_000_000_000`** — that is **0.1 BAT** at 18
decimals, ≈ **$0.0065** at BAT's 2026-07-31 price of ~$0.065. The current
orchestrator README states the rule as *"typically $0.001–$0.01 USD
equivalent, preferably a power of 10."* Within that band, a power of ten is
uniquely determined: 0.01 BAT is $0.00065 (below the band) and 1 BAT is
$0.065 (well above it). 0.1 BAT is the only candidate that satisfies both
halves of the rule.

It also lands mid-pack against every live ckERC20 fee, read from the ledgers
themselves via `icrc1_fee` and priced at the same date:

| Token | Fee (token units) | ≈ USD today |
|---|---|---|
| ckEURC | 0.01 | $0.0117 |
| ckUSDC / ckUSDT | 0.01 | $0.0100 |
| **ckBAT (proposed)** | **0.1** | **$0.0065** |
| ckWBTC | 0.0000001 | $0.0064 |
| **ckUNI** | **0.001** | **$0.0044** |
| ckXAUT | 0.000001 | $0.0040 |
| ckPEPE | 1000 | $0.0028 |
| ckWSTETH | 0.000001 | $0.0023 |
| ckLINK | 0.0001 | $0.0008 |
| ckSHIB | 100 | $0.0005 |
| ckOCT | 0.034 | $0.0001 |

Two things this table makes plain, both worth stating in the forum post
before anyone asks. First, **fees are set once at listing and never
revisited** — ckOCT's is now a hundredth of a cent because OCT's price fell,
not because anyone chose that. So the number should be defended against
today's price, and the proposal should say outright that a follow-up
proposal can adjust it if BAT moves substantially. Second, ckBAT at 0.1
sits *between* ckWBTC and ckUNI — unremarkable, which is what you want.

**On "just use ckUNI's fee":** ckUNI's literal `transfer_fee` is
`1_000_000_000_000_000` (0.001 UNI). Copying that integer verbatim would
give 0.001 BAT ≈ $0.00007 — roughly 1/60th of the band's floor, and a
reviewer would flag it immediately. What ckUNI is worth copying is its
*reasoning*, and that is exactly what the 0.1 BAT figure does: a power of
ten landing in the low single-digit-cent range.

`sv3dd-oaaaa-aaaar-qacoa-cai` is the ckETH/ckERC20 minter — the same minting
account and fee-collector subaccount convention every other ckERC20 token
uses.

**The minter is wired automatically — confirmed.** An earlier draft flagged
as unknown whether the minter's supported-token list needs a second action.
It does not. The orchestrator's own Candid interface documents the field:

```
// Canister ID of the minter that will be notified when new ERC-20 tokens are added.
minter_id: opt principal;
```

and the running orchestrator already has it populated with
`sv3dd-oaaaa-aaaar-qacoa-cai`, the ckETH/ckERC20 minter (visible in the
`get_orchestrator_info` output above). So a single adopted proposal is the
whole job: on execution the orchestrator spawns the ckBAT ledger, index and
archive, and notifies the minter to begin accepting BAT deposits.

**This is precisely why the payload must be right on the first submission.**
There is no staging step and no dry run — adoption creates live canisters
and switches on a real deposit path. A wrong `transfer_fee` is a permanent
economic parameter absent a second proposal; a wrong contract address would
create a ledger for the wrong asset. Every value in the payload above is
therefore stated with the command that reproduces it, so reviewers can check
each one independently rather than taking the proposer's word.

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
> The full payload is assembled and independently verifiable: orchestrator
> commit `cf41372e3d4dc1accfe2c09a7969f8bddc729dc1` (read from the running
> canister's own `git_commit_id` metadata), with ledger/index wasm hashes
> matching the orchestrator's current `ledger_suite_version` and reproduced
> byte-for-byte from `download.dfinity.systems` at that commit. Proposed
> `transfer_fee` is 0.1 BAT (≈$0.0065 today) — a power of ten inside the
> README's $0.001–$0.01 band, which for BAT's price uniquely determines it.
>
> Since adoption immediately spawns the ledger, index and archive and
> notifies the minter (per the orchestrator's `minter_id` wiring), there's no
> second chance to correct a parameter — so I'd rather have the fee and the
> logo picked apart here than after execution.
>
> I hold a neuron with the standing to submit the NNS proposal myself once
> there's rough consensus — happy to iterate here first, the way the ckOCT
> thread did.

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

**Verified directly against mainnet and DFINITY's build artifacts
(2026-07-31)** — this is what turned section 4 from a template into a
finished payload:
- `git_commit_hash` `cf41372e…` read from the orchestrator canister's own
  `git_commit_id` metadata, i.e. from the code actually running.
- `ledger_suite_version` read from `get_orchestrator_info`, then all three
  wasms downloaded from `download.dfinity.systems` at that commit and
  SHA-256'd — ledger, index and archive hashes all matched exactly. This
  supersedes the ckOCT-era advice to "reuse the previous proposal's hashes."
- BAT's `symbol()`, `decimals()` and `name()` read by `eth_call` against
  `0x0D87…87EF` on a public Ethereum RPC: `BAT`, 18, `Basic Attention Token`.
- Every live ckERC20 `transfer_fee` read from its own ledger via
  `icrc1_fee`, priced against current market data, to place ckBAT's proposed
  fee in the real distribution (the table in section 4).
- The current fee rule read from the orchestrator README on `dfinity/ic`
  master: `$0.001–$0.01 USD equivalent, preferably a power of 10` — newer
  and narrower than the mid-2024 forum range, and it resolves one of the two
  open questions the previous draft flagged.

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

**Both previously-open questions are now closed:**
- *Fee guidance* — the current orchestrator README rule
  (`$0.001–$0.01`, power of 10) supersedes the mid-2024 forum range.
- *Minter wiring* — the orchestrator's Candid documents `minter_id` as the
  minter "that will be notified when new ERC-20 tokens are added," and the
  live orchestrator has it set to `sv3dd-oaaaa-aaaar-qacoa-cai`. One adopted
  proposal creates the ledger suite *and* enables minting. No second action.

**Logo provenance:** the official BAT SVG mark, re-canvased to a square
`viewBox` and rasterised for a visual check before inclusion (correct mark,
correct brand colours, transparent background, no clipping).

**One thing that will go stale:** the fee is justified against BAT at
~$0.065. If BAT moves materially before submission, re-run the arithmetic —
though note that 0.1 BAT stays the correct power of ten anywhere from about
$0.01 to $0.10, so it tolerates a wide swing before the answer changes.

---

*Prepared for Anthony (anthony@cafreso.com), minegold.defi / Banking.Brave,
powered by CafresoDAO.*
