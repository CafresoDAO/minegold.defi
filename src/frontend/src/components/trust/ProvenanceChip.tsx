/**
 * ProvenanceChip — a value that carries its own evidence: what it is, where
 * it came from, and how old it is, with a trust-token dot:
 *
 *   verified — read from a public ledger / on-chain query   (--trust-verified)
 *   attested — operator-stated, checkable but not on-chain  (--trust-attested)
 *   unknown  — stale or unreachable; auto-demoted           (--trust-unknown)
 *   fault    — the source reported an error                 (--trust-fault)
 *
 * AUTO-DEMOTE: a "verified" or "attested" value older than `staleAfterMs`
 * renders as unknown — a number that was true an hour ago is not a number
 * we present as true now.
 */
export type TrustLevel = "verified" | "attested" | "unknown" | "fault";

const DOT: Record<TrustLevel, string> = {
  verified: "var(--trust-verified)",
  attested: "var(--trust-attested)",
  unknown: "var(--trust-unknown, #71717a)",
  fault: "var(--trust-fault, #f87171)",
};

export const ageLabel = (ageMs: number | null): string => {
  if (ageMs == null) return "age unknown";
  const mins = Math.max(0, Math.round(ageMs / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
};

type Props = {
  /** The number itself, already formatted. */
  value: string;
  /** Where it came from — "sGLDT ledger", "XRC oracle", "operator-set". */
  source: string;
  /** Milliseconds since the value was read; null = unknown. */
  ageMs?: number | null;
  trust: TrustLevel;
  /** Demote verified/attested to unknown beyond this age. Default 15 min. */
  staleAfterMs?: number;
  className?: string;
};

export function ProvenanceChip({
  value,
  source,
  ageMs = null,
  trust,
  staleAfterMs = 15 * 60_000,
  className = "",
}: Props) {
  const effective: TrustLevel =
    (trust === "verified" || trust === "attested") &&
    (ageMs == null || ageMs > staleAfterMs)
      ? "unknown"
      : trust;
  return (
    <span
      className={`inline-flex items-baseline gap-1.5 rounded-lg border border-zinc-800 bg-black/30 px-2 py-1 text-[11px] ${className}`}
      title={`${source} · ${ageLabel(ageMs)}`}
    >
      <span
        aria-hidden
        className="self-center h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: DOT[effective] }}
      />
      <span className="font-semibold text-zinc-200 tabular-nums">{value}</span>
      <span className="text-zinc-500">
        {source}
        {ageMs != null && <> · {ageLabel(ageMs)}</>}
      </span>
    </span>
  );
}
