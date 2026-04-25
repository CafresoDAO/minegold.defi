import { ArrowLeft, ChevronRight, Clock, ShieldCheck, Zap } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";

interface MinegoldBraveSoonProps {
  onBack: () => void;
  onOpenUni: () => void;
}

/**
 * Minegold.Brave — coming-soon landing.
 *
 * Minegold.Brave will onboard BAT (Basic Attention Token, the Brave browser's
 * native ERC-20) onto ICP as ckBAT using the same DFINITY ckERC-20 bridge
 * infrastructure minegold.defi already uses for UNI.
 *
 * Wired into BankingBraveHome as the second card under the "Minegold.Defi"
 * protocol family. Kept deliberately lightweight — no data-fetching, no
 * auth — so it renders instantly and doesn't burn cycles.
 */
export function MinegoldBraveSoon({ onBack, onOpenUni }: MinegoldBraveSoonProps) {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bb-bg)", color: "var(--bb-text)" }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Top bar: back + theme toggle */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest transition-colors"
            style={{ color: "var(--bb-text-muted)" }}
          >
            <ArrowLeft size={14} />
            Banking.Brave
          </button>
          <ThemeToggle />
        </div>

        {/* Breadcrumb header */}
        <div className="text-[10px] font-black uppercase tracking-widest mb-2"
             style={{ color: "var(--bb-text-dim)" }}>
          Banking.Brave · Minegold.Defi
        </div>

        <header className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 3L3 8l9 5 9-5-9-5z" fill="#FFFFFF" />
                <path d="M3 8v8l9 5 9-5V8" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                Minegold<span style={{ color: "var(--bb-brand)" }}>.</span>Brave
              </h1>
              <div className="inline-flex items-center gap-1.5 mt-1">
                <span
                  className="text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 border"
                  style={{
                    background: "rgba(234, 179, 8, 0.12)",
                    color: "#ca8a04",
                    borderColor: "rgba(234, 179, 8, 0.35)",
                  }}
                >
                  Coming Soon
                </span>
                <Clock size={11} style={{ color: "var(--bb-text-dim)" }} />
              </div>
            </div>
          </div>
          <p className="text-sm sm:text-base max-w-2xl mt-3" style={{ color: "var(--bb-text-muted)" }}>
            Onboard <strong>BAT (Basic Attention Token)</strong> to the Internet
            Computer as <strong>ckBAT</strong>, using DFINITY's chain-key ERC-20
            bridge. Once live, Brave Wallet users will be able to refine BAT
            into sGLDT inside this dApp — the same flow as Minegold.Uni, just a
            different source asset.
          </p>
        </header>

        {/* Three-step workflow preview */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--bb-brand)" }}>
              Planned Workflow
            </span>
            <span className="flex-1 border-t" style={{ borderColor: "var(--bb-border)" }} />
          </div>

          <ol className="grid sm:grid-cols-3 gap-4">
            {[
              {
                n: "01",
                title: "Bridge BAT → ckBAT",
                body: "User signs a deposit() call on the ckERC-20 helper contract on Ethereum. DFINITY's ckBAT minter credits the treasury.",
              },
              {
                n: "02",
                title: "Verify on ICP",
                body: "Backend canister reads the Ethereum tx directly via HTTPS outcalls and cryptographically verifies amount + recipient.",
              },
              {
                n: "03",
                title: "Release sGLDT",
                body: "Locked-rate sGLDT is transferred from treasury to the depositor's ICP account via ICRC-1.",
              },
            ].map((step) => (
              <li
                key={step.n}
                className="rounded-2xl border p-5"
                style={{ background: "var(--bb-surface)", borderColor: "var(--bb-border)" }}
              >
                <div className="text-[10px] font-black tracking-widest mb-2" style={{ color: "var(--bb-brand)" }}>
                  STEP {step.n}
                </div>
                <div className="font-bold text-sm mb-1">{step.title}</div>
                <div className="text-xs leading-relaxed" style={{ color: "var(--bb-text-muted)" }}>
                  {step.body}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* What's blocking */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--bb-brand)" }}>
              What we're waiting on
            </span>
            <span className="flex-1 border-t" style={{ borderColor: "var(--bb-border)" }} />
          </div>

          <div
            className="rounded-2xl border p-5 text-sm"
            style={{ background: "var(--bb-surface)", borderColor: "var(--bb-border)", color: "var(--bb-text-muted)" }}
          >
            <p className="leading-relaxed">
              DFINITY's ckERC-20 minter needs a BAT listing before we can go live.
              The bridge infrastructure, helper contract, and calldata format are
              already the same — the work on our side is primarily adding BAT's
              contract address to the allowlist once the minter supports it.
            </p>
          </div>
        </section>

        {/* Why under Banking.Brave */}
        <section className="mb-16 grid sm:grid-cols-3 gap-4 text-xs">
          {[
            { icon: ShieldCheck, color: "var(--bb-brand)", title: "Brave-native", desc: "BAT is the Brave browser's native token. Pairs naturally with Brave Wallet UX." },
            { icon: Zap, color: "#10b981", title: "Same bridge", desc: "Reuses the chain-key ckERC-20 path — no new on-chain contracts to audit." },
            { icon: Clock, color: "#eab308", title: "Gated by ckBAT", desc: "Live on day one of DFINITY's ckBAT rollout. We are actively tracking it." },
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

        {/* Footer CTA back to Uni */}
        <div
          className="rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{
            background: "linear-gradient(135deg, rgba(234, 179, 8, 0.06), var(--bb-surface))",
            borderColor: "var(--bb-border)",
          }}
        >
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--bb-brand)" }}>
              In the meantime
            </div>
            <p className="text-sm" style={{ color: "var(--bb-text)" }}>
              The live <strong>Minegold.Uni</strong> workflow refines UNI into sGLDT today.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenUni}
            className="inline-flex items-center gap-1.5 text-sm font-bold rounded-xl px-4 py-2 transition-all"
            style={{ background: "var(--bb-brand)", color: "#ffffff" }}
          >
            Open Minegold.Uni
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
