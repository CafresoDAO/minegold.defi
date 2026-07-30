import { ArrowUpFromLine, Coins } from "lucide-react";
import { useRateStatus } from "../hooks/useQueries";
import { ProvenanceChip } from "./trust/ProvenanceChip";

/**
 * PortfolioHeader — the position-first strip: total USD, per-asset chips,
 * the live rate as a ProvenanceChip (source + age + trust dot, auto-demoted
 * when stale), and the redeem exit. Split out of HoldingsCard; the activity
 * list lives in LedgerPreview and the empty state in GetStarted — this
 * header ALWAYS renders for a signed-in user, even at zero.
 */
type Props = {
  sgldtBalance: string | null;
  /** ckUNI in the user's own account (e18), null while unknown. */
  ckuniBalance: bigint | null;
  /** USD prices for the total line; null while the feed hasn't answered. */
  sgldtPrice: number | null;
  uniPrice: number | null;
  onRedeem: () => void;
};

export function PortfolioHeader({
  sgldtBalance,
  ckuniBalance,
  sgldtPrice,
  uniPrice,
  onRedeem,
}: Props) {
  const { data: rate } = useRateStatus();

  const sgldtNum = sgldtBalance != null ? Number.parseFloat(sgldtBalance) : null;
  const ckuniNum = ckuniBalance != null ? Number(ckuniBalance) / 1e18 : null;

  // Total only when every priced part has a price — a partial sum shown as
  // "your total" would be a quiet lie. Missing pieces render as "—".
  const total =
    sgldtNum != null && sgldtPrice != null && ckuniNum != null && uniPrice != null
      ? sgldtNum * sgldtPrice + ckuniNum * uniPrice
      : null;

  const rateAgeMs =
    rate && rate.lastSyncNs > 0n
      ? Date.now() - Number(rate.lastSyncNs / 1_000_000n)
      : null;

  return (
    <section
      data-ocid="portfolio.header"
      className="mb-6 rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center shrink-0">
            <Coins size={18} className="text-yellow-400" />
          </div>
          <div>
            <p className="t-label text-zinc-500">Your vault</p>
            <p className="text-2xl font-black text-white tabular-nums leading-tight">
              {total != null ? `$${total.toFixed(2)}` : "$—"}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="inline-flex items-baseline gap-1 rounded-lg border border-yellow-500/25 bg-yellow-500/5 px-2 py-1 text-[11px]">
                <span className="font-bold text-yellow-400 tabular-nums">
                  {sgldtBalance ?? "—"}
                </span>
                <span className="text-yellow-600 font-semibold">sGLDT</span>
              </span>
              {ckuniNum != null && ckuniNum > 0 && (
                <span className="inline-flex items-baseline gap-1 rounded-lg border border-blue-500/25 bg-blue-500/5 px-2 py-1 text-[11px]">
                  <span className="font-bold text-blue-300 tabular-nums">
                    {ckuniNum.toFixed(4)}
                  </span>
                  <span className="text-blue-400/70 font-semibold">ckUNI</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {rate && rate.rate > 0n && (
            <ProvenanceChip
              value={`1 UNI = ${(Number(rate.rate) / 1e8).toFixed(4)} sGLDT`}
              source="XRC oracle"
              ageMs={rateAgeMs}
              trust="verified"
              staleAfterMs={2 * 60 * 60_000 /* hourly sync cadence + slack */}
            />
          )}
          <button
            type="button"
            data-ocid="holdings.redeem.button"
            onClick={onRedeem}
            className="inline-flex min-h-[36px] items-center gap-1.5 text-[11px] font-bold text-pink-300 hover:text-pink-200 bg-pink-500/10 border border-pink-500/20 px-3 py-1.5 rounded-xl transition-colors"
          >
            <ArrowUpFromLine size={11} />
            Withdraw — redeem sGLDT
          </button>
        </div>
      </div>
    </section>
  );
}
