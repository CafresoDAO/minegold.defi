import { formatTokenAmount } from "../../hooks/useQueries";

type Readiness = {
  treasurySGLDTLive: bigint;
  estimatedSGLDTNeeded: bigint;
  pendingDeposits: bigint;
};

/**
 * Refine coverage: live treasury sGLDT vs what's owed to pending deposits,
 * as a real meter — the bar's fill is the actual ratio, capped visually at
 * 100% with the true percentage stated beside it. Green means every owed
 * payout is covered; amber means it isn't, said plainly.
 */
export function CoverageMeter({
  readiness,
  loading,
}: {
  readiness: Readiness | null;
  loading: boolean;
}) {
  const coverage =
    readiness && readiness.estimatedSGLDTNeeded > 0n
      ? Number(readiness.treasurySGLDTLive) /
        Number(readiness.estimatedSGLDTNeeded)
      : null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
      <p className="t-label text-zinc-500 mb-1">Refine coverage</p>
      {loading ? (
        <p className="text-sm text-zinc-500">…</p>
      ) : !readiness ? (
        <p className="text-sm text-zinc-500">Unavailable right now</p>
      ) : readiness.pendingDeposits === 0n ? (
        <p className="text-sm font-bold text-emerald-400">
          No pending payouts owed
        </p>
      ) : (
        <>
          <p
            className={`text-sm font-bold ${
              (coverage ?? 0) >= 1 ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {coverage != null
              ? `${Math.min(999, Math.round(coverage * 100))}% of owed payouts covered`
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
            aria-label="Share of owed payouts covered by live treasury sGLDT"
          >
            <div
              className={`h-full rounded-full ${
                (coverage ?? 0) >= 1 ? "bg-emerald-400" : "bg-amber-400"
              }`}
              style={{
                width: `${Math.min(100, Math.round((coverage ?? 0) * 100))}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">
            {formatTokenAmount(readiness.treasurySGLDTLive)} live vs{" "}
            {formatTokenAmount(readiness.estimatedSGLDTNeeded)} owed across{" "}
            {readiness.pendingDeposits.toString()} pending
          </p>
        </>
      )}
    </div>
  );
}
