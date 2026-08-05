import { j as jsxRuntimeExports, T as ThemeToggle, M as MinegoldMark, y as ChevronRight, z as Clock, A as ShieldCheck, B as TrendingUp, D as Lock } from "./index-Dfb_LJyK.js";
function BankingBraveHome({
  onOpenMinegoldUni,
  onOpenMinegoldBrave
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "min-h-screen",
      style: { background: "var(--bb-bg)", color: "var(--bb-text)" },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end mb-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeToggle, {}) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "flex flex-col items-center text-center mb-16", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "w-32 h-32 sm:w-40 sm:h-40 mb-6 rounded-full overflow-hidden block",
              style: { boxShadow: "0 0 30px rgba(2, 69, 140, 0.45)" },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "img",
                {
                  src: "/brand/icon-512.png",
                  alt: "Banking.Brave",
                  width: 160,
                  height: 160,
                  className: "w-full h-full"
                }
              )
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "t-display mb-3", children: [
            "Banking",
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--bb-brand)" }, children: "." }),
            "Brave"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm sm:text-base max-w-xl", style: { color: "var(--bb-text-muted)" }, children: "On-chain financial primitives on the Internet Computer — open, auditable, and self-custodial by construction." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              className: "mt-2 t-label",
              style: { color: "var(--bb-text-dim)" },
              children: "Powered by CafresoDAO"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "mb-12", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-end justify-between flex-wrap gap-2 mb-5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "t-label mb-1",
                style: { color: "var(--bb-text-dim)" },
                children: "Applications in the ecosystem"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-xl sm:text-2xl font-black tracking-tight", children: [
              "minegold",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--bb-brand)" }, children: "." }),
              "defi"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs mt-1 max-w-lg", style: { color: "var(--bb-text-muted)" }, children: "A cross-chain refinery: it bridges an ERC-20 asset onto ICP and refines it into sGLDT — a 1:1 wrapper of Gold DAO's physically backed GLDT (gldt.org). It runs as its own product, with its own front door." })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: onOpenMinegoldUni,
                className: "group relative text-left rounded-3xl border transition-all p-6 overflow-hidden hover:-translate-y-0.5",
                style: {
                  background: "linear-gradient(135deg, rgba(234, 179, 8, 0.08), var(--bb-surface))",
                  borderColor: "var(--bb-border)",
                  color: "var(--bb-text)"
                },
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-yellow-500/20", children: /* @__PURE__ */ jsxRuntimeExports.jsx(MinegoldMark, { size: 24 }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-lg font-black", children: [
                        "minegold",
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--bb-brand)" }, children: "." }),
                        "defi"
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "t-label bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5", children: "Live" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] font-mono mb-2", style: { color: "var(--bb-text-dim)" }, children: "UNI (ERC-20) → ckUNI → sGLDT" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs leading-relaxed", style: { color: "var(--bb-text-muted)" }, children: "The UNI intake — minegold.uni — is live on mainnet: bridge UNI into ckUNI via the chain-key minter, then refine into sGLDT at the canister's own rate. This is the path the application is proven on today." }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex items-center gap-1.5 text-xs font-bold text-yellow-500 group-hover:text-yellow-400 transition-colors", children: [
                      "Open minegold.defi",
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 14, className: "group-hover:translate-x-1 transition-transform" })
                    ] })
                  ] })
                ] })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: onOpenMinegoldBrave,
                className: "group relative text-left rounded-3xl border transition-all p-6 overflow-hidden hover:-translate-y-0.5",
                style: {
                  background: "linear-gradient(135deg, rgba(249, 115, 22, 0.08), var(--bb-surface))",
                  borderColor: "var(--bb-border)",
                  color: "var(--bb-text)"
                },
                children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      className: "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20",
                      style: { background: "linear-gradient(135deg, #f97316, #ea580c)" },
                      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", "aria-hidden": true, children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M12 3L3 8l9 5 9-5-9-5z", fill: "#FFFFFF" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("path", { d: "M3 8v8l9 5 9-5V8", stroke: "#FFFFFF", strokeWidth: "1.5", fill: "none" })
                      ] })
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-1", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-black", children: "BAT intake" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 t-label bg-amber-500/15 text-amber-500 border border-amber-500/30 rounded-full px-2 py-0.5", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 9 }),
                        " Soon"
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-[10px] font-mono mb-2", style: { color: "var(--bb-text-dim)" }, children: "BAT (ERC-20) → ckBAT → sGLDT" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs leading-relaxed", style: { color: "var(--bb-text-muted)" }, children: "The same refinery, fed by the Brave browser's BAT. Opens only once DFINITY's chain-key minter lists ckBAT — a condition we don't control, checked live." }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex items-center gap-1.5 text-xs font-bold text-orange-500 group-hover:text-orange-400 transition-colors", children: [
                      "Live status",
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 14, className: "group-hover:translate-x-1 transition-transform" })
                    ] })
                  ] })
                ] })
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "mb-16 grid sm:grid-cols-3 gap-4 text-xs", children: [
          { icon: ShieldCheck, color: "var(--bb-brand)", title: "100% on-chain", desc: "All logic lives in ICP canisters — no backend servers." },
          { icon: TrendingUp, color: "#10b981", title: "Cross-chain native", desc: "DFINITY chain-key ckERC-20 bridges each source asset automatically." },
          { icon: Lock, color: "#eab308", title: "Self-custody", desc: "You sign with your own Brave Wallet and Internet Identity." }
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
          "footer",
          {
            className: "pt-6 border-t text-center text-[11px]",
            style: { borderColor: "var(--bb-border)", color: "var(--bb-text-dim)" },
            children: [
              "Banking.Brave is powered by",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "var(--bb-text-muted)" }, children: "CafresoDAO" }),
              " · built on",
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "a",
                {
                  href: "https://internetcomputer.org",
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "transition-colors",
                  style: { color: "var(--bb-brand)" },
                  children: "Internet Computer Protocol"
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
  BankingBraveHome
};
