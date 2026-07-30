import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInternetIdentity } from "../auth";
import {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { ReceiptBlock } from "../components/trust/ReceiptBlock";
import { StatusPill } from "../components/trust/StatusPill";
import { useLedger } from "../hooks/useLedger";
import type { LedgerEntry, SettlementStatus } from "../lib/ledger";

/**
 * /history — the unified ledger. One newest-first stream merging refines,
 * redeems, and bridge/mint/transfer records (lib/ledger owns the merge +
 * dedup), one status taxonomy (StatusPill), and a full ReceiptBlock behind
 * every row — every entry reconcilable against the public ledgers.
 */

const KIND_META: Record<
  LedgerEntry["kind"],
  { label: string; icon: React.ReactNode }
> = {
  refine: {
    label: "Refine",
    icon: <ArrowDownToLine size={12} className="text-yellow-500/80" />,
  },
  redeem: {
    label: "Redeem",
    icon: <ArrowUpFromLine size={12} className="text-pink-400/80" />,
  },
  bridge: {
    label: "Deposit",
    icon: <ArrowRightLeft size={12} className="text-blue-400/80" />,
  },
  mint: {
    label: "Mint",
    icon: <ArrowDownToLine size={12} className="text-blue-300/80" />,
  },
  transfer: {
    label: "Transfer",
    icon: <ArrowRightLeft size={12} className="text-emerald-400/80" />,
  },
};

const KIND_FILTERS: { value: "all" | LedgerEntry["kind"]; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "refine", label: "Refines" },
  { value: "redeem", label: "Redeems" },
  { value: "bridge", label: "Deposits" },
  { value: "mint", label: "Mints" },
  { value: "transfer", label: "Transfers" },
];

const STATUS_FILTERS: { value: "all" | SettlementStatus; label: string }[] = [
  { value: "all", label: "Any status" },
  { value: "settled", label: "Settled" },
  { value: "in-flight", label: "In flight" },
  { value: "refunded", label: "Refunded" },
  { value: "held", label: "Held" },
  { value: "failed", label: "Failed" },
];

const fmtTime = (ns: bigint): string =>
  new Date(Number(ns / 1_000_000n)).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const [expanded, setExpanded] = useState(false);
  const meta = KIND_META[entry.kind];
  return (
    <div
      data-ocid={`ledger.row.${entry.id}`}
      className="border border-zinc-800 rounded-xl bg-zinc-900/60 hover:border-zinc-700 transition-colors overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-left"
      >
        <span className="flex items-center gap-1.5 sm:w-24 shrink-0 text-[11px] font-bold text-zinc-300">
          {meta.icon}
          {meta.label}
        </span>
        <span className="flex-1 min-w-0 text-sm text-zinc-200 truncate">
          {entry.summary}
        </span>
        <span className="shrink-0">
          <StatusPill status={entry.status} />
        </span>
        <span className="text-xs text-zinc-500 shrink-0 sm:w-32 sm:text-right">
          {fmtTime(entry.timestampNs)}
        </span>
        <span className="hidden sm:inline-flex text-zinc-500 shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <ReceiptBlock entry={entry} />
        </div>
      )}
    </div>
  );
}

export function TransactionHistoryPage() {
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();

  const { entries, isLoading, refetch, isFetching } = useLedger(identity);

  const [kindFilter, setKindFilter] = useState<"all" | LedgerEntry["kind"]>(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | SettlementStatus>(
    "all",
  );

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
          <h2 className="text-2xl font-black text-white mb-2">Your activity</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Open your vault to see every refine, redeem, and transfer — each
            one reconcilable against the public ledgers.
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
              "Open my vault"
            )}
          </button>
        </div>
      </div>
    );
  }

  const filtered = entries.filter(
    (e) =>
      (kindFilter === "all" || e.kind === kindFilter) &&
      (statusFilter === "all" || e.status === statusFilter),
  );

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="t-display text-white"
              style={{ fontSize: "clamp(1.75rem, 1.4rem + 1.6vw, 2.25rem)" }}
            >
              Your <span className="text-yellow-500">activity</span>
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              One ledger — refines, redeems, deposits, and transfers, each with
              its on-chain receipt
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
            {KIND_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                data-ocid={`tx_history.kind_filter.${f.value}`}
                onClick={() => setKindFilter(f.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  kindFilter === f.value
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
                className="h-[64px] w-full rounded-xl bg-zinc-800/60"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            data-ocid="tx_history.empty_state"
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-16 text-center"
          >
            <ArrowRightLeft size={48} className="text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-300 mb-2">
              {entries.length > 0 ? "Nothing matches" : "No activity yet"}
            </h3>
            <p className="text-zinc-500 text-sm">
              {entries.length > 0
                ? "Try loosening the filters."
                : "Your first refine will appear here with its full on-chain receipt."}
            </p>
          </div>
        ) : (
          <div data-ocid="tx_history.list" className="space-y-3">
            <span className="block text-xs text-zinc-500 font-semibold">
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"} —
              tap a row for its receipt
            </span>
            {filtered.map((e) => (
              <LedgerRow key={e.id} entry={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
