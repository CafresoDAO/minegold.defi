import { ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft } from "lucide-react";
import type { LedgerEntry } from "../lib/ledger";
import { StatusPill } from "./trust/StatusPill";

/**
 * LedgerPreview — the newest five ledger entries on the home dashboard,
 * each linking into the full /history stream (where the on-chain receipt
 * lives). Replaces HoldingsCard's inline activity list.
 */
const ICON: Record<LedgerEntry["kind"], React.ReactNode> = {
  refine: <ArrowDownToLine size={11} className="text-yellow-500/80" />,
  redeem: <ArrowUpFromLine size={11} className="text-pink-400/80" />,
  bridge: <ArrowRightLeft size={11} className="text-blue-400/80" />,
  mint: <ArrowDownToLine size={11} className="text-blue-300/80" />,
  transfer: <ArrowRightLeft size={11} className="text-emerald-400/80" />,
};

const fmtTime = (ns: bigint): string =>
  new Date(Number(ns / 1_000_000n)).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function LedgerPreview({
  entries,
  onViewAll,
}: {
  entries: LedgerEntry[];
  onViewAll: () => void;
}) {
  if (entries.length === 0) return null;
  const visible = entries.slice(0, 5);

  return (
    <section
      data-ocid="ledger.preview"
      className="mb-6 rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <p className="t-label text-zinc-500">Latest activity</p>
        <button
          type="button"
          data-ocid="ledger.preview.view_all"
          onClick={onViewAll}
          className="min-h-[36px] text-[11px] font-semibold text-zinc-400 underline underline-offset-2 hover:text-white"
        >
          All activity &amp; receipts ›
        </button>
      </div>
      <ul className="space-y-1.5">
        {visible.map((e) => (
          <li
            key={e.id}
            className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[11px]"
          >
            <span className="shrink-0 self-center">{ICON[e.kind]}</span>
            <span className="text-zinc-300 font-semibold min-w-0">
              {e.summary}
            </span>
            {e.rateE8 != null && e.rateE8 > 0n && (
              <span className="text-zinc-600 font-mono">
                @{(Number(e.rateE8) / 1e8).toFixed(4)}
              </span>
            )}
            <StatusPill status={e.status} />
            <span className="ml-auto text-zinc-600">
              {fmtTime(e.timestampNs)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
