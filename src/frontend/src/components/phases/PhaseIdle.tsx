import { GoldCTA } from "../ui/GoldCTA";

type Props = {
  startDisabled: boolean;
  showRateHint: boolean;
  showConnecting: boolean;
  actorTimedOut: boolean;
  onStartMining: () => void;
};

/** Idle phase — the "Mine sGLDT" call-to-action and readiness hints.
 *
 *  The old "recover a previous deposit" panel (Etherscan scan / paste-hash)
 *  is gone: under minter attribution a deposit credits ckUNI to the user's
 *  own principal, so recovery is automatic — the leftover-ckUNI banner
 *  surfaces any un-refined balance the moment the user signs in. */
export function PhaseIdle({
  startDisabled,
  showRateHint,
  showConnecting,
  actorTimedOut,
  onStartMining,
}: Props) {
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
    </>
  );
}
