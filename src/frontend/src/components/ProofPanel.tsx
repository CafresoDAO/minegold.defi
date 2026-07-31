import { ExternalLink, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  refreshProofBalances,
  useProofSnapshot,
  useRateStatus,
  formatTokenAmount,
} from "../hooks/useQueries";
import { CANISTERS, OPERATOR_CONTROLLER } from "../lib/canisters";
import { CanisterRow } from "./trust/CanisterRow";
import { CoverageMeter } from "./trust/CoverageMeter";

type Props = {
  onClose: () => void;
  /** Follow an in-app path. /proof is the summary; the docs are the long
   *  form, and a reader who got this far is exactly who wants them. */
  onNavigatePath: (path: string) => void;
};

const ageLabel = (ns: bigint): string => {
  if (ns <= 0n) return "never refreshed";
  const mins = Math.max(
    0,
    Math.round((Date.now() - Number(ns / 1_000_000n)) / 60_000),
  );
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
};

/** Everything a skeptic needs, in one place: age-stamped treasury liquidity
 *  with a refresh that re-reads the ledgers, refine coverage vs pending
 *  demand, the stranded count (published even at 0), rate provenance, every
 *  canister in the money path with WHO controls it, and the limitations
 *  stated as plainly as the strengths. An unverifiable "trust us" page would
 *  be worse than none. */
