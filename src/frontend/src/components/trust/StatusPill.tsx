import type { SettlementStatus } from "../../lib/ledger";

/**
 * THE settlement-status pill — one taxonomy for every money state in the
 * app, replacing the two divergent badge sets that existed before I5
 * (HoldingsCard's prose labels vs TransactionHistoryPage's five TxStatus
 * badges). If a surface needs a status color, it uses this component; a
 * new status is a product decision, not a local style choice.
 *
 *   settled    — the funds landed; block index exists         (green)
 *   in-flight  — moving now; nothing owed has been dropped    (amber)
 *   refunded   — the swap failed and the deposit came back    (blue)
 *   held       — swap AND refund failed; manual resolution    (amber, strong)
 *   failed     — a non-swap action that simply didn't happen  (red)
 */
const STYLE: Record<SettlementStatus, { label: string; cls: string }> = {
  settled: {
    label: "settled",
    cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  },
  "in-flight": {
    label: "in flight",
    cls: "bg-amber-500/10 border-amber-500/25 text-amber-400",
  },
  refunded: {
    label: "refunded",
    cls: "bg-blue-500/10 border-blue-500/25 text-blue-300",
  },
  held: {
    label: "held — being resolved",
    cls: "bg-amber-500/15 border-amber-500/40 text-amber-300",
  },
  failed: {
    label: "failed",
    cls: "bg-red-500/10 border-red-500/30 text-red-400",
  },
};

export function StatusPill({
  status,
  className = "",
}: {
  status: SettlementStatus;
  className?: string;
}) {
  const s = STYLE[status];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-px text-[10px] font-bold whitespace-nowrap ${s.cls} ${className}`}
    >
      {s.label}
    </span>
  );
}
