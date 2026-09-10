# Incidents

Anything that affected user funds, availability, or the accuracy of what we
displayed. This file is published verbatim on the product's status page — it
is not a summary of a private log, it *is* the log.

## The rule

**Post before the fix, every time.**

An incident is logged when it is *detected*, not when it is resolved. The
entry starts as "investigating" and is updated in place. This is the whole
point: a log that only ever gains entries after they are safely fixed tells
you nothing about how the operator behaves during a problem, which is the
only time that information matters.

Entries are never deleted. A wrong entry gets a correction appended, not a
rewrite.

## Format

```
## YYYY-MM-DD — One-line summary
**Status:** investigating | identified | monitoring | resolved
**Impact:** who was affected and how — funds, availability, or accuracy
**Detected:** how we found out (alert, user report, routine check)

What happened, what we did, and what changed so it doesn't recur.
```

Severity is deliberately not a field. "Sev-3" is a word that makes a problem
sound handled; describing the actual impact does not.

---

## 2026-08-05 — Frontend briefly served nothing during a deploy
**Status:** resolved
**Impact:** availability only — the web app was unreachable for roughly
2–3 minutes. No user funds were touched; the backend, both ledgers, and all
balances were unaffected throughout. Anyone loading the site in that window
got a blank response.
**Detected:** the deploy itself failed mid-run (operator was watching).

The frontend canister ran out of cycles *during* an asset deploy. The sync
script deletes stale assets before uploading replacements; the deletions
had gone through when the canister started rejecting writes, so the site
was briefly empty rather than stale. Topped the canister up (now ~8 months
of runway at current burn) and re-ran the deploy; all assets verified back
online.

What changes so it doesn't recur: cycles balances were not being monitored
on any Cafreso canister — this is now scheduled tooling, not a manual
habit. Longer term the sync script should refuse to start (and especially
refuse to delete) when the canister's cycle balance can't absorb the whole
deploy.

## 2026-09-03 — Backend could not make any outbound call; swaps refused for ~8 hours
**Status:** resolved
**Impact:** availability and accuracy. The exchange-rate feed went stale, so
every refine and redeem was refused with "paused" (by design — no swap
settled on a stale price). Treasury balances on `/proof` could not refresh.
No user funds moved or were lost; ledger balances were unaffected.
**Detected:** routine `getRateStatus` check showed `isFresh = false` and
`lastError = "guarded sync wrapper caught: could not perform self call"`.

The backend's cycles balance had fallen to the freezing-threshold reserve
(30-day default × real burn). Below that line the replica still serves
queries and runs updates, but refuses every inter-canister call — so the
oracle sync, the ledger reads, and the swap paths all failed at once while
the canister looked "Running". We first misread it as a stuck message queue
(redeployed, stopped and started the canister — neither helped), then found
the balance. Lowering the threshold to 7 days restored calls immediately; a
top-up followed.

What changed: measured burn was ~6× the "idle" figure we had been budgeting
on. Commit `863f7f20` cuts idle burn ~5× (3-hour rate heartbeat plus
on-demand refresh, event-armed sweeper, on-demand balance cache) and adds
`getCyclesHealth`, which measures burn from daily snapshots and is shown on
`/proof`. The cycles-monitor dashboard we were relying on had itself been
stale for weeks; that is fixed in its own repo.

## 2026-09-09 — Rate feed stale again; swaps refused
**Status:** identified
**Impact:** availability only, same shape as 2026-09-03: refines and redeems
refuse to settle while the UNI and BAT price feeds are stale. No funds
affected. Additionally, the UNI deposit button in the web app did **not**
disable itself while the rate was stale — a user could sign the Ethereum
approve+deposit (spending gas) and only then be refused. We have no report
of anyone hitting this, but the window was open.
**Detected:** routine `getRateStatus` / `getBatRateStatus` check while
verifying the BAT path end-to-end.

Same cause: the balance drifted back toward the reserve because the
efficiency upgrade from 2026-09-03 was built and committed but **not
deployed** — the canister was still running the always-on hourly timers.
Fix in progress: deploy `863f7f20` plus the follow-up (`redeemSGLDT` now
also refuses a stale rate; the sweeper backs off instead of retrying a
failing deposit every 30 s; duplicate timer chains are cancelled), and the
web app now disables the deposit button with the reason while the rate is
stale. This entry will be updated to resolved once the module hash on
mainnet matches and `isFresh` reads true on both legs.
