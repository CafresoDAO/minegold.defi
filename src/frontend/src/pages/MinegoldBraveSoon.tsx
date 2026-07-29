import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  CircleDashed,
  Clock,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "../components/ThemeToggle";
import {
  BAT_ERC20_ADDRESS,
  CK_MINTER_CANISTER_ID,
  fetchCkBatStatus,
  type CkBatStatus,
} from "../lib/ckMinter";

interface MinegoldBraveSoonProps {
  onBack: () => void;
  onOpenUni: () => void;
}

const NOTIFY_EMAIL = "hello@cafreso.com";

/**
 * Minegold.Brave — status page.
 *
 * Minegold.Brave onboards BAT (Basic Attention Token, the Brave browser's
 * native ERC-20) onto ICP as ckBAT, reusing the ckERC-20 bridge that
 * Minegold.Uni already runs on.
 *
 * The launch is gated on exactly one external fact: whether DFINITY's minter
 * has listed BAT. So this page doesn't hard-code "coming soon" — it queries the
 * minter live on load (anonymous query, no backend, no auth) and flips itself
 * to a launch state the moment ckBAT appears in the allowlist.
 */
export function MinegoldBraveSoon({ onBack, onOpenUni }: MinegoldBraveSoonProps) {
  const [status, setStatus] = useState<CkBatStatus | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const s = await fetchCkBatStatus();
      if (cancelled) return;
      setStatus(s);
      setCheckedAt(new Date());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = status === null;
  const live = status?.supported === true;
  const tokenCount = status?.allTokens.length ?? 0;

  const notifyHref =
    `mailto:${NOTIFY_EMAIL}` +
    `?subject=${encodeURIComponent("Notify me when Minegold.Brave goes live")}` +
    `&body=${encodeURIComponent(
      "Add me to the Minegold.Brave waitlist — I'd like an email when BAT → ckBAT → sGLDT opens.",
    )}`;

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

        {/* Breadcrumb */}
        <div
          className="text-[10px] font-black uppercase tracking-widest mb-2"
          style={{ color: "var(--bb-text-dim)" }}
        >
          Banking.Brave · Minegold.Defi
        </div>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <header className="mb-10">
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
                {loading ? (
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 border"
                    style={{
                      background: "var(--bb-surface)",
                      color: "var(--bb-text-muted)",
                      borderColor: "var(--bb-border)",
                    }}
                  >
                    <Loader2 size={10} className="animate-spin" />
                    Checking bridge…
                  </span>
                ) : live ? (
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 border"
                    style={{
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "#059669",
                      borderColor: "rgba(16, 185, 129, 0.35)",
                    }}
                  >
                    <Sparkles size={10} />
                    ckBAT is live
                  </span>
                ) : (
                  <span
                    className="text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 border"
                    style={{
                      background: "rgba(234, 179, 8, 0.12)",
                      color: "#ca8a04",
                      borderColor: "rgba(234, 179, 8, 0.35)",
                    }}
                  >
                    Awaiting ckBAT
                  </span>
                )}
                <Clock size={11} style={{ color: "var(--bb-text-dim)" }} />
              </div>
            </div>
          </div>
          <p
            className="text-sm sm:text-base max-w-2xl mt-3"
            style={{ color: "var(--bb-text-muted)" }}
          >
            Onboard <strong>BAT (Basic Attention Token)</strong> to the Internet
            Computer as <strong>ckBAT</strong>, then refine it into sGLDT — the
            same proven workflow as Minegold.Uni, with a different source asset.
          </p>
        </header>

        {/* ── Live bridge status ───────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span
              className="text-[11px] font-black uppercase tracking-widest"
              style={{ color: "var(--bb-brand)" }}
            >
              Bridge status · checked live
            </span>
            <span className="flex-1 border-t" style={{ borderColor: "var(--bb-border)" }} />
          </div>

          <div
            className="rounded-2xl border p-5 sm:p-6"
            style={{
              background: live
                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.08), var(--bb-surface))"
                : "var(--bb-surface)",
              borderColor: live ? "rgba(16, 185, 129, 0.35)" : "var(--bb-border)",
            }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {loading ? (
                  <Loader2 size={18} className="animate-spin" style={{ color: "var(--bb-text-dim)" }} />
                ) : live ? (
                  <Sparkles size={18} style={{ color: "#059669" }} />
                ) : (
                  <CircleDashed size={18} style={{ color: "#ca8a04" }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {loading && (
                  <p className="text-sm" style={{ color: "var(--bb-text-muted)" }}>
                    Asking DFINITY's ckERC-20 minter which assets it bridges…
                  </p>
                )}

                {!loading && status?.error && (
                  <>
                    <div className="font-bold text-sm mb-1">Status check unavailable</div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--bb-text-muted)" }}>
                      We couldn't reach the minter just now, so this page can't
                      confirm ckBAT's status. Minegold.Brave opens as soon as BAT
                      is listed — please check back shortly.
                    </p>
                  </>
                )}

                {!loading && !status?.error && live && (
                  <>
                    <div className="font-bold text-sm mb-1">
                      BAT is now bridgeable — Minegold.Brave can open.
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--bb-text-muted)" }}>
                      The minter lists <strong>{status?.token?.symbol}</strong> with
                      ledger{" "}
                      <code className="font-mono">{status?.token?.ledgerCanisterId}</code>.
                      The refinery flow is being switched on — check back within a day.
                    </p>
                  </>
                )}

                {!loading && !status?.error && !live && (
                  <>
                    <div className="font-bold text-sm mb-1">
                      BAT is not yet listed on the ckERC-20 bridge.
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--bb-text-muted)" }}>
                      Adding a token is an NNS governance decision, not something
                      we control. This page re-checks the minter every time it
                      loads and will switch itself on the day BAT appears —
                      nothing here is hand-updated.
                    </p>
                  </>
                )}

                {/* Evidence: what the bridge supports right now */}
                {!loading && !status?.error && tokenCount > 0 && (
                  <div className="mt-4">
                    <div
                      className="text-[10px] font-black uppercase tracking-widest mb-2"
                      style={{ color: "var(--bb-text-dim)" }}
                    >
                      Bridged today · {tokenCount} assets
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {status?.allTokens.map((t) => (
                        <span
                          key={t.ledgerCanisterId || t.symbol}
                          className="text-[10px] font-bold rounded-lg px-2 py-1 border"
                          style={{
                            borderColor: "var(--bb-border)",
                            color:
                              t.symbol.toLowerCase() === "ckuni"
                                ? "var(--bb-brand)"
                                : "var(--bb-text-muted)",
                            background: "var(--bb-bg)",
                          }}
                        >
                          {t.symbol}
                        </span>
                      ))}
                      <span
                        className="text-[10px] font-bold rounded-lg px-2 py-1 border border-dashed"
                        style={{ borderColor: "rgba(234, 179, 8, 0.5)", color: "#ca8a04" }}
                      >
                        ckBAT — pending
                      </span>
                    </div>
                  </div>
                )}

                {checkedAt && (
                  <div
                    className="mt-4 text-[10px] font-mono"
                    style={{ color: "var(--bb-text-dim)" }}
                  >
                    minter {CK_MINTER_CANISTER_ID} · checked{" "}
                    {checkedAt.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Waitlist ─────────────────────────────────────────────────── */}
        {!live && (
          <section className="mb-12">
            <div
              className="rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
              style={{
                background: "linear-gradient(135deg, rgba(249, 115, 22, 0.06), var(--bb-surface))",
                borderColor: "var(--bb-border)",
              }}
            >
              <div className="min-w-0">
                <div
                  className="text-[10px] font-black uppercase tracking-widest mb-1"
                  style={{ color: "var(--bb-brand)" }}
                >
                  Get notified
                </div>
                <p className="text-sm" style={{ color: "var(--bb-text)" }}>
                  Want an email the day BAT refining opens?
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--bb-text-muted)" }}>
                  One message, at launch. No newsletter.
                </p>
              </div>
              <a
                href={notifyHref}
                className="inline-flex items-center gap-1.5 text-sm font-bold rounded-xl px-4 py-2 transition-all shrink-0"
                style={{ background: "var(--bb-brand)", color: "#ffffff" }}
              >
                Notify me
                <ArrowUpRight size={14} />
              </a>
            </div>
          </section>
        )}

        {/* ── Planned workflow ─────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span
              className="text-[11px] font-black uppercase tracking-widest"
              style={{ color: "var(--bb-brand)" }}
            >
              {live ? "How it works" : "Planned workflow"}
            </span>
            <span className="flex-1 border-t" style={{ borderColor: "var(--bb-border)" }} />
          </div>

          <ol className="grid sm:grid-cols-3 gap-4">
            {[
              {
                n: "01",
                title: "Bridge BAT → ckBAT",
                body: "You sign a deposit() call on the ckERC-20 helper contract on Ethereum. DFINITY's minter credits the treasury on ICP.",
              },
              {
                n: "02",
                title: "Verify on ICP",
                body: "The backend canister reads the Ethereum transaction via HTTPS outcalls and cryptographically verifies amount and recipient.",
              },
              {
                n: "03",
                title: "Release sGLDT",
                body: "Locked-rate sGLDT transfers from treasury to your ICP account over ICRC-1 — no custodian in the middle.",
              },
            ].map((step) => (
              <li
                key={step.n}
                className="rounded-2xl border p-5"
                style={{ background: "var(--bb-surface)", borderColor: "var(--bb-border)" }}
              >
                <div
                  className="text-[10px] font-black tracking-widest mb-2"
                  style={{ color: "var(--bb-brand)" }}
                >
                  STEP {step.n}
                </div>
                <div className="font-bold text-sm mb-1">{step.title}</div>
                <div className="text-xs leading-relaxed" style={{ color: "var(--bb-text-muted)" }}>
                  {step.body}
                </div>
              </li>
            ))}
          </ol>

          <p className="text-[11px] mt-3" style={{ color: "var(--bb-text-dim)" }}>
            BAT contract <code className="font-mono">{BAT_ERC20_ADDRESS}</code>
          </p>
        </section>

        {/* ── Why it fits ──────────────────────────────────────────────── */}
        <section className="mb-16 grid sm:grid-cols-3 gap-4 text-xs">
          {[
            {
              icon: ShieldCheck,
              color: "var(--bb-brand)",
              title: "Brave-native",
              desc: "BAT is the Brave browser's own token — a natural pairing with Brave Wallet.",
            },
            {
              icon: Zap,
              color: "#10b981",
              title: "Same bridge",
              desc: "Reuses the chain-key ckERC-20 path already running for UNI. No new contracts to audit.",
            },
            {
              icon: Clock,
              color: "#eab308",
              title: "Self-updating",
              desc: "This page reads the minter directly, so it goes live the day ckBAT does.",
            },
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

        {/* ── Footer CTA back to Uni ───────────────────────────────────── */}
        <div
          className="rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{
            background: "linear-gradient(135deg, rgba(234, 179, 8, 0.06), var(--bb-surface))",
            borderColor: "var(--bb-border)",
          }}
        >
          <div>
            <div
              className="text-[10px] font-black uppercase tracking-widest mb-1"
              style={{ color: "var(--bb-brand)" }}
            >
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
