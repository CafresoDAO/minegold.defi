import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInternetIdentity } from "../auth";
import {
  AlertCircle,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  ExternalLink,
  Filter,
  Flame,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import type { TxRecord } from "../backend.d";
import { TxStatus, TxType } from "../backend.d";
import { formatTimestamp, useMyTransactions } from "../hooks/useQueries";

// ── Type/Status badge configs ─────────────────────────────────────────────────

const TX_TYPE_CONFIG: Record<
  TxType,
  { label: string; className: string; icon: React.ReactNode }
> = {
  [TxType.Bridge]: {
    label: "Bridge",
    className:
      "bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/15",
    icon: <ArrowRightLeft size={11} />,
  },
  [TxType.Mint]: {
    label: "Mint",
    className:
      "bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/15",
    icon: <Coins size={11} />,
  },
  [TxType.Refine]: {
    label: "Refine",
    className:
      "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/15",
    icon: <Flame size={11} />,
  },
  [TxType.Transfer]: {
    label: "Transfer",
    className:
      "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15",
    icon: <Coins size={11} />,
  },
  [TxType.Redeem]: {
    label: "Redeem",
    className:
      "bg-pink-500/15 text-pink-400 border border-pink-500/30 hover:bg-pink-500/15",
    icon: <ArrowRightLeft size={11} />,
  },
  [TxType.Refund]: {
    label: "Refund",
    className:
      "bg-sky-500/15 text-sky-400 border border-sky-500/30 hover:bg-sky-500/15",
    icon: <ArrowRightLeft size={11} />,
  },
};

const TX_STATUS_CONFIG: Record<TxStatus, { label: string; className: string }> =
  {
    [TxStatus.Pending]: {
      label: "Pending",
      className:
        "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/15",
    },
    [TxStatus.Confirmed]: {
      label: "Confirmed",
      className:
        "bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/15",
    },
    [TxStatus.Completed]: {
      label: "Completed",
      className:
        "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15",
    },
    [TxStatus.Failed]: {
      label: "Failed",
      className:
        "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/15",
    },
    [TxStatus.Held]: {
      label: "Held",
      className:
        "bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/15",
    },
  };

// ── Sub-components ────────────────────────────────────────────────────────────

function TxTypeBadge({ txType }: { txType: TxType }) {
  const cfg = TX_TYPE_CONFIG[txType] ?? TX_TYPE_CONFIG[TxType.Transfer];
  return (
    <Badge className={`gap-1 text-[10px] font-bold uppercase ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function TxStatusBadge({ status }: { status: TxStatus }) {
  const cfg = TX_STATUS_CONFIG[status] ?? TX_STATUS_CONFIG[TxStatus.Pending];
  return (
    <Badge className={`text-[10px] font-bold uppercase ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

function TxRow({ tx }: { tx: TxRecord }) {
  const [expanded, setExpanded] = useState(false);
  const hasFailed =
    (tx.status === TxStatus.Failed || tx.status === TxStatus.Held) &&
    tx.errorMsg;
  // ckUNI uses 18 decimal places (ERC-20 standard); all other tokens use 8
  const decimals = tx.tokenSymbol === "ckUNI" ? 1e18 : 1e8;
  const amountFormatted = `${(Number(tx.amount) / decimals).toFixed(8)} ${tx.tokenSymbol}`;

  return (
    <div
      data-ocid={`tx.row.${tx.id}`}
      className="border border-zinc-800 rounded-xl bg-zinc-900/60 hover:border-zinc-700 transition-colors overflow-hidden"
    >
      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Type badge */}
        <div className="flex items-center gap-2 sm:w-28 shrink-0">
          <TxTypeBadge txType={tx.txType} />
        </div>

        {/* Amount */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white font-mono truncate">
            {amountFormatted}
          </p>
          {tx.description && (
            <p className="text-xs text-zinc-500 truncate mt-0.5">
              {tx.description}
            </p>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 sm:w-28 shrink-0">
          <TxStatusBadge status={tx.status} />
        </div>

        {/* Timestamp */}
        <div className="text-xs text-zinc-500 shrink-0 flex items-center gap-1 sm:w-40">
          <Clock size={11} />
          {formatTimestamp(tx.timestamp)}
        </div>

        {/* Links */}
        <div className="flex items-center gap-2 shrink-0">
          {tx.ethTxHash && (
            <a
              href={`https://etherscan.io/tx/${tx.ethTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              data-ocid={`tx.etherscan_link.${tx.id}`}
              className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              Etherscan <ExternalLink size={10} />
            </a>
          )}
          {tx.icpBlockIndex !== undefined && tx.icpBlockIndex !== null && (
            <a
              href="https://dashboard.internetcomputer.org/"
              target="_blank"
              rel="noopener noreferrer"
              data-ocid={`tx.icp_link.${tx.id}`}
              className="flex items-center gap-1 text-[11px] text-yellow-500 hover:text-yellow-400 transition-colors"
            >
              ICP <ExternalLink size={10} />
            </a>
          )}
          {hasFailed && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              data-ocid={`tx.expand_error.${tx.id}`}
              className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors"
            >
              Error{" "}
              {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          )}
        </div>
      </div>

      {/* Error message (expandable) */}
      {hasFailed && expanded && (
        <div
          data-ocid={`tx.error_detail.${tx.id}`}
          className="px-4 pb-4 border-t border-zinc-800/60"
        >
          <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 p-3 flex items-start gap-2">
            <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 font-mono break-all">
              {tx.errorMsg}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

type TypeFilter = "all" | TxType;
type StatusFilter = "all" | TxStatus;

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: TxType.Bridge, label: "Bridge" },
  { value: TxType.Mint, label: "Mint" },
  { value: TxType.Refine, label: "Refine" },
  { value: TxType.Redeem, label: "Redeem" },
  { value: TxType.Refund, label: "Refund" },
  { value: TxType.Transfer, label: "Transfer" },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: TxStatus.Pending, label: "Pending" },
  { value: TxStatus.Confirmed, label: "Confirmed" },
  { value: TxStatus.Completed, label: "Completed" },
  { value: TxStatus.Failed, label: "Failed" },
  { value: TxStatus.Held, label: "Held" },
];

// ── Main page export ──────────────────────────────────────────────────────────

export function TransactionHistoryPage() {
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();

  const {
    data: txs,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useMyTransactions();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
        <div
          data-ocid="tx_history.login_prompt"
          className="text-center max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-[2rem] p-10"
        >
          <ShieldCheck
            size={48}
            className="text-yellow-500 mx-auto mb-4 opacity-80"
          />
          <h2 className="text-2xl font-black text-white mb-2">
            Transaction History
          </h2>
          <p className="text-zinc-400 text-sm mb-6">
            Sign in with Internet Identity to view your transaction history.
          </p>
          <button
            type="button"
            onClick={login}
            disabled={isLoggingIn}
            data-ocid="tx_history.login_button"
            className="w-full bg-white text-black hover:bg-zinc-200 h-14 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoggingIn ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <img
                  src="https://cryptologos.cc/logos/internet-computer-icp-logo.png"
                  className="w-5 h-5"
                  alt="ICP"
                />
                Sign in with Internet Identity
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const filteredTxs = (txs ?? []).filter((tx) => {
    const matchType = typeFilter === "all" || tx.txType === typeFilter;
    const matchStatus = statusFilter === "all" || tx.status === statusFilter;
    return matchType && matchStatus;
  });

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">
              Transaction <span className="text-yellow-500">History</span>
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              Your complete cross-chain activity log
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-ocid="tx_history.refresh_button"
            className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1.5"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Filter bar */}
        <div
          data-ocid="tx_history.filter_bar"
          className="mb-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-wrap gap-4 items-center"
        >
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-bold">
            <Filter size={12} /> Filters
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                data-ocid={`tx_history.type_filter.${f.value}`}
                onClick={() => setTypeFilter(f.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  typeFilter === f.value
                    ? "bg-yellow-500 text-black"
                    : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-zinc-800 hidden sm:block" />
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                data-ocid={`tx_history.status_filter.${f.value}`}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  statusFilter === f.value
                    ? "bg-yellow-500 text-black"
                    : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div data-ocid="tx_history.loading_state" className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton
                key={i}
                className="h-[72px] w-full rounded-xl bg-zinc-800/60"
              />
            ))}
          </div>
        ) : error ? (
          <div
            data-ocid="tx_history.error_state"
            className="rounded-2xl border border-red-500/30 bg-red-500/10 p-12 text-center"
          >
            <AlertCircle
              size={40}
              className="text-red-400 mx-auto mb-3 opacity-60"
            />
            <p className="text-red-400 text-sm font-medium mb-4">
              Failed to load transaction history.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <RefreshCw size={14} className="mr-1.5" /> Try again
            </Button>
          </div>
        ) : filteredTxs.length === 0 ? (
          <div
            data-ocid="tx_history.empty_state"
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-16 text-center"
          >
            <ArrowRightLeft size={48} className="text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-300 mb-2">
              {txs && txs.length > 0
                ? "No matching transactions"
                : "No transactions yet"}
            </h3>
            <p className="text-zinc-500 text-sm">
              {txs && txs.length > 0
                ? "Try adjusting your filters."
                : "Start by bridging some UNI to the refinery."}
            </p>
          </div>
        ) : (
          <div data-ocid="tx_history.list" className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                {filteredTxs.length} transaction
                {filteredTxs.length !== 1 ? "s" : ""}
              </span>
            </div>
            {filteredTxs.map((tx) => (
              <TxRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
