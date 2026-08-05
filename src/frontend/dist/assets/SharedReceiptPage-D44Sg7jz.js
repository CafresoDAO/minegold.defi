import { r as reactExports, a9 as fetchPublicReceipt, j as jsxRuntimeExports, T as ThemeToggle, F as formatTokenAmount, aa as formatTimestamp, a7 as ledgerUrl, A as ShieldCheck, ab as SGLDT_LEDGER_ID, I as ExternalLink } from "./index-Cnm2qphK.js";
import { A as ArrowRight } from "./arrow-right-CcVc8Kyp.js";
const STATUS_COPY = {
  paid: { label: "Settled", tone: "var(--trust-verified)" },
  pulled: { label: "In flight", tone: "var(--trust-attested)" },
  refunded: { label: "Refunded", tone: "var(--trust-unknown)" },
  stranded: { label: "Held for manual resolution", tone: "var(--trust-fault)" }
};
function SharedReceiptPage({ token, onNavigatePath }) {
  const [receipt, setReceipt] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  reactExports.useEffect(() => {
    let cancelled = false;
    if (!token) {
      setLoading(false);
      return;
    }
    void (async () => {
      const r = await fetchPublicReceipt(token);
      if (cancelled) return;
      setReceipt(r);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);
  const isRefine = (receipt == null ? void 0 : receipt.kind) === "refine";
  const inDecimals = isRefine ? 18 : 8;
  const outDecimals = isRefine ? 8 : 18;
  const inSymbol = isRefine ? "ckUNI" : "sGLDT";
  const outSymbol = isRefine ? "sGLDT" : "ckUNI";
  const status = receipt ? STATUS_COPY[receipt.status] : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-ocid": "shared_receipt.page",
      className: "min-h-screen",
      style: { background: "var(--bb-bg)", color: "var(--bb-text)" },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-10", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-10 flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => onNavigatePath("/"),
              className: "inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold",
              style: { color: "var(--bb-text-muted)" },
              children: "minegold.defi"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeToggle, {})
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "t-label mb-3", style: { color: "var(--bb-text-dim)" }, children: "Shared receipt" }),
        loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "animate-pulse text-sm", style: { color: "var(--bb-text-muted)" }, children: "Reading the ledger…" }) : !receipt ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "shared_receipt.not_found", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "t-display", style: { fontSize: "1.75rem" }, children: "This link doesn't resolve" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              className: "mt-3 text-[15px] leading-relaxed",
              style: { color: "var(--bb-text-muted)" },
              children: "Either it was never a valid share link, or its owner revoked it. We deliberately don't say which — distinguishing the two would let someone probe for receipts that exist."
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: () => onNavigatePath("/"),
              className: "mt-6 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold",
              style: { color: "var(--bb-brand)" },
              children: [
                "Go to minegold.defi ",
                /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRight, { size: 14 })
              ]
            }
          )
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "t-display", style: { fontSize: "1.75rem" }, children: isRefine ? "Deposit" : "Withdrawal" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "mt-6 rounded-3xl border p-6",
              style: {
                borderColor: "var(--bb-border)",
                background: "var(--bb-surface)"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "t-label", style: { color: "var(--bb-text-dim)" }, children: "Status" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "span",
                    {
                      className: "inline-flex items-center gap-1.5 text-xs font-bold",
                      style: { color: status == null ? void 0 : status.tone },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "span",
                          {
                            "aria-hidden": true,
                            className: "h-2 w-2 rounded-full",
                            style: { background: status == null ? void 0 : status.tone }
                          }
                        ),
                        status == null ? void 0 : status.label
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { className: "mt-5 space-y-3 text-[13px]", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Row,
                    {
                      label: "In",
                      value: `${formatTokenAmount(receipt.amountIn, inDecimals)} ${inSymbol}`
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Row,
                    {
                      label: "Out",
                      value: `${formatTokenAmount(receipt.amountOut, outDecimals)} ${outSymbol}`
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Row,
                    {
                      label: "Settled rate",
                      value: `${(Number(receipt.rate) / 1e8).toFixed(4)} sGLDT / UNI`
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Time", value: formatTimestamp(receipt.timestampNs) }),
                  receipt.payBlock !== null && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Row,
                    {
                      label: "sGLDT ledger block",
                      value: receipt.payBlock.toString(),
                      href: ledgerUrl("sGLDT")
                    }
                  ),
                  receipt.pullBlock !== null && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Pull block", value: receipt.pullBlock.toString() })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "mt-4 flex items-start gap-3 rounded-3xl border p-5",
              style: {
                borderColor: "var(--bb-border)",
                background: "var(--bb-surface)"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  ShieldCheck,
                  {
                    size: 18,
                    className: "mt-0.5 shrink-0",
                    style: { color: "var(--trust-verified)" }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "p",
                  {
                    className: "text-[12px] leading-relaxed",
                    style: { color: "var(--bb-text-muted)" },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-bold", style: { color: "var(--bb-text)" }, children: "This receipt names nobody." }),
                      " ",
                      "It carries no account, wallet address, or identity — the figures above are all it contains. The block reference is public on the sGLDT ledger, so anyone can confirm the payout happened without asking us, or the person who shared it, for anything."
                    ]
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "p",
            {
              className: "mt-6 text-[12px] leading-relaxed",
              style: { color: "var(--bb-text-muted)" },
              children: [
                "Verify independently on the",
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "a",
                  {
                    href: `https://dashboard.internetcomputer.org/canister/${SGLDT_LEDGER_ID}`,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "inline-flex items-center gap-1 font-semibold underline underline-offset-2",
                    style: { color: "var(--bb-brand)" },
                    children: [
                      "sGLDT ledger ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 11 })
                    ]
                  }
                ),
                ", read the live treasury figures on",
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
                ", or start with",
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => onNavigatePath("/docs/how-it-works"),
                    className: "font-semibold underline underline-offset-2",
                    style: { color: "var(--bb-brand)" },
                    children: "how it works"
                  }
                ),
                "."
              ]
            }
          )
        ] }),
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
function Row({
  label,
  value,
  href
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline justify-between gap-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { style: { color: "var(--bb-text-dim)" }, children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("dd", { className: "text-right font-mono font-semibold", style: { color: "var(--bb-text)" }, children: href ? /* @__PURE__ */ jsxRuntimeExports.jsx(
      "a",
      {
        href,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "underline underline-offset-2",
        style: { color: "var(--bb-brand)" },
        children: value
      }
    ) : value })
  ] });
}
export {
  SharedReceiptPage
};
