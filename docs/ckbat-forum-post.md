# Forum post — ready to paste

**Where:** forum.dfinity.org → Governance → *NNS proposal discussions*
**Title:** `Proposal to add ckBAT (Basic Attention Token) as a new ckERC20 token`

Everything below the line is the post itself. It is written to be posted
*before* the NNS proposal is submitted, which is the whole point — the ckOCT
proposal was initially rejected by CodeGov for arriving without notice.

Attach `docs/ckbat-logo.svg` to the post so reviewers can see the mark
without decoding the data URL.

---

I'd like to gauge community support for adding **ckBAT** (Basic Attention
Token) to the ckERC20 ledger suite, following the path the
[ckOCT proposal](https://forum.dfinity.org/t/proposal-to-add-oct-as-a-new-ckerc20-token/32108)
took: discuss here first, incorporate feedback, then submit the NNS proposal.

I hold a neuron with the standing to submit it myself once there's rough
consensus, so this thread is the review step, not a request for someone else
to do the work.

## Why BAT

**Let me lead with the weakest part of my own case, because you'll check it
anyway:** BAT is currently ranked **#257 by market cap** (~$98M). It is not
a top-20 or even top-100 token today, and I'm not going to pretend
otherwise. It sat in the top 30 during the 2021 cycle and has fallen a long
way since.

So I'm not arguing this on size. I'm arguing it on **use case**, which I
think is the more relevant bar for chain-key tokens.

BAT is what Brave browser users earn as advertising revenue. That makes the
flows structurally unlike most ERC-20s: **recurring, small, and tied to real
income** rather than to trading. A typical Brave Rewards payout is on the
order of $1–3/month. On Ethereum that is uneconomical to move — the fee
routinely exceeds the payout, so the balance simply sits there. On ICP it is
trivially economical.

That's the argument in one line: **chain-key tokens exist precisely to make
small, recurring transfers viable, and BAT is one of the few ERC-20s whose
core use case is small, recurring transfers.** A large market cap isn't what
makes a token worth bridging; an unserved transfer pattern is.

Two facts that speak to whether it's a *live* asset rather than a dead one,
both checkable right now:

- **24h volume ~$10.3M against a ~$98M market cap** — roughly 10% turnover
  daily. That is healthy liquidity, not a ghost token.
- **Fixed supply, verified on-chain.** `totalSupply()` on the ERC-20 returns
  exactly `1,500,000,000` — matching the documented cap, with no
  fee-on-transfer and no rebasing.

### My interest in this, stated plainly

I operate **minegold.defi**, a live mainnet application that refines ckERC20
assets into a gold-backed token —
[minegold.cafreso.com](https://minegold.cafreso.com), served from canister
`cqyto-tiaaa-aaaau-agppa-cai` (inspect it on the
[dashboard](https://dashboard.internetcomputer.org/canister/cqyto-tiaaa-aaaau-agppa-cai)).
It already runs against the ckERC20 minter and polls `get_minter_info` for
BAT support on every page load, so a listing activates shipped code rather
than a roadmap item. I'd also intend to fund Brave Ads campaigns — paid in
BAT — marketing the on-ramp to Brave Rewards users, which is demand
generation for the ck-twin at my own cost.

That's a real conflict of interest and you should weigh it. But the case
shouldn't rest on my app: if someone else builds the better BAT on-ramp, the
listing was still correct, and I'd rather be voted down on the merits than
adopted on my say-so.

## Token facts

| Field | Value |
|---|---|
| Token | Basic Attention Token (BAT) |
| Ethereum contract | `0x0D8775F648430679A709E98d2b0Cb6250d2887EF` |
| Decimals | 18 |
| Deployed | May 2017 |
| Supply | 1.5 billion, fixed |
| Issuer | Brave Software |
| Market cap rank | #257 (~$98M) |
| 24h volume | ~$10.3M |

Contract verified by `eth_call`: `symbol()` → `BAT`, `decimals()` → 18,
`name()` → `Basic Attention Token`, `totalSupply()` → `1500000000` ×10¹⁸.

## "Isn't Brave moving BAT to Solana?"

Partly, yes — and I'd rather raise this myself than have it raised in reply.
Brave's newer self-custody Rewards payouts settle BAT on Solana, and BAT is
deployed on seven chains today. If you know that, you should be asking why
the *Ethereum* token is the one worth bridging.

Here's the on-chain answer:

| Chain | BAT supply | Share |
|---|---|---|
| **Ethereum (canonical issuance)** | 1,500,000,000 | 100% of issuance |
| Solana (bridged/wrapped) | ~1,639,750 | **~0.11%** |

```bash
# Ethereum — the full supply is minted here
cast call 0x0D8775F648430679A709E98d2b0Cb6250d2887EF "totalSupply()(uint256)"
# → 1500000000000000000000000000

# Solana — the wrapped mint
curl -s -X POST https://api.mainnet-beta.solana.com -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getTokenSupply","params":["EPeUFDgHRxs9xxEPVaL6kfGQvCon7jmAWKVUHuux1Tpz"]}'
# → uiAmount ≈ 1,639,750
```

Roughly **one BAT in a thousand** is on Solana. Ethereum remains where the
asset is actually issued and held, where every major exchange withdraws to
by default, and where years of accumulated Rewards balances already sit. The
Solana deployment is new and, so far, small.

Three honest caveats:

1. **That share may grow.** If Brave's self-custody payouts scale, more BAT
   ends up on Solana over time. I'm proposing based on where the float is
   today, not forecasting where it lands.
2. **This isn't exclusive.** If ICP's Solana integration reaches SPL tokens,
   an SPL-based BAT twin could be added later. Adding the ERC-20 now doesn't
   foreclose that — and ckERC20 infrastructure exists today, while SPL
   support does not.
3. **I'm not claiming Brave payouts land on Ethereum.** Increasingly they
   don't. The addressable population is BAT holders on Ethereum — which, per
   the table above, is very nearly all of them.

## The proposal payload

A single upgrade of the ledger suite orchestrator
(`vxkom-oyaaa-aaaar-qafda-cai`) **to the wasm it is already running**, with
this `AddErc20Arg`:

```candid
(variant { AddErc20Arg = record {
  contract = record {
    chain_id = 1 : nat;
    address = "0x0D8775F648430679A709E98d2b0Cb6250d2887EF";
  };
  ledger_init_arg = record {
    transfer_fee = 100_000_000_000_000_000 : nat;
    decimals = 18 : nat8;
    token_symbol = "ckBAT";
    token_name = "ckBAT";
    token_logo = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0i…";  // full string below
  };
}})
```

Encoded:

| | |
|---|---|
| `args.bin` size | 967 bytes |
| `args.bin` SHA-256 | `3f2e92c566b562f7791b6706b3c564e3e51488500f98d5c5bf7fdfaa8a755206` |
| Orchestrator module hash | `b7294354c6ad8d0466894204471155d47e80af468fbca4759baa64c7c77ca65a` (unchanged) |
| Built from commit | `cf41372e3d4dc1accfe2c09a7969f8bddc729dc1` |

### Reproducing it

Every value comes from mainnet or from DFINITY's published artifacts, and
each check is a one-liner:

```bash
# 1. The commit, read from the running orchestrator itself
dfx canister --network ic metadata vxkom-oyaaa-aaaar-qafda-cai git_commit_id
# → cf41372e3d4dc1accfe2c09a7969f8bddc729dc1

# 2. That commit's wasm reproduces the live module hash exactly
dfx canister --network ic info vxkom-oyaaa-aaaar-qafda-cai   # Module hash: 0xb7294354…
curl -sO "https://download.dfinity.systems/ic/cf41372e3d4dc1accfe2c09a7969f8bddc729dc1/canisters/ic-ledger-suite-orchestrator-canister.wasm.gz"
shasum -a 256 ic-ledger-suite-orchestrator-canister.wasm.gz   # → b7294354…  ✓

# 3. The .did used for encoding is the canister's own interface
dfx canister --network ic metadata vxkom-oyaaa-aaaar-qafda-cai candid:service > from-canister.did
curl -sL -o from-github.did "https://raw.githubusercontent.com/dfinity/ic/cf41372e3d4dc1accfe2c09a7969f8bddc729dc1/rs/ethereum/ledger-suite-orchestrator/ledger_suite_orchestrator.did"
diff from-github.did from-canister.did   # → identical
```

## On the transfer fee

I've proposed **0.1 BAT** (`100_000_000_000_000_000`), ≈ **$0.0065** at
BAT's current ~$0.065.

The orchestrator README gives the rule as *"typically $0.001–$0.01 USD
equivalent, preferably a power of 10."* For BAT that turns out to be
uniquely determined: 0.01 BAT is $0.00065 (under the band) and 1 BAT is
$0.065 (over it). 0.1 BAT is the only power of ten that fits.

For context, here is every live ckERC20 fee read from its own ledger via
`icrc1_fee`, priced today:

| Token | Fee | ≈ USD |
|---|---|---|
| ckEURC | 0.01 | $0.0117 |
| ckUSDC / ckUSDT | 0.01 | $0.0100 |
| **ckBAT (proposed)** | **0.1** | **$0.0065** |
| ckWBTC | 0.0000001 | $0.0064 |
| ckUNI | 0.001 | $0.0044 |
| ckXAUT | 0.000001 | $0.0040 |
| ckPEPE | 1000 | $0.0028 |
| ckWSTETH | 0.000001 | $0.0023 |
| ckLINK | 0.0001 | $0.0008 |
| ckSHIB | 100 | $0.0005 |
| ckOCT | 0.034 | $0.0001 |

Two honest observations. First, ckBAT at 0.1 lands mid-pack — between
ckWBTC and ckUNI — which is where I think it belongs. Second, that table
shows fees are set once and never revisited: ckOCT's is now a hundredth of a
cent because OCT's price fell, not because anyone chose that. So I'd rather
over-discuss this number now. **If people prefer 0.05 BAT, I'll take the
feedback** — it's below the README band but friendlier to the small
recurring payouts that are BAT's actual use case, and I can see the argument.

## A heads-up for anyone reusing an older proposal as a template

The `AddErc20Arg` shape has changed since the ckOCT and ckPEPE proposals.
Copying those payloads verbatim no longer encodes:

```
Error: type mismatch: opt 18 cannot be of type nat8
```

In the current `.did`:

- `AddErc20Arg` holds **only** `contract` and `ledger_init_arg`.
  `git_commit_hash`, `ledger_compressed_wasm_hash` and
  `index_compressed_wasm_hash` have moved to `UpgradeArg` and are no longer
  part of adding a token.
- `LedgerInitArg` is now five fields — `transfer_fee`, `decimals`,
  `token_symbol`, `token_name`, `token_logo`. `minting_account`,
  `fee_collector_account`, `feature_flags` and `archive_options` are set by
  the orchestrator.

Flagging it because the convention of reusing the previous proposal's
arguments is otherwise good advice, and this is a quiet way for it to break.

## What I'd like feedback on

1. **The fee.** 0.1 BAT per the README rule, or 0.05 BAT for a token whose
   deposits are typically a few dollars?
2. **The symbol/name.** I used `ckBAT` for both, matching ckUNI's
   convention of symbol == name. Some suites use a longer `token_name`.
3. **Anything in the payload** you'd want changed before it's submitted —
   after adoption the orchestrator immediately spawns the ledger, index and
   archive and notifies the minter, so there's no correcting a parameter
   without a second proposal.
4. **Whether #257 is disqualifying.** I've made the use-case argument above
   and I think it's the right frame, but if the consensus is that there's a
   market-cap floor for ckERC20 additions, I'd genuinely rather hear that
   stated as a general rule than have it applied case-by-case. It would be
   useful for everyone proposing after me.

Thanks for reading. I'll hold off submitting for at least a week, longer if
discussion is active.

---

## Appendix: full `token_logo` data URL

The official BAT mark, re-canvased to a square `viewBox` (the source file
declared `width`/`height` that didn't match its `viewBox`), 646 characters:

```
data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAwIDIwMDAiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMTQwLjUpIj48cGF0aCBmaWxsPSIjNjYyZDkxIiBkPSJNMjAwMCAxNzE2LjY0IDEwMDQuNzkgMTE0Ni43OCAwIDE3MTkgMjAwMCAxNzE2LjY0eiIvPjxwYXRoIGZpbGw9IiM5ZTFmNjMiIGQ9Ik0xMDA1LjExIDAgMTAwNC43OSAxMTQ2Ljc4IDIwMDAgMTcxNi42NCAxMDA1LjExIDB6Ii8+PHBhdGggZmlsbD0iI2ZmNTAwMCIgZD0iTTAgMTcxOSAxMDA0Ljc5IDExNDYuNzggMTAwNS4xMSAwIDAgMTcxOXoiLz48cGF0aCBmaWxsPSIjZmZmIiBzdHJva2U9IiNmZjUwMDAiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLXdpZHRoPSIyNSIgZD0ibTEwMDIuNzUgNjk1LjY3bC00MTAuODUgNjg2LjI1aDgyMy41NGwtNDEyLjY5LTY4Ni4yNXoiLz48L2c+PC9zdmc+
```

Decode it to inspect:

```bash
python3 -c "import base64,sys;print(base64.b64decode(sys.argv[1]).decode())" "PHN2ZyB4…"
```

The BAT mark is Brave Software's trademark, used here to identify the
underlying asset — the same convention every other ckERC20 token follows.
