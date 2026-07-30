import { c as createLucideIcon, r as reactExports, j as jsxRuntimeExports, E as useProofSnapshot, F as formatTokenAmount, G as CANISTERS, H as DASHBOARD, I as ExternalLink, J as fetchCkBatStatus, T as ThemeToggle, y as ChevronRight, K as JOURNEY } from "./index-we-wz8f3.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
];
const ArrowRight = createLucideIcon("arrow-right", __iconNode);
function Reveal({
  children,
  delayMs = 0,
  className = ""
}) {
  const ref = reactExports.useRef(null);
  const [shown, setShown] = reactExports.useState(() => {
    if (typeof window === "undefined") return true;
    return !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  reactExports.useEffect(() => {
    if (shown || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      ref,
      className,
      style: {
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(14px)",
        transition: `opacity 600ms var(--ease-settle) ${delayMs}ms, transform 600ms var(--ease-settle) ${delayMs}ms`
      },
      children
    }
  );
}
function ProofBand({ onOpenProof }) {
  const { data: snap, isLoading } = useProofSnapshot(true);
  const balances = (snap == null ? void 0 : snap.balances) ?? null;
  const stranded = (snap == null ? void 0 : snap.stranded) ? snap.stranded.refines + snap.stranded.redeems : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      "data-ocid": "landing.proof_band",
      className: "rounded-[2rem] border p-6 sm:p-8",
      style: {
        borderColor: "var(--bb-border)",
        background: "var(--bb-surface)"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "t-display", style: { fontSize: "clamp(1.75rem, 1.4rem + 1.6vw, 2.5rem)" }, children: "Verify it." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "p",
          {
            className: "mt-1 mb-5 text-sm max-w-2xl",
            style: { color: "var(--bb-text-muted)" },
            children: "Don't take our word for any of this. These are live reads from public ledgers, and the canisters behind them are linked below — including the ones we don't control."
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Figure,
            {
              label: "Treasury sGLDT (pays refines)",
              value: balances ? formatTokenAmount(balances.sgldtBalance) : isLoading ? "…" : "—"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Figure,
            {
              label: "Treasury ckUNI (pays cash-outs)",
              value: balances ? formatTokenAmount(balances.ckUNIBalance, 18) : isLoading ? "…" : "—"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Figure,
            {
              label: "Swaps held for manual resolution",
              value: stranded != null ? stranded.toString() : isLoading ? "…" : "—",
              note: "published even at 0"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label mb-2", style: { color: "var(--bb-text-dim)" }, children: "Every canister in the money path — and who controls it" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "mb-5 grid gap-1.5 sm:grid-cols-2", children: CANISTERS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "text-[11px] leading-relaxed", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "a",
            {
              href: `${DASHBOARD}/${c.id}`,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "inline-flex items-center gap-1 font-mono underline underline-offset-2",
              style: { color: "var(--bb-brand)" },
              children: [
                c.id.slice(0, 14),
                "… ",
                /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 10 })
              ]
            }
          ),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--bb-text)" }, children: c.label }),
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "var(--bb-text-dim)" }, children: [
            "(",
            c.party,
            ")"
          ] })
        ] }, c.id)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "rounded-2xl border p-4 text-[12px] leading-relaxed",
            style: {
              borderColor: "var(--bb-border)",
              background: "var(--bb-bg-soft)",
              color: "var(--bb-text-muted)"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label mb-1.5", style: { color: "var(--bb-text)" }, children: "What we can't promise (stated on purpose)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "list-disc pl-4 space-y-1", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--bb-text)" }, className: "font-semibold", children: "Unaudited." }),
                  " ",
                  "No third party has audited this code."
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--bb-text)" }, className: "font-semibold", children: "Single operator." }),
                  " ",
                  "One person controls the backend and sets the sGLDT/USD reference leg of the rate."
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "Refine payouts depend on treasury liquidity — shown live above. If it runs short, your deposit is auto-refunded, never taken." }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "sGLDT's peg is sVault's contract and GLDT's gold backing is Gold DAO's — we link them, we don't control them." })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            "data-ocid": "landing.open_proof",
            onClick: onOpenProof,
            className: "mt-4 inline-flex min-h-[44px] items-center text-sm font-bold underline underline-offset-4",
            style: { color: "var(--bb-brand)" },
            children: "Open the full proof page ›"
          }
        )
      ]
    }
  );
}
function Figure({
  label,
  value,
  note
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "rounded-2xl border p-4",
      style: { borderColor: "var(--bb-border)", background: "var(--bb-bg-soft)" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label mb-1", style: { color: "var(--bb-text-muted)" }, children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xl font-black tabular-nums", style: { color: "var(--bb-text)" }, children: value }),
        note && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] mt-0.5", style: { color: "var(--bb-text-muted)" }, children: note })
      ]
    }
  );
}
const ITEMS = [
  {
    q: "Is this custodial? Do you hold my money?",
    a: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      "No. DFINITY's chain-key minter credits your bridged tokens to",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "your own account" }),
      ", and the gold lands in your vault. The refinery holds funds only for the seconds of the atomic swap, and a failed swap refunds you automatically. Four of the five custody steps are yours — the refinery's rail on the refinery page names each one."
    ] })
  },
  {
    q: "What actually backs sGLDT?",
    a: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      "sGLDT is a 1:1 wrapper of ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "GLDT" }),
      ", Gold DAO's token — each backed by 0.01 g of LBMA-sourced physical gold in audited Swiss vaults. The wrapper exists purely for fees (0.00001 vs 0.10 per transfer, ~10,000× cheaper). Unwrap at sVault any time; redeem GLDT for metal through Gold DAO.",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "a",
        {
          href: "https://gldt.org",
          target: "_blank",
          rel: "noopener noreferrer",
          className: "underline underline-offset-2",
          style: { color: "var(--bb-brand)" },
          children: "gldt.org"
        }
      ),
      " ",
      "explains the gold behind it. We link that chain — we don't control it."
    ] })
  },
  {
    q: "What happens if a swap fails?",
    a: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      "Your deposit is refunded automatically to your own account — the swap and the refund are one atomic path in the canister. If even the refund fails, the record is ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "held" }),
      " on-chain with your funds noted, it appears in your activity with a resolution contact, and the live count of held swaps is published on the proof page — even when it's zero. Nothing is silently dropped."
    ] })
  },
  {
    q: "Do I need a seed phrase?",
    a: /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: "No. Your vault is an Internet Identity passkey — Face ID or a fingerprint, about 20 seconds to create, nothing to write down or lose. You'll also connect an ordinary Ethereum wallet for the tokens you're spending; that one is yours already." })
  },
  {
    q: "When does BAT intake open?",
    a: /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children: "When DFINITY's chain-key minter lists BAT — not before, and not on our say-so. The chip at the top of this page is a live read of the minter's supported-token list, so it tells you the truth on every visit. Join the waitlist and you get exactly one message, at launch." })
  },
  {
    q: "Who runs this, and how does it relate to Banking.Brave?",
    a: /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      "minegold.defi is an application in the",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Banking.Brave" }),
      " ecosystem, which is powered by",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "CafresoDAO" }),
      ". They are separate products: Banking.Brave is the institution; this is a refinery that runs under it. Day to day, the canisters here have a",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "single controller" }),
      " — published on the proof page alongside the code's limitations — and the code is",
      " ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "unaudited" }),
      ". Check the numbers before you send anything; that is what the proof page is for."
    ] })
  }
];
function FAQ() {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "data-ocid": "landing.faq", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "h2",
      {
        className: "t-display mb-4",
        style: { fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)" },
        children: "Fair questions"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: ITEMS.map((item) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "details",
      {
        className: "group rounded-2xl border px-4 py-3",
        style: {
          borderColor: "var(--bb-border)",
          background: "var(--bb-surface)"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "cursor-pointer list-none text-sm font-bold marker:hidden flex items-center justify-between gap-3 min-h-[28px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: item.q }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                "aria-hidden": true,
                className: "shrink-0 transition-transform group-open:rotate-45",
                style: { color: "var(--bb-text-dim)" },
                children: "+"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              className: "mt-2 text-[13px] leading-relaxed",
              style: { color: "var(--bb-text-muted)" },
              children: item.a
            }
          )
        ]
      },
      item.q
    )) })
  ] });
}
function LandingPage({
  onOpenRefinery,
  onOpenBrave,
  onOpenProof
}) {
  const [bat, setBat] = reactExports.useState(null);
  const [sticky, setSticky] = reactExports.useState(false);
  reactExports.useEffect(() => {
    let cancelled = false;
    fetchCkBatStatus().then((s) => {
      if (!cancelled) setBat(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  reactExports.useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const batChip = bat === null ? "checking DFINITY's minter…" : bat.supported ? "BAT is listed on the chain-key minter — BAT intake can open" : bat.error ? "minter status check unavailable" : "BAT not yet listed by DFINITY's minter — checked live just now";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-ocid": "landing.page",
      className: "min-h-screen",
      style: { background: "var(--bb-bg)", color: "var(--bb-text)" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pointer-events-none sm:px-6",
            style: {
              opacity: sticky ? 1 : 0,
              transform: sticky ? "none" : "translateY(12px)",
              transition: "opacity 300ms var(--ease-settle), transform 300ms var(--ease-settle)"
            },
            "aria-hidden": !sticky,
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                "data-ocid": "landing.sticky_cta",
                onClick: onOpenRefinery,
                tabIndex: sticky ? 0 : -1,
                className: "pointer-events-auto mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-2xl",
                style: { background: "var(--royal-700)", color: "#ffffff" },
                children: [
                  "Open the refinery ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 15 })
                ]
              }
            )
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-10", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-lg font-black tracking-tight", children: [
              "minegold",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--gold-500)" }, children: ".defi" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeToggle, {})
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "mb-16 max-w-3xl", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "p",
              {
                className: "t-label mb-3",
                style: { color: "var(--bb-text-dim)" },
                children: "An ERC-20 refinery on the Internet Computer"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "t-display", children: "Tokens in. Gold out." }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "p",
              {
                className: "mt-4 max-w-2xl text-[15px] leading-relaxed",
                style: { color: "var(--bb-text-muted)" },
                children: [
                  "minegold.defi bridges an ERC-20 token from Ethereum onto ICP and refines it into",
                  " ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: "var(--gold-500)" }, children: "sGLDT" }),
                  " — a 1:1 wrapper of Gold DAO's GLDT, each token backed by 0.01 g of LBMA-sourced physical gold held in audited Swiss vaults. The entire refinery is a canister: no server, no company holding your funds, and an exit path that works the same day you arrive."
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 flex flex-wrap items-center gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  "data-ocid": "landing.hero_cta",
                  onClick: onOpenRefinery,
                  className: "inline-flex min-h-[48px] items-center gap-2 rounded-2xl px-5 text-sm font-bold shadow-lg transition-transform hover:-translate-y-0.5",
                  style: { background: "var(--royal-700)", color: "#ffffff" },
                  children: [
                    "Open the refinery ",
                    /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 15 })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  "data-ocid": "landing.hero_proof",
                  onClick: onOpenProof,
                  className: "inline-flex min-h-[48px] items-center text-sm font-bold underline underline-offset-4",
                  style: { color: "var(--bb-brand)" },
                  children: "Read the proof first ›"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-5 flex flex-wrap items-center gap-2 text-[11px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "span",
                {
                  className: "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-semibold",
                  style: {
                    borderColor: "rgba(52,211,153,0.3)",
                    background: "rgba(52,211,153,0.1)",
                    color: "var(--trust-verified)"
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        className: "h-1.5 w-1.5 rounded-full",
                        style: { background: "var(--trust-verified)" }
                      }
                    ),
                    "UNI intake live on mainnet"
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  "data-ocid": "landing.bat_status",
                  onClick: onOpenBrave,
                  className: "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-semibold",
                  style: {
                    borderColor: "rgba(255,122,69,0.3)",
                    background: "rgba(255,122,69,0.1)",
                    color: "#ff9a6e"
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        className: "h-1.5 w-1.5 rounded-full",
                        style: {
                          background: (bat == null ? void 0 : bat.supported) ? "var(--trust-verified)" : "var(--trust-unknown)"
                        }
                      }
                    ),
                    batChip
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Reveal, { className: "mb-16", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-4 sm:grid-cols-3", children: [
            {
              accent: "var(--royal-400)",
              kicker: "Bridge",
              body: "DFINITY's chain-key minter moves your ERC-20 onto ICP and credits it to your own account — not to ours."
            },
            {
              accent: "var(--gold-500)",
              kicker: "Refine",
              body: "One atomic swap converts it to sGLDT at the canister's own on-chain rate. A failed swap refunds you automatically."
            },
            {
              accent: "var(--trust-verified)",
              kicker: "Hold or exit",
              body: "The gold sits in a vault only your passkey opens. Redeem back to ckUNI whenever you want."
            }
          ].map((b, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "relative rounded-3xl border p-5",
              style: {
                borderColor: "var(--bb-border)",
                background: "var(--bb-surface)"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: "mb-2 block h-1 w-8 rounded-full",
                    style: { background: b.accent }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-base font-black", children: b.kicker }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "p",
                  {
                    className: "mt-1 text-[13px] leading-relaxed",
                    style: { color: "var(--bb-text-muted)" },
                    children: b.body
                  }
                ),
                i < 2 && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ChevronRight,
                  {
                    size: 16,
                    "aria-hidden": true,
                    className: "absolute -right-3 top-1/2 hidden -translate-y-1/2 sm:block",
                    style: { color: "var(--bb-text-dim)" }
                  }
                )
              ]
            },
            b.kicker
          )) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Reveal, { className: "mb-16", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ProofBand, { onOpenProof }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Reveal, { className: "mb-16", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "h2",
              {
                className: "t-display mb-4",
                style: { fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)" },
                children: "Four steps, about three minutes"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "grid gap-3 sm:grid-cols-4", children: JOURNEY.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "li",
              {
                className: "rounded-2xl border p-4",
                style: {
                  borderColor: "var(--bb-border)",
                  background: "var(--bb-surface)"
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: "mb-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                      style: { background: "var(--royal-700)", color: "#ffffff" },
                      children: s.n
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold", children: s.title }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "p",
                    {
                      className: "mt-0.5 text-[12px] leading-relaxed",
                      style: { color: "var(--bb-text-muted)" },
                      children: s.sub
                    }
                  )
                ]
              },
              s.n
            )) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3 text-[12px]", style: { color: "var(--bb-text-dim)" }, children: "The wait in step 3 is Ethereum's, not ours — 12 blocks. You can close the tab; the payout happens on-chain either way." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Reveal, { className: "mb-16", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "h2",
              {
                className: "t-display mb-4",
                style: { fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)" },
                children: "Where this stands today"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "rounded-3xl border p-6",
                style: {
                  borderColor: "var(--bb-border)",
                  background: "var(--bb-surface)"
                },
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { className: "grid gap-5 sm:grid-cols-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "t-label mb-1", style: { color: "var(--bb-text-dim)" }, children: "Live intake" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-sm font-bold", children: "minegold.uni" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "dd",
                      {
                        className: "mt-1 text-[12px] leading-relaxed",
                        style: { color: "var(--bb-text-muted)" },
                        children: "UNI → ckUNI → sGLDT. The path that works on mainnet today, and the one the application is being proven on."
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "t-label mb-1", style: { color: "var(--bb-text-dim)" }, children: "Next intake" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-sm font-bold", children: "BAT" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "dd",
                      {
                        className: "mt-1 text-[12px] leading-relaxed",
                        style: { color: "var(--bb-text-muted)" },
                        children: [
                          "Opens if and when DFINITY's chain-key minter lists BAT. The status chip above reads that list live, on every visit — it is not a promise we control.",
                          " ",
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "button",
                            {
                              type: "button",
                              onClick: onOpenBrave,
                              className: "underline underline-offset-2",
                              style: { color: "var(--bb-brand)" },
                              children: "Live status ›"
                            }
                          )
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "t-label mb-1", style: { color: "var(--bb-text-dim)" }, children: "Home" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-sm font-bold", children: "minegold.brave" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "dd",
                      {
                        className: "mt-1 text-[12px] leading-relaxed",
                        style: { color: "var(--bb-text-muted)" },
                        children: "The domain this application will move to. Until then it runs at its canister address — which keeps working afterwards regardless."
                      }
                    )
                  ] })
                ] })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Reveal, { className: "mb-16", children: /* @__PURE__ */ jsxRuntimeExports.jsx(FAQ, {}) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "footer",
            {
              className: "border-t pt-6 pb-24 text-[11px] leading-relaxed",
              style: { borderColor: "var(--bb-border)", color: "var(--bb-text-dim)" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "mb-2", children: [
                  "Refinery backend",
                  " ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono", children: "c626g-iyaaa-aaaau-agpoa-cai" }),
                  " · frontend",
                  " ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono", children: "cqyto-tiaaa-aaaau-agppa-cai" }),
                  " · built on",
                  " ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "a",
                    {
                      href: "https://internetcomputer.org",
                      target: "_blank",
                      rel: "noopener noreferrer",
                      className: "underline underline-offset-2",
                      style: { color: "var(--bb-brand)" },
                      children: "Internet Computer Protocol"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex flex-wrap items-center gap-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "img",
                    {
                      src: "/brand/icon-512.png",
                      alt: "",
                      width: 16,
                      height: 16,
                      className: "rounded-full"
                    }
                  ),
                  "minegold.defi is part of the Banking.Brave ecosystem, powered by CafresoDAO."
                ] })
              ]
            }
          )
        ] })
      ]
    }
  );
}
export {
  LandingPage
};
