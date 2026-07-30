import { ChevronRight, Clock, Lock, ShieldCheck, TrendingUp } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";

interface BankingBraveHomeProps {
  onOpenMinegoldUni: () => void;
  onOpenMinegoldBrave: () => void;
}

/**
 * Banking.Brave landing — the top-level entry point.
 *
 * Hierarchy rendered here:
 *   Banking.Brave               ← this page's brand
 *     └── Minegold.Defi         ← the "protocols we govern" vertical
 *           ├── Minegold.Uni    ← LIVE — UNI → ckUNI → sGLDT
 *           └── Minegold.Brave  ← COMING SOON — BAT → ckBAT → sGLDT
 */
export function BankingBraveHome({
  onOpenMinegoldUni,
  onOpenMinegoldBrave,
}: BankingBraveHomeProps) {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bb-bg)", color: "var(--bb-text)" }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Top bar with theme toggle */}
        <div className="flex justify-end mb-6">
          <ThemeToggle />
        </div>

        {/* Brand header */}
        <header className="flex flex-col items-center text-center mb-16">
          <div
            className="w-32 h-32 sm:w-40 sm:h-40 mb-6 rounded-full overflow-hidden flex items-center justify-center"
            style={{
              boxShadow: "0 0 30px rgba(29, 78, 216, 0.35)",
              background: "#1D4ED8",
            }}
          >
            <img
              src="/bankingbrave.png"
              alt="Banking.Brave"
              className="w-[115%] h-[115%] object-cover object-center"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3">
            Banking<span style={{ color: "var(--bb-brand)" }}>.</span>Brave
          </h1>
          <p className="text-sm sm:text-base max-w-xl" style={{ color: "var(--bb-text-muted)" }}>
            On-chain financial primitives on the Internet Computer. We govern open,
            auditable cross-chain protocols under the Minegold.Defi family.
          </p>
        </header>

        {/* Minegold.Defi — the protocol family */}
        <section className="mb-12">
          <div className="flex items-end justify-between flex-wrap gap-2 mb-5">
            <div>
              <div
                className="text-[10px] font-black uppercase tracking-widest mb-1"
                style={{ color: "var(--bb-text-dim)" }}
              >
                Protocols we govern
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Minegold<span style={{ color: "var(--bb-brand)" }}>.</span>Defi
              </h2>
              <p className="text-xs mt-1 max-w-lg" style={{ color: "var(--bb-text-muted)" }}>
                A family of cross-chain refinery workflows. Each workflow bridges a
                specific ERC-20 source asset onto ICP and refines it into sGLDT — a
                1:1 wrapper of Gold DAO's physically backed GLDT (gldt.org).
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Minegold.Uni — LIVE */}
            <button
              type="button"
              onClick={onOpenMinegoldUni}
              className="group relative text-left rounded-3xl border transition-all p-6 overflow-hidden hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, rgba(234, 179, 8, 0.08), var(--bb-surface))",
                borderColor: "var(--bb-border)",
                color: "var(--bb-text)",
              }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-yellow-500/20">
                  <svg width="24" height="24" viewBox="0 0 40 40" fill="none" aria-hidden>
                    <path d="M6 34 L30 8" stroke="#3B1F00" strokeWidth="5" strokeLinecap="square" />
                    <path d="M6 34 L30 8" stroke="#7B4513" strokeWidth="3" strokeLinecap="square" />
                    <rect x="24" y="4" width="14" height="6" rx="1" fill="#FFFFF0" />
                    <path d="M36 2 L40 6 L36 10 L32 6 Z" fill="#F0F0F0" />
                    <circle cx="8" cy="32" r="3" fill="#FFD700" opacity="0.9" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-black">
                      Minegold<span style={{ color: "var(--bb-brand)" }}>.</span>Uni
                    </h3>
                    <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">
                      Live
                    </span>
                  </div>
                  <div className="text-[10px] font-mono mb-2" style={{ color: "var(--bb-text-dim)" }}>
                    UNI (ERC-20) → ckUNI → sGLDT
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--bb-text-muted)" }}>
                    Onboard UNI into ckUNI on ICP via the chain-key bridge, then refine
                    into sGLDT — wrapped, physically backed GLDT — at the locked-in live rate.
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-yellow-500 group-hover:text-yellow-400 transition-colors">
                    Open workflow
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </button>

            {/* Minegold.Brave — COMING SOON, but clickable */}
            <button
              type="button"
              onClick={onOpenMinegoldBrave}
              className="group relative text-left rounded-3xl border transition-all p-6 overflow-hidden hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, rgba(249, 115, 22, 0.08), var(--bb-surface))",
                borderColor: "var(--bb-border)",
                color: "var(--bb-text)",
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20"
                  style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 3L3 8l9 5 9-5-9-5z" fill="#FFFFFF" />
                    <path d="M3 8v8l9 5 9-5V8" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-black">
                      Minegold<span style={{ color: "var(--bb-brand)" }}>.</span>Brave
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-amber-500/15 text-amber-500 border border-amber-500/30 rounded-full px-2 py-0.5">
                      <Clock size={9} /> Soon
                    </span>
                  </div>
                  <div className="text-[10px] font-mono mb-2" style={{ color: "var(--bb-text-dim)" }}>
                    BAT (ERC-20) → ckBAT → sGLDT
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--bb-text-muted)" }}>
                    Onboard the Brave browser's native BAT token as ckBAT on ICP.
                    Unlocks once DFINITY's chain-key ERC-20 minter adds ckBAT support.
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-orange-500 group-hover:text-orange-400 transition-colors">
                    Preview details
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Trust row */}
        <section className="mb-16 grid sm:grid-cols-3 gap-4 text-xs">
          {[
            { icon: ShieldCheck, color: "var(--bb-brand)", title: "100% on-chain", desc: "All logic lives in ICP canisters — no backend servers." },
            { icon: TrendingUp, color: "#10b981", title: "Cross-chain native", desc: "DFINITY chain-key ckERC-20 bridges each source asset automatically." },
            { icon: Lock, color: "#eab308", title: "Self-custody", desc: "You sign with your own Brave Wallet and Internet Identity." },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-2 rounded-2xl border p-4"
              style={{ borderColor: "var(--bb-border)", background: "var(--bb-surface)" }}
            >
              <item.icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: item.color }} />
              <div>
                <div className="font-bold mb-0.5">{item.title}</div>
                <div style={{ color: "var(--bb-text-muted)" }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer
          className="pt-6 border-t text-center text-[11px]"
          style={{ borderColor: "var(--bb-border)", color: "var(--bb-text-dim)" }}
        >
          Built on{" "}
          <a
            href="https://internetcomputer.org"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors"
            style={{ color: "var(--bb-brand)" }}
          >
            Internet Computer Protocol
          </a>
        </footer>
      </div>
    </div>
  );
}
