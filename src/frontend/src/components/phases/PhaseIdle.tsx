import { GoldCTA } from "../ui/GoldCTA";

type Props = {
  uniAmount: string;
  startDisabled: boolean;
  showRateHint: boolean;
  showConnecting: boolean;
  actorTimedOut: boolean;
  showRecoveryEntry: boolean;
  showRecoveryPanel: boolean;
  manualTxHash: string;
  manualRecoveryBusy: boolean;
  onStartMining: () => void;
  onToggleRecovery: () => void;
  onManualTxHashChange: (v: string) => void;
  onFinalizeFromChain: () => void;
  onResumeFromTxHash: (hash: string) => void;
};

/** Idle phase — the "Mine sGLDT" call-to-action, readiness hints, and the
 *  collapsed recover-a-previous-deposit panel. */
export function PhaseIdle({
  uniAmount,
  startDisabled,
  showRateHint,
  showConnecting,
  actorTimedOut,
  showRecoveryEntry,
  showRecoveryPanel,
  manualTxHash,
  manualRecoveryBusy,
  onStartMining,
  onToggleRecovery,
  onManualTxHashChange,
  onFinalizeFromChain,
  onResumeFromTxHash,
}: Props) {
  const amountMissing =
    !uniAmount || Number.parseFloat(uniAmount || "0") <= 0;

  return (
    <>
      <GoldCTA
        data-ocid="refinery.start.primary_button"
        onClick={onStartMining}
        disabled={startDisabled}
        aria-label="Mine sGLDT by depositing UNI"
        size="lg"
        className="shadow-2xl"
      >
        ⛏ Mine sGLDT
      </GoldCTA>
      {showRateHint && (
        <p className="mt-2 text-center text-xs text-amber-400">
          Waiting for live exchange rate before enabling swap…
        </p>
      )}
      {showConnecting && (
        <p className="mt-2 text-center text-xs text-zinc-500 animate-pulse">
          Connecting to canister...
        </p>
      )}
      {actorTimedOut && (
        <div className="mt-2 text-center space-y-2">
          <p className="text-xs text-red-400">
            Unable to reach the refinery. Please refresh the
            page.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs text-zinc-400 underline underline-offset-2 hover:text-white transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Recover-a-previous-deposit panel — shown only when
       *  the user is authenticated + has wallet connected +
       *  is idle. Hidden behind a subtle text button so it
       *  doesn't clutter the primary flow. Covers two
       *  scenarios: (a) the user sent UNI but the frontend
       *  never recorded the deposit on the canister (tab
       *  killed mid-flow, network drop, older version of
       *  the dApp) — hit "Scan Ethereum" to have the
       *  canister find the tx by address; (b) user has the
       *  specific txHash — paste it in for a direct verify
       *  + finalize. Both paths run the same canister
       *  verification as the happy-path flow, so the
       *  verification guarantees are identical.  */}
      {showRecoveryEntry && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onToggleRecovery}
            className="w-full text-center text-[11px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors py-2"
            data-ocid="refinery.recovery.toggle"
            aria-expanded={showRecoveryPanel}
          >
            {showRecoveryPanel
              ? "Hide recovery options"
              : "Already sent UNI? Recover a previous deposit"}
          </button>

          {showRecoveryPanel && (
            <div className="mt-3 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-4">
              <div>
                <p className="text-[11px] font-black text-blue-300 uppercase tracking-widest mb-1">
                  Recover a previous deposit
                </p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  If you sent UNI to the bridge but the dApp
                  didn't track the swap, enter the same UNI
                  amount above, then either scan for your
                  recent tx or paste its hash. The canister
                  re-verifies the calldata and releases your
                  sGLDT.
                </p>
              </div>

              <button
                type="button"
                data-ocid="refinery.recovery.scan"
                onClick={onFinalizeFromChain}
                disabled={manualRecoveryBusy || amountMissing}
                className="w-full min-h-[48px] rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-200 font-bold text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {manualRecoveryBusy
                  ? "Searching Ethereum…"
                  : "Scan Ethereum for my deposit"}
              </button>

              <div className="flex items-center gap-3">
                <span className="flex-1 h-px bg-zinc-800" />
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
                  or
                </span>
                <span className="flex-1 h-px bg-zinc-800" />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="recovery-tx-hash"
                  className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest"
                >
                  Paste your deposit tx hash
                </label>
                <input
                  id="recovery-tx-hash"
                  type="text"
                  inputMode="text"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={manualTxHash}
                  onChange={(e) => onManualTxHashChange(e.target.value)}
                  placeholder="0x… 64 hex chars"
                  className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-blue-400/60"
                />
                <button
                  type="button"
                  data-ocid="refinery.recovery.tx_submit"
                  onClick={() => onResumeFromTxHash(manualTxHash)}
                  disabled={manualRecoveryBusy || !manualTxHash || amountMissing}
                  className="w-full min-h-[44px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {manualRecoveryBusy
                    ? "Verifying…"
                    : "Verify & release sGLDT"}
                </button>
              </div>

              {amountMissing && (
                <p className="text-[10px] text-amber-400 text-center">
                  Enter the UNI amount you deposited in the
                  input above — the canister needs it to
                  match the on-chain tx.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
