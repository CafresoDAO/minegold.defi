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

### ⚠️ The Namecheap Host-field trap — this already happened once

Namecheap's **Host** field takes the name *relative to the zone*, and it
appends `.cafreso.com` automatically. Typing the full FQDN produces records
at a doubled name that silently does nothing:

```bash
# What a first attempt actually created:
dig +short @dns1.registrar-servers.com minegold.cafreso.com.cafreso.com CNAME
# → icp1.io.          ← correct value, wrong NAME
dig +short @dns1.registrar-servers.com minegold.cafreso.com CNAME
# → (nothing)         ← what the boundary node looks for
```

The values were all correct; only the record names were wrong. Registration
failed with:

```json
{"error_type":"canister_id_not_resolved"}
```

**Enter these in the Host column — subdomain only, no `.cafreso.com`:**

| Type | Host (what you type) | Value |
|---|---|---|
| `CNAME` | `minegold` | `icp1.io` |
| `TXT` | `_canister-id.minegold` | `cqyto-tiaaa-aaaau-agppa-cai` |
| `CNAME` | `_acme-challenge.minegold` | `_acme-challenge.minegold.cafreso.com.icp2.io` |

Note the asymmetry that makes this confusing: the **Host** is relative
(`_acme-challenge.minegold`) but the **Value** contains the full FQDN with
`.icp2.io` appended (`_acme-challenge.minegold.cafreso.com.icp2.io`). That
is correct — don't "fix" the value to match the host.

Resulting fully-qualified records:

| Type | Name | Value |
|---|---|---|
| `CNAME` | `minegold.cafreso.com` | `icp1.io` |
| `TXT` | `_canister-id.minegold.cafreso.com` | `cqyto-tiaaa-aaaau-agppa-cai` |
| `CNAME` | `_acme-challenge.minegold.cafreso.com` | `_acme-challenge.minegold.cafreso.com.icp2.io` |

### ⚠️ Copy the shape from `cafreso.com`, never the values from `ai.cafreso.com`

`ai.cafreso.com`'s `_canister-id` TXT is **wrong** — it reads
`dqcmv-zqaaa-aaaab-agp2a-cai` (the apex canister) when `ai.cafreso.com` is
actually served by `v4tdv-riaaa-aaaab-agtfa-cai`, confirmed by the
`x-ic-canister-id` response header. It isn't breaking anything today because
the boundary node cached the correct mapping at registration time, but if
that domain is ever re-registered or re-validated it would re-point
`ai.cafreso.com` at the wrong site. It looks like a copy-paste of the apex
record. **Worth fixing separately** — and worth not propagating.

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

> ### 🚧 BLOCKED as of 2026-08-04 — and not on our side
>
> **Steps 1 and 2 are complete and verified.** All three DNS records resolve
> correctly at the authoritative nameserver *and* at 1.1.1.1 and 8.8.8.8, and
> the canister serves `/.well-known/ic-domains` listing the domain. There is
> nothing left to fix here.
>
> The registration API itself rejects every request:
>
> ```
> HTTP 400
> {"error_type":"canister_id_not_resolved",
>  "description":"The gateway couldn't determine the destination canister for this request…"}
> ```
>
> **Why this is not a DNS or config problem — the evidence:**
>
> - A bare `GET https://icp0.io/registrations`, with no domain in the request
>   at all, returns the *same* error. It fails before our domain is ever
>   evaluated.
> - Identical response from `icp0.io`, `icp-api.io`, `ic0.app` and
>   `boundary.ic0.app`, for both POST and GET.
> - The request reaches a genuine ICP boundary node — valid certificate,
>   `x-request-id` and the standard IC CORS headers come back. It is being
>   *rejected*, not dropped.
> - Pinning `icp0.io` to a public-resolver IP with `--resolve` changes
>   nothing, so it is not local DNS interference.
>
> `canister_id_not_resolved` is the gateway's generic "I can't map this
> request to a canister" error. Getting it on `/registrations` suggests that
> path is no longer special-cased on the edge that answers us — i.e. the API
> moved or changed. Re-check DFINITY's current custom-domain docs and the
> forum before assuming anything in this file is still the right call.
>
> **A red herring worth not chasing twice:** `icp0.io` resolves to a
> different IP here (`209.34.235.18`) than at 1.1.1.1 (`63.251.162.11`) or
> 8.8.8.8 (`23.142.184.129`), and the first is also what `cafreso.com`
> resolves to. That looks like DNS hijacking and is not — `cafreso.com` is
> itself ICP-hosted, so it shares boundary-node IPs, and these are ordinary
> anycast/GeoDNS differences. Pinning the IP was tested and made no
> difference.
>
> **Meanwhile:** the app was deployed with `SITE_ORIGIN` still set to
> `https://minegold.cafreso.com`, so `canonical` and `og:url` point at a host
> that does not resolve yet. Deliberate — it avoids a second full deploy and
> becomes correct the moment registration succeeds. Retry Step 3 periodically;
> nothing else needs doing when it works.

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
