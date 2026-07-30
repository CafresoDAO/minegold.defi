import { ExternalLink, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  refreshProofBalances,
  useProofSnapshot,
  useRateStatus,
  formatTokenAmount,
} from "../hooks/useQueries";

type Props = {
  onClose: () => void;
};

const DASHBOARD = "https://dashboard.internetcomputer.org/canister";

/** Who actually controls each canister in the money path. "operator" =
 *  Anthony's single controller principal (shown below); "DFINITY" = NNS-
 *  controlled infrastructure; "Gold DAO / sVault" = third parties we link to
 *  but do not control. */
type Party = "operator" | "DFINITY" | "Gold DAO / sVault";

const PARTY_STYLE: Record<Party, string> = {
  operator: "bg-amber-500/10 border-amber-500/25 text-amber-300",
  DFINITY: "bg-blue-500/10 border-blue-500/25 text-blue-300",
  "Gold DAO / sVault": "bg-emerald-500/10 border-emerald-500/25 text-emerald-300",
};

/** Sole controller of the backend + frontend canisters — verified live via
 *  `dfx canister info` 2026-07-30. One person. Stated, not hidden. */
const OPERATOR_CONTROLLER =
  "xip3r-mhzcr-csb7y-ilqf5-4tpge-dka64-jv2ow-zon7z-key3x-77kf3-mae";

const CANISTERS: { label: string; id: string; party: Party; note: string }[] = [
  {
    label: "Refinery backend (the treasury)",
    id: "c626g-iyaaa-aaaau-agpoa-cai",
    party: "operator",
    note: "holds treasury funds; executes atomic swaps with auto-refund",
  },
  {
    label: "sGLDT ledger (the GLDT wrapper)",
    id: "i2s4q-syaaa-aaaan-qz4sq-cai",
    party: "Gold DAO / sVault",
    note: "every payout is a block here — sVault's 1:1 GLDT wrapper",
  },
  {
    label: "ckUNI ledger",
    id: "ilzky-ayaaa-aaaar-qahha-cai",
    party: "DFINITY",
    note: "your bridged UNI lives here, in YOUR account",
  },
  {
    label: "ckERC-20 minter",
    id: "sv3dd-oaaaa-aaaar-qacoa-cai",
    party: "DFINITY",
    note: "mints ckUNI after 12 Ethereum blocks — not our code",
  },
  {
    label: "Exchange Rate Canister (XRC)",
    id: "uf6dk-hyaaa-aaaaq-qaaaq-cai",
    party: "DFINITY",
    note: "the UNI/USD oracle — DFINITY infrastructure",
  },
];

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
export function ProofPanel({ onClose }: Props) {
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
  // Refine coverage: live treasury sGLDT vs what's owed to pending deposits.
  const coverage =
    readiness && readiness.estimatedSGLDTNeeded > 0n
      ? Number(readiness.treasurySGLDTLive) / Number(readiness.estimatedSGLDTNeeded)
      : null;
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
          <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
            <p className="t-label text-zinc-500 mb-1">
              Refine coverage
            </p>
            {isLoading ? (
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
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {formatTokenAmount(readiness.treasurySGLDTLive)} live vs{" "}
                  {formatTokenAmount(readiness.estimatedSGLDTNeeded)} owed across{" "}
                  {readiness.pendingDeposits.toString()} pending
                </p>
              </>
            )}
          </div>
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
            <li key={c.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px]">
              <a
                href={`${DASHBOARD}/${c.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                {c.id.slice(0, 14)}… <ExternalLink size={10} />
              </a>
              <span className="text-zinc-300 font-semibold">{c.label}</span>
              <span
                className={`rounded-md border px-1.5 py-px text-[9px] font-bold uppercase tracking-wider ${PARTY_STYLE[c.party]}`}
              >
                {c.party}
              </span>
              <span className="text-zinc-500">— {c.note}</span>
            </li>
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
      </div>
    </div>
  );
}
