import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  type AutoRefineSetting,
  CKBAT_STANDING_ALLOWANCE,
  approveCkBATForRefinery,
  fetchMyAutoRefineCkBAT,
  setAutoRefineCkBAT,
} from "../hooks/useQueries";
import { CKBAT_ASSET, formatAssetAmount } from "../lib/refineAssets";

type Props = {
  identity: unknown;
  /** Live ckBAT balance and ledger fee, from the position read. */
  balance: bigint;
  fee: bigint;
  /** Called after an approve/revoke so the parent re-reads the allowance. */
  onChanged: () => void;
};

/**
 * The standing order. Brave pays BAT rewards monthly in small amounts, and
 * a user who has to come back, approve and refine each time mostly won't.
 * Switching this on signs ONE standing approval on the ckBAT ledger and
 * flags the account; from then on the refinery's hourly pass refines
 * whatever ckBAT is sitting there, through the same pay-or-refund path as
 * a manual refine.
 *
 * The allowance is the whole authorisation. Switching off revokes it
 * (approve 0), so nothing is left standing — the backend flag alone can't
 * move anything.
 */
export function AutoRefineCard({ identity, balance, fee, onChanged }: Props) {
  const [setting, setSetting] = useState<AutoRefineSetting | null | undefined>(
    undefined,
  );
  const [busy, setBusy] = useState<"on" | "off" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    void fetchMyAutoRefineCkBAT(identity).then(setSetting);
  }, [identity]);

  useEffect(() => {
    load();
  }, [load]);

  const enabled = setting?.enabled === true;
  // Both the approve and the revoke cost one ledger fee, paid from the
  // user's ckBAT. Say so before the tap rather than failing after it.
  const canPayFee = balance >= fee;

  const turnOn = async () => {
    setBusy("on");
    setError(null);
    const approved = await approveCkBATForRefinery({
      identity,
      amount: CKBAT_STANDING_ALLOWANCE,
    });
    if (!approved.ok) {
      setError(approved.error);
      setBusy(null);
      return;
    }
    const r = await setAutoRefineCkBAT({ identity, enabled: true });
    if (!r.ok) setError(r.error);
    else setSetting(r.setting);
    setBusy(null);
    onChanged();
  };

  const turnOff = async () => {
    setBusy("off");
    setError(null);
    const r = await setAutoRefineCkBAT({ identity, enabled: false });
    if (!r.ok) {
      setError(r.error);
      setBusy(null);
      return;
    }
    setSetting(r.setting);
    if (canPayFee) {
      const revoked = await approveCkBATForRefinery({ identity, amount: 0n });
      if (!revoked.ok) {
        setError(
          `Auto-refine is off, but the standing approval could not be revoked: ${revoked.error} You can revoke it later from this card.`,
        );
      }
    } else {
      setError(
        `Auto-refine is off. The standing approval is still on the ledger (revoking costs ${formatAssetAmount(fee, CKBAT_ASSET, 2)} ckBAT, which you don't hold right now) — it can't move anything while this is off, and you can revoke it once you have ckBAT again.`,
      );
    }
    setBusy(null);
    onChanged();
  };

  const lastRun =
    setting && setting.lastRunNs > 0n
      ? new Date(Number(setting.lastRunNs / 1_000_000n)).toLocaleString()
      : null;

  return (
    <div
      data-ocid="brave.autorefine"
      className="mt-5 rounded-2xl border p-4"
      style={{
        borderColor: enabled ? "rgba(52,211,153,0.35)" : "var(--bb-border)",
        background: enabled
          ? "rgba(52,211,153,0.06)"
          : "var(--bb-surface-soft)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">
            Auto-refine{" "}
            {enabled && (
              <span
                className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
                style={{
                  background: "rgba(52,211,153,0.15)",
                  color: "var(--trust-verified)",
                }}
              >
                on
              </span>
            )}
          </p>
          <p
            className="mt-1 text-[12px] leading-relaxed"
            style={{ color: "var(--bb-text-muted)" }}
          >
            Whenever ckBAT lands in your vault, the refinery turns it into
            sGLDT for you — hourly, at the live rate, with the same automatic
            refund if a payout ever fails. Brave pays rewards monthly; this is
            how they become gold without you coming back.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? "Turn auto-refine off" : "Turn auto-refine on"}
          data-ocid="brave.autorefine.toggle"
          disabled={busy !== null || setting === undefined || (!enabled && !canPayFee)}
          onClick={() => void (enabled ? turnOff() : turnOn())}
          className="relative inline-flex h-11 w-[72px] shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
          style={{
            borderColor: enabled ? "var(--trust-verified)" : "var(--bb-border)",
            background: enabled ? "var(--trust-verified)" : "var(--bb-bg-soft)",
          }}
        >
          <span
            className="absolute flex h-9 w-9 items-center justify-center rounded-full shadow transition-transform"
            style={{
              background: "#ffffff",
              transform: enabled ? "translateX(32px)" : "translateX(3px)",
            }}
          >
            {busy && (
              <Loader2 size={14} className="animate-spin" style={{ color: "var(--ink-800)" }} />
            )}
          </span>
        </button>
      </div>

      {!enabled && (
        <p
          className="mt-2 text-[11px] leading-relaxed"
          style={{ color: "var(--bb-text-dim)" }}
        >
          Turning this on signs one standing approval for the refinery to pull
          ckBAT from your account (costs the{" "}
          {formatAssetAmount(fee, CKBAT_ASSET, 2)} ckBAT ledger fee once).
          Your balance is the real cap — it can only ever pull what is there.
          Turning it off revokes the approval.
          {!canPayFee && (
            <>
              {" "}
              You need at least {formatAssetAmount(fee, CKBAT_ASSET, 2)} ckBAT
              to sign it.
            </>
          )}
        </p>
      )}

      {enabled && (
        <p
          className="mt-2 text-[11px] leading-relaxed tabular-nums"
          style={{ color: "var(--bb-text-dim)" }}
        >
          {setting.refines > 0n
            ? `${String(setting.refines)} auto-refine${setting.refines === 1n ? "" : "s"} so far.`
            : "No auto-refine yet."}{" "}
          {lastRun ? `Last check ${lastRun}: ${setting.lastResult}` : "First check within the hour."}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 text-[11px] leading-relaxed"
          style={{ color: "var(--trust-fault)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
