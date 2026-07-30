import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { useState } from "react";

/**
 * CustodyIndicator — WHO holds the funds, as a five-node rail instead of a
 * paragraph. Each node is a real custody state in the architecture; the
 * only node that isn't the user is the seconds-long atomic swap, and the
 * rail says so. The old prose strip survives behind "Why?" — the claim is
 * scannable, the reasoning is one tap away.
 *
 * Every clause maps to code: minter → user principal (the deposit calldata
 * encodes the caller's own principal), treasury custody only inside the
 * atomic refineCkUNI call, auto-refund via _refundCkUNI.
 */

const NODES: { label: string; holder: "you" | "dfinity" | "refinery" }[] = [
  { label: "Your wallet", holder: "you" },
  { label: "ckERC-20 minter", holder: "dfinity" },
  { label: "Your ckUNI account", holder: "you" },
  { label: "Atomic swap (~seconds)", holder: "refinery" },
  { label: "Your vault", holder: "you" },
];

const HOLDER_STYLE: Record<
  (typeof NODES)[number]["holder"],
  { dot: string; text: string; tag: string }
> = {
  you: { dot: "bg-emerald-400", text: "text-zinc-300", tag: "yours" },
  dfinity: { dot: "bg-blue-400", text: "text-zinc-400", tag: "DFINITY" },
  refinery: { dot: "bg-amber-400", text: "text-zinc-400", tag: "refinery" },
};

export function CustodyIndicator({
  /** 0-based node currently holding the funds; undefined = static display. */
  active,
}: {
  active?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/30 px-4 py-3">
      <div className="flex items-center gap-2 mb-2.5">
        <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
        <p className="t-label text-zinc-400">
          Who holds your funds — 4 of 5 steps: you
        </p>
      </div>

      {/* The rail. It wraps at every real width the widget is rendered at, so
          order is carried by an ORDINAL on each node rather than connector
          dashes — a dash leading a wrapped row points at nothing. */}
      <ol className="flex flex-wrap items-center gap-1.5">
        {NODES.map((n, i) => {
          const s = HOLDER_STYLE[n.holder];
          const isActive = active === i;
          return (
            <li
              key={n.label}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] leading-none ${
                isActive
                  ? "border-yellow-500/40 bg-yellow-500/10"
                  : "border-zinc-800 bg-zinc-900/40"
              }`}
              title={`Held by: ${s.tag}`}
            >
              <span className="font-mono text-zinc-600">{i + 1}</span>
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${s.dot}`}
              />
              <span className={`font-semibold ${s.text}`}>{n.label}</span>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        data-ocid="custody.why.toggle"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 inline-flex min-h-[32px] items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
      >
        Why? {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>
      {open && (
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
          DFINITY&apos;s chain-key minter mints ckUNI{" "}
          <span className="text-zinc-200 font-semibold">
            to your own ICP account
          </span>{" "}
          — never to us. The refinery takes custody only for the seconds of
          the atomic ckUNI→sGLDT swap, and a failed swap{" "}
          <span className="text-zinc-200 font-semibold">
            refunds your ckUNI automatically
          </span>
          . No servers, no custodian — the whole app is a canister on the
          Internet Computer.
        </p>
      )}
    </div>
  );
}
