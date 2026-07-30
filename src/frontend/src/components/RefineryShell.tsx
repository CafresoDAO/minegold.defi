import { Activity, ArrowRightLeft, Lock, ShieldCheck } from "lucide-react";
import type React from "react";
import { formatTokenAmount } from "../hooks/useQueries";

export type RateLine = {
  /** e.g. "1 UNI = 4.1152 sGLDT" */
  rateDisplay: string;
  /** e.g. "XRC oracle (UNI/USD) · synced 12m ago" */
  provenance: string;
  /** Non-null when something deserves attention (oracle stale/error, market
   *  divergence). Rendered amber. */
  warning: string | null;
};

type Props = {
  dimmed: boolean;
  // Treasury header readouts
  displaySGLDTBalance: bigint;
  displaySGLDTLoading: boolean;
  displayCkUNIBalance: bigint;
  displayCkUNILoading: boolean;
  treasuryEthUniBalance: string | null;
  treasuryEthUniLoading: boolean;
  treasuryEthUniUnavailable: boolean;
  // Swap inputs
  uniAmount: string;
  uniBalance: string | null;
  inputDisabled: boolean;
  outputDisplay: string;
  onUniAmountChange: (v: string) => void;
  ckuniLedgerCanisterId: string;
  /** Real gas estimate (e.g. "~0.0011 ETH ($3.80)"), or null while unknown. */
  gasEstimate: string | null;
  /** The authoritative rate + where it comes from. Null while loading. */
  rateLine: RateLine | null;
  /** "0.02050 sGLDT" — the rate-clamp floor (quote − 2%). Null when no amount. */
  minReceivedDisplay: string | null;
  /** Timeline + phase-specific progress/action content. */
  children: React.ReactNode;
};

/** The refinery panel chrome: treasury header, UNI→sGLDT swap grid, and the
 *  ledger footer. Phase-specific content renders through `children`. */
