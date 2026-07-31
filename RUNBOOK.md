# RUNBOOK — minegold.defi

**Operator document. In-repo only.** Nothing here is served to users; the
frontend bundles `src/frontend/src/content/`, never this file.

Everything below was learned against the live canisters, usually the hard
way. Where a step has a failure mode that *looks like success*, it is called
out — those are the ones that cost real time.

---

## 0. The rules that outrank convenience

Three things, if broken, cannot be undone by a later deploy.

### The Internet Identity derivation origin is permanent

`II_DERIVATION_ORIGIN` in `src/auth.tsx` is
`https://cqyto-tiaaa-aaaau-agppa-cai.icp0.io` and **must never change.**

It is what every existing vault's principal is derived from. Changing it does
not migrate users — it silently gives every returning user a *different*
principal, and their balances become unreachable. There is no recovery.

It is deliberately a **different constant** from `SITE_ORIGIN` in
`routes.manifest.mjs`, which is the pretty domain used for canonical/OG URLs.
Unifying them is a natural-looking cleanup that would strand every user.

### The frontend canister must not be reinstalled

`cqyto-tiaaa-aaaau-agppa-cai` live-serves ~39 MB. `dfx deploy frontend` fails
on it (see §2) — **do not force it.** Reinstalling wipes the assets.

### Incidents are posted before they are fixed

See §4. This is a published commitment on `/status`, not an aspiration.

---

## 1. Identities and who holds what

| Identity | Role |
|---|---|
| `vm_default_identity_backup` | **Sole controller** of backend + frontend. Holds the cycles and ICP. This is the one that does real work. |
| `default`, `ic_admin` | Near-empty. A cycles top-up from these fails with `InsufficientFunds`. |

- Controller principal:
  `xip3r-mhzcr-csb7y-ilqf5-4tpge-dka64-jv2ow-zon7z-key3x-77kf3-mae`
- PEM used by the asset sync tool:
  `~/.config/dfx/identity/vm_default_identity_backup/identity.pem`
- `xip3r` also holds app-level `#admin` (granted in the init do-block), so
  CLI ops methods work. The **UI** admin is a different, hardcoded Internet
  Identity principal (`rc62u…`).

**Cycles:** top-ups spend real ICP and are the owner's call, never automatic.
Both `cqyto` and `dqcmv` (cafreso.com) have hit out-of-cycles rejections
before — worth watching for recurring drain rather than waiting for the next
outage.

---

## 2. Deploying the frontend

`dfx deploy frontend --network ic` **fails**, on both dfx 0.24.3 and 0.29.1:

```
failed to restore stable state: Cannot parse header
```

The installed module is not dfx's asset canister (Caffeine pipeline origin).
It does answer the standard asset API (v2), so we talk to that instead.

```bash
# 1. Build. post-build.mjs regenerates root + per-route OG shells from
#    routes.manifest.mjs and copies env.json into dist/.
cd src/frontend && npm run build && cd ../..

# 2. ALWAYS dry-run first. It prints every key it would add, replace, delete.
cd scripts/asset-sync
npm install          # first time only
node sync.mjs --dry-run

# 3. Ship it.
node sync.mjs
```

**Surgical deploys:** `node sync.mjs --only .well-known` restricts the sync to
keys containing that substring — useful for shipping the identity files
without touching `index.html` or the bundles. Stale-bundle cleanup is skipped
under `--only`, deliberately.

### Things that have actually gone wrong here

- `batch.store(bytes, { path })` yields **slashless keys the gateway cannot
  serve** and briefly took the site down. The tool now always passes
  `{ fileName: fullRelativePath }` with no leading slash and no `path`.
- `create_asset` traps `"asset already exists"` → the tool deletes before
  re-storing, interleaved per asset so the unavailable window is per-file
  rather than site-wide.
- `@dfinity/assets` silently falls back to `application/octet-stream` for
  extensionless files; this once shipped `/.well-known/ii-alternative-origins`
  as octet-stream. `contentTypeFor()` now **throws** rather than guessing.
- `.ic-assets.json5` is a **dfx-client feature and is completely inert on this
  deploy path.** Content types and headers must be set in `sync.mjs`.
- This `@dfinity/assets` version has no `set_asset_properties`: a wrong
  content type can only be fixed by delete + recreate.

---

## 3. Upgrading the backend

Canister `c626g-iyaaa-aaaau-agpoa-cai`, Motoko, enhanced-orthogonal-persistence.

```bash
export PATH="$HOME/Library/Application Support/org.dfinity.dfx/bin:$PATH"
export DFX_VERSION=0.29.1
export DFX_WARNING=-mainnet_plaintext_identity

dfx canister install backend \
  --network ic \
  --mode upgrade \
  --wasm-memory-persistence keep \
  --wasm src/backend/dist/backend.wasm \
  --identity vm_default_identity_backup
```

### `--wasm` is not optional. Read this before skipping it.

Without `--wasm`, dfx installs from its own staged copy at
`.dfx/ic/canisters/backend/backend.wasm`. That copy goes stale the moment you
rebuild with `moc` directly, because `dfx.json`'s build step is only a
`test -f` guard — dfx never re-copies.

A stale cache makes the upgrade **exit 0, print success, and change nothing.**
It reinstalls the old module over itself. This burned two "done" deploys on
2026-07-30.

**Verify by module hash and by calling a new method. Never by dfx's output.**

```bash
dfx canister info c626g-iyaaa-aaaau-agpoa-cai --network ic   # module hash
shasum -a 256 src/backend/dist/backend.wasm                  # compare
```

