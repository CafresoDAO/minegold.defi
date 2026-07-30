import { GoldCTA } from "../ui/GoldCTA";

type Props = {
  startDisabled: boolean;
  /** True until this browser completes its first refine. First-run hides the
   *  unlimited-approval opt-in (an advanced tradeoff nobody should meet
   *  before their first swap) and names the amount in the CTA. */
  firstRun: boolean;
  uniAmount: string;
  showRateHint: boolean;
  showConnecting: boolean;
  actorTimedOut: boolean;
  /** Non-null when the wallet's ETH can't cover the estimated gas — the Mine
   *  button is disabled and this explains exactly why, before the user signs
   *  anything. */
  gasShortfall: string | null;
  /** Approval sizing. false (default) = exact-amount approve per swap;
   *  true = MAX_UINT256, the user's explicit opt-in. */
  unlimitedApproval: boolean;
  onUnlimitedApprovalChange: (v: boolean) => void;
  onStartMining: () => void;
  /** Opens the redeem modal. BANKING GRAMMAR: withdraw is a peer of
   *  deposit, not a small link — a visible, equal exit is what makes the
   *  deposit feel safe. Disabled (not hidden) at zero balance so the door
   *  is always on screen. */
  onWithdraw: () => void;
  withdrawDisabled: boolean;
};

/** Idle phase — the "Mine sGLDT" call-to-action and readiness hints.
 *
 *  The old "recover a previous deposit" panel (Etherscan scan / paste-hash)
 *  is gone: under minter attribution a deposit credits ckUNI to the user's
 *  own principal, so recovery is automatic — the leftover-ckUNI banner
 *  surfaces any un-refined balance the moment the user signs in. */
export function PhaseIdle({
  startDisabled,
  firstRun,
  uniAmount,
  showRateHint,
  showConnecting,
  actorTimedOut,
  gasShortfall,
  unlimitedApproval,
  onUnlimitedApprovalChange,
  onStartMining,
  onWithdraw,
  withdrawDisabled,
}: Props) {
  return (
    <>
      {/* Deposit and Withdraw as equal peers — banking grammar. */}
      <div className="grid grid-cols-2 gap-2.5">
        <GoldCTA
          data-ocid="refinery.start.primary_button"
          onClick={onStartMining}
          disabled={startDisabled}
          aria-label="Deposit UNI to receive sGLDT"
          size="lg"
          fullWidth
          trailingIcon={null}
          className="shadow-2xl"
        >
          Deposit{uniAmount ? ` ${uniAmount} UNI` : ""}
        </GoldCTA>
        <button
          type="button"
          data-ocid="refinery.withdraw.button"
          onClick={onWithdraw}
          disabled={withdrawDisabled}
          aria-label="Withdraw — redeem sGLDT back to ckUNI"
          className="h-full min-h-[56px] rounded-2xl border border-zinc-700 bg-zinc-900 text-sm font-bold text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Withdraw
        </button>
      </div>
      {/* What each action is, in one line each — stated BEFORE the tap. */}
      <p className="mt-1.5 text-center text-[11px] text-zinc-500">
        Deposits convert to sGLDT at the on-chain rate (minimum 0.005 UNI —
        below that, ledger fees eat the deposit). Withdrawals redeem sGLDT
        back to ckUNI at the same rate source.
      </p>
      {showRateHint && (
        <p className="mt-2 text-center text-xs text-amber-400">
          Waiting for the on-chain exchange rate before enabling swap…
        </p>
      )}
      {gasShortfall && (
        <p
          className="mt-2 text-center text-xs text-amber-400"
          data-ocid="refinery.gas_shortfall.hint"
        >
          {gasShortfall}
        </p>
      )}

      {/* Approval sizing — exact-amount by default; unlimited is an explicit,
       *  remembered opt-in with the tradeoff stated in place. */}
      {firstRun ? null : (
      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3.5 py-3">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            data-ocid="refinery.unlimited_approval.checkbox"
            checked={unlimitedApproval}
            onChange={(e) => onUnlimitedApprovalChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-yellow-500"
          />
          <span className="text-[11px] leading-relaxed text-zinc-400">
            <span className="font-bold text-zinc-300">
              Approve unlimited UNI spending
            </span>{" "}
            (skips one wallet signature on every future swap). Off by default —
            each swap then approves exactly its own amount.
          </span>
        </label>
        {/* Deliberately OUTSIDE the <label>: a link inside it both follows
            the link and toggles the checkbox — a misclick that silently flips
            an approval setting. */}
        <p className="mt-1.5 pl-[26px] text-[11px] leading-relaxed text-zinc-500">
          The spender is always DFINITY&apos;s ckERC-20 helper contract; revoke
          any time at{" "}
          <a
            href="https://revoke.cash"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            revoke.cash
          </a>
          .
        </p>
      </div>
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
