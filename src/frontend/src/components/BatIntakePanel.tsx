import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useBatRefineFlow } from "../hooks/useBatRefineFlow";
import { type BatRateStatus, fetchBatRateStatus } from "../hooks/useQueries";
import { DASHBOARD } from "../lib/canisters";
import {
  CKBAT_ASSET,
  formatAssetAmount,
  parseAssetAmount,
} from "../lib/refineAssets";

interface BatIntakePanelProps {
  /** II identity, or null when signed out. */
  identity: unknown | null;
  onSignIn: () => void;
}

/**
 * The live BAT intake. Replaces the waitlist card on /brave the moment the
 * minter lists ckBAT AND the backend has a rate.
 *
 * Three states, in the order a person actually hits them:
 *   signed out      → what this does, and a way in
 *   no ckBAT yet    → how to get some (we do NOT bridge for them)
 *   holding ckBAT   → the amount field and the refine
 *
 * The bridge itself is deliberately not driven from here. The user mints
 * ckBAT against their own principal through DFINITY's minter; we never touch
 * their Ethereum side, and holding ckBAT is the only proof this page needs.
 * So the honest thing to show someone with no ckBAT is instructions, not a
 * disabled button implying we could do it for them.
 */
export function BatIntakePanel({ identity, onSignIn }: BatIntakePanelProps) {
  const { state, position, busy, refineNow, refreshPosition, reset } =
    useBatRefineFlow(identity);
  const [amountText, setAmountText] = useState("");
  const [loadingPosition, setLoadingPosition] = useState(false);
  const [rateStatus, setRateStatus] = useState<BatRateStatus | null>(null);

  useEffect(() => {
    if (!identity) return;
    setLoadingPosition(true);
    void refreshPosition().finally(() => setLoadingPosition(false));
  }, [identity, refreshPosition]);

  // Anonymous query — runs signed out too, so the closed-state copy can be
  // specific before anyone has logged in.
  useEffect(() => {
    void fetchBatRateStatus().then(setRateStatus);
  }, []);

  const fee = position?.fee ?? CKBAT_ASSET.feeFallback;
  const minRefine = position?.minRefine ?? CKBAT_ASSET.minRefineFallback;
  const balance = position?.balance ?? 0n;
  const rate = position?.rate ?? 0n;

  /** What the user can actually refine: balance minus the two ledger fees
   *  this flow pays (approve, then transfer_from). */
  const spendable = balance > 2n * fee ? balance - 2n * fee : 0n;
  const hasEnough = spendable >= minRefine;

  const requested = useMemo(
    () => parseAssetAmount(amountText, CKBAT_ASSET),
    [amountText],
  );

  /** sGLDT the user would receive, at the rate the backend reports. The rate
   *  is 1e8-precision sGLDT per whole BAT, and sGLDT is e8s — so this is the
   *  same (amount * rate) / 1e18 the canister computes. Shown as an estimate
   *  because the settled rate is whatever the backend clamps to at call time. */
  const estimatedSgldt = useMemo(() => {
    if (rate === 0n || requested === 0n) return 0n;
    return (requested * rate) / 1_000_000_000_000_000_000n;
  }, [requested, rate]);

  const amountValid =
    requested > 0n && requested <= spendable && requested >= minRefine;

  const intakeOpen = rate > 0n;

  // ── Signed out ────────────────────────────────────────────────────────────
  if (!identity) {
    return (
      <Card>
        <Label>BAT intake · live</Label>
        <p className="mt-1 text-sm font-bold">Refine ckBAT into gold</p>
        <p
          className="mt-1 text-[12px] leading-relaxed"
          style={{ color: "var(--bb-text-muted)" }}
        >
          Bring ckBAT you already hold and the refinery settles it into sGLDT in
          one atomic call — the same treasury, the same auto-refund, the same
          public proof page as the UNI intake.
        </p>
        <button
          type="button"
          data-ocid="brave.intake.signin"
          onClick={onSignIn}
          className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-2xl px-5 text-sm font-bold"
          style={{ background: "var(--royal-700)", color: "#ffffff" }}
        >
          Sign in to refine <ArrowRight size={15} />
        </button>
      </Card>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (state.kind === "done") {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <CheckCircle2
            size={20}
            className="mt-0.5 shrink-0"
            style={{ color: "var(--trust-verified)" }}
          />
          <div className="min-w-0">
            <p className="text-sm font-bold">Refined</p>
            <p
              className="mt-1 text-[12px] leading-relaxed"
              style={{ color: "var(--bb-text-muted)" }}
            >
              {(Number(state.sgldt) / 1e8).toFixed(4)} sGLDT is in your account.
              Settled at {(Number(state.settledRate) / 1e8).toFixed(6)} sGLDT
              per BAT, sGLDT ledger block{" "}
              <span className="font-mono">{state.payBlock.toString()}</span>.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                data-ocid="brave.intake.again"
                onClick={() => {
                  reset();
                  setAmountText("");
                  void refreshPosition();
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-bold"
                style={{ color: "var(--bb-brand)" }}
              >
                Refine more <ArrowRight size={13} />
              </button>
              <a
                href={`${DASHBOARD}/${CKBAT_ASSET.ledgerCanisterId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold"
                style={{ color: "var(--bb-text-dim)" }}
              >
                ckBAT ledger <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // ── Intake closed (minter lists ckBAT, but no rate set yet) ───────────────
  if (!loadingPosition && position && !intakeOpen) {
    return (
      <Card>
        <Label>BAT intake · {rateStatus?.rate ? "paused" : "opening"}</Label>
        <p className="mt-1 text-sm font-bold">
          {rateStatus?.rate
            ? "Price feed has gone quiet"
            : "Waiting on the first rate"}
        </p>
        <p
          className="mt-1 text-[12px] leading-relaxed"
          style={{ color: "var(--bb-text-muted)" }}
        >
          {rateStatus?.rate
            ? `The refinery last confirmed a BAT price more than ${rateStatus.maxAgeNs / 3_600_000_000_000n} hours ago and will not settle against a number that old. It reopens on its own as soon as the oracle reports again.`
            : "ckBAT is listed by the minter and the refinery accepts it, but no BAT/USD rate has been established yet. The refinery refuses to settle until it has one rather than pay out against a guessed number."}{" "}
          Your ckBAT is untouched.
        </p>
        {rateStatus && !rateStatus.rate && (
          <p
            className="mt-2 text-[11px] tabular-nums"
            style={{ color: "var(--bb-text-dim)" }}
          >
            {rateStatus.samples.length}/{String(rateStatus.sampleWindow)} price
            samples collected — the rate is the median of the window, so the
            door opens once it is full.
          </p>
        )}
      </Card>
    );
  }

  // ── Holding ckBAT (or not) ────────────────────────────────────────────────
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>BAT intake · live</Label>
        <button
          type="button"
          data-ocid="brave.intake.refresh"
          onClick={() => {
            setLoadingPosition(true);
            void refreshPosition().finally(() => setLoadingPosition(false));
          }}
          disabled={loadingPosition || busy}
          className="inline-flex items-center gap-1 text-[10px] font-semibold disabled:opacity-40"
          style={{ color: "var(--bb-text-dim)" }}
        >
          <RefreshCw
            size={10}
            className={loadingPosition ? "animate-spin" : ""}
          />
          balance
        </button>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="t-display" style={{ fontSize: "1.6rem" }}>
          {formatAssetAmount(balance, CKBAT_ASSET)}
        </span>
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--bb-text-muted)" }}
        >
          ckBAT
        </span>
      </div>

      {balance === 0n ? (
        <p
          className="mt-2 text-[12px] leading-relaxed"
          style={{ color: "var(--bb-text-muted)" }}
        >
          You don&apos;t hold any ckBAT yet. Mint it yourself through
          DFINITY&apos;s chain-key minter — deposit BAT on Ethereum naming your
          own principal, and the minter credits ckBAT directly to you after ~12
          block confirmations. We never touch your Ethereum side; the ckBAT
          landing in your account is the only proof this page needs.
        </p>
      ) : !hasEnough ? (
        <p
          className="mt-2 text-[12px] leading-relaxed"
          style={{ color: "var(--bb-text-muted)" }}
        >
          Not quite enough to refine. The ckBAT ledger charges{" "}
          {formatAssetAmount(fee, CKBAT_ASSET, 2)} per transfer and this flow
          pays it twice, so you need{" "}
          {formatAssetAmount(minRefine + 2n * fee, CKBAT_ASSET)} ckBAT to refine
          the {formatAssetAmount(minRefine, CKBAT_ASSET, 2)} minimum.
        </p>
      ) : (
        <>
          <p
            className="mt-1 text-[11px]"
            style={{ color: "var(--bb-text-dim)" }}
          >
            {formatAssetAmount(spendable, CKBAT_ASSET)} refinable after the two{" "}
            {formatAssetAmount(fee, CKBAT_ASSET, 2)} ledger fees
          </p>

          <div className="mt-4">
            <label
              htmlFor="bat-amount"
              className="t-label block"
              style={{ color: "var(--bb-text-dim)" }}
            >
              Amount to refine
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="bat-amount"
                data-ocid="brave.intake.amount"
                inputMode="decimal"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                disabled={busy}
                placeholder={formatAssetAmount(minRefine, CKBAT_ASSET, 2)}
                className="min-h-[48px] w-full rounded-2xl border px-4 font-mono text-sm outline-none disabled:opacity-50"
                style={{
                  borderColor: "var(--bb-border)",
                  background: "var(--bb-bg)",
                  color: "var(--bb-text)",
                }}
              />
              <button
                type="button"
                data-ocid="brave.intake.max"
                onClick={() =>
                  setAmountText(formatAssetAmount(spendable, CKBAT_ASSET, 6))
                }
                disabled={busy}
                className="min-h-[48px] shrink-0 rounded-2xl border px-4 text-xs font-bold disabled:opacity-50"
                style={{
                  borderColor: "var(--bb-border)",
                  color: "var(--bb-text-muted)",
                }}
              >
                Max
              </button>
            </div>

            {requested > 0n && (
              <p
                className="mt-2 text-[12px]"
                style={{ color: "var(--bb-text-muted)" }}
              >
                {amountValid ? (
                  <>
                    You receive about{" "}
                    <span
                      className="font-mono font-bold"
                      style={{ color: "var(--bb-text)" }}
                    >
                      {(Number(estimatedSgldt) / 1e8).toFixed(4)} sGLDT
                    </span>{" "}
                    at {(Number(rate) / 1e8).toFixed(6)} per BAT. The rate is
                    re-read at settlement, so the final figure can move
                    slightly.
                  </>
                ) : requested < minRefine ? (
                  <>
                    Minimum is {formatAssetAmount(minRefine, CKBAT_ASSET, 2)}{" "}
                    ckBAT.
                  </>
                ) : (
                  <>
                    More than you can refine —{" "}
                    {formatAssetAmount(spendable, CKBAT_ASSET)} is available
                    after fees.
                  </>
                )}
              </p>
            )}
          </div>

          <button
            type="button"
            data-ocid="brave.intake.refine"
            onClick={() => void refineNow(requested, rate > 0n ? rate : null)}
            disabled={!amountValid || busy}
            className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold disabled:opacity-40"
            style={{ background: "var(--royal-700)", color: "#ffffff" }}
          >
            {state.kind === "approving" ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Approving the
                refinery…
              </>
            ) : state.kind === "refining" ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Refining…
              </>
            ) : (
              <>
                Refine to sGLDT <ArrowRight size={15} />
              </>
            )}
          </button>

          <p
            className="mt-2 text-[11px] leading-relaxed"
            style={{ color: "var(--bb-text-dim)" }}
          >
            Two signatures: one approving the refinery to pull that ckBAT, one
            settling the swap. If the sGLDT payout fails, the ckBAT is returned
            automatically.
          </p>
        </>
      )}

      {state.kind === "failed" && (
        <div
          className="mt-4 rounded-2xl border p-3"
          style={{
            borderColor: "var(--trust-fault)",
            background:
              "color-mix(in srgb, var(--trust-fault) 8%, transparent)",
          }}
        >
          <p
            className="text-[12px] leading-relaxed"
            style={{ color: "var(--bb-text)" }}
          >
            {state.error}
          </p>
          {state.recoverable && (
            <button
              type="button"
              data-ocid="brave.intake.retry"
              onClick={reset}
              className="mt-2 text-xs font-bold"
              style={{ color: "var(--bb-brand)" }}
            >
              Try again
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-ocid="brave.intake"
      className="rounded-3xl border p-6"
      style={{
        borderColor: "var(--bb-border)",
        background: "var(--bb-surface)",
      }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="t-label" style={{ color: "var(--bb-text-dim)" }}>
      {children}
    </p>
  );
}
