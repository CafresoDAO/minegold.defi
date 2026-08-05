import { ChevronRight, Clock, Lock, ShieldCheck, TrendingUp } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";
import { MinegoldMark } from "../components/ui/MinegoldMark";

interface BankingBraveHomeProps {
  onOpenMinegoldUni: () => void;
  onOpenMinegoldBrave: () => void;
}

/**
 * Banking.Brave — the institution's own surface, powered by CafresoDAO.
 *
 * This page is Banking.Brave's brand and nothing else's. minegold.defi is a
 * SEPARATE product that belongs to the ecosystem; it wears its own identity
 * on its own front door (pages/LandingPage) and is presented here the way an
 * institution presents an application it backs — named, linked, and not
 * absorbed.
 *
 *   Banking.Brave      the institution (this page) · powered by CafresoDAO
 *     └── minegold.defi   an ERC-20 → ICP gold refinery (its own product)
 *           minegold.uni  the live intake, and how the app is proven today
 *           BAT intake    gated on DFINITY listing ckBAT
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
          <span
            className="w-32 h-32 sm:w-40 sm:h-40 mb-6 rounded-full overflow-hidden block"
            style={{ boxShadow: "0 0 30px rgba(2, 69, 140, 0.45)" }}
          >
            <img
              src="/brand/icon-512.png"
              alt="Banking.Brave"
              width={160}
              height={160}
              className="w-full h-full"
            />
          </span>
          <h1 className="t-display mb-3">
            Banking<span style={{ color: "var(--bb-brand)" }}>.</span>Brave
          </h1>
          <p className="text-sm sm:text-base max-w-xl" style={{ color: "var(--bb-text-muted)" }}>
            On-chain financial primitives on the Internet Computer — open,
            auditable, and self-custodial by construction.
          </p>
          <p
            className="mt-2 t-label"
            style={{ color: "var(--bb-text-dim)" }}
          >
            Powered by CafresoDAO
          </p>
        </header>

        {/* Applications in the ecosystem — minegold.defi is its own product,
            named and linked, not folded into this page's brand. */}
        <section className="mb-12">
          <div className="flex items-end justify-between flex-wrap gap-2 mb-5">
            <div>
              <div
                className="t-label mb-1"
                style={{ color: "var(--bb-text-dim)" }}
              >
                Applications in the ecosystem
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                minegold<span style={{ color: "var(--bb-brand)" }}>.</span>defi
              </h2>
              <p className="text-xs mt-1 max-w-lg" style={{ color: "var(--bb-text-muted)" }}>
                A cross-chain refinery: it bridges an ERC-20 asset onto ICP and
                refines it into sGLDT — a 1:1 wrapper of Gold DAO&apos;s
                physically backed GLDT (gldt.org). It runs as its own product,
                with its own front door.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* minegold.defi via its live UNI intake */}
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
                  <MinegoldMark size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-black">
                      minegold<span style={{ color: "var(--bb-brand)" }}>.</span>defi
                    </h3>
                    <span className="t-label bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">
                      Live
                    </span>
                  </div>
                  <div className="text-[10px] font-mono mb-2" style={{ color: "var(--bb-text-dim)" }}>
                    UNI (ERC-20) → ckUNI → sGLDT
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--bb-text-muted)" }}>
                    The UNI intake — minegold.uni — is live on mainnet: bridge UNI
                    into ckUNI via the chain-key minter, then refine into sGLDT at
                    the canister&apos;s own rate. This is the path the application
                    is proven on today.
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-yellow-500 group-hover:text-yellow-400 transition-colors">
                    Open minegold.defi
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </button>

            {/* BAT intake — gated on DFINITY, checked live */}
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
                    <h3 className="text-lg font-black">BAT intake</h3>
                    <span className="inline-flex items-center gap-1 t-label bg-amber-500/15 text-amber-500 border border-amber-500/30 rounded-full px-2 py-0.5">
                      <Clock size={9} /> Soon
                    </span>
                  </div>
                  <div className="text-[10px] font-mono mb-2" style={{ color: "var(--bb-text-dim)" }}>
                    BAT (ERC-20) → ckBAT → sGLDT
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--bb-text-muted)" }}>
                    The same refinery, fed by the Brave browser&apos;s BAT. Opens
                    only once DFINITY&apos;s chain-key minter lists ckBAT — a
                    condition we don&apos;t control, checked live.
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-orange-500 group-hover:text-orange-400 transition-colors">
                    Live status
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
          Banking.Brave is powered by{" "}
          <span style={{ color: "var(--bb-text-muted)" }}>CafresoDAO</span> ·
          built on{" "}
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
