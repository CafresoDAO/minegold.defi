# Add ckBAT (Basic Attention Token) to the ckERC20 ledger suite

This proposal upgrades the ckERC20 ledger suite orchestrator
(`vxkom-oyaaa-aaaar-qafda-cai`) **to the exact wasm module it is already
running**, passing an `AddErc20Arg` that instructs it to spawn a ledger, index
and archive for **BAT** and to notify the ckETH/ckERC20 minter.

Discussed on the forum for 12 days before submission:
https://forum.dfinity.org/t/proposal-to-add-ckbat-basic-attention-token-as-a-new-ckerc20-token/74960

## The token

| Field | Value |
|---|---|
| Token | Basic Attention Token (BAT) |
| Ethereum contract | `0x0D8775F648430679A709E98d2b0Cb6250d2887EF` |
| Decimals | 18 |
| Standard | ERC-20 — no fee-on-transfer, no rebasing |
| Deployed | May 2017 |
| Supply | 1,500,000,000, fixed |
| Issuer | Brave Software |
| Market cap rank | #260 (~$88.7M), 2026-08-18 |
| 24h volume | ~$9.5M |

`symbol()`, `decimals()` and `name()` were read directly from the contract via
`eth_call`: `BAT`, `18`, `Basic Attention Token`.

## Why BAT

Stated plainly: BAT is **not** a large-cap token. It ranks #260, it sat in the
top 30 during the 2021 cycle, and it has fallen a long way since. The case
rests on its transfer pattern, not its size.

BAT is what Brave browser users earn as advertising revenue. That makes its
flows structurally unlike most ERC-20s — **recurring, small, and tied to real
income** rather than to trading. A typical Brave Rewards payout is on the order
of $1–3/month. On Ethereum that is uneconomical to move: the gas fee routinely
exceeds the payout, so the balance simply sits. On ICP it is trivially
economical. This is precisely the shape of flow chain-key tokens serve better
than the origin chain does.

Liquidity is real: ~$9.5M of 24h volume against an ~$88.7M cap is roughly 10%
turnover daily.

## Transfer fee: 0.1 BAT

`transfer_fee = 100_000_000_000_000_000` (0.1 BAT at 18 decimals) ≈ **$0.0059**
at BAT's current ~$0.0593.

The orchestrator README gives the rule as *"typically $0.001–$0.01 USD
equivalent, preferably a power of 10."* For BAT that is uniquely determined:

- 0.01 BAT = $0.00059 — below the band
- **0.1 BAT = $0.0059 — the only power of ten inside it**
- 1 BAT = $0.0593 — above the band

Against live ckERC20 fees read from each ledger's own `icrc1_fee`, 0.1 BAT
lands mid-pack, between ckWBTC and ckUNI.

Note for voters: ckERC20 fees are set once at listing and are not routinely
revisited — ckOCT's is now a hundredth of a cent because OCT's price fell, not
because anyone chose that. This number is defended against today's price, and a
follow-up proposal can adjust it if BAT moves materially. 0.1 BAT remains the
correct power of ten anywhere from roughly $0.01 to $0.10.

## What a voter should verify

Every value in this proposal is reproducible from mainnet state and DFINITY's
published build artifacts. Each check is a one-liner.

**1. The commit, read from the running orchestrator itself:**

```
dfx canister --network ic metadata vxkom-oyaaa-aaaar-qafda-cai git_commit_id
# → cf41372e3d4dc1accfe2c09a7969f8bddc729dc1
```

**2. That commit's wasm reproduces the live module hash exactly** — this is what
proves the module being installed is the module already running:

```
dfx canister --network ic info vxkom-oyaaa-aaaar-qafda-cai
# Module hash: 0xb7294354c6ad8d0466894204471155d47e80af468fbca4759baa64c7c77ca65a

curl -sO "https://download.dfinity.systems/ic/cf41372e3d4dc1accfe2c09a7969f8bddc729dc1/canisters/ic-ledger-suite-orchestrator-canister.wasm.gz"
shasum -a 256 ic-ledger-suite-orchestrator-canister.wasm.gz
# → b7294354c6ad8d0466894204471155d47e80af468fbca4759baa64c7c77ca65a  ✓
```

**3. The `.did` used to encode the argument is the canister's own interface:**

```
dfx canister --network ic metadata vxkom-oyaaa-aaaar-qafda-cai candid:service > from-canister.did
curl -sL -o from-github.did "https://raw.githubusercontent.com/dfinity/ic/cf41372e3d4dc1accfe2c09a7969f8bddc729dc1/rs/ethereum/ledger-suite-orchestrator/ledger_suite_orchestrator.did"
diff from-github.did from-canister.did   # → identical
```

**4. The argument itself.** SHA-256 `3f2e92c566b562f7791b6706b3c564e3e51488500f98d5c5bf7fdfaa8a755206`,
967 bytes, encoding:

```
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
    token_logo = "data:image/svg+xml;base64,...";
  };
}})
```

It round-trips through `didc decode` back to the source text, so the bytes are
confirmed to be what would execute.

## Scope and irreversibility

The orchestrator's `minter_id` is already set to `sv3dd-oaaaa-aaaar-qacoa-cai`,
so a single adopted proposal both creates the ledger suite and enables minting —
there is no second action, no staging step and no dry run. On execution this
spawns live canisters and switches on a real deposit path. A wrong
`transfer_fee` would be a permanent economic parameter absent a further
proposal; a wrong contract address would create a ledger for the wrong asset.
That is why every value above is stated together with the command that
reproduces it.

## Logo

The `token_logo` is Brave Software's official BAT mark, re-canvased to a square
`viewBox` and inlined as a 646-character SVG data URL. It is Brave's trademark,
used here to identify the underlying asset — the same convention every other
ckERC20 token follows (ckUNI carries Uniswap's mark, and so on).

## Disclosure of interest

The proposer operates minegold.defi (`cqyto-tiaaa-aaaau-agppa-cai`), a live ICP
mainnet application that refines ckERC20 assets into a gold-backed token. It is
already built against the ckERC20 minter and polls `get_minter_info` for BAT
support, so this listing activates a shipped product. The proposer also intends
to fund Brave Ads campaigns, paid in BAT, marketing the on-ramp to Brave Rewards
users — demand generation for the ck-twin at the proposer's own cost.

This interest is disclosed so voters can weigh it. The technical payload above
stands or falls independently of it, and every value in it is verifiable without
trusting the proposer.
