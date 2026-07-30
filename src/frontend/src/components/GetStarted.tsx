import { Check } from "lucide-react";
import { JOURNEY } from "../lib/journey";

/**
 * GetStarted — the empty vault IS onboarding. Before I5 an empty portfolio
 * rendered nothing (HoldingsCard returned null) and a new user faced the
 * refinery with no map. This checklist reuses the canonical journey
 * (lib/journey — the one map every surface shares) with live done-states:
 * vault ✓ the moment they're signed in, wallet ✓ once connected.
 */
export function GetStarted({
  walletConnected,
}: {
  walletConnected: boolean;
}) {
  const done = [true, walletConnected, false, false];
  const nextIdx = done.findIndex((d) => !d);

  return (
    <section
      data-ocid="get_started"
      className="mb-6 rounded-[2rem] border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6"
    >
      <p className="t-label text-zinc-500 mb-1">Your vault is open — and empty</p>
      <p className="text-sm text-zinc-300 font-semibold mb-4">
        Two steps down, {4 - done.filter(Boolean).length} to your first gold.
      </p>
      <ol className="space-y-2.5">
        {JOURNEY.map((s, i) => (
          <li key={s.n} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                done[i]
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                  : i === nextIdx
                    ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
                    : "border-zinc-700 bg-zinc-800/60 text-zinc-500"
              }`}
            >
              {done[i] ? <Check size={11} /> : s.n}
            </span>
            <span className="min-w-0">
              <span
                className={`text-[13px] font-bold ${
                  done[i]
                    ? "text-zinc-500 line-through decoration-zinc-700"
                    : i === nextIdx
                      ? "text-white"
                      : "text-zinc-400"
                }`}
              >
                {s.title}
              </span>{" "}
              <span className="text-[12px] text-zinc-500">— {s.sub}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