export function RefineryShell({
  dimmed,
  displaySGLDTBalance,
  displaySGLDTLoading,
  displayCkUNIBalance,
  displayCkUNILoading,
  treasuryEthUniBalance,
  treasuryEthUniLoading,
  treasuryEthUniUnavailable,
  uniAmount,
  uniBalance,
  inputDisabled,
  outputDisplay,
  onUniAmountChange,
  ckuniLedgerCanisterId,
  gasEstimate,
  rateLine,
  minReceivedDisplay,
  children,
}: Props) {
  return (
    <div
      className={`transition-all duration-700 ${
        dimmed ? "opacity-30 pointer-events-none scale-95 grayscale" : ""
      }`}
    >
      <div className="refinery-panel bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 sm:p-10">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
            <div>
              <h2 className="text-3xl font-black bg-gradient-to-r from-white to-zinc-600 bg-clip-text text-transparent italic">
                THE REFINERY
              </h2>
              {/* Treasury balances — shown directly below the heading */}
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  {displaySGLDTLoading ? (
                    <span className="text-[10px] text-zinc-600 font-mono">
                      Loading treasury…
                    </span>
                  ) : (
                    <span
                      className="text-[11px] font-semibold font-mono text-emerald-400/90"
                      data-ocid="refinery.treasury_balance"
                    >
                      <span className="text-emerald-300">
                        {formatTokenAmount(displaySGLDTBalance)}
                      </span>{" "}
                      sGLDT available
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  {displayCkUNILoading ? (
                    <span className="text-[10px] text-zinc-600 font-mono">
                      Loading…
                    </span>
                  ) : (
                    <span
                      className="text-[11px] font-semibold font-mono text-blue-400/90"
                      data-ocid="refinery.ckuni_balance"
                    >
                      <span className="text-blue-300">
                        {formatTokenAmount(displayCkUNIBalance, 18)}
                      </span>{" "}
                      ckUNI minted
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0" />
                  {treasuryEthUniLoading ? (
                    <span className="text-[10px] text-zinc-600 font-mono">
                      Loading…
                    </span>
                  ) : (
                    <span
                      className="text-[11px] font-semibold font-mono text-pink-400/90"
                      data-ocid="refinery.eth_uni_balance"
                      title={
                        treasuryEthUniUnavailable
                          ? "Balance temporarily unavailable"
                          : undefined
                      }
                    >
                      <span className="text-pink-300">
                        {treasuryEthUniUnavailable
                          ? "—"
                          : (treasuryEthUniBalance ?? "0.0000")}
                      </span>{" "}
                      UNI on ETH
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-zinc-500 t-label">
                  UNI &rarr; sGLDT
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div
                className="bg-black border border-zinc-800 px-4 py-2 rounded-xl text-[10px] font-bold text-zinc-400"
                data-ocid="refinery.gas.estimate"
                title="Live estimate for the two Ethereum transactions (approve + deposit) at the current gas price. Unused gas is refunded."
              >
                GAS: {gasEstimate ?? "estimating…"}
              </div>
              <div className="text-[9px] text-blue-500/60 font-mono">
                via ICP ERC-20 Minter
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Input UNI */}
            <div className="lg:col-span-2 group">
              <div className="bg-black/50 p-6 sm:p-8 rounded-3xl border border-zinc-800 group-focus-within:border-pink-500/40 transition-all">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">
                    From (Ethereum)
                  </span>
                  <span className="text-xs text-pink-500 font-bold">
                    UNI
                  </span>
                </div>
                <input
                  data-ocid="refinery.uni.input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-label="UNI amount to swap"
                  className="bg-transparent text-3xl sm:text-4xl font-bold w-full outline-none text-white placeholder:text-zinc-600 focus-visible:placeholder:text-zinc-500 tabular-nums min-w-0"
                  value={uniAmount}
                  onChange={(e) => {
                    let val = e.target.value.trim();
                    // Reject scientific notation, letters, and other invalid chars
                    // Allow: digits, one decimal point, optional leading "."
                    if (!/^\d*\.?\d*$/.test(val)) return;
                    // Collapse a leading "." into "0."
                    if (val.startsWith(".")) val = `0${val}`;
                    // Allow empty or partial-input intermediate states
                    if (val === "" || val === "0" || val.endsWith(".")) {
                      onUniAmountChange(val);
                      return;
                    }
                    const raw = Number.parseFloat(val);
                    if (Number.isNaN(raw) || raw < 0) {
                      onUniAmountChange("");
                      return;
                    }
                    const max = Number.parseFloat(uniBalance ?? "");
                    if (Number.isFinite(max) && raw > max) {
                      // Clamp to balance without losing user precision
                      onUniAmountChange(uniBalance ?? "");
                      return;
                    }
                    // Preserve the user's typed string — avoids precision loss
                    // from Number→string conversion.
                    onUniAmountChange(val);
                  }}
                  disabled={inputDisabled}
                />
                {uniBalance && (
                  <button
                    type="button"
                    onClick={() => onUniAmountChange(uniBalance)}
                    className="mt-2 px-3 py-2 text-xs text-pink-500 font-bold hover:underline hover:bg-pink-500/5 rounded-md -ml-1"
                  >
                    MAX: {uniBalance} UNI
                  </button>
                )}
                {uniBalance &&
                  Number.parseFloat(uniAmount) >
                    Number.parseFloat(uniBalance) && (
                    <p className="mt-1.5 text-xs text-red-400 font-semibold">
                      Exceeds your UNI balance
                    </p>
                  )}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center lg:col-span-1 py-4 lg:py-0">
              <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-yellow-500 shadow-xl">
                <ArrowRightLeft size={24} />
              </div>
            </div>

            {/* Output sGLDT */}
            <div className="lg:col-span-2 group">
              <div className="bg-yellow-500/[0.03] p-6 sm:p-8 rounded-3xl border border-yellow-500/10 transition-all">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-yellow-600 tracking-widest uppercase">
                    To (ICP Network)
                  </span>
                  <span className="text-xs text-yellow-500 font-bold">
                    sGLDT
                  </span>
                </div>
                <div className="text-4xl font-bold text-yellow-500 truncate">
                  {outputDisplay}
                </div>
                {minReceivedDisplay && (
                  <p
                    className="mt-2 text-[11px] text-zinc-400"
                    data-ocid="refinery.min_received"
                    title="The canister settles at its own on-chain rate, clamped within ±2% of this quote — this is the floor."
                  >
                    Minimum received:{" "}
                    <span className="text-yellow-500/90 font-semibold">
                      {minReceivedDisplay}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Rate provenance — the quote's source and freshness, stated
           *  plainly. The displayed rate IS the canister's settlement rate
           *  (getRateStatus), not a third-party feed. */}
          {rateLine && (
            <div
              className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]"
              data-ocid="refinery.rate.provenance"
              aria-live="polite"
            >
              <span className="font-semibold text-zinc-300">
                {rateLine.rateDisplay}
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-500">{rateLine.provenance}</span>
              {rateLine.warning && (
                <span className="basis-full text-center text-amber-400/90">
                  {rateLine.warning}
                </span>
              )}
            </div>
          )}

          {/* Custody strip — WHO holds the funds at each step. This is the
           *  architecture's strongest trust property; every clause maps to
           *  code: minter → user principal (startMining encodes the caller's
           *  principal in the deposit calldata), treasury custody only inside
           *  the atomic refineCkUNI call, auto-refund via _refundCkUNI. */}
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-zinc-400">
                <span className="font-bold text-zinc-300">Who holds your funds: </span>
                DFINITY&apos;s chain-key minter mints ckUNI{" "}
                <span className="text-zinc-200 font-semibold">to your own ICP account</span>{" "}
                — never to us. The refinery takes custody only for the seconds
                of the atomic ckUNI→sGLDT swap, and a failed swap{" "}
                <span className="text-zinc-200 font-semibold">refunds your ckUNI automatically</span>.
                No servers, no custodian — the whole app is a canister on the
                Internet Computer.
              </p>
            </div>
          </div>

          {children}
        </div>

        {/* Widget Footer */}
        <div className="bg-black/40 border-t border-zinc-800 p-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">
          <span className="flex items-center gap-1">
            <Lock size={10} /> ckUNI Ledger:{" "}
            {ckuniLedgerCanisterId.slice(0, 20)}...
          </span>
          <span className="hidden sm:block text-zinc-800">|</span>
          <span className="flex items-center gap-1">
            <Activity size={10} /> ICP ERC-20 Minter: sv3dd-oaaaa...
          </span>
        </div>
      </div>
    </div>
  );
}
