import { ArrowDownToLine, ArrowUpFromLine, Coins } from "lucide-react";
import {
  useMyRedeems,
  useMyRefines,
  type RedeemRecordView,
  type RefineRecordView,
  type RefineStatusKey,
} from "../hooks/useQueries";

type Props = {
  identity: unknown;
  /** Formatted sGLDT balance ("12.4402") and its USD value ("12.00"), both
   *  already computed by App — null while loading. */
  sgldtBalance: string | null;
  sgldtUsd: string | null;
  /** ckUNI in the user's own account (e18), null while unknown. */
  ckuniBalance: bigint | null;
  /** True when that ckUNI clears the refine minimum + fees. */
  ckuniRefinable: boolean;
  /** "1 UNI = 4.1152 sGLDT" + provenance, from the on-chain oracle. */
  rateDisplay: string | null;
  rateProvenance: string | null;
  onRedeem: () => void;
};

type ActivityRow = {
  key: string;
  kind: "refine" | "redeem";
  /** Human reference for support: "refine #3" / "redeem #1". */
  ref: string;
  title: string;
  detail: string;
  rate: string;
  status: RefineStatusKey;
  timestampNs: bigint;
  payBlock: bigint | null;
};

const STATUS_LABEL: Record<RefineStatusKey, { text: string; cls: string }> = {
  paid: { text: "settled", cls: "text-emerald-400" },
  pulled: { text: "in flight", cls: "text-amber-400" },
  refunded: { text: "refunded", cls: "text-blue-300" },
  stranded: { text: "held — being resolved", cls: "text-amber-400" },
};

