import { c as createLucideIcon, j as jsxRuntimeExports, T as ThemeToggle } from "./index-Cnm2qphK.js";
import { r as renderMarkdown } from "./markdown-D5Urscps.js";
import { A as ArrowLeft } from "./arrow-left-84sTGc_F.js";
import { A as ArrowRight } from "./arrow-right-CcVc8Kyp.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
];
const FileText = createLucideIcon("file-text", __iconNode);
const howItWorks = "# How it works\n\nminegold.defi takes a token you already hold on Ethereum and converts it into\nsGLDT — a token backed, through two wrappers, by physical gold in a Swiss\nvault. This page explains every step of that path, including the parts that\nare other people's infrastructure rather than ours.\n\nIf you only read one other page, make it [Risks & limitations](/docs/risks).\n\n## The short version\n\n1. You sign in with a passkey. That creates your **vault** — an account only\n   your device's biometrics can open.\n2. You connect the Ethereum **wallet** holding your UNI.\n3. You deposit. Two signatures in your wallet, then Ethereum confirms.\n4. sGLDT lands in your vault. You can withdraw it back to ckUNI at any time.\n\nFour steps, about three minutes — most of which is Ethereum confirming, not\nus doing anything.\n\n## The long version\n\n### Step 1 — Your vault is not an account with us\n\nSigning in creates an Internet Identity: a keypair your device holds and your\nbiometrics unlock. We never see a password, and there is no account for us to\nfreeze, because there is no account — there is a principal that owns balances\non public ledgers.\n\nThe practical consequence is worth being blunt about: **we cannot recover your\nvault for you.** There is no reset link. That is the direct cost of there\nbeing no one who can seize it either. See\n[Redeem & recovery](/docs/redeem-and-recovery) for what this means in\npractice.\n\n### Step 2 — Your UNI crosses to the Internet Computer, and we don't carry it\n\nThis is the part people assume is the risky bit, and it is the part we have\nthe least to do with.\n\nYour UNI is bridged by **DFINITY's chain-key ERC-20 minter**\n(`sv3dd-oaaaa-aaaar-qacoa-cai`) — NNS-governed infrastructure, not our code.\nYou send UNI to its helper contract on Ethereum. After **12 Ethereum block\nconfirmations** (roughly three minutes), the minter credits **ckUNI to your\nown principal** on the ckUNI ledger.\n\nTwo things follow from that, and both matter:\n\n- The bridged ckUNI is **yours**, sitting in your account on a DFINITY-run\n  ledger, before this application touches it. We are not a custodian of it.\n- Because it lands in your account automatically, **a deposit cannot go\n  missing in transit**. If you close the tab mid-flow, the ckUNI still\n  arrives. The next time you sign in, the app sees the un-refined balance and\n  offers to continue.\n\n### Step 3 — The swap is atomic, or it doesn't happen\n\nWhen you confirm the deposit, the refinery backend\n(`c626g-iyaaa-aaaau-agpoa-cai`) does two things as one unit: it pulls your\nckUNI, and it pays you sGLDT from treasury inventory at the current rate.\n\nIf the payout leg fails for any reason — most plausibly the treasury being\nshort of sGLDT — the pull is reversed and **your ckUNI is refunded**. There is\nno state in which we hold your tokens and owe you gold.\n\nBecause ICRC ledgers charge their fee on top of the amount moved, and this\nflow moves through two ledger operations, the smallest deposit worth making\nis **0.005 UNI**. Below that, fees consume the deposit. The app enforces this\nrather than letting you make a losing trade.\n\nIn the rare case where even the refund fails, the swap is recorded as\n**stranded** and held for manual resolution. Nothing is silently dropped, and\nthe live count of stranded swaps is published on\n[/proof](/proof) — including when it is zero, which is when publishing it\nmeans something.\n\n### Step 4 — What you're actually holding\n\nsGLDT is a 1:1 wrapper of **GLDT**, Gold DAO's token. Each GLDT is backed by\n**0.01 g of LBMA-sourced physical gold** held in audited Swiss vaults.\n\nThe wrapper exists for one unglamorous reason: transfer fees. GLDT costs 0.10\nper transfer; sGLDT costs 0.00001 — about 10,000× cheaper. For a product\ndoing many small conversions, that difference is the difference between\nviable and not.\n\nYou can unwrap sGLDT to GLDT at sVault whenever you like, and Gold DAO's own\nprocess lets you redeem GLDT for metal. Neither of those is ours: **sVault's\ncontract holds the peg, and Gold DAO holds the gold.** We link to them; we\ndon't control them.\n\n## Who controls what\n\nThe single most useful thing you can know about a financial application is\nwhich parts its operator can change. Here is ours, in full:\n\n| Component | Controlled by |\n|---|---|\n| Refinery backend (the treasury) | **The operator** — one person |\n| Frontend canister | **The operator** — one person |\n| ckUNI ledger | DFINITY (NNS) |\n| ckERC-20 minter | DFINITY (NNS) |\n| Exchange Rate Canister (the UNI/USD oracle) | DFINITY (NNS) |\n| sGLDT ledger | Gold DAO / sVault |\n\nEvery one of those canister IDs, and the operator's single controller\nprincipal, is listed on [/proof](/proof) with dashboard links. You can verify\neach claim with `dfx canister info` without asking us anything.\n\n## What this application never does\n\n- It never takes custody of your gold. Settled sGLDT is in your vault, not\n  ours.\n- It never has a path to your Ethereum wallet beyond the approval you sign,\n  which you can revoke at [revoke.cash](https://revoke.cash) at any time.\n- It never quotes you a price it can't honour: the rate is read from the\n  canister, and the swap either settles at that rate or refunds.\n\n## Next\n\n- [The rate, in full](/docs/rate-methodology) — the exact formula, its two\n  inputs, and which one is operator-set.\n- [Redeem & recovery](/docs/redeem-and-recovery) — getting out, and what to do\n  when something goes wrong.\n- [Risks & limitations](/docs/risks) — the honest list.\n";
const rateMethodology = "# How the rate is made\n\nThe exchange rate is the single number that decides what you get. This page\npublishes the whole formula, both of its inputs, which one we control, and\nevery guardrail around it.\n\nThe live values — current rate, oracle price, sync age — are on\n[/proof](/proof). This page explains what those numbers mean.\n\n## The formula\n\n```\n                UNI/USD  (Exchange Rate Canister, hourly)\n1 UNI  =  ─────────────────────────────────────────────────  sGLDT\n                sGLDT/USD  (operator-set reference)\n```\n\nBoth legs carry 1e8 precision. That is the entire calculation — there is no\nspread applied on top, no dynamic fee, and no hidden margin between the rate\nshown and the rate settled.\n\n## Leg 1 — UNI/USD, from DFINITY's oracle\n\nSource: the **Exchange Rate Canister** (`uf6dk-hyaaa-aaaaq-qaaaq-cai`), NNS\ninfrastructure that aggregates prices across exchanges. We read it; we cannot\ninfluence what it says.\n\nIt syncs on an **hourly cadence**. The age of the last successful sync is\ndisplayed on /proof, and if the oracle is failing, the last error is\npublished there too rather than hidden behind a stale-looking number.\n\n## Leg 2 — sGLDT/USD, set by the operator\n\nThis is the leg to scrutinise, so here is the unvarnished version.\n\nsGLDT trades on **one ICPSwap pool**, which the Exchange Rate Canister does\nnot index. There is no independent oracle for it. So the reference price is\nset by the operator, tracking GLDT's gold-derived value.\n\nWe would prefer this to be automated, and it should become automated. Today\nit is not, and calling it anything other than operator-set would be\nmisleading.\n\nIf the reference has not been set, the canister falls back to a **manual\nrate**, and /proof says so explicitly rather than displaying a computed\nnumber that isn't one.\n\n## The guardrails, with their actual numbers\n\nThese constrain what the rate can do — including what *we* can do to it.\n\n### ±30% — oracle jump rejection\n\nAn oracle reading that differs from the current rate by more than 30% is\n**rejected**. A flash-crash print or a bad aggregation can't drag the\nsettlement rate with it.\n\nThe tradeoff is deliberate and worth naming: if UNI genuinely moves more than\n30%, the rate goes stale and requires a **one-time operator re-anchor** to\nresume. We chose a stale rate that stops trading over a wrong rate that keeps\ntrading.\n\n### ±2% — UI hint clamp\n\nThe frontend sends a rate hint with each swap so the price you saw is the\nprice you get. The canister clamps that hint to **±2%** of its own rate.\n\nThis exists to answer a specific attack: if the frontend were compromised or\nreplaced, it still could not make the backend settle at an arbitrary price.\nThe canister is the authority; the UI is a suggestion within a narrow band.\n\n### 500,000 sGLDT / 50 ckUNI — admin transfer caps\n\nAdministrative transfers are capped per transaction. This bounds the size of\nany single operator action, including a mistaken one.\n\nIt does **not** bound repeated actions. It is a limit on blast radius, not a\nsubstitute for the multi-party control that doesn't exist yet — see\n[Risks & limitations](/docs/risks).\n\n## What you settle at\n\nThe rate that applies is the one **current when your swap executes**, not\nwhen you started it. Ethereum finality takes about three minutes, and the\nrate can move within that window.\n\nYour receipt records the settled rate and the sGLDT ledger block index of the\npayout, so every completed swap can be reconciled against the ledger\nindependently of anything we display.\n\n## What would make this better\n\nStated because a methodology page that lists no gaps isn't a methodology\npage:\n\n1. **An independent sGLDT/USD source.** The clearest single improvement:\n   removes the operator from the pricing path.\n2. **A published re-anchor log.** Every operator re-anchor, with timestamp\n   and reason, visible on /proof rather than inferable from rate history.\n3. **Time-locked rate parameters.** A delay between setting a reference and\n   it taking effect, so a change is observable before it settles anything.\n\nNone of these exist today. They are the honest roadmap for this page, and\nthis section is here so the absence is on the record rather than discovered.\n";
const redeemAndRecovery = `# Redeem & recovery

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
ledger (\`ilzky-ayaaa-aaaar-qahha-cai\`) via the ICP dashboard, without
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
`;
const risks = "# Risks & limitations\n\nThis page exists because a financial application that only publishes its\nstrengths is telling you something by omission. Everything below is a real\nlimitation of minegold.defi as it stands today. None of it is hypothetical\nboilerplate.\n\nIf any single item here is unacceptable to you, that is a correct reason not\nto use this product, and we would rather you learn it here than afterwards.\n\n## The four that matter most\n\n### 1. The code is unaudited\n\nNo third party has audited the refinery backend. Not a firm, not a formal\nverification pass, not a bug bounty with a meaningful payout.\n\nWhat partially offsets this: the money path is short, the treasury logic is\natomic-with-refund rather than multi-step, and every canister is inspectable\non-chain. What does not offset it: none of that is the same thing as an\naudit, and we will not present it as though it were.\n\n### 2. One person controls the treasury\n\nThe refinery backend and the frontend canister have exactly **one\ncontroller** — a single principal, published in full on [/proof](/proof).\n\nThat person can upgrade the backend. Practically, that means the honest\nstatement is: *the protections described on this site are enforced by code\nthat one person can change.* Time-locks, an SNS, or multi-party control would\nchange that. None of them exist today.\n\nThis is the risk that most deserves your attention, because it is the one\nthat no amount of on-chain verification eliminates. You can verify what the\ncode does right now. You cannot verify what it will do after the next\nupgrade.\n\n### 3. One leg of the exchange rate is operator-set\n\nThe rate is UNI/USD from DFINITY's Exchange Rate Canister, divided by an\n**sGLDT/USD reference the operator sets**. The oracle leg is independent\ninfrastructure. The reference leg is not.\n\nThe reason it is operator-set rather than fetched is genuine rather than\nconvenient: sGLDT trades on a single ICPSwap pool that the XRC cannot see. It\nhas to come from somewhere, and today it comes from us.\n\nThe guardrails on this are real, but they are guardrails, not independence:\n\n- Oracle readings that jump **±30%** from the current rate are rejected\n  outright; a genuine larger move requires a deliberate operator re-anchor.\n- Rate hints sent by the UI are clamped to **±2%** of the canister's own\n  rate, so a tampered frontend cannot move the price it settles at.\n- Administrative transfers are capped at **500,000 sGLDT / 50 ckUNI** per\n  transaction.\n\n[The full formula, with its provenance](/docs/rate-methodology), is published\nseparately.\n\n### 4. Payouts depend on treasury liquidity\n\nYour deposit is paid from sGLDT the treasury already holds. If the treasury\nis short, **your deposit is refunded** — this is the designed behaviour, not\na failure mode.\n\nBut refunded is not the same as filled. If liquidity runs out, the product\nstops working until it is topped up. Current coverage is shown live on\n[/proof](/proof), and we would rather you watch that number than take our\nword for its health.\n\n## What we depend on that we don't control\n\nA failure in any of these breaks this product, and we could not fix it:\n\n| Dependency | Run by | What breaks if it fails |\n|---|---|---|\n| ckERC-20 minter | DFINITY (NNS) | Deposits stop bridging |\n| ckUNI ledger | DFINITY (NNS) | Bridged funds inaccessible |\n| Exchange Rate Canister | DFINITY (NNS) | Rate goes stale; swaps gate off |\n| sGLDT ledger | sVault | Payouts and withdrawals halt |\n| GLDT / physical backing | Gold DAO | The gold claim itself |\n\nThe sGLDT dependency is worth stating twice: **sGLDT's peg is sVault's\ncontract, and GLDT's gold backing is Gold DAO's.** We integrate them. If\neither fails, holding sGLDT is not a claim on us that we could honour.\n\n## Smaller, but real\n\n- **Ethereum finality takes time.** Roughly three minutes at 12 block\n  confirmations. During that window the rate can move; the swap settles at\n  the rate current when it executes, not when you started.\n- **Gas is yours.** Deposits require ETH for gas. On a small deposit, gas can\n  be a large fraction of the value. The app refuses to start a swap it can\n  see you can't afford, but it cannot make Ethereum cheap.\n- **Minimums exist because fees do.** 0.005 UNI to deposit, 0.1 sGLDT to\n  withdraw. Below those, ledger fees eat the transaction.\n- **Stranded swaps require a human.** If a swap fails *and* its refund fails,\n  it is held as a stranded record for manual resolution. The count is\n  published live on [/proof](/proof), at zero as well as above it.\n- **Your vault cannot be recovered by us.** No password reset exists. See\n  [Redeem & recovery](/docs/redeem-and-recovery).\n- **Gold has a price, and it moves.** Nothing here protects you from the gold\n  price falling. This is a conversion, not a yield product, and there is no\n  return being promised.\n\n## What is not a risk here, and why\n\nStated so the list above reads as a real assessment rather than a defensive\none:\n\n- **We cannot spend your settled sGLDT.** Once a swap settles, the tokens are\n  in your vault on a ledger we don't control. Our treasury's health stops\n  mattering to you at that moment.\n- **We cannot lose your deposit in transit.** The bridge credits ckUNI to\n  your own principal before we touch it. Closing the tab does not lose funds.\n- **We cannot quietly change your price.** The settlement rate comes from the\n  canister, with the UI clamped to ±2% of it.\n- **There is no leverage, lending, or yield scheme** operating on treasury\n  assets. The [treasury policy](/proof) states this, and it was published\n  before there was any pressure to have one.\n\n## How to verify all of this yourself\n\nEvery claim on this page is checkable without our cooperation:\n\n- Canister IDs, controllers, and live treasury balances: [/proof](/proof)\n- Controller verification: `dfx canister info <canister-id>`\n- Ledger balances and blocks: the ICP dashboard links on /proof\n- The gold backing: [gldt.org](https://gldt.org)\n\nIf you find something on this page that is no longer true, that is a bug and\nwe want to hear about it.\n";
const DOCS = [
  {
    slug: "how-it-works",
    title: "How it works",
    blurb: "The full path from a token on Ethereum to gold-backed sGLDT — including the parts run by DFINITY and Gold DAO rather than by us.",
    body: howItWorks
  },
  {
    slug: "risks",
    title: "Risks & limitations",
    blurb: "Unaudited, single-operator, one rate leg we set ourselves. The honest list, and how to verify every item on it.",
    body: risks
  },
  {
    slug: "rate-methodology",
    title: "How the rate is made",
    blurb: "The whole formula, both inputs, every guardrail with its actual number — and what would make it better.",
    body: rateMethodology
  },
  {
    slug: "redeem-and-recovery",
    title: "Redeem & recovery",
    blurb: "Three ways out, two of which don't involve us at all. Plus what to do when a step goes wrong.",
    body: redeemAndRecovery
  }
];
const docBySlug = (slug) => DOCS.find((d) => d.slug === slug);
function DocsPage({ slug, onBack, onNavigatePath }) {
  const doc = slug ? docBySlug(slug) : void 0;
  const interceptLinks = (e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = e.target.closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!(href == null ? void 0 : href.startsWith("/"))) return;
    e.preventDefault();
    onNavigatePath(href);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-ocid": "docs.page",
      className: "min-h-screen",
      style: { background: "var(--bb-bg)", color: "var(--bb-text)" },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-10 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              "data-ocid": "docs.back",
              onClick: () => doc ? onNavigatePath("/docs") : onBack(),
              className: "inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold",
              style: { color: "var(--bb-text-muted)" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { size: 14 }),
                " ",
                doc ? "All docs" : "minegold.defi"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeToggle, {})
        ] }),
        doc ? /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { "data-ocid": "docs.article", onClick: interceptLinks, children: [
          renderMarkdown(doc.body),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "nav",
            {
              className: "mt-12 border-t pt-6",
              style: { borderColor: "var(--bb-border)" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label mb-3", style: { color: "var(--bb-text-dim)" }, children: "Other docs" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "space-y-2", children: DOCS.filter((d) => d.slug !== doc.slug).map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => onNavigatePath(`/docs/${d.slug}`),
                    className: "inline-flex min-h-[36px] items-center gap-1.5 text-sm font-semibold",
                    style: { color: "var(--bb-brand)" },
                    children: [
                      d.title,
                      " ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 13 })
                    ]
                  }
                ) }, d.slug)) })
              ]
            }
          )
        ] }) : slug ? (
          /* Unknown slug — a real 404 rather than a blank page, since the
             asset canister SPA-fallbacks every unknown path to this app. */
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "docs.notfound", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "t-display", style: { fontSize: "1.75rem" }, children: "No such document" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-3 text-[15px]", style: { color: "var(--bb-text-muted)" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("code", { className: "font-mono", children: [
                "/docs/",
                slug
              ] }),
              " doesn't exist. Everything we publish is listed below."
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DocIndex, { onNavigatePath }) })
          ] })
        ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label mb-3", style: { color: "var(--bb-text-dim)" }, children: "Documentation" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "t-display", style: { fontSize: "clamp(1.9rem, 1.4rem + 2.2vw, 2.75rem)" }, children: "How this works, and what it can't do." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              className: "mt-3 max-w-xl text-[15px] leading-relaxed",
              style: { color: "var(--bb-text-muted)" },
              children: "No sign-in required for any of it. The limitations page is as detailed as the how-it-works page, on purpose — a product that only documents its strengths is telling you something by omission."
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DocIndex, { onNavigatePath }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "p",
            {
              className: "mt-8 text-[13px] leading-relaxed",
              style: { color: "var(--bb-text-muted)" },
              children: [
                "Every number these pages cite is published live on",
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => onNavigatePath("/proof"),
                    className: "font-semibold underline underline-offset-2",
                    style: { color: "var(--bb-brand)" },
                    children: "/proof"
                  }
                ),
                ", and changes to the product are logged on",
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => onNavigatePath("/status"),
                    className: "font-semibold underline underline-offset-2",
                    style: { color: "var(--bb-brand)" },
                    children: "/status"
                  }
                ),
                "."
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "footer",
          {
            className: "mt-12 border-t pt-5 text-center text-[11px]",
            style: { borderColor: "var(--bb-border)", color: "var(--bb-text-dim)" },
            children: "minegold.defi · part of the Banking.Brave ecosystem, powered by CafresoDAO"
          }
        )
      ] })
    }
  );
}
function DocIndex({ onNavigatePath }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "grid gap-3 sm:grid-cols-2", children: DOCS.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      "data-ocid": `docs.index.${d.slug}`,
      onClick: () => onNavigatePath(`/docs/${d.slug}`),
      className: "h-full w-full rounded-3xl border p-5 text-left transition-colors",
      style: {
        borderColor: "var(--bb-border)",
        background: "var(--bb-surface)"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "span",
          {
            className: "mb-2 inline-flex items-center gap-1.5 text-sm font-bold",
            style: { color: "var(--bb-text)" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileText, { size: 14, style: { color: "var(--bb-brand)" } }),
              d.title
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "block text-[12px] leading-relaxed",
            style: { color: "var(--bb-text-muted)" },
            children: d.blurb
          }
        )
      ]
    }
  ) }, d.slug)) });
}
export {
  DocsPage
};
