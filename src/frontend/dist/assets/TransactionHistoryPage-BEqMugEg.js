import { c as createLucideIcon, j as jsxRuntimeExports, a as cn, u as useInternetIdentity, U as useLedger, r as reactExports, A as ShieldCheck, L as LoaderCircle, g as RefreshCw, V as ArrowRightLeft, X as StatusPill, Y as ChevronUp, Z as ChevronDown, _ as ArrowDownToLine, $ as ArrowUpFromLine } from "./index-M3INk0cV.js";
import { B as Button } from "./button-9ZEbrwYe.js";
import { R as ReceiptBlock } from "./ReceiptBlock-gnoPrV7u.js";
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
      d: "M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",
      key: "sc7q7i"
    }
  ]
];
const Funnel = createLucideIcon("funnel", __iconNode);
function Skeleton({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-slot": "skeleton",
      className: cn("bg-accent animate-pulse rounded-md", className),
      ...props
    }
  );
}
const KIND_META = {
  refine: {
    label: "Refine",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDownToLine, { size: 12, className: "text-yellow-500/80" })
  },
  redeem: {
    label: "Redeem",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpFromLine, { size: 12, className: "text-pink-400/80" })
  },
  bridge: {
    label: "Deposit",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRightLeft, { size: 12, className: "text-blue-400/80" })
  },
  mint: {
    label: "Mint",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowDownToLine, { size: 12, className: "text-blue-300/80" })
  },
  transfer: {
    label: "Transfer",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRightLeft, { size: 12, className: "text-emerald-400/80" })
  }
};
const KIND_FILTERS = [
  { value: "all", label: "Everything" },
  { value: "refine", label: "Refines" },
  { value: "redeem", label: "Redeems" },
  { value: "bridge", label: "Deposits" },
  { value: "mint", label: "Mints" },
  { value: "transfer", label: "Transfers" }
];
const STATUS_FILTERS = [
  { value: "all", label: "Any status" },
  { value: "settled", label: "Settled" },
  { value: "in-flight", label: "In flight" },
  { value: "refunded", label: "Refunded" },
  { value: "held", label: "Held" },
  { value: "failed", label: "Failed" }
];
const fmtTime = (ns) => new Date(Number(ns / 1000000n)).toLocaleString(void 0, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});
function LedgerRow({ entry }) {
  const [expanded, setExpanded] = reactExports.useState(false);
  const meta = KIND_META[entry.kind];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-ocid": `ledger.row.${entry.id}`,
      className: "border border-zinc-800 rounded-xl bg-zinc-900/60 hover:border-zinc-700 transition-colors overflow-hidden",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setExpanded((v) => !v),
            "aria-expanded": expanded,
            className: "w-full p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-left",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex items-center gap-1.5 sm:w-24 shrink-0 text-[11px] font-bold text-zinc-300", children: [
                meta.icon,
                meta.label
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "flex-1 min-w-0 text-sm text-zinc-200 truncate", children: entry.summary }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(StatusPill, { status: entry.status }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-zinc-500 shrink-0 sm:w-32 sm:text-right", children: fmtTime(entry.timestampNs) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline-flex text-zinc-500 shrink-0", children: expanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { size: 14 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 14 }) })
            ]
          }
        ),
        expanded && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 pb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(ReceiptBlock, { entry }) })
      ]
    }
  );
}
function TransactionHistoryPage() {
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();
  const { entries, isLoading, refetch, isFetching } = useLedger(identity);
  const [kindFilter, setKindFilter] = reactExports.useState(
    "all"
  );
  const [statusFilter, setStatusFilter] = reactExports.useState(
    "all"
  );
  if (!isLoggedIn) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-[#080808] flex items-center justify-center p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": "tx_history.login_prompt",
        className: "text-center max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-[2rem] p-10",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            ShieldCheck,
            {
              size: 48,
              className: "text-yellow-500 mx-auto mb-4 opacity-80"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-black text-white mb-2", children: "Your activity" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-400 text-sm mb-6", children: "Open your vault to see every refine, redeem, and transfer — each one reconcilable against the public ledgers." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: login,
              disabled: isLoggingIn,
              "data-ocid": "tx_history.login_button",
              className: "w-full bg-white text-black hover:bg-zinc-200 h-14 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50",
              children: isLoggingIn ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "animate-spin", size: 18 }) : "Open my vault"
            }
          )
        ]
      }
    ) });
  }
  const filtered = entries.filter(
    (e) => (kindFilter === "all" || e.kind === kindFilter) && (statusFilter === "all" || e.status === statusFilter)
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-[#080808] text-zinc-100", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-4xl mx-auto px-4 sm:px-6 py-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "h1",
          {
            className: "t-display text-white",
            style: { fontSize: "clamp(1.75rem, 1.4rem + 1.6vw, 2.25rem)" },
            children: [
              "Your ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-500", children: "activity" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-500 text-sm mt-1", children: "One ledger — refines, redeems, deposits, and transfers, each with its on-chain receipt" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          onClick: () => refetch(),
          disabled: isFetching,
          "data-ocid": "tx_history.refresh_button",
          className: "border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1.5",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              RefreshCw,
              {
                className: `w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`
              }
            ),
            "Refresh"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": "tx_history.filter_bar",
        className: "mb-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap gap-4 items-center",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs text-zinc-500 font-bold", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Funnel, { size: 12 }),
            " Filters"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: KIND_FILTERS.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "data-ocid": `tx_history.kind_filter.${f.value}`,
              onClick: () => setKindFilter(f.value),
              className: `px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${kindFilter === f.value ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"}`,
              children: f.label
            },
            f.value
          )) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-px h-5 bg-zinc-800 hidden sm:block" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: STATUS_FILTERS.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "data-ocid": `tx_history.status_filter.${f.value}`,
              onClick: () => setStatusFilter(f.value),
              className: `px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${statusFilter === f.value ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"}`,
              children: f.label
            },
            f.value
          )) })
        ]
      }
    ),
    isLoading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "data-ocid": "tx_history.loading_state", className: "space-y-3", children: [1, 2, 3, 4, 5].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      Skeleton,
      {
        className: "h-[64px] w-full rounded-xl bg-zinc-800/60"
      },
      i
    )) }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": "tx_history.empty_state",
        className: "rounded-2xl border border-zinc-800 bg-zinc-900 p-16 text-center",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRightLeft, { size: 48, className: "text-zinc-700 mx-auto mb-4" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-bold text-zinc-300 mb-2", children: entries.length > 0 ? "Nothing matches" : "No activity yet" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-500 text-sm", children: entries.length > 0 ? "Try loosening the filters." : "Your first refine will appear here with its full on-chain receipt." })
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "tx_history.list", className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "block text-xs text-zinc-500 font-semibold", children: [
        filtered.length,
        " ",
        filtered.length === 1 ? "entry" : "entries",
        " — tap a row for its receipt"
      ] }),
      filtered.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsx(LedgerRow, { entry: e }, e.id))
    ] })
  ] }) });
}
export {
  TransactionHistoryPage
};
