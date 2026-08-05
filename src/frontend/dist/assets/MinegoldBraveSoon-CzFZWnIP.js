import { c as createLucideIcon, r as reactExports, j as jsxRuntimeExports, T as ThemeToggle, I as ExternalLink } from "./index-Dfb_LJyK.js";
import { f as fetchCkBatStatus, C as CK_MINTER_CANISTER_ID, B as BAT_ERC20_ADDRESS } from "./ckMinter-Dc8CUEeC.js";
import { A as ArrowLeft } from "./arrow-left-Bf0Qqjra.js";
import { A as ArrowRight } from "./arrow-right-1PJWC54Z.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7", key: "132q7q" }],
  ["rect", { x: "2", y: "4", width: "20", height: "16", rx: "2", key: "izxlao" }]
];
const Mail = createLucideIcon("mail", __iconNode);
const NOTIFY_EMAIL = "anthony@cafreso.com";
function MinegoldBraveSoon({ onBack, onOpenUni }) {
  const [status, setStatus] = reactExports.useState(null);
  const [checkedAt, setCheckedAt] = reactExports.useState(null);
  reactExports.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const s = await fetchCkBatStatus();
      if (cancelled) return;
      setStatus(s);
      setCheckedAt(/* @__PURE__ */ new Date());
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const loading = status === null;
  const live = (status == null ? void 0 : status.supported) === true;
  const tokenCount = (status == null ? void 0 : status.allTokens.length) ?? 0;
  const notifyHref = `mailto:${NOTIFY_EMAIL}?subject=${encodeURIComponent("Notify me when BAT intake opens")}&body=${encodeURIComponent(
    "Add me to the BAT intake waitlist — one email when BAT → ckBAT → sGLDT opens on minegold.defi."
  )}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-ocid": "brave.page",
      className: "min-h-screen",
      style: { background: "var(--bb-bg)", color: "var(--bb-text)" },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-10 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              "data-ocid": "brave.back",
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
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label mb-3", style: { color: "var(--bb-text-dim)" }, children: "BAT intake · status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "t-display", style: { fontSize: "clamp(1.9rem, 1.4rem + 2.2vw, 2.75rem)" }, children: "Ad revenue, refined to gold." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            className: "mt-3 max-w-xl text-[15px] leading-relaxed",
            style: { color: "var(--bb-text-muted)" },
            children: "The Brave browser pays its users BAT for the ads they already see. This intake will accept that BAT and refine it into sGLDT — the same gold-backed token, through the same refinery, that the UNI intake settles today."
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            "data-ocid": "brave.status_card",
            className: "mt-8 rounded-3xl border p-6",
            style: { borderColor: "var(--bb-border)", background: "var(--bb-surface)" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label", style: { color: "var(--bb-text-dim)" }, children: "The one thing this is waiting on" }),
                checkedAt && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px]", style: { color: "var(--bb-text-dim)" }, children: [
                  "checked live at ",
                  checkedAt.toLocaleTimeString()
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex items-start gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    "aria-hidden": true,
                    className: "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                    style: {
                      background: loading ? "var(--trust-unknown)" : live ? "var(--trust-verified)" : (status == null ? void 0 : status.error) ? "var(--trust-fault)" : "var(--trust-attested)"
                    }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold", children: loading ? "Reading DFINITY's chain-key minter…" : live ? "ckBAT is listed — the intake is opening" : (status == null ? void 0 : status.error) ? "The minter couldn't be reached just now" : "DFINITY's minter does not yet list BAT" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "p",
                    {
                      className: "mt-1 text-[12px] leading-relaxed",
                      style: { color: "var(--bb-text-muted)" },
                      children: [
                        "Chain-key intake requires DFINITY's ckERC-20 minter to support the token. That listing happens by NNS vote — a public process we participate in but don't control — so this page reads the minter's own supported-token list on every load",
                        tokenCount > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                          " (",
                          tokenCount,
                          " tokens listed today, BAT ",
                          live ? "among" : "not among",
                          " them)"
                        ] }) : null,
                        ". No date is promised because no date is ours to promise."
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mt-2 text-[11px]", style: { color: "var(--bb-text-dim)" }, children: [
                    "Verify it yourself: minter",
                    " ",
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "a",
                      {
                        href: `https://dashboard.internetcomputer.org/canister/${CK_MINTER_CANISTER_ID}`,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "inline-flex items-center gap-1 font-mono underline underline-offset-2",
                        style: { color: "var(--bb-brand)" },
                        children: [
                          CK_MINTER_CANISTER_ID,
                          " ",
                          /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 10 })
                        ]
                      }
                    ),
                    " ",
                    "· BAT contract",
                    " ",
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "a",
                      {
                        href: `https://etherscan.io/token/${BAT_ERC20_ADDRESS}`,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "inline-flex items-center gap-1 font-mono underline underline-offset-2",
                        style: { color: "var(--bb-brand)" },
                        children: [
                          BAT_ERC20_ADDRESS.slice(0, 10),
                          "… ",
                          /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 10 })
                        ]
                      }
                    )
                  ] })
                ] })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 grid gap-4 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "rounded-3xl border p-5",
              style: { borderColor: "var(--bb-border)", background: "var(--bb-surface)" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label mb-1", style: { color: "var(--bb-text-dim)" }, children: "Working today" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold", children: "The same refinery, via UNI" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[12px] leading-relaxed", style: { color: "var(--bb-text-muted)" }, children: "Every part of this machine except the BAT door is live on mainnet — deposits, atomic settlement, withdrawals, the public proof page. BAT intake reuses it unchanged." }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    "data-ocid": "brave.open_uni",
                    onClick: onOpenUni,
                    className: "mt-3 inline-flex min-h-[40px] items-center gap-1.5 text-xs font-bold",
                    style: { color: "var(--bb-brand)" },
                    children: [
                      "Open the live app ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 13 })
                    ]
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "rounded-3xl border p-5",
              style: { borderColor: "var(--bb-border)", background: "var(--bb-surface)" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label mb-1", style: { color: "var(--bb-text-dim)" }, children: "Worth knowing" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold", children: "Where your BAT actually lives" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[12px] leading-relaxed", style: { color: "var(--bb-text-muted)" }, children: "Brave's newer self-custody payouts settle BAT on Solana; chain-key intake starts with the Ethereum ERC-20. Small monthly amounts are cheapest to convert once accumulated — and if ICP's Solana integration reaches SPL tokens, that cost drops to cents. This page will say so plainly when either fact changes." })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "mt-4 rounded-3xl border p-6 text-center",
            style: { borderColor: "var(--bb-border)", background: "var(--bb-surface)" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold mb-1", children: live ? "It's opening — watch your inbox" : "One message, at launch. No newsletter." }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mb-4 text-[12px]", style: { color: "var(--bb-text-muted)" }, children: "Ask to be told when BAT intake opens, and that is the only email you will ever get from it." }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "a",
                {
                  href: notifyHref,
                  "data-ocid": "brave.notify",
                  className: "inline-flex min-h-[48px] items-center gap-2 rounded-2xl px-5 text-sm font-bold",
                  style: { background: "var(--royal-700)", color: "#ffffff" },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { size: 15 }),
                    " Notify me at launch"
                  ]
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "footer",
          {
            className: "mt-10 border-t pt-5 text-center text-[11px]",
            style: { borderColor: "var(--bb-border)", color: "var(--bb-text-dim)" },
            children: "minegold.defi · part of the Banking.Brave ecosystem, powered by CafresoDAO"
          }
        )
      ] })
    }
  );
}
export {
  MinegoldBraveSoon
};
