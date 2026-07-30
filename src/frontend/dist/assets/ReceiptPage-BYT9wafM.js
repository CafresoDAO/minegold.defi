import { u as useInternetIdentity, Q as useLedger, a0 as findEntry, j as jsxRuntimeExports, A as ShieldCheck, L as LoaderCircle } from "./index-we-wz8f3.js";
import { R as ReceiptBlock } from "./ReceiptBlock-0uLhA4WO.js";
import { A as ArrowLeft } from "./arrow-left-CpEElhDA.js";
function ReceiptPage({
  id,
  onBack
}) {
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();
  const { entries, isLoading } = useLedger(identity);
  const entry = id ? findEntry(entries, id) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-[#080808] text-zinc-100", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-md mx-auto px-4 sm:px-6 py-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        "data-ocid": "receipt.back",
        onClick: onBack,
        className: "inline-flex min-h-[44px] items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-6",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowLeft, { size: 14 }),
          " Back to activity"
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "t-headline text-white mb-1", children: "Receipt" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12px] text-zinc-500 mb-6", children: "Every figure below exists on a public ledger — verify it, don't trust it." }),
    !isLoggedIn ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": "receipt.login_prompt",
        className: "text-center bg-zinc-900 border border-zinc-800 rounded-[2rem] p-10",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ShieldCheck,
            {
              size: 40,
              className: "text-yellow-500 mx-auto mb-4 opacity-80"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-400 text-sm mb-6", children: "Receipts are private to their owner. Open your vault to view yours." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: login,
              disabled: isLoggingIn,
              "data-ocid": "receipt.login_button",
              className: "w-full bg-white text-black hover:bg-zinc-200 h-14 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50",
              children: isLoggingIn ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "animate-spin", size: 18 }) : "Open my vault"
            }
          )
        ]
      }
    ) : isLoading && !entry ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center text-sm text-zinc-500 py-16 animate-pulse", children: "Reading your ledger…" }) : !entry ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": "receipt.not_found",
        className: "rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold text-zinc-300 mb-1", children: "No receipt with this reference" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-zinc-500", children: [
            'This vault has no entry "',
            id ?? "—",
            '". Receipts are visible only to the vault that owns them — if someone shared this link with you, only they can open it.'
          ] })
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptBlock, { entry, showLink: false })
  ] }) });
}
export {
  ReceiptPage
};
