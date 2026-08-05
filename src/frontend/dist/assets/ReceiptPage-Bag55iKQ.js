import { r as reactExports, a0 as fetchShareToken, j as jsxRuntimeExports, a1 as shareUrl, a2 as Check, q as Copy, L as LoaderCircle, a3 as X, a4 as unpublishReceipt, a5 as publishReceipt, u as useInternetIdentity, Q as useLedger, a6 as findEntry, A as ShieldCheck } from "./index-Dfb_LJyK.js";
import { L as Link2, R as ReceiptBlock } from "./ReceiptBlock-DMDHvSHN.js";
import { A as ArrowLeft } from "./arrow-left-Bf0Qqjra.js";
function ShareReceiptControl({
  entry,
  identity
}) {
  const kind = entry.kind === "refine" || entry.kind === "redeem" ? entry.kind : null;
  const numericId = (() => {
    const n = entry.id.split("-")[1];
    return n && /^\d+$/.test(n) ? BigInt(n) : null;
  })();
  const [token, setToken] = reactExports.useState(null);
  const [busy, setBusy] = reactExports.useState(false);
  const [copied, setCopied] = reactExports.useState(false);
  const [error, setError] = reactExports.useState(null);
  const [checked, setChecked] = reactExports.useState(false);
  reactExports.useEffect(() => {
    let cancelled = false;
    if (!kind || numericId === null) {
      setChecked(true);
      return;
    }
    void (async () => {
      const t = await fetchShareToken(identity, kind, numericId);
      if (cancelled) return;
      setToken(t);
      setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [identity, kind, numericId]);
  if (!kind || numericId === null || !checked) return null;
  const onShare = async () => {
    setBusy(true);
    setError(null);
    const res = await publishReceipt(identity, kind, numericId);
    if (res.ok) setToken(res.token);
    else setError(res.error);
    setBusy(false);
  };
  const onRevoke = async () => {
    setBusy(true);
    setError(null);
    const res = await unpublishReceipt(identity, kind, numericId);
    if (res.ok) {
      setToken(null);
      setCopied(false);
    } else setError(res.error ?? "Couldn't revoke the link.");
    setBusy(false);
  };
  const onCopy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    } catch {
      setError("Couldn't copy — select the link and copy it manually.");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-ocid": "receipt.share",
      className: "mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4",
      children: [
        token ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12px] font-bold text-zinc-200 mb-1", children: "This receipt is shared" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] leading-relaxed text-zinc-500 mb-3", children: "Anyone with the link can see the amounts, the settled rate and the ledger block — and nothing that identifies you. Revoking stops the link resolving; the receipt stays in your history either way." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "min-w-0 flex-1 truncate rounded-lg border border-zinc-800 bg-black/40 px-2.5 py-2 font-mono text-[11px] text-zinc-400", children: shareUrl(token) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                "data-ocid": "receipt.share.copy",
                onClick: () => void onCopy(),
                className: "inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-[12px] font-bold text-zinc-200 hover:bg-zinc-800",
                children: [
                  copied ? /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { size: 13 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { size: 13 }),
                  copied ? "Copied" : "Copy"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                "data-ocid": "receipt.share.revoke",
                onClick: () => void onRevoke(),
                disabled: busy,
                className: "inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-zinc-800 px-3 text-[12px] font-semibold text-zinc-400 hover:text-zinc-200 disabled:opacity-50",
                children: [
                  busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 13, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 13 }),
                  "Revoke"
                ]
              }
            )
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[12px] font-bold text-zinc-200 mb-1", children: "Share this receipt" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] leading-relaxed text-zinc-500 mb-3", children: "Creates a link anyone can open. It shows the amounts, the settled rate and the ledger block — and carries no account, wallet address or identity. You can revoke it at any time." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              "data-ocid": "receipt.share.create",
              onClick: () => void onShare(),
              disabled: busy,
              className: "inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 text-[12px] font-bold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50",
              children: [
                busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { size: 13, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Link2, { size: 13 }),
                "Create share link"
              ]
            }
          )
        ] }),
        error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-2 text-[11px] text-amber-400", "data-ocid": "receipt.share.error", children: error })
      ]
    }
  );
}
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
    ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptBlock, { entry, showLink: false }),
      identity && /* @__PURE__ */ jsxRuntimeExports.jsx(ShareReceiptControl, { entry, identity })
    ] })
  ] }) });
}
export {
  ReceiptPage
};
