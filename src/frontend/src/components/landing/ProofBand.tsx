import { ExternalLink } from "lucide-react";
import { formatTokenAmount, useProofSnapshot } from "../../hooks/useQueries";
import { CANISTERS, DASHBOARD } from "../../lib/canisters";

/**
 * The proof band — the skeptic's stop on the landing page. Live treasury
 * figures, the canister IDs behind them, and the limitations stated in the
 * SAME verbatim words /proof uses. No sign-in required to read any of it.
 *
 * Rule this section is built on: a landing page's trust section must be
 * harder on itself than a critic would be. The headline is an instruction,
 * not a boast.
 */
export function ProofBand({ onOpenProof }: { onOpenProof: () => void }) {
  const { data: snap, isLoading } = useProofSnapshot(true);
  const balances = snap?.balances ?? null;
  const stranded = snap?.stranded
    ? snap.stranded.refines + snap.stranded.redeems
    : null;

  return (
    <section
      data-ocid="landing.proof_band"
      className="rounded-[2rem] border p-6 sm:p-8"
      style={{
        borderColor: "var(--bb-border)",
        background: "var(--bb-surface)",
      }}
    >
      <h2 className="t-display" style={{ fontSize: "clamp(1.75rem, 1.4rem + 1.6vw, 2.5rem)" }}>
        Verify it.
      </h2>
      <p
        className="mt-1 mb-5 text-sm max-w-2xl"
        style={{ color: "var(--bb-text-muted)" }}
      >
        Don&apos;t take our word for any of this. These are live reads from
        public ledgers, and the canisters behind them are linked below —
        including the ones we don&apos;t control.
      </p>

      {/* Live figures */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <Figure
          label="Treasury sGLDT (pays refines)"
          value={
            balances ? formatTokenAmount(balances.sgldtBalance) : isLoading ? "…" : "—"
          }
        />
        <Figure
          label="Treasury ckUNI (pays cash-outs)"
          value={
            balances
              ? formatTokenAmount(balances.ckUNIBalance, 18)
              : isLoading
                ? "…"
                : "—"
          }
        />
        <Figure
          label="Swaps held for manual resolution"
          value={stranded != null ? stranded.toString() : isLoading ? "…" : "—"}
          note="published even at 0"
        />
      </div>

      {/* Canister IDs */}
      <p className="t-label mb-2" style={{ color: "var(--bb-text-dim)" }}>
        Every canister in the money path — and who controls it
      </p>
      <ul className="mb-5 grid gap-1.5 sm:grid-cols-2">
        {CANISTERS.map((c) => (
          <li key={c.id} className="text-[11px] leading-relaxed">
            <a
              href={`${DASHBOARD}/${c.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono underline underline-offset-2"
              style={{ color: "var(--bb-brand)" }}
            >
              {c.id.slice(0, 14)}… <ExternalLink size={10} />
            </a>{" "}
            <span style={{ color: "var(--bb-text)" }}>{c.label}</span>{" "}
            <span style={{ color: "var(--bb-text-dim)" }}>({c.party})</span>
          </li>
        ))}
      </ul>

      {/* The limitations — same words as /proof, on purpose */}
      <div
        className="rounded-2xl border p-4 text-[12px] leading-relaxed"
        style={{
          borderColor: "var(--bb-border)",
          background: "var(--bb-bg-soft)",
          color: "var(--bb-text-muted)",
        }}
      >
        <p className="t-label mb-1.5" style={{ color: "var(--bb-text)" }}>
          What we can&apos;t promise (stated on purpose)
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <span style={{ color: "var(--bb-text)" }} className="font-semibold">
              Unaudited.
            </span>{" "}
            No third party has audited this code.
          </li>
          <li>
            <span style={{ color: "var(--bb-text)" }} className="font-semibold">
              Single operator.
            </span>{" "}
            One person controls the backend and sets the sGLDT/USD reference
            leg of the rate.
          </li>
          <li>
            Refine payouts depend on treasury liquidity — shown live above. If
            it runs short, your deposit is auto-refunded, never taken.
          </li>
          <li>
            sGLDT&apos;s peg is sVault&apos;s contract and GLDT&apos;s gold
            backing is Gold DAO&apos;s — we link them, we don&apos;t control
            them.
          </li>
        </ul>
      </div>

      <button
        type="button"
        data-ocid="landing.open_proof"
        onClick={onOpenProof}
        className="mt-4 inline-flex min-h-[44px] items-center text-sm font-bold underline underline-offset-4"
        style={{ color: "var(--bb-brand)" }}
      >
        Open the full proof page ›
      </button>
    </section>
  );
}

function Figure({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ borderColor: "var(--bb-border)", background: "var(--bb-bg-soft)" }}
    >
      <p className="t-label mb-1" style={{ color: "var(--bb-text-dim)" }}>
        {label}
      </p>
      <p className="text-xl font-black tabular-nums" style={{ color: "var(--bb-text)" }}>
        {value}
      </p>
      {note && (
        <p className="text-[10px] mt-0.5" style={{ color: "var(--bb-text-dim)" }}>
          {note}
        </p>
      )}
    </div>
  );
}
