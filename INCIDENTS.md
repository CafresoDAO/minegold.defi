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
