import { formatTokenAmount } from "../../hooks/useQueries";

type Readiness = {
  treasurySGLDTLive: bigint;
  estimatedSGLDTNeeded: bigint;
  pendingDeposits: bigint;
  strandedCount: bigint;
  strandedSGLDTOwed: bigint;
};

/**
 * Settlement coverage: live treasury sGLDT against what the refinery still
 * owes people.
 *
 * This meter used to read `pendingDeposits`/`estimatedSGLDTNeeded`, which
 * count the old queued-deposit pipeline. Nothing writes to that pipeline any
 * more — the live flow pulls and pays inside a single call — so those numbers
 * are structurally always zero and the meter permanently read "No pending
 * payouts owed" no matter how empty the treasury got. A risk indicator that
 * cannot indicate risk is worse than no indicator, because it reassures.
 *
 * So it now reads stranded swaps: funds pulled from a user and neither paid
 * nor refunded, awaiting manual release. That is the live flow's actual
 * outstanding obligation, and it is a number that can genuinely go bad.
 *
 * Both are shown when the legacy pipeline is somehow non-empty, so a
 * historical record can't hide behind the new metric.
 */
export function CoverageMeter({
  readiness,
  loading,
}: {
  readiness: Readiness | null;
  loading: boolean;
}) {
  const owed = readiness
    ? readiness.strandedSGLDTOwed + readiness.estimatedSGLDTNeeded
    : 0n;
  const obligations = readiness
    ? readiness.strandedCount + readiness.pendingDeposits
    : 0n;

  const coverage =
    readiness && owed > 0n
      ? Number(readiness.treasurySGLDTLive) / Number(owed)
      : null;
  const covered = (coverage ?? 0) >= 1;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
      <p className="t-label text-zinc-500 mb-1">Settlement coverage</p>
      {loading ? (
        <p className="text-sm text-zinc-500">…</p>
      ) : !readiness ? (
        <p className="text-sm text-zinc-500">Unavailable right now</p>
      ) : obligations === 0n ? (
        <>
          <p className="text-sm font-bold text-emerald-400">
            Nothing outstanding
          </p>
          <p className="text-[10px] text-zinc-500 mt-1 tabular-nums">
            No swap is waiting on a payout or a refund.{" "}
            {formatTokenAmount(readiness.treasurySGLDTLive)} sGLDT in the
            treasury.
          </p>
        </>
      ) : (
        <>
          <p
            className={`text-sm font-bold ${
              covered ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {coverage != null
              ? `${Math.min(999, Math.round(coverage * 100))}% of what we owe is covered`
              : "—"}
          </p>
          <div
            className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              coverage != null ? Math.min(100, Math.round(coverage * 100)) : 0
            }
            aria-label="Share of outstanding obligations covered by live treasury sGLDT"
          >
            <div
              className={`h-full rounded-full ${
                covered ? "bg-emerald-400" : "bg-amber-400"
              }`}
              style={{
                width: `${Math.min(100, Math.round((coverage ?? 0) * 100))}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 tabular-nums">
            {formatTokenAmount(readiness.treasurySGLDTLive)} live vs{" "}
            {formatTokenAmount(owed)} owed across {obligations.toString()}{" "}
            {obligations === 1n ? "swap" : "swaps"} awaiting release
          </p>
        </>
      )}
    </div>
  );
}
