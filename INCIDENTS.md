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

## No incidents recorded

There have been no incidents affecting user funds, availability, or display
accuracy since this log was opened on 2026-07-31.

This section is published *as* a statement — an empty incident log that
nobody can see is indistinguishable from one that is being suppressed. When
the first entry lands, this notice is replaced by it.
