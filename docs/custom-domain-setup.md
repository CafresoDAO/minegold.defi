# minegold.cafreso.com — custom domain setup

## Why this is needed

`minegold.defi`, `minegold.brave` and `minegold.uni` are **Unstoppable
Domains blockchain TLDs, not ICANN TLDs.** They do not resolve in an
ordinary browser and never will without a plugin or a gateway:

```bash
$ dig +short minegold.defi A     # → nothing
$ curl -I https://minegold.defi  # → 000, connection failed
```

That is fine for branding, but it means any link to `https://minegold.defi`
in a forum post, proposal or README is **dead for the reader**. On an NNS
proposal whose entire argument is "every claim here is verifiable," a broken
self-link is the worst possible detail to get wrong.

`minegold.cafreso.com` gives the app a real, resolvable HTTPS address on a
domain already proven to work with ICP (`cafreso.com` serves
`dqcmv-zqaaa-aaaab-agp2a-cai` through the same mechanism).

## State

| | |
|---|---|
| Frontend canister | `cqyto-tiaaa-aaaau-agppa-cai` |
| Works today | `https://cqyto-tiaaa-aaaau-agppa-cai.icp0.io` (200) |
| Target | `https://minegold.cafreso.com` |

Note: `banking.cafreso.com` was already listed in `.well-known/ic-domains`
but **has no DNS records at all** — it was never actually wired up. It has
been left in the file (harmless, and plausibly wanted later for
Banking.Brave), but it is not live and never was.

## Step 1 — DNS records (must be done at the registrar; I can't do this)

Three records, mirroring how `cafreso.com` is already configured:

| Type | Name | Value |
|---|---|---|
| `CNAME` | `minegold.cafreso.com` | `icp1.io` |
| `TXT` | `_canister-id.minegold.cafreso.com` | `cqyto-tiaaa-aaaau-agppa-cai` |
| `CNAME` | `_acme-challenge.minegold.cafreso.com` | `_acme-challenge.minegold.cafreso.com.icp2.io` |

The existing `cafreso.com` records to copy the pattern from:

```bash
dig +short _canister-id.cafreso.com TXT
# → "dqcmv-zqaaa-aaaab-agp2a-cai"
dig +short _acme-challenge.cafreso.com CNAME
# → _acme-challenge.cafreso.com.icp2.io.
```

Verify propagation before continuing — registration fails if DNS isn't
visible yet:

```bash
dig +short minegold.cafreso.com
dig +short _canister-id.minegold.cafreso.com TXT
```

## Step 2 — deploy the asset canister

Already committed: `minegold.cafreso.com` has been added to
`src/frontend/public/.well-known/ic-domains`. The boundary node fetches this
file during registration and refuses the domain if it's absent.

Deploy per the usual frontend path (the canister can't be `dfx deploy`-ed —
use the `@dfinity/assets` sync script), then confirm the file is actually
being served:

```bash
curl -s https://cqyto-tiaaa-aaaau-agppa-cai.icp0.io/.well-known/ic-domains
# must list minegold.cafreso.com
```

## Step 3 — register with the boundary node

```bash
curl -sX POST -H 'Content-Type: application/json' \
  -d '{"name":"minegold.cafreso.com"}' \
  https://icp0.io/registrations
```

Returns a request ID. Poll it:

```bash
curl -s https://icp0.io/registrations/<REQUEST_ID>
```

Certificate issuance typically takes a few minutes. Then:

```bash
curl -sI https://minegold.cafreso.com | head -1   # expect HTTP/2 200
```

## ⚠️ Internet Identity — the thing that will silently break

The canonical `derivationOrigin` is
`https://cqyto-tiaaa-aaaau-agppa-cai.icp0.io` and **must never change** —
changing it changes every user's principal, orphaning their vaults.

Serving the app from a new origin does not change that, but II will reject
the login unless the new origin is whitelisted on *this* canister's
`.well-known/ii-alternative-origins`. Already committed:

```json
{
  "alternativeOrigins": [
    "https://minegold.cafreso.com",
    "https://banking.cafreso.com",
    "https://cafreso.com",
    "https://ai.cafreso.com",
    "https://hq-ui.cafreso.com",
    "https://dqcmv-zqaaa-aaaab-agp2a-cai.icp0.io",
    "https://v4tdv-riaaa-aaaab-agtfa-cai.icp0.io"
  ]
}
```

**Test sign-in on the new domain before advertising it anywhere.** The
failure mode is silent: II simply refuses, with no useful error. Confirm the
whitelist is served with the right headers (`Content-Type: application/json`
and `Access-Control-Allow-Origin: *`, both set in `.ic-assets.json5`):

```bash
curl -sI https://cqyto-tiaaa-aaaau-agppa-cai.icp0.io/.well-known/ii-alternative-origins \
  | grep -i 'content-type\|access-control'
```

## What to use in the forum post meanwhile

Until the domain is live, link the **canister URL**:
`https://cqyto-tiaaa-aaaau-agppa-cai.icp0.io`

For an ICP audience this is arguably the better link anyway — it's
verifiable on the dashboard and proves the app is genuinely on-chain, which
a custom domain does not. Once `minegold.cafreso.com` resolves, cite both:
the domain for humans, the canister ID for reviewers.