Also note: dfxvm's default is **0.24.3**, so a bare `dfx` is the wrong
version. And 0.29.1 turns the plaintext-identity warning into a *hard abort*,
hence `DFX_WARNING=-mainnet_plaintext_identity`.

### Stable-compatibility

Adding a variant tag to a type stored in a `Map`/`List` (e.g. `TxType` /
`TxStatus` in `userTransactions`) is **not** stable-compatible — `var` fields
are invariant. It needs `(with migration = …)` plus a module that deep-copies
the records.

**Then remove the migration before the next upgrade**, or that one fails its
input check.

Check both directions before shipping:

```bash
moc --stable-compatible old.most new.most
```

Compiler: moc 1.3.0 from the mops cache, package `core@2.2.0`, lint flags
including `-E M0236` (dot-notation is a hard error).

---

## 4. Incident response

**Post before the fix. Every time.** `/status` states this publicly, and the
all-clear banner is derived from `INCIDENTS.md` so the two cannot disagree.

1. **Log it first.** Append an entry to `INCIDENTS.md` with status
   `investigating`, the actual user impact, and how it was detected. Replace
   the `## No incidents recorded` heading if it is still there — the banner
   keys off that exact line.
2. **Ship the entry.** Build + `sync.mjs`. The log being public *while the
   problem is open* is the entire point; an entry that only appears after
   resolution is marketing.
3. Fix the problem.
4. Update the same entry in place to `resolved`. **Never delete or rewrite an
   entry** — a correction is appended.
5. Add a `CHANGELOG.md` entry if the fix changed behaviour.

Severity labels are deliberately not used. "Sev-3" makes a problem sound
handled; describing the actual impact does not.

### Fast triage

| Symptom | Check first |
|---|---|
| Deposits not settling | Treasury sGLDT on `/proof`; coverage meter |
| Withdrawals failing | Treasury ckUNI on `/proof` |
| Rate stale or swaps gated off | `getRateStatus` — oracle sync age, last error |
| Deposits not arriving at all | The ckERC-20 minter (DFINITY, not ours) |
| Swaps stuck | `getStrandedCounts` — these need manual resolution |

---

## 5. Routine checks

```bash
# Has DFINITY listed BAT yet? (Also runs every 6h in CI.)
node scripts/ckbat-watch/check.mjs

# Stranded swaps — should be 0
dfx canister call c626g-iyaaa-aaaau-agpoa-cai getStrandedCounts --query --network ic

# Rate health: oracle sync age and last error
dfx canister call c626g-iyaaa-aaaau-agpoa-cai getRateStatus --query --network ic
```

---

## 6. Launch checklist

**Ordered.** Each gate exists because shipping past it has a specific cost.

- [ ] **I0 verified** — II derivation origin pinned and confirmed; A/B check
      that the same anchor yields the same principal on both origins.
- [ ] **I1–I2 live** — real paths with per-route OG shells; `/proof` live and
      degrading per-query rather than blanking.
- [ ] **Docs and status live** — `/docs/risks` reachable without sign-in;
      `/status` rendering both logs.
- [ ] **Full-loop smoke test with real money.** Both directions: deposit *and*
      withdraw. Screenshot each step. This is the gate that matters most —
      nothing below it is a substitute, and it must be done on mainnet with
      real funds, because that is the only configuration users will meet.
- [ ] **Reconcile the smoke test independently.** Confirm the payout on the
      sGLDT ledger by block index, not by what the UI displayed.
- [ ] **Exercise the public-receipt round-trip on the smoke-test swap.** Call
      `publishReceipt`, open the returned token via `getPublicReceipt` **while
      signed out**, and confirm the response carries no principal. This path
      cannot be tested locally — it needs a real settled record — so it is a
      launch-checklist item rather than a pre-merge one. Then call
      `unpublishReceipt` and confirm the token stops resolving.
- [ ] **Stranded count is 0** and `/proof` is publishing it.
- [ ] **DNS live and verified** — `banking.cafreso.com` resolving, with the
      canonical/OG origin switched over (`OG_ASSET_ORIGIN` → `SITE_ORIGIN` in
      `routes.manifest.mjs`, once the domain resolves).
- [ ] **Announcement.** Leads with the constraints — unaudited, one operator,
      small treasury — and links **`/proof`, not `/`.** The least exciting
      version of the announcement is the correct one: everything it concedes
      is something a skeptic would otherwise discover and treat as concealed.

### Not launch blockers, but know where they stand

- No third-party audit. Stated on `/docs/risks`.
- Single controller, no time-lock, no SNS. Stated on `/docs/risks`.
- sGLDT/USD reference is operator-set. Stated on `/docs/rate-methodology`.
- Waitlist is a `mailto:`, not a hosted form. **User-owned** — a hosted form
  needs an account in the owner's name.

---

## 7. Known-stale documents

- **`LAUNCH.md`** is the original Caffeine-era setup guide and has drifted
  from reality. It names the wrong minter (`nbsys-…`) and still says bridged
  ckUNI is "credited to the project's treasury" — since the minter-attribution
  change, ckUNI is credited to the **user's own principal**, which is one of
  the product's better properties. Treat `LAUNCH.md` as cold-start setup only,
  and this file as the operational truth.
- **`env.json` host discrepancy.** The tracked `src/frontend/env.json` sets
  `backend_host` to `https://icp0.io`, while the last-deployed `dist/env.json`
  had `https://icp-api.io`. Both are valid IC endpoints, so this is not
  breaking — but the next frontend deploy will change it, and that should be a
  decision rather than a side effect.