export function ProofPanel({ onClose, onNavigatePath }: Props) {
  const { data: rate } = useRateStatus();
  const { data: snap, isLoading, refetch, isFetching } = useProofSnapshot(true);
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const syncAgeMin =
    rate && rate.lastSyncNs > 0n
      ? Math.max(0, Math.round((Date.now() - Number(rate.lastSyncNs / 1_000_000n)) / 60_000))
      : null;

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProofBalances();
      await qc.invalidateQueries({ queryKey: ["proofSnapshot"] });
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const balances = snap?.balances ?? null;
  const readiness = snap?.readiness ?? null;
  const strandedTotal = snap?.stranded
    ? snap.stranded.refines + snap.stranded.redeems
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
            <h2 className="t-headline text-white">
              Proof &amp; transparency
            </h2>
            <p className="text-[11px] text-zinc-500">
              Every number below is on-chain — verify it, don&apos;t trust it.
            </p>
          </div>
        </div>

        {/* Live liquidity — age-stamped, refreshable */}
        <div className="flex items-center justify-between mb-2">
          <p className="t-label text-zinc-500">
            Treasury liquidity
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">
              {isLoading
                ? "…"
                : balances
                  ? `ledger read ${ageLabel(balances.cachedAtNs)}`
                  : "ledger read unavailable"}
            </span>
            <button
              type="button"
              data-ocid="proof.refresh"
              onClick={() => void doRefresh()}
              disabled={refreshing || isFetching}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-700 bg-zinc-900 text-[10px] font-bold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              title="Re-read both ledgers now"
            >
              <RefreshCw
                size={10}
                className={refreshing || isFetching ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
            <p className="t-label text-zinc-500 mb-1">
              sGLDT (pays refines)
            </p>
            <p className="text-xl font-black text-yellow-400 tabular-nums">
              {balances ? formatTokenAmount(balances.sgldtBalance) : isLoading ? "…" : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
            <p className="t-label text-zinc-500 mb-1">
              ckUNI (pays redeems)
            </p>
            <p className="text-xl font-black text-blue-300 tabular-nums">
              {balances ? formatTokenAmount(balances.ckUNIBalance, 18) : isLoading ? "…" : "—"}
            </p>
          </div>
        </div>

        {/* Coverage + stranded — the two "is anything wrong?" numbers */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <CoverageMeter readiness={readiness} loading={isLoading} />
          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
            <p className="t-label text-zinc-500 mb-1">
              Held (stranded) swaps
            </p>
            {strandedTotal == null ? (
              <p className="text-sm text-zinc-500">
                {isLoading ? "…" : "Unavailable right now"}
              </p>
            ) : (
              <>
                <p
                  className={`text-sm font-bold ${
                    strandedTotal === 0n ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {strandedTotal.toString()} right now
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  swaps whose auto-refund also failed, held for manual
                  resolution — published even at 0
                </p>
              </>
            )}
          </div>
        </div>

        {/* Rate provenance */}
        <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 mb-5 text-[12px] leading-relaxed text-zinc-400">
          <p className="t-label text-zinc-500 mb-1.5">
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
              <p className="mt-1.5 text-[11px] text-zinc-500">
                Guardrails, with numbers: oracle readings that jump ±30% from
                the current rate are rejected (a genuine larger move needs a
                one-time operator re-anchor); rate hints sent by this UI are
                clamped to ±2% of the canister&apos;s own rate; admin transfers
                are capped at 500,000 sGLDT / 50 ckUNI per transaction.
              </p>
            </>
          ) : (
            <p>Loading rate status…</p>
          )}
        </div>

        {/* What backs the gold */}
        <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 mb-5 text-[12px] leading-relaxed text-zinc-400">
          <p className="t-label text-zinc-500 mb-1.5">
            What backs sGLDT
          </p>
          <p>
            sGLDT is a 1:1 wrapper of{" "}
            <span className="text-zinc-200 font-semibold">GLDT</span> — Gold
            DAO&apos;s token backed by 0.01&nbsp;g of physical gold per token,
            LBMA-sourced, in audited Swiss vaults. The wrapper exists for fees
            (0.00001 vs 0.10 per transfer — 10,000× cheaper). Unwrap at sVault
            any time; redeem GLDT for metal via Gold DAO. New to GLDT?{" "}
            <a
              href="https://gldt.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              gldt.org <ExternalLink size={10} />
            </a>
          </p>
        </div>

        {/* The money path, canister by canister, with parties */}
        <p className="t-label text-zinc-500 mb-2">
          Every canister in the money path — and who controls it
        </p>
        <ul className="space-y-1.5 mb-3">
          {CANISTERS.map((c) => (
            <CanisterRow key={c.id} canister={c} />
          ))}
        </ul>
        <p className="mb-5 text-[10px] text-zinc-500 leading-relaxed">
          &quot;Operator&quot; canisters have exactly one controller:{" "}
          <span className="font-mono text-zinc-400 break-all">
            {OPERATOR_CONTROLLER}
          </span>{" "}
          — verify with{" "}
          <span className="font-mono text-zinc-400">dfx canister info</span> or
          the dashboard links above.
        </p>

        {/* Treasury policy — written BEFORE it's needed, which is when
            writing it is credible. No numbers are stated that haven't been
            set; the band cap is published here the day it exists. */}
        <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 mb-5 text-[12px] leading-relaxed text-zinc-400">
          <p className="t-label text-zinc-500 mb-1.5">Treasury policy</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <span className="text-zinc-300 font-semibold">
                Settlement is atomic and final.
              </span>{" "}
              The sGLDT you receive is fully backed the moment it lands
              (sVault&apos;s 1:1 GLDT wrap) — after a swap settles, you have
              zero exposure to this treasury or its choices.
            </li>
            <li>
              <span className="text-zinc-300 font-semibold">
                Inventory risk is the operator&apos;s, never yours.
              </span>{" "}
              Deposited tokens become treasury inventory. If their price
              falls, the treasury&apos;s capacity to buy the next batch of
              sGLDT shrinks — visible in the coverage meter above — but no
              settled balance is touched, and an unpayable deposit is
              auto-refunded, never taken.
            </li>
            <li>
              <span className="text-zinc-300 font-semibold">Today (UNI):</span>{" "}
              the operator converts inventory to maintain the sGLDT liquidity
              shown live above. No leverage, no lending, no yield schemes on
              treasury assets.
            </li>
            <li>
              <span className="text-zinc-300 font-semibold">
                Before BAT intake opens:
              </span>{" "}
              a reserve-band rule will be published here — a stated cap on
              held BAT, conversion above the cap, and an advertising budget
              drawn from the reserve. It will appear on this page before the
              first BAT deposit is accepted, so you can watch the policy
              execute rather than take it on faith.
            </li>
          </ul>
        </div>

        {/* What we can't promise — neutral chrome, stated on purpose */}
        <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 text-[11px] leading-relaxed text-zinc-400">
          <p className="t-label text-zinc-300 mb-1.5">
            What we can&apos;t promise (stated on purpose)
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <span className="text-zinc-300 font-semibold">Unaudited.</span>{" "}
              No third party has audited this code.
            </li>
            <li>
              <span className="text-zinc-300 font-semibold">
                Single operator.
              </span>{" "}
              One person controls the backend and sets the sGLDT/USD reference
              leg of the rate — sGLDT trades on one ICPSwap pool the XRC
              can&apos;t see.
            </li>
            <li>
              Refine payouts depend on treasury sGLDT liquidity (shown live
              above); if it runs short, your ckUNI is auto-refunded — never
              taken.
            </li>
            <li>
              Swaps that fail even the refund are held as &quot;stranded&quot;
              records for manual resolution — the live count is published
              above; nothing is silently dropped.
            </li>
            <li>
              sGLDT&apos;s peg is sVault&apos;s contract and GLDT&apos;s gold
              backing is Gold DAO&apos;s — we link them, we don&apos;t control
              them.
            </li>
          </ul>
        </div>

        {/* The long form. This panel is the live-numbers summary; the docs
            are where each limitation is argued out in full. */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
          {[
            ["Risks & limitations, in full", "/docs/risks"],
            ["How the rate is made", "/docs/rate-methodology"],
            ["Redeem & recovery", "/docs/redeem-and-recovery"],
          ].map(([label, path]) => (
            <button
              key={path}
              type="button"
              data-ocid={`proof.docs${path.replace(/\//g, ".")}`}
              onClick={() => {
                onClose();
                onNavigatePath(path);
              }}
              className="min-h-[32px] font-semibold text-blue-400 underline underline-offset-2 hover:text-blue-300"
            >
              {label} ›
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
