# How the rate is made

The exchange rate is the single number that decides what you get. This page
publishes the whole formula, both of its inputs, which one we control, and
every guardrail around it.

The live values — current rate, oracle price, sync age — are on
[/proof](/proof). This page explains what those numbers mean.

## The formula

```
                UNI/USD  (Exchange Rate Canister, hourly)
1 UNI  =  ─────────────────────────────────────────────────  sGLDT
                sGLDT/USD  (operator-set reference)


           median of 5 BAT/USD readings  (Exchange Rate Canister, hourly)
1 BAT  =  ────────────────────────────────────────────────────────────────  sGLDT
                     sGLDT/USD  (operator-set reference)
```

Both legs carry 1e8 precision. That is the entire calculation — there is no
spread applied on top, no dynamic fee, and no hidden margin between the rate
shown and the rate settled.

The two intakes share a denominator and differ in one respect: **the BAT leg
settles on a median, the UNI leg still settles on the latest reading.** That
difference is described under the guardrails below, and it is a gap in the
UNI leg rather than a feature of the BAT one.

## Leg 1 — UNI/USD, from DFINITY's oracle

Source: the **Exchange Rate Canister** (`uf6dk-hyaaa-aaaaq-qaaaq-cai`), NNS
infrastructure that aggregates prices across exchanges. We read it; we cannot
influence what it says.

It syncs on an **hourly cadence**. The age of the last successful sync is
displayed on /proof, and if the oracle is failing, the last error is
published there too rather than hidden behind a stale-looking number.

## Leg 1b — BAT/USD, from the same oracle, taken as a median

Same canister, same hourly cadence, one extra step: we keep the **last five
BAT/USD readings** and settle on their **median**, never on the newest one.

The reason is narrow. The Exchange Rate Canister already aggregates across
many exchanges under IC consensus, so a single reading is not cheap to forge
— but it is still a single reading. A median means a forged price has to
survive **three separate hourly syncs** to move our rate at all. One bad
print does nothing.

The cost is that the intake **opens slowly**. Until five samples exist there
is no median worth trusting, so the door stays shut rather than opening on
one or two readings. `getBatRateStatus` publishes the window, the median, and
the sample count, so "how far along is it" is a question you can answer
yourself rather than take our word for.

## Leg 2 — sGLDT/USD, set by the operator

This is the leg to scrutinise, so here is the unvarnished version.

sGLDT trades on **one ICPSwap pool**, which the Exchange Rate Canister does
not index. There is no independent oracle for it. So the reference price is
set by the operator, tracking GLDT's gold-derived value.

We would prefer this to be automated, and it should become automated. Today
it is not, and calling it anything other than operator-set would be
misleading.

If the reference has not been set, the canister falls back to a **manual
rate**, and /proof says so explicitly rather than displaying a computed
number that isn't one.

## The guardrails, with their actual numbers

These constrain what the rate can do — including what *we* can do to it.

### ±30% — oracle jump rejection

An oracle reading that differs from the current rate by more than 30% is
**rejected**. A flash-crash print or a bad aggregation can't drag the
settlement rate with it.

The tradeoff is deliberate and worth naming: if UNI genuinely moves more than
30%, the rate goes stale and requires a **one-time operator re-anchor** to
resume. We chose a stale rate that stops trading over a wrong rate that keeps
trading.

### 6 hours — BAT staleness cutoff

If the refinery has not confirmed a BAT price in **six hours** — six missed
hourly syncs — the ckBAT intake **closes itself** and refuses to settle.

This is here because the failure already happened. An upgrade wipes a
canister's timers, and for a stretch in August 2026 the re-arm was missing:
the last sync was sixteen days old while the intake stayed open. Nobody was
harmed, but the door was open against a frozen price, and that is exactly the
condition this cutoff now refuses.

The timestamp behind it records when we last **believed** a price, not when
we last **tried** — a failed sync, or a reading the jump guard rejected, does
not refresh it. Six hours rides through a transient oracle outage; a dead
timer chain it does not.

The UNI leg does **not** have this cutoff yet. Stated plainly because it is
the same hole in the older intake, and listing it is more useful than
quietly fixing one and implying both.

### ±2% — UI hint clamp

The frontend sends a rate hint with each swap so the price you saw is the
price you get. The canister clamps that hint to **±2%** of its own rate.

This exists to answer a specific attack: if the frontend were compromised or
replaced, it still could not make the backend settle at an arbitrary price.
The canister is the authority; the UI is a suggestion within a narrow band.

### 500,000 sGLDT / 50 ckUNI — admin transfer caps

Administrative transfers are capped per transaction. This bounds the size of
any single operator action, including a mistaken one.

It does **not** bound repeated actions. It is a limit on blast radius, not a
substitute for the multi-party control that doesn't exist yet — see
[Risks & limitations](/docs/risks).

## What you settle at

The rate that applies is the one **current when your swap executes**, not
when you started it. Ethereum finality takes about three minutes, and the
rate can move within that window.

Your receipt records the settled rate and the sGLDT ledger block index of the
payout, so every completed swap can be reconciled against the ledger
independently of anything we display.

## What would make this better

Stated because a methodology page that lists no gaps isn't a methodology
page:

1. **An independent sGLDT/USD source.** The clearest single improvement:
   removes the operator from the pricing path.
2. **The median and the staleness cutoff on the UNI leg too.** The BAT
   intake has both; the UNI intake has neither. That asymmetry is a
   deployment order, not a judgement that UNI needs less.
3. **A published re-anchor log.** Every operator re-anchor, with timestamp
   and reason, visible on /proof rather than inferable from rate history.
4. **Time-locked rate parameters.** A delay between setting a reference and
   it taking effect, so a change is observable before it settles anything.

None of these exist today. They are the honest roadmap for this page, and
this section is here so the absence is on the record rather than discovered.
