import { c as createLucideIcon, r as reactExports, E as fetchCkBatStatus, j as jsxRuntimeExports, T as ThemeToggle, L as LoaderCircle, F as Sparkles, z as Clock, G as CK_MINTER_CANISTER_ID, H as BAT_ERC20_ADDRESS, A as ShieldCheck, y as ChevronRight } from "./index-Dr2VPZea.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$3 = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
];
const ArrowLeft = createLucideIcon("arrow-left", __iconNode$3);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [
  ["path", { d: "M7 7h10v10", key: "1tivn9" }],
  ["path", { d: "M7 17 17 7", key: "1vkiza" }]
];
const ArrowUpRight = createLucideIcon("arrow-up-right", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["path", { d: "M10.1 2.182a10 10 0 0 1 3.8 0", key: "5ilxe3" }],
  ["path", { d: "M13.9 21.818a10 10 0 0 1-3.8 0", key: "11zvb9" }],
  ["path", { d: "M17.609 3.721a10 10 0 0 1 2.69 2.7", key: "1iw5b2" }],
  ["path", { d: "M2.182 13.9a10 10 0 0 1 0-3.8", key: "c0bmvh" }],
  ["path", { d: "M20.279 17.609a10 10 0 0 1-2.7 2.69", key: "1ruxm7" }],
  ["path", { d: "M21.818 10.1a10 10 0 0 1 0 3.8", key: "qkgqxc" }],
  ["path", { d: "M3.721 6.391a10 10 0 0 1 2.7-2.69", key: "1mcia2" }],
  ["path", { d: "M6.391 20.279a10 10 0 0 1-2.69-2.7", key: "1fvljs" }]
];
const CircleDashed = createLucideIcon("circle-dashed", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  [
    "path",
    {
      d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
      key: "1xq2db"
    }
  ]
];
const Zap = createLucideIcon("zap", __iconNode);
const NOTIFY_EMAIL = "hello@cafreso.com";
function MinegoldBraveSoon({ onBack, onOpenUni }) {
  var _a, _b;
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
  const notifyHref = `mailto:${NOTIFY_EMAIL}?subject=${encodeURIComponent("Notify me when Minegold.Brave goes live")}&body=${encodeURIComponent(
    "Add me to the Minegold.Brave waitlist — I'd like an email when BAT → ckBAT → sGLDT opens."
  )}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "min-h-screen",
      style: { background: "var(--bb-bg)", color: "var(--bb-text)" },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: onBack,
              className: "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest transition-colors",
              style: { color: "var(--bb-text-muted)" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { size: 14 }),
                "Banking.Brave"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeToggle, {})
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "text-[10px] font-black uppercase tracking-widest mb-2",
            style: { color: "var(--bb-text-dim)" },
            children: "Banking.Brave · Minegold.Defi"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "mb-10", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                style: { background: "linear-gradient(135deg, #f97316, #ea580c)" },
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", "aria-hidden": true, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 3L3 8l9 5 9-5-9-5z", fill: "#FFFFFF" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 8v8l9 5 9-5V8", stroke: "#FFFFFF", strokeWidth: "1.5", fill: "none" })
                ] })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-3xl sm:text-4xl font-black tracking-tight leading-tight", children: [
                "Minegold",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--bb-brand)" }, children: "." }),
                "Brave"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "inline-flex items-center gap-1.5 mt-1", children: [
                loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "span",
                  {
                    className: "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 border",
                    style: {
                      background: "var(--bb-surface)",
                      color: "var(--bb-text-muted)",
                      borderColor: "var(--bb-border)"
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 10, className: "animate-spin" }),
                      "Checking bridge…"
                    ]
                  }
                ) : live ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "span",
                  {
                    className: "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 border",
                    style: {
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "#059669",
                      borderColor: "rgba(16, 185, 129, 0.35)"
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 10 }),
                      "ckBAT is live"
                    ]
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 border",
                    style: {
                      background: "rgba(234, 179, 8, 0.12)",
                      color: "#ca8a04",
                      borderColor: "rgba(234, 179, 8, 0.35)"
                    },
                    children: "Awaiting ckBAT"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 11, style: { color: "var(--bb-text-dim)" } })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "p",
            {
              className: "text-sm sm:text-base max-w-2xl mt-3",
              style: { color: "var(--bb-text-muted)" },
              children: [
                "Onboard ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "BAT (Basic Attention Token)" }),
                " to the Internet Computer as ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "ckBAT" }),
                ", then refine it into sGLDT — the same proven workflow as Minegold.Uni, with a different source asset."
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mb-12", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: "text-[11px] font-black uppercase tracking-widest",
                style: { color: "var(--bb-brand)" },
                children: "Bridge status · checked live"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 border-t", style: { borderColor: "var(--bb-border)" } })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "rounded-2xl border p-5 sm:p-6",
              style: {
                background: live ? "linear-gradient(135deg, rgba(16, 185, 129, 0.08), var(--bb-surface))" : "var(--bb-surface)",
                borderColor: live ? "rgba(16, 185, 129, 0.35)" : "var(--bb-border)"
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-0.5 shrink-0", children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 18, className: "animate-spin", style: { color: "var(--bb-text-dim)" } }) : live ? /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { size: 18, style: { color: "#059669" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(CircleDashed, { size: 18, style: { color: "#ca8a04" } }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                  loading && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm", style: { color: "var(--bb-text-muted)" }, children: "Asking DFINITY's ckERC-20 minter which assets it bridges…" }),
                  !loading && (status == null ? void 0 : status.error) && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-sm mb-1", children: "Status check unavailable" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs leading-relaxed", style: { color: "var(--bb-text-muted)" }, children: "We couldn't reach the minter just now, so this page can't confirm ckBAT's status. Minegold.Brave opens as soon as BAT is listed — please check back shortly." })
                  ] }),
                  !loading && !(status == null ? void 0 : status.error) && live && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-sm mb-1", children: "BAT is now bridgeable — Minegold.Brave can open." }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs leading-relaxed", style: { color: "var(--bb-text-muted)" }, children: [
                      "The minter lists ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: (_a = status == null ? void 0 : status.token) == null ? void 0 : _a.symbol }),
                      " with ledger",
                      " ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "font-mono", children: (_b = status == null ? void 0 : status.token) == null ? void 0 : _b.ledgerCanisterId }),
                      ". The refinery flow is being switched on — check back within a day."
                    ] })
                  ] }),
                  !loading && !(status == null ? void 0 : status.error) && !live && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-sm mb-1", children: "BAT is not yet listed on the ckERC-20 bridge." }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs leading-relaxed", style: { color: "var(--bb-text-muted)" }, children: "Adding a token is an NNS governance decision, not something we control. This page re-checks the minter every time it loads and will switch itself on the day BAT appears — nothing here is hand-updated." })
                  ] }),
                  !loading && !(status == null ? void 0 : status.error) && tokenCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        className: "text-[10px] font-black uppercase tracking-widest mb-2",
                        style: { color: "var(--bb-text-dim)" },
                        children: [
                          "Bridged today · ",
                          tokenCount,
                          " assets"
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-1.5", children: [
                      status == null ? void 0 : status.allTokens.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "span",
                        {
                          className: "text-[10px] font-bold rounded-lg px-2 py-1 border",
                          style: {
                            borderColor: "var(--bb-border)",
                            color: t.symbol.toLowerCase() === "ckuni" ? "var(--bb-brand)" : "var(--bb-text-muted)",
                            background: "var(--bb-bg)"
                          },
                          children: t.symbol
                        },
                        t.ledgerCanisterId || t.symbol
                      )),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "span",
                        {
                          className: "text-[10px] font-bold rounded-lg px-2 py-1 border border-dashed",
                          style: { borderColor: "rgba(234, 179, 8, 0.5)", color: "#ca8a04" },
                          children: "ckBAT — pending"
                        }
                      )
                    ] })
                  ] }),
                  checkedAt && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "mt-4 text-[10px] font-mono",
                      style: { color: "var(--bb-text-dim)" },
                      children: [
                        "minter ",
                        CK_MINTER_CANISTER_ID,
                        " · checked",
                        " ",
                        checkedAt.toLocaleTimeString()
                      ]
                    }
                  )
                ] })
              ] })
            }
          )
        ] }),
        !live && /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "mb-12", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between",
            style: {
              background: "linear-gradient(135deg, rgba(249, 115, 22, 0.06), var(--bb-surface))",
              borderColor: "var(--bb-border)"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "text-[10px] font-black uppercase tracking-widest mb-1",
                    style: { color: "var(--bb-brand)" },
                    children: "Get notified"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm", style: { color: "var(--bb-text)" }, children: "Want an email the day BAT refining opens?" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs mt-0.5", style: { color: "var(--bb-text-muted)" }, children: "One message, at launch. No newsletter." })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "a",
                {
                  href: notifyHref,
                  className: "inline-flex items-center gap-1.5 text-sm font-bold rounded-xl px-4 py-2 transition-all shrink-0",
                  style: { background: "var(--bb-brand)", color: "#ffffff" },
                  children: [
                    "Notify me",
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { size: 14 })
                  ]
                }
              )
            ]
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mb-12", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                className: "text-[11px] font-black uppercase tracking-widest",
                style: { color: "var(--bb-brand)" },
                children: live ? "How it works" : "Planned workflow"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 border-t", style: { borderColor: "var(--bb-border)" } })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "grid sm:grid-cols-3 gap-4", children: [
            {
              n: "01",
              title: "Bridge BAT → ckBAT",
              body: "You sign a deposit() call on the ckERC-20 helper contract on Ethereum. DFINITY's minter credits the treasury on ICP."
            },
            {
              n: "02",
              title: "Verify on ICP",
              body: "The backend canister reads the Ethereum transaction via HTTPS outcalls and cryptographically verifies amount and recipient."
            },
            {
              n: "03",
              title: "Release sGLDT",
              body: "Locked-rate sGLDT transfers from treasury to your ICP account over ICRC-1 — no custodian in the middle."
            }
          ].map((step) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "li",
            {
              className: "rounded-2xl border p-5",
              style: { background: "var(--bb-surface)", borderColor: "var(--bb-border)" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "text-[10px] font-black tracking-widest mb-2",
                    style: { color: "var(--bb-brand)" },
                    children: [
                      "STEP ",
                      step.n
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold text-sm mb-1", children: step.title }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs leading-relaxed", style: { color: "var(--bb-text-muted)" }, children: step.body })
              ]
            },
            step.n
          )) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] mt-3", style: { color: "var(--bb-text-dim)" }, children: [
            "BAT contract ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "font-mono", children: BAT_ERC20_ADDRESS })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "mb-16 grid sm:grid-cols-3 gap-4 text-xs", children: [
          {
            icon: ShieldCheck,
            color: "var(--bb-brand)",
            title: "Brave-native",
            desc: "BAT is the Brave browser's own token — a natural pairing with Brave Wallet."
          },
          {
            icon: Zap,
            color: "#10b981",
            title: "Same bridge",
            desc: "Reuses the chain-key ckERC-20 path already running for UNI. No new contracts to audit."
          },
          {
            icon: Clock,
            color: "#eab308",
            title: "Self-updating",
            desc: "This page reads the minter directly, so it goes live the day ckBAT does."
          }
        ].map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "flex items-start gap-2 rounded-2xl border p-4",
            style: { borderColor: "var(--bb-border)", background: "var(--bb-surface)" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(item.icon, { className: "w-4 h-4 shrink-0 mt-0.5", style: { color: item.color } }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-bold mb-0.5", children: item.title }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "var(--bb-text-muted)" }, children: item.desc })
              ] })
            ]
          },
          item.title
        )) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
            style: {
              background: "linear-gradient(135deg, rgba(234, 179, 8, 0.06), var(--bb-surface))",
              borderColor: "var(--bb-border)"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    className: "text-[10px] font-black uppercase tracking-widest mb-1",
                    style: { color: "var(--bb-brand)" },
                    children: "In the meantime"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm", style: { color: "var(--bb-text)" }, children: [
                  "The live ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Minegold.Uni" }),
                  " workflow refines UNI into sGLDT today."
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: onOpenUni,
                  className: "inline-flex items-center gap-1.5 text-sm font-bold rounded-xl px-4 py-2 transition-all",
                  style: { background: "var(--bb-brand)", color: "#ffffff" },
                  children: [
                    "Open Minegold.Uni",
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 14 })
                  ]
                }
              )
            ]
          }
        )
      ] })
    }
  );
}
export {
  MinegoldBraveSoon
};