const fmtTime = (ns: bigint): string => {
  const d = new Date(Number(ns / 1_000_000n));
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** The position-first view: your gold, your ckUNI, the live rate, and an
 *  activity list built from the backend's own refine/redeem records —
 *  amounts on both sides, the settled rate, and the payout block index, so
 *  every row is reconcilable against the ledgers. */
export function HoldingsCard({
  identity,
  sgldtBalance,
  sgldtUsd,
  ckuniBalance,
  ckuniRefinable,
  rateDisplay,
  rateProvenance,
  onRedeem,
}: Props) {
  const { data: refines } = useMyRefines(identity);
  const { data: redeems } = useMyRedeems(identity);

  const rows: ActivityRow[] = [
    ...(refines ?? []).map((r: RefineRecordView): ActivityRow => ({
      key: `rf-${r.id.toString()}`,
      kind: "refine",
      ref: `refine #${r.id.toString()}`,
      title: `Refined ${(Number(r.ckuniAmount) / 1e18).toFixed(4)} ckUNI`,
      detail: `→ ${(Number(r.sgldtPaid) / 1e8).toFixed(4)} sGLDT`,
      rate: (Number(r.rate) / 1e8).toFixed(4),
      status: r.status,
      timestampNs: r.timestamp,
      payBlock: r.payBlock,
    })),
    ...(redeems ?? []).map((r: RedeemRecordView): ActivityRow => ({
      key: `rd-${r.id.toString()}`,
      kind: "redeem",
      ref: `redeem #${r.id.toString()}`,
      title: `Redeemed ${(Number(r.sgldtAmount) / 1e8).toFixed(4)} sGLDT`,
      detail: `→ ${(Number(r.ckuniPaid) / 1e18).toFixed(4)} ckUNI`,
      rate: (Number(r.rate) / 1e8).toFixed(4),
      status: r.status,
      timestampNs: r.timestamp,
      payBlock: r.payBlock,
    })),
  ].sort((a, b) => (a.timestampNs < b.timestampNs ? 1 : -1));

  // Held swaps must surface even when they've scrolled out of the 6-row
  // preview — a stranded record with no visible resolution path is the bug
  // this panel exists to fix.
  const stranded = rows.filter((r) => r.status === "stranded");
  const visibleRows = rows.slice(0, 6);

  const hasAnything =
    (sgldtBalance != null && Number.parseFloat(sgldtBalance) > 0) ||
    (ckuniBalance != null && ckuniBalance > 0n) ||
    rows.length > 0;
  if (!hasAnything) return null;

  return (
    <section
      data-ocid="holdings.card"
      className="mb-8 rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center shrink-0">
            <Coins size={18} className="text-yellow-400" />
          </div>
          <div>
            <p className="t-label text-zinc-500">
              Your Gold
            </p>
            <p className="text-2xl font-black text-yellow-400 tabular-nums leading-tight">
              {sgldtBalance ?? "—"}{" "}
              <span className="text-sm font-bold text-yellow-600">sGLDT</span>
            </p>
            {sgldtUsd && (
              <p className="text-[11px] text-zinc-500">≈ ${sgldtUsd}</p>
            )}
          </div>
        </div>

        <div className="text-right">
          {rateDisplay && (
            <p className="text-[11px] font-semibold text-zinc-300">
              {rateDisplay}
            </p>
          )}
          {rateProvenance && (
            <p className="text-[10px] text-zinc-500">{rateProvenance}</p>
          )}
          {ckuniBalance != null && ckuniBalance > 0n && (
            <p className="mt-1 text-[11px] text-blue-300">
              {(Number(ckuniBalance) / 1e18).toFixed(4)} ckUNI in your account
              {ckuniRefinable ? " · ready to refine" : ""}
            </p>
          )}
          <button
            type="button"
            data-ocid="holdings.redeem.button"
            onClick={onRedeem}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-pink-300 hover:text-pink-200 bg-pink-500/10 border border-pink-500/20 px-3 py-1.5 rounded-xl transition-colors"
          >
            <ArrowUpFromLine size={11} />
            Redeem sGLDT → ckUNI
          </button>
        </div>
      </div>

      {/* Resolution path for held swaps — never a dead end. A stranded record
          means the swap AND its auto-refund both failed: the funds are
          recorded on-chain awaiting manual release, not lost. */}
      {stranded.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-[11px] leading-relaxed text-zinc-300">
          <p className="font-bold text-amber-300 mb-1">
            A swap of yours is held for manual resolution
          </p>
          <p className="text-zinc-400">
            Its refund couldn&apos;t be sent automatically, so the record is
            held on-chain with your funds noted — nothing is dropped. Email{" "}
            <a
              href={`mailto:anthony@cafreso.com?subject=${encodeURIComponent(
                `minegold.defi held swap: ${stranded.map((r) => r.ref).join(", ")}`,
              )}`}
              className="text-amber-300 underline underline-offset-2 hover:text-amber-200"
            >
              anthony@cafreso.com
            </a>{" "}
            quoting{" "}
            <span className="font-mono text-zinc-200">
              {stranded.map((r) => r.ref).join(", ")}
            </span>{" "}
            and it will be released or refunded by hand.
          </p>
        </div>
      )}

      {visibleRows.length > 0 && (
        <div className="mt-4 border-t border-zinc-800 pt-3">
          <p className="t-label text-zinc-500 mb-2">
            Activity
          </p>
          <ul className="space-y-1.5">
            {visibleRows.map((row) => (
              <li
                key={row.key}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[11px]"
              >
                <span className="shrink-0 text-zinc-600">
                  {row.kind === "refine" ? (
                    <ArrowDownToLine size={11} className="inline text-yellow-500/80" />
                  ) : (
                    <ArrowUpFromLine size={11} className="inline text-pink-400/80" />
                  )}
                </span>
                <span className="text-zinc-300 font-semibold">{row.title}</span>
                <span className="text-zinc-400">{row.detail}</span>
                <span className="text-zinc-600 font-mono">@{row.rate}</span>
                {row.payBlock != null && (
                  <span className="text-zinc-600 font-mono">
                    block #{row.payBlock.toString()}
                  </span>
                )}
                <span className={`${STATUS_LABEL[row.status].cls} font-semibold`}>
                  {STATUS_LABEL[row.status].text}
                </span>
                <span className="ml-auto text-zinc-600">
                  {fmtTime(row.timestampNs)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
