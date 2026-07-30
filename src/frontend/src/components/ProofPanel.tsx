import { ExternalLink, ShieldCheck, XCircle } from "lucide-react";
import { useRateStatus, formatTokenAmount } from "../hooks/useQueries";

type Props = {
  /** Treasury balances App already polls — reused, not refetched. */
  treasurySGLDT: bigint;
  treasuryCkUNI: bigint;
  onClose: () => void;
};

const DASHBOARD = "https://dashboard.internetcomputer.org/canister";

const CANISTERS: { label: string; id: string; note: string }[] = [
  { label: "Refinery backend (the treasury)", id: "c626g-iyaaa-aaaau-agpoa-cai", note: "holds treasury funds; executes atomic swaps with auto-refund" },
  { label: "sGLDT ledger", id: "i2s4q-syaaa-aaaan-qz4sq-cai", note: "every payout is a block here" },
  { label: "ckUNI ledger", id: "ilzky-ayaaa-aaaar-qahha-cai", note: "your bridged UNI lives here, in YOUR account" },
  { label: "DFINITY ckERC-20 minter", id: "sv3dd-oaaaa-aaaar-qacoa-cai", note: "mints ckUNI after 12 Ethereum blocks — not our code" },
  { label: "Exchange Rate Canister (XRC)", id: "uf6dk-hyaaa-aaaaq-qaaaq-cai", note: "the UNI/USD oracle — DFINITY infrastructure" },
];

/** Everything a skeptic needs, in one place: live treasury liquidity, rate
 *  provenance, every canister in the money path with explorer links, and the
 *  limitations stated as plainly as the strengths. An unverifiable "trust us"
 *  page would be worse than none. */
export function ProofPanel({ treasurySGLDT, treasuryCkUNI, onClose }: Props) {
  const { data: rate } = useRateStatus();
  const syncAgeMin =
    rate && rate.lastSyncNs > 0n
      ? Math.max(0, Math.round((Date.now() - Number(rate.lastSyncNs / 1_000_000n)) / 60_000))
      : null;

  return (
    <div
      data-ocid="proof.panel"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] p-6 sm:p-8 w-full max-w-2xl relative max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain">
        <button
          type="button"
          data-ocid="proof.close"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400"
        >
          <XCircle size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <ShieldCheck size={20} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="font-black text-white text-lg leading-tight">
              Proof &amp; transparency
            </h2>
            <p className="text-[11px] text-zinc-500">
              Every number below is on-chain — verify it, don&apos;t trust it.
            </p>
          </div>
        </div>

        {/* Live liquidity */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
              Treasury sGLDT (pays refines)
            </p>
            <p className="text-xl font-black text-yellow-400 tabular-nums">
              {formatTokenAmount(treasurySGLDT)}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
              Treasury ckUNI (pays redeems)
            </p>
            <p className="text-xl font-black text-blue-300 tabular-nums">
              {formatTokenAmount(treasuryCkUNI, 18)}
            </p>
          </div>
        </div>

        {/* Rate provenance */}
        <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 mb-5 text-[12px] leading-relaxed text-zinc-400">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">
            How the rate is made
          </p>
          {rate ? (
            <>
              <p>
                <span className="text-zinc-200 font-semibold">
                  1 UNI = {(Number(rate.rate) / 1e8).toFixed(4)} sGLDT
                </span>{" "}
                = UNI/USD from the XRC oracle (
                {rate.uniUsdE8 > 0n ? `$${(Number(rate.uniUsdE8) / 1e8).toFixed(2)}` : "—"}
                , synced {syncAgeMin != null ? `${syncAgeMin}m ago` : "—"}, hourly cadence)
                ÷ an operator-set sGLDT/USD reference (
                {rate.sgldtUsdE8 > 0n ? `$${(Number(rate.sgldtUsdE8) / 1e8).toFixed(3)}` : "not set — manual rate in effect"}
                ).
              </p>
              {rate.lastError && (
                <p className="mt-1 text-amber-400/90">
                  Last oracle note: {rate.lastError}
                </p>
              )}
            </>
          ) : (
            <p>Loading rate status…</p>
          )}
        </div>

        {/* The money path, canister by canister */}
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
          Every canister in the money path
        </p>
        <ul className="space-y-1.5 mb-5">
          {CANISTERS.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline gap-x-2 text-[11px]">
              <a
                href={`${DASHBOARD}/${c.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                {c.id.slice(0, 14)}… <ExternalLink size={10} />
              </a>
              <span className="text-zinc-300 font-semibold">{c.label}</span>
              <span className="text-zinc-500">— {c.note}</span>
            </li>
          ))}
        </ul>

        {/* Honest limitations */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-[11px] leading-relaxed text-zinc-400">
          <p className="text-[10px] font-black text-amber-400/90 uppercase tracking-widest mb-1.5">
            Known limitations (stated on purpose)
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              The sGLDT/USD leg of the rate is set by the operator, not an
              oracle — sGLDT trades on one ICPSwap pool the XRC can&apos;t see.
            </li>
            <li>
              A ±30% jump guard rejects wild oracle readings; a genuine larger
              market move needs a one-time operator re-anchor.
            </li>
            <li>
              Refine payouts depend on treasury sGLDT liquidity (shown live
              above); if it runs short, your ckUNI is auto-refunded — never
              taken.
            </li>
            <li>
              Swaps that fail even the refund are held as &quot;stranded&quot;
              records for manual resolution — nothing is silently dropped.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
