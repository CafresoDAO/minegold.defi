import { Infinity as InfinityIcon } from "lucide-react";

type Props = {
  /** Current side of the bridge where activity is happening:
   *    "eth"    — user is signing / tx is mining on Ethereum
   *    "bridge" — chain-key ckERC-20 minter is processing
   *    "icp"    — ckUNI minted, sGLDT releasing on ICP
   *    "done"   — complete */
  phase: "eth" | "bridge" | "icp" | "done";
  amount?: string;
};

/**
 * Cross-chain flow visualization — two cards (Ethereum left, ICP right)
 * connected by an animated bridge. Particles flow between them based on
 * the current phase, giving the user a real sense of progress across the
 * two chains rather than a static "waiting..." spinner.
 *
 * Uses CSS-only animations so no motion library dependency required.
 */
export function CrossChainFlow({ phase, amount }: Props) {
  const flowing = phase !== "done";

  return (
    <div className="relative rounded-2xl border border-zinc-800 bg-black/30 p-4">
      <div className="flex items-center justify-between gap-3">
        {/* Ethereum */}
        <ChainCard
          title="Ethereum"
          subtitle={amount ? `${amount} UNI` : "UNI"}
          accent="#627EEA"
          glyph={<EthGlyph />}
          active={phase === "eth"}
          done={phase !== "eth"}
        />

        {/* Bridge */}
        <div className="relative flex-1 mx-2 self-center">
          <div className="h-px bg-gradient-to-r from-[#627EEA]/40 via-zinc-700 to-[#F15A24]/40 relative overflow-hidden rounded-full">
            {flowing && (
              <>
                <span
                  className="absolute inset-y-0 w-6 rounded-full bg-gradient-to-r from-transparent via-yellow-300/80 to-transparent"
                  style={{ animation: "xchain-flow 2.4s linear infinite" }}
                />
                <span
                  className="absolute inset-y-0 w-3 rounded-full bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent"
                  style={{ animation: "xchain-flow 2.4s linear infinite", animationDelay: "1.2s" }}
                />
              </>
            )}
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-lg transition-all ${
                phase === "bridge"
                  ? "bg-yellow-500/20 border-yellow-400 animate-pulse"
                  : phase === "done"
                    ? "bg-emerald-500/20 border-emerald-400"
                    : "bg-zinc-900 border-zinc-700"
              }`}
            >
              <InfinityIcon
                size={14}
                className={
                  phase === "bridge"
                    ? "text-yellow-300"
                    : phase === "done"
                      ? "text-emerald-400"
                      : "text-zinc-500"
                }
              />
            </div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 text-[9px] font-black uppercase tracking-widest text-zinc-600 whitespace-nowrap">
            ckERC-20
          </div>
        </div>

        {/* ICP */}
        <ChainCard
          title="ICP"
          subtitle={phase === "done" ? "sGLDT minted" : "ckUNI → sGLDT"}
          accent="#F15A24"
          glyph={<IcpGlyph />}
          active={phase === "icp" || phase === "done"}
          done={phase === "done"}
        />
      </div>
    </div>
  );
}

function ChainCard({
  title,
  subtitle,
  accent,
  glyph,
  active,
  done,
}: {
  title: string;
  subtitle: string;
  accent: string;
  glyph: React.ReactNode;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 min-w-[100px] transition-all ${
        active
          ? "border-yellow-400/50 bg-yellow-500/5"
          : done
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: accent }}
        >
          {glyph}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-black text-white leading-tight">{title}</div>
          <div className="text-[9px] text-zinc-400 font-mono truncate">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function EthGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
      <path d="M8 1.5 L3.5 8.5 L8 11 L12.5 8.5 Z" fill="#ffffff" opacity="0.95" />
      <path d="M8 1.5 L3.5 8.5 L8 6 Z" fill="#ffffff" opacity="0.6" />
      <path d="M8 12 L3.5 9 L8 14.5 Z" fill="#ffffff" opacity="0.8" />
    </svg>
  );
}

function IcpGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M3 12c0-3 2.5-5.5 5.5-5.5 1.7 0 3.3.8 4.3 2l3.4 3.8c1 1.1 2.4 1.7 3.8 1.7 1.4 0 2.5-1.1 2.5-2.5S21.4 9 20 9c-1.4 0-2.8.6-3.8 1.7l-3.4 3.8c-1 1.2-2.6 2-4.3 2C5.5 16.5 3 14 3 12Z"
        fill="#ffffff"
        opacity="0.95"
      />
    </svg>
  );
}
