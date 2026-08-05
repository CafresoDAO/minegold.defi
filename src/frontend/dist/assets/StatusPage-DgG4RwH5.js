import { r as reactExports, j as jsxRuntimeExports, T as ThemeToggle, a9 as TriangleAlert, s as CircleCheck } from "./index-Dfb_LJyK.js";
import { r as renderMarkdown } from "./markdown-2cnCMo2x.js";
import { A as ArrowLeft } from "./arrow-left-Bf0Qqjra.js";
const changelog = "# Changelog\n\nEvery change that affects money, custody, or what we claim. This file is\npublished verbatim on the product's status page.\n\nIncidents are kept separately, in `INCIDENTS.md`, and appear alongside this\nlog. **The rule there is: post before the fix, every time.** An incident log\nthat only ever gains entries after resolution is marketing, not disclosure.\n\nDates are ISO. Newest first.\n\n---\n\n## 2026-08-05 — minegold.cafreso.com is live, OISY sign-in, and a leaner face\n\n- **The app now lives at [minegold.cafreso.com](https://minegold.cafreso.com).**\n  Registration had been blocked for days with an unexplained error; the cause\n  turned out to be that DFINITY replaced the custom-domains API (the old\n  `icp0.io/registrations` endpoint was retired 2025-12-01 and now fails with\n  a misleading error). Registered through the new `icp.net` service. The\n  canister origin keeps working, and **existing principals are unaffected** —\n  principal derivation stays pinned to the canonical canister origin.\n- **OISY wallet sign-in.** Second door next to Internet Identity, using the\n  ICRC-25/29 signer standard with an ICRC-34 delegation — the wallet approves\n  once at connect, then the session is as silent as an II session (no\n  per-read popups). Principal derivation is pinned to the same canonical\n  origin via ICRC-95, so the same OISY user gets the same vault on every\n  domain this app is served from. New sign-ins only; nothing changes for\n  existing II users.\n- **Less copy everywhere.** Landing page and sign-in gate rewritten to say\n  the same things in fewer words. The proof band's live figures, canister\n  list, and \"what we can't promise\" section are unchanged on purpose.\n- **The sign-in screen now uses the official Internet Computer mark** and a\n  proper brand icon instead of hand-drawn approximations.\n- **Availability incident during today's deploy** — the frontend canister ran\n  out of cycles mid-deploy and the site was briefly empty. Details in the\n  incident log alongside this page.\n\n### Corrected the same day\n\n- **The OISY sign-in shipped earlier today was removed.** It could not work:\n  OISY has no dApp delegation (it implements ICRC-25/27/21/49, not ICRC-34),\n  so a wallet session would have prompted for approval on every balance\n  poll — roughly once a minute. It was shipped without a real end-to-end\n  test against the wallet, which is how a broken door reached the sign-in\n  screen. The sign-in gate is now one button that says what it does.\n  The research and the actual build order are written up in\n  `docs/oisy-integration.md`; the next step there is using OISY as the\n  **Ethereum** wallet over WalletConnect, which does work today.\n- **How it works** now opens with a plain-language TL;DR and links the\n  source repository.\n\n## 2026-07-31 — Shareable receipts, and an incident banner\n\n*Backend built and verified; not yet deployed.*\n\n- **Receipts can be shared without exposing who they belong to.** Publishing a\n  receipt mints a random 32-byte token; anyone with the link sees the amounts,\n  rate, status and ledger blocks — and no principal. Links are revocable.\n- **Sharing is opt-in, and stays that way.** The share link is keyed on an\n  unguessable token rather than the record's id. Sequential ids would have\n  made every receipt readable by counting upward, and because a receipt\n  carries its ledger payout block, that would have exposed every user's\n  account and amounts.\n- **Added an operator incident banner** readable by anyone. It exists so\n  disclosing an incident doesn't require a full frontend deploy — if the\n  honest path is the slow path, it stops being taken under pressure.\n  Editing an open notice preserves its original raise time.\n\n## 2026-07-31 — Documentation\n\n- **Published `/docs`** — four pages, readable without signing in: how it\n  works, risks & limitations, how the rate is made, redeem & recovery.\n- **Risks page states the uncomfortable things by name**: unaudited, a single\n  controller who can upgrade the backend, one operator-set leg of the\n  exchange rate, payouts gated on treasury liquidity.\n- **Fixed a metadata drift class.** The route manifest claimed to be the\n  single source of truth for page metadata, but the root route's meta was\n  hand-maintained and had gone stale — it still described the product as \"A\n  Banking.Brave protocol\" after the two were separated. The root is now\n  generated from the manifest like every other route.\n\n## 2026-07-30 — Banking grammar, and separating the brands\n\n- **Deposit and Withdraw are now equal-rank peers.** Withdraw was a small\n  link; it is now a button beside Deposit, disabled rather than hidden at a\n  zero balance. A visible exit is what makes a deposit safe to make.\n- **Removed storytelling chrome** from the money path — the \"Gold Mined!\"\n  toast, the gradient success header, the narrative strip. A settled deposit\n  now says \"Deposit settled\".\n- **Published treasury policy on `/proof`** — settlement is atomic and final,\n  inventory risk is the operator's and never yours, no leverage or lending or\n  yield schemes on treasury assets. Written before there was any pressure to\n  have one, which is the only time writing it is credible.\n- **Separated Banking.Brave and minegold.defi.** They are distinct products:\n  Banking.Brave is the institution, powered by CafresoDAO; minegold.defi is\n  an application in that ecosystem. Banking.Brave now appears as footer\n  attribution rather than as this product's brand.\n- **Rewrote `/brave`** from a \"Minegold.Brave protocol\" story into a calm BAT\n  intake status page that checks DFINITY's minter live on every load.\n\n## 2026-07-30 — I6: a front door instead of a wall\n\n- **A stranger at `/` now gets a landing page**, not a sign-in prompt. Every\n  claim, the live proof band, and `/proof` itself are readable without a\n  passkey.\n- Signing out returns to the landing page rather than to a login wall.\n\n## 2026-07-30 — I5: one status taxonomy, one ledger\n\n- Unified transaction history: refines, redeems and transfers in a single\n  ledger view with one settlement-status vocabulary.\n- Trust components (provenance, custody, coverage, receipts) built once and\n  reused, so two surfaces can no longer disagree about the same fact.\n\n## 2026-07-30 — I3/I4: design foundation and onboarding\n\n- One fixed metaphor: **vault** (your passkey) and **wallet** (your Ethereum\n  wallet). No \"principal\" or \"canister\" in default UI.\n- No surprise signatures: every wallet signature is explained before it is\n  requested.\n- Approval sizing is **exact-amount by default**; unlimited approval is an\n  explicit opt-in with the tradeoff stated in place, and a revoke.cash link.\n\n## 2026-07-30 — I2: the honesty pass\n\n- **Published `/proof`**: live treasury liquidity with a refresh that re-reads\n  both ledgers, refine coverage against pending demand, the full rate formula\n  with oracle provenance, and every canister in the money path with who\n  controls it.\n- **Stranded swaps are published even at zero.** A count that only appears\n  when it is non-zero teaches people not to look at it.\n- `/proof` degrades per-query rather than blanking the whole page when one\n  read fails.\n\n## 2026-07-30 — I0/I1: safety and real URLs\n\n- **Pinned the Internet Identity derivation origin.** This is permanent: it\n  is what keeps every existing vault reachable. It must never change, and it\n  is deliberately a different constant from the site's canonical origin.\n- Real paths replaced hash routing, with per-route metadata so links unfurl\n  as themselves.\n- Hardened the deploy path: explicit content types, and per-asset replacement\n  so an interrupted deploy can't leave the site half-served.\n\n## 2026-07-29 — The exit path\n\n- **Added redeem: sGLDT → ckUNI.** Until this shipped the refinery only ran\n  one way, which meant the product could not honestly be described as\n  something you could get out of.\n- Added the on-chain XRC oracle for the UNI/USD leg of the rate.\n- **Minter attribution**: deposits now credit ckUNI directly to the user's own\n  principal. The refinery became a pure ICP-side swap, and a deposit stopped\n  being able to go missing in transit.\n\n---\n\n## Before this log\n\nEarlier history exists in the repository but predates the decision to keep a\npublic changelog. It is not reconstructed here — writing entries after the\nfact, from memory, would produce exactly the kind of tidy narrative this file\nexists to avoid.\n";
const incidents = "# Incidents\n\nAnything that affected user funds, availability, or the accuracy of what we\ndisplayed. This file is published verbatim on the product's status page — it\nis not a summary of a private log, it *is* the log.\n\n## The rule\n\n**Post before the fix, every time.**\n\nAn incident is logged when it is *detected*, not when it is resolved. The\nentry starts as \"investigating\" and is updated in place. This is the whole\npoint: a log that only ever gains entries after they are safely fixed tells\nyou nothing about how the operator behaves during a problem, which is the\nonly time that information matters.\n\nEntries are never deleted. A wrong entry gets a correction appended, not a\nrewrite.\n\n## Format\n\n```\n## YYYY-MM-DD — One-line summary\n**Status:** investigating | identified | monitoring | resolved\n**Impact:** who was affected and how — funds, availability, or accuracy\n**Detected:** how we found out (alert, user report, routine check)\n\nWhat happened, what we did, and what changed so it doesn't recur.\n```\n\nSeverity is deliberately not a field. \"Sev-3\" is a word that makes a problem\nsound handled; describing the actual impact does not.\n\n---\n\n## 2026-08-05 — Frontend briefly served nothing during a deploy\n**Status:** resolved\n**Impact:** availability only — the web app was unreachable for roughly\n2–3 minutes. No user funds were touched; the backend, both ledgers, and all\nbalances were unaffected throughout. Anyone loading the site in that window\ngot a blank response.\n**Detected:** the deploy itself failed mid-run (operator was watching).\n\nThe frontend canister ran out of cycles *during* an asset deploy. The sync\nscript deletes stale assets before uploading replacements; the deletions\nhad gone through when the canister started rejecting writes, so the site\nwas briefly empty rather than stale. Topped the canister up (now ~8 months\nof runway at current burn) and re-ran the deploy; all assets verified back\nonline.\n\nWhat changes so it doesn't recur: cycles balances were not being monitored\non any Cafreso canister — this is now scheduled tooling, not a manual\nhabit. Longer term the sync script should refuse to start (and especially\nrefuse to delete) when the canister's cycle balance can't absorb the whole\ndeploy.\n";
const CHANGELOG_MD = changelog;
const INCIDENTS_MD = incidents;
const withoutTitle = (md) => md.replace(/^#\s+.*\n+/, "");
const hasOpenIncidents = (md) => !/^##\s+No incidents recorded\s*$/m.test(md);
function StatusPage({ onBack, onNavigatePath }) {
  const [tab, setTab] = reactExports.useState("incidents");
  const open = hasOpenIncidents(INCIDENTS_MD);
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
      "data-ocid": "status.page",
      className: "min-h-screen",
      style: { background: "var(--bb-bg)", color: "var(--bb-text)" },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-10 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              "data-ocid": "status.back",
              onClick: onBack,
              className: "inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold",
              style: { color: "var(--bb-text-muted)" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { size: 14 }),
                " minegold.defi"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeToggle, {})
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label mb-3", style: { color: "var(--bb-text-dim)" }, children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "h1",
          {
            className: "t-display",
            style: { fontSize: "clamp(1.9rem, 1.4rem + 2.2vw, 2.75rem)" },
            children: "What changed, and what broke."
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            "data-ocid": "status.banner",
            className: "mt-6 flex items-start gap-3 rounded-3xl border p-5",
            style: {
              borderColor: open ? "var(--trust-fault)" : "var(--bb-border)",
              background: "var(--bb-surface)"
            },
            children: [
              open ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                TriangleAlert,
                {
                  size: 18,
                  className: "mt-0.5 shrink-0",
                  style: { color: "var(--trust-fault)" }
                }
              ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                CircleCheck,
                {
                  size: 18,
                  className: "mt-0.5 shrink-0",
                  style: { color: "var(--trust-verified)" }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold", children: open ? "There is an open incident — details below" : "No incidents recorded" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "p",
                  {
                    className: "mt-1 text-[12px] leading-relaxed",
                    style: { color: "var(--bb-text-muted)" },
                    children: [
                      "Incidents are logged when they are ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("em", { children: "detected" }),
                      ", not when they are resolved — the entry starts as “investigating” and is updated in place. Entries are never deleted. Live treasury and coverage numbers are on",
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
                      "."
                    ]
                  }
                )
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "mt-8 flex gap-1 border-b",
            style: { borderColor: "var(--bb-border)" },
            role: "tablist",
            children: [
              ["incidents", "Incidents"],
              ["changelog", "Changelog"]
            ].map(([id, label]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                role: "tab",
                "aria-selected": tab === id,
                "data-ocid": `status.tab.${id}`,
                onClick: () => setTab(id),
                className: "-mb-px min-h-[44px] border-b-2 px-4 text-sm font-bold transition-colors",
                style: {
                  borderColor: tab === id ? "var(--bb-brand)" : "transparent",
                  color: tab === id ? "var(--bb-text)" : "var(--bb-text-dim)"
                },
                children: label
              },
              id
            ))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            "data-ocid": `status.body.${tab}`,
            className: "mt-2",
            onClick: interceptLinks,
            children: renderMarkdown(
              withoutTitle(tab === "incidents" ? INCIDENTS_MD : CHANGELOG_MD)
            )
          }
        ),
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
export {
  StatusPage
};
