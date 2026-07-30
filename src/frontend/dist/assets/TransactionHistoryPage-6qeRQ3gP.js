import { c as createLucideIcon, j as jsxRuntimeExports, a as cn, I as cva, u as useInternetIdentity, J as useMyTransactions, r as reactExports, A as ShieldCheck, L as LoaderCircle, g as RefreshCw, C as CircleAlert, K as ArrowRightLeft, z as Clock, M as formatTimestamp, N as ExternalLink, O as ChevronDown, e as Coins } from "./index-Dr2VPZea.js";
import { S as Slot, B as Button, F as Flame } from "./button-D8QirsJA.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [["path", { d: "m18 15-6-6-6 6", key: "153udz" }]];
const ChevronUp = createLucideIcon("chevron-up", __iconNode$1);
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
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive: "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function Badge({
  className,
  variant,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "span";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Comp,
    {
      "data-slot": "badge",
      className: cn(badgeVariants({ variant }), className),
      ...props
    }
  );
}
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
var TxStatus = /* @__PURE__ */ ((TxStatus2) => {
  TxStatus2["Failed"] = "Failed";
  TxStatus2["Confirmed"] = "Confirmed";
  TxStatus2["Completed"] = "Completed";
  TxStatus2["Pending"] = "Pending";
  TxStatus2["Held"] = "Held";
  return TxStatus2;
})(TxStatus || {});
var TxType = /* @__PURE__ */ ((TxType2) => {
  TxType2["Mint"] = "Mint";
  TxType2["Refine"] = "Refine";
  TxType2["Bridge"] = "Bridge";
  TxType2["Transfer"] = "Transfer";
  TxType2["Redeem"] = "Redeem";
  TxType2["Refund"] = "Refund";
  return TxType2;
})(TxType || {});
const TX_TYPE_CONFIG = {
  [TxType.Bridge]: {
    label: "Bridge",
    className: "bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/15",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRightLeft, { size: 11 })
  },
  [TxType.Mint]: {
    label: "Mint",
    className: "bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/15",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Coins, { size: 11 })
  },
  [TxType.Refine]: {
    label: "Refine",
    className: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/15",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Flame, { size: 11 })
  },
  [TxType.Transfer]: {
    label: "Transfer",
    className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Coins, { size: 11 })
  },
  [TxType.Redeem]: {
    label: "Redeem",
    className: "bg-pink-500/15 text-pink-400 border border-pink-500/30 hover:bg-pink-500/15",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRightLeft, { size: 11 })
  },
  [TxType.Refund]: {
    label: "Refund",
    className: "bg-sky-500/15 text-sky-400 border border-sky-500/30 hover:bg-sky-500/15",
    icon: /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRightLeft, { size: 11 })
  }
};
const TX_STATUS_CONFIG = {
  [TxStatus.Pending]: {
    label: "Pending",
    className: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/15"
  },
  [TxStatus.Confirmed]: {
    label: "Confirmed",
    className: "bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/15"
  },
  [TxStatus.Completed]: {
    label: "Completed",
    className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15"
  },
  [TxStatus.Failed]: {
    label: "Failed",
    className: "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/15"
  },
  [TxStatus.Held]: {
    label: "Held",
    className: "bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/15"
  }
};
function TxTypeBadge({ txType }) {
  const cfg = TX_TYPE_CONFIG[txType] ?? TX_TYPE_CONFIG[TxType.Transfer];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(Badge, { className: `gap-1 text-[10px] font-bold uppercase ${cfg.className}`, children: [
    cfg.icon,
    cfg.label
  ] });
}
function TxStatusBadge({ status }) {
  const cfg = TX_STATUS_CONFIG[status] ?? TX_STATUS_CONFIG[TxStatus.Pending];
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Badge, { className: `text-[10px] font-bold uppercase ${cfg.className}`, children: cfg.label });
}
function TxRow({ tx }) {
  const [expanded, setExpanded] = reactExports.useState(false);
  const hasFailed = (tx.status === TxStatus.Failed || tx.status === TxStatus.Held) && tx.errorMsg;
  const decimals = tx.tokenSymbol === "ckUNI" ? 1e18 : 1e8;
  const amountFormatted = `${(Number(tx.amount) / decimals).toFixed(8)} ${tx.tokenSymbol}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-ocid": `tx.row.${tx.id}`,
      className: "border border-zinc-800 rounded-xl bg-zinc-900/60 hover:border-zinc-700 transition-colors overflow-hidden",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 flex flex-col sm:flex-row sm:items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 sm:w-28 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TxTypeBadge, { txType: tx.txType }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-bold text-white font-mono truncate", children: amountFormatted }),
            tx.description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-zinc-500 truncate mt-0.5", children: tx.description })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-2 sm:w-28 shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TxStatusBadge, { status: tx.status }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-xs text-zinc-500 shrink-0 flex items-center gap-1 sm:w-40", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 11 }),
            formatTimestamp(tx.timestamp)
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [
            tx.ethTxHash && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "a",
              {
                href: `https://etherscan.io/tx/${tx.ethTxHash}`,
                target: "_blank",
                rel: "noopener noreferrer",
                "data-ocid": `tx.etherscan_link.${tx.id}`,
                className: "flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors",
                children: [
                  "Etherscan ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 10 })
                ]
              }
            ),
            tx.icpBlockIndex !== void 0 && tx.icpBlockIndex !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "a",
              {
                href: "https://dashboard.internetcomputer.org/",
                target: "_blank",
                rel: "noopener noreferrer",
                "data-ocid": `tx.icp_link.${tx.id}`,
                className: "flex items-center gap-1 text-[11px] text-yellow-500 hover:text-yellow-400 transition-colors",
                children: [
                  "ICP ",
                  /* @__PURE__ */ jsxRuntimeExports.jsx(ExternalLink, { size: 10 })
                ]
              }
            ),
            hasFailed && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => setExpanded((v) => !v),
                "data-ocid": `tx.expand_error.${tx.id}`,
                className: "flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors",
                children: [
                  "Error",
                  " ",
                  expanded ? /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronUp, { size: 10 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { size: 10 })
                ]
              }
            )
          ] })
        ] }),
        hasFailed && expanded && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            "data-ocid": `tx.error_detail.${tx.id}`,
            className: "px-4 pb-4 border-t border-zinc-800/60",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 rounded-lg bg-red-500/10 border border-red-500/20 p-3 flex items-start gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { size: 14, className: "text-red-400 shrink-0 mt-0.5" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-red-400 font-mono break-all", children: tx.errorMsg })
            ] })
          }
        )
      ]
    }
  );
}
const TYPE_FILTERS = [
  { value: "all", label: "All Types" },
  { value: TxType.Bridge, label: "Bridge" },
  { value: TxType.Mint, label: "Mint" },
  { value: TxType.Refine, label: "Refine" },
  { value: TxType.Redeem, label: "Redeem" },
  { value: TxType.Refund, label: "Refund" },
  { value: TxType.Transfer, label: "Transfer" }
];
const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: TxStatus.Pending, label: "Pending" },
  { value: TxStatus.Confirmed, label: "Confirmed" },
  { value: TxStatus.Completed, label: "Completed" },
  { value: TxStatus.Failed, label: "Failed" },
  { value: TxStatus.Held, label: "Held" }
];
function TransactionHistoryPage() {
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();
  const {
    data: txs,
    isLoading,
    error,
    refetch,
    isFetching
  } = useMyTransactions();
  const [typeFilter, setTypeFilter] = reactExports.useState("all");
  const [statusFilter, setStatusFilter] = reactExports.useState("all");
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
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-2xl font-black text-white mb-2", children: "Transaction History" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-400 text-sm mb-6", children: "Sign in with Internet Identity to view your transaction history." }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: login,
              disabled: isLoggingIn,
              "data-ocid": "tx_history.login_button",
              className: "w-full bg-white text-black hover:bg-zinc-200 h-14 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50",
              children: isLoggingIn ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "animate-spin", size: 18 }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "img",
                  {
                    src: "https://cryptologos.cc/logos/internet-computer-icp-logo.png",
                    className: "w-5 h-5",
                    alt: "ICP"
                  }
                ),
                "Sign in with Internet Identity"
              ] })
            }
          )
        ]
      }
    ) });
  }
  const filteredTxs = (txs ?? []).filter((tx) => {
    const matchType = typeFilter === "all" || tx.txType === typeFilter;
    const matchStatus = statusFilter === "all" || tx.status === statusFilter;
    return matchType && matchStatus;
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-screen bg-[#080808] text-zinc-100", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-4xl mx-auto px-4 sm:px-6 py-10", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h1", { className: "text-3xl font-black text-white", children: [
          "Transaction ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-yellow-500", children: "History" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-500 text-sm mt-1", children: "Your complete cross-chain activity log" })
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
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: TYPE_FILTERS.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              "data-ocid": `tx_history.type_filter.${f.value}`,
              onClick: () => setTypeFilter(f.value),
              className: `px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${typeFilter === f.value ? "bg-yellow-500 text-black" : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"}`,
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
        className: "h-[72px] w-full rounded-xl bg-zinc-800/60"
      },
      i
    )) }) : error ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": "tx_history.error_state",
        className: "rounded-2xl border border-red-500/30 bg-red-500/10 p-12 text-center",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            CircleAlert,
            {
              size: 40,
              className: "text-red-400 mx-auto mb-3 opacity-60"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-red-400 text-sm font-medium mb-4", children: "Failed to load transaction history." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Button,
            {
              variant: "outline",
              size: "sm",
              onClick: () => refetch(),
              className: "border-red-500/30 text-red-400 hover:bg-red-500/10",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { size: 14, className: "mr-1.5" }),
                " Try again"
              ]
            }
          )
        ]
      }
    ) : filteredTxs.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": "tx_history.empty_state",
        className: "rounded-2xl border border-zinc-800 bg-zinc-900 p-16 text-center",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowRightLeft, { size: 48, className: "text-zinc-700 mx-auto mb-4" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-bold text-zinc-300 mb-2", children: txs && txs.length > 0 ? "No matching transactions" : "No transactions yet" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-zinc-500 text-sm", children: txs && txs.length > 0 ? "Try adjusting your filters." : "Start by bridging some UNI to the refinery." })
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "tx_history.list", className: "space-y-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-between mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-zinc-500 font-semibold uppercase tracking-wider", children: [
        filteredTxs.length,
        " transaction",
        filteredTxs.length !== 1 ? "s" : ""
      ] }) }),
      filteredTxs.map((tx) => /* @__PURE__ */ jsxRuntimeExports.jsx(TxRow, { tx }, tx.id))
    ] })
  ] }) });
}
export {
  TransactionHistoryPage
};
