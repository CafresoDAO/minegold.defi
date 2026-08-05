import { c as createLucideIcon, r as reactExports, j as jsxRuntimeExports, U as StatusPill, a6 as fmtAmount, I as ExternalLink, a7 as ledgerUrl } from "./index-Cnm2qphK.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M9 17H7A5 5 0 0 1 7 7h2", key: "8i5ue5" }],
  ["path", { d: "M15 7h2a5 5 0 1 1 0 10h-2", key: "1b9ql8" }],
  ["line", { x1: "8", x2: "16", y1: "12", y2: "12", key: "1jonct" }]
];
const Link2 = createLucideIcon("link-2", __iconNode);
const KIND_LABEL = {
  refine: "Deposit — UNI refined to sGLDT",
  redeem: "Redeem — gold back to ckUNI",
  bridge: "Deposit — UNI onto the bridge",
  mint: "Mint — ckUNI credited",
  transfer: "Transfer"
};
const legTokens = (kind) => kind === "redeem" ? { pull: "sGLDT", pay: "ckUNI" } : { pull: "ckUNI", pay: "sGLDT" };
const fmtTime = (ns) => new Date(Number(ns / 1000000n)).toLocaleString(void 0, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});
function Row({ label, children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline justify-between gap-3 py-1.5 border-b border-zinc-800/60 last:border-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-zinc-500 shrink-0", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[12px] text-zinc-200 text-right min-w-0", children })
  ] });
}
function BlockLink({
  token,
  block
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "a",
    {
      href: ledgerUrl(token),
      target: "_blank",
      rel: "noopener noreferrer",
      className: "inline-flex items-center gap-1 font-mono text-blue-400 hover:text-blue-300 underline underline-offset-2",
      title: `${token} ledger canister on the ICP dashboard`,
      children: [
        token,
        " ledger block #",
        block.toString(),
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 10 })
      ]
    }
  );
}
function ReceiptBlock({
  entry,
  /** Show the copy-link row (off inside pages that ARE the link target). */
  showLink = true
}) {
  var _a, _b;
  const [copied, setCopied] = reactExports.useState(false);
  const legs = legTokens(entry.kind);
  const isSwap = entry.kind === "refine" || entry.kind === "redeem";
  const copyLink = () => {
    try {
      void navigator.clipboard.writeText(
        `${window.location.origin}/receipt/${entry.id}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-ocid": `receipt.block.${entry.id}`,
      className: "rounded-2xl border border-zinc-800 bg-black/30 p-4",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3 mb-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold text-white", children: KIND_LABEL[entry.kind] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { status: entry.status })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "When", children: fmtTime(entry.timestampNs) }),
        entry.amountIn && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: isSwap ? "You put in" : "Amount", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono", children: fmtAmount(entry.amountIn, 6) }) }),
        entry.amountOut && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "You received", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-mono", children: fmtAmount(entry.amountOut, 6) }) }),
        entry.rateE8 != null && entry.rateE8 > 0n && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Settled rate", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "font-mono", children: [
          "1 UNI = ",
          (Number(entry.rateE8) / 1e8).toFixed(4),
          " sGLDT"
        ] }) }),
        entry.pullBlock != null && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: isSwap ? "Pull leg" : "Block", children: /* @__PURE__ */ jsxRuntimeExports.jsx(BlockLink, { token: legs.pull, block: entry.pullBlock }) }),
        entry.payBlock != null && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: isSwap ? "Pay leg" : "Block", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          BlockLink,
          {
            token: isSwap ? legs.pay : ((_a = entry.amountOut) == null ? void 0 : _a.symbol) === "ckUNI" || ((_b = entry.amountIn) == null ? void 0 : _b.symbol) === "ckUNI" ? "ckUNI" : "sGLDT",
            block: entry.payBlock
          }
        ) }),
        entry.ethTxHash && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Ethereum tx", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            href: `https://etherscan.io/tx/${entry.ethTxHash}`,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "inline-flex items-center gap-1 font-mono text-blue-400 hover:text-blue-300 underline underline-offset-2",
            children: [
              entry.ethTxHash.slice(0, 10),
              "…",
              entry.ethTxHash.slice(-6),
              " ",
              /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 10 })
            ]
          }
        ) }),
        entry.errorMsg && /* @__PURE__ */ jsxRuntimeExports.jsx(Row, { label: "Note", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-amber-400/90 break-words", children: entry.errorMsg }) }),
        showLink && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            "data-ocid": `receipt.copy_link.${entry.id}`,
            onClick: copyLink,
            className: "mt-2.5 inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 underline underline-offset-2",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Link2, { size: 11 }),
              copied ? "Link copied" : `Copy receipt link (/receipt/${entry.id})`
            ]
          }
        )
      ]
    }
  );
}
export {
  Link2 as L,
  ReceiptBlock as R
};
