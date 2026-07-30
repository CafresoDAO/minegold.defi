import { ArrowRight, ChevronRight, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "../components/ThemeToggle";
import { MineShaft } from "../components/MineShaft";
import { Reveal } from "../components/landing/Reveal";
import { ProofBand } from "../components/landing/ProofBand";
import { FAQ } from "../components/landing/FAQ";
import { JOURNEY } from "../lib/journey";
import { fetchCkBatStatus, type CkBatStatus } from "../lib/ckMinter";

/**
 * The public front door. Before I6, signing out left `/` as a login wall —
 * a stranger could not read a single claim without a passkey. Now the root
 * is adaptive: signed-out lands here, signed-in goes straight to the
 * refinery dashboard (App owns that switch).
 *
 * BRAND LAW (from the lion seal): house surfaces are royal blue + white +
 * serif display — a bank's face. The refinery below keeps the gold product
 * identity. The seal leads the hero and the circular motif echoes it,
 * without cosplaying as an actual bank document.
 *
 * Three paths are deliberately open from this page:
 *   skeptic     → the proof band, and /proof, in one click, no sign-in
 *   crypto-native → the sticky "Open the refinery" CTA after 400px
 *   BAT holder  → the live truth-gate chip → /brave waitlist
 */
type Props = {
  onOpenRefinery: () => void;
  onOpenBrave: () => void;
  onOpenProof: () => void;
};

export function LandingPage({
  onOpenRefinery,
  onOpenBrave,
  onOpenProof,
}: Props) {
  const [bat, setBat] = useState<CkBatStatus | null>(null);
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCkBatStatus().then((s) => {
      if (!cancelled) setBat(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The BAT claim is gated on a LIVE read of DFINITY's minter — never
  // "coming soon" theater. Same source as the in-app story strip.
  const batChip =
    bat === null
      ? "checking DFINITY's minter…"
      : bat.supported
        ? "BAT is live on the chain-key minter — the BAT refinery is opening"
        : bat.error
          ? "minter status check unavailable"
          : "not yet listed by DFINITY's minter — checked live just now";

  return (
    <div
      data-ocid="landing.page"
      className="min-h-screen"
      style={{ background: "var(--bb-bg)", color: "var(--bb-text)" }}
    >
      {/* Sticky CTA — appears once the hero is behind you (crypto-native
          path: someone who already knows what this is shouldn't have to
          scroll back up to start). */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pointer-events-none sm:px-6"
        style={{
          opacity: sticky ? 1 : 0,
          transform: sticky ? "none" : "translateY(12px)",
          transition: "opacity 300ms var(--ease-settle), transform 300ms var(--ease-settle)",
        }}
        aria-hidden={!sticky}
      >
        <button
          type="button"
          data-ocid="landing.sticky_cta"
          onClick={onOpenRefinery}
          tabIndex={sticky ? 0 : -1}
          className="pointer-events-auto mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-2xl"
          style={{ background: "var(--royal-700)", color: "#ffffff" }}
        >
          Open the refinery <ArrowRight size={15} />
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <header className="mb-16 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <span
              className="mb-6 block h-24 w-24 overflow-hidden rounded-full sm:h-28 sm:w-28"
              style={{ boxShadow: "0 0 30px rgba(2, 69, 140, 0.45)" }}
            >
              <img
                src="/brand/icon-512.png"
                alt="Banking.Brave"
                width={112}
                height={112}
                className="h-full w-full"
              />
            </span>
            <h1 className="t-display">Your browser is the mine.</h1>
            <p
              className="mt-3 max-w-xl text-[15px] leading-relaxed"
              style={{ color: "var(--bb-text-muted)" }}
            >
              Brave pays you <strong style={{ color: "#ff7a45" }}>BAT</strong>{" "}
              for the ads you already see. MineGold turns crypto you already
              hold into <strong style={{ color: "var(--gold-500)" }}>gold</strong>{" "}
              — sGLDT, a 1:1 wrapper of Gold DAO&apos;s GLDT, each backed by
              0.01&nbsp;g of vaulted physical metal. The whole refinery runs as
              a canister on the Internet Computer: no server, no company
              holding your funds.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-ocid="landing.hero_cta"
                onClick={onOpenRefinery}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl px-5 text-sm font-bold shadow-lg transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--royal-700)", color: "#ffffff" }}
              >
                Open the refinery <ArrowRight size={15} />
              </button>
              <button
                type="button"
                data-ocid="landing.hero_proof"
                onClick={onOpenProof}
                className="inline-flex min-h-[48px] items-center text-sm font-bold underline underline-offset-4"
                style={{ color: "var(--bb-brand)" }}
              >
                See the proof first ›
              </button>
            </div>

            {/* Truth-gated status chips */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
              <button
                type="button"
                data-ocid="landing.bat_status"
                onClick={onOpenBrave}
                className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-semibold"
                style={{
                  borderColor: "rgba(255,122,69,0.3)",
                  background: "rgba(255,122,69,0.1)",
                  color: "#ff9a6e",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: bat?.supported ? "var(--trust-verified)" : "var(--trust-unknown)",
                  }}
                />
                BAT refinery: {batChip}
              </button>
              <span
                className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-semibold"
                style={{
                  borderColor: "rgba(52,211,153,0.3)",
                  background: "rgba(52,211,153,0.1)",
                  color: "var(--trust-verified)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--trust-verified)" }}
                />
                UNI refinery: live on mainnet today
              </span>
            </div>
          </div>

          {/* Shaft cameo — decorative only. No numbers are shown, because
              nothing here is bound to a verified quantity; the shaft earns
              its numbers inside the flow, not on a marketing page. */}
          <div
            className="hidden overflow-hidden rounded-[2rem] border lg:block"
            style={{ borderColor: "var(--bb-border)", background: "#08080a" }}
            aria-hidden
          >
            <MineShaft
              confirmations={0}
              targetConfirmations={12}
              stage="surface"
              height={360}
              decorative
            />
          </div>
        </header>

        {/* ── Three beats ──────────────────────────────────────────────── */}
        <Reveal className="mb-16">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                accent: "#ff7a45",
                kicker: "You already earn it",
                body: "BAT from Brave, UNI in your wallet — value you hold today, sitting still.",
              },
              {
                accent: "var(--gold-500)",
                kicker: "It becomes gold",
                body: "One deposit refines it into sGLDT at the canister's own on-chain rate.",
              },
              {
                accent: "var(--royal-400)",
                kicker: "It stays yours",
                body: "The gold lands in your vault, opened only by your passkey. Cash out any time.",
              },
            ].map((b, i) => (
              <div
                key={b.kicker}
                className="relative rounded-3xl border p-5"
                style={{
                  borderColor: "var(--bb-border)",
                  background: "var(--bb-surface)",
                }}
              >
                <span
                  className="mb-2 block h-1 w-8 rounded-full"
                  style={{ background: b.accent }}
                />
                <p className="text-base font-black">{b.kicker}</p>
                <p
                  className="mt-1 text-[13px] leading-relaxed"
                  style={{ color: "var(--bb-text-muted)" }}
                >
                  {b.body}
                </p>
                {i < 2 && (
                  <ChevronRight
                    size={16}
                    aria-hidden
                    className="absolute -right-3 top-1/2 hidden -translate-y-1/2 sm:block"
                    style={{ color: "var(--bb-text-dim)" }}
                  />
                )}
              </div>
            ))}
          </div>
        </Reveal>

        {/* ── Proof band (skeptic path) ────────────────────────────────── */}
        <Reveal className="mb-16">
          <ProofBand onOpenProof={onOpenProof} />
        </Reveal>

        {/* ── How it works — the canonical journey, same four steps as the
               app itself (lib/journey is the one copy authority). ──────── */}
        <Reveal className="mb-16">
          <h2
            className="t-display mb-4"
            style={{ fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)" }}
          >
            Four steps, about three minutes
          </h2>
          <ol className="grid gap-3 sm:grid-cols-4">
            {JOURNEY.map((s) => (
              <li
                key={s.n}
                className="rounded-2xl border p-4"
                style={{
                  borderColor: "var(--bb-border)",
                  background: "var(--bb-surface)",
                }}
              >
                <span
                  className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: "var(--royal-700)", color: "#ffffff" }}
                >
                  {s.n}
                </span>
                <p className="text-sm font-bold">{s.title}</p>
                <p
                  className="mt-0.5 text-[12px] leading-relaxed"
                  style={{ color: "var(--bb-text-muted)" }}
                >
                  {s.sub}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[12px]" style={{ color: "var(--bb-text-dim)" }}>
            The wait in step 3 is Ethereum&apos;s, not ours — 12 blocks. You
            can close the tab; the payout happens on-chain either way.
          </p>
        </Reveal>

        {/* ── Protocol family ──────────────────────────────────────────── */}
        <Reveal className="mb-16">
          <p className="t-label mb-2" style={{ color: "var(--bb-text-dim)" }}>
            Protocols we govern
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <button
              type="button"
              data-ocid="landing.family.uni"
              onClick={onOpenRefinery}
              className="group text-left rounded-3xl border p-6 transition-transform hover:-translate-y-0.5 sm:col-span-2"
              style={{
                borderColor: "var(--bb-border)",
                background:
                  "linear-gradient(135deg, rgba(232,182,44,0.10), var(--bb-surface))",
                color: "var(--bb-text)",
              }}
            >
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-lg font-black">
                  Minegold<span style={{ color: "var(--bb-brand)" }}>.</span>Uni
                </h3>
                <span
                  className="t-label rounded-full border px-2 py-0.5"
                  style={{
                    borderColor: "rgba(52,211,153,0.3)",
                    background: "rgba(52,211,153,0.12)",
                    color: "var(--trust-verified)",
                  }}
                >
                  Live
                </span>
              </div>
              <div
                className="mb-2 font-mono text-[10px]"
                style={{ color: "var(--bb-text-dim)" }}
              >
                UNI (ERC-20) → ckUNI → sGLDT
              </div>
              <p
                className="text-[13px] leading-relaxed"
                style={{ color: "var(--bb-text-muted)" }}
              >
                The refinery running on mainnet today. Bridge UNI onto ICP
                through DFINITY&apos;s chain-key minter, then refine it into
                gold at the canister&apos;s own rate.
              </p>
              <span
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold"
                style={{ color: "var(--gold-500)" }}
              >
                Open the refinery
                <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </button>

            <button
              type="button"
              data-ocid="landing.family.brave"
              onClick={onOpenBrave}
              className="group text-left rounded-3xl border p-6 transition-transform hover:-translate-y-0.5"
              style={{
                borderColor: "var(--bb-border)",
                background:
                  "linear-gradient(135deg, rgba(255,122,69,0.10), var(--bb-surface))",
                color: "var(--bb-text)",
              }}
            >
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-lg font-black">
                  Minegold<span style={{ color: "var(--bb-brand)" }}>.</span>Brave
                </h3>
                <span
                  className="t-label inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
                  style={{
                    borderColor: "rgba(251,191,36,0.3)",
                    background: "rgba(251,191,36,0.12)",
                    color: "var(--trust-attested)",
                  }}
                >
                  <Clock size={9} /> Gated
                </span>
              </div>
              <div
                className="mb-2 font-mono text-[10px]"
                style={{ color: "var(--bb-text-dim)" }}
              >
                BAT (ERC-20) → ckBAT → sGLDT
              </div>
              <p
                className="text-[13px] leading-relaxed"
                style={{ color: "var(--bb-text-muted)" }}
              >
                Opens when DFINITY&apos;s minter lists BAT — checked live, not
                promised. Join the waitlist for one message at launch.
              </p>
              <span
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold"
                style={{ color: "#ff9a6e" }}
              >
                See the live status
                <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          </div>
        </Reveal>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <Reveal className="mb-16">
          <FAQ />
        </Reveal>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer
          className="border-t pt-6 pb-24 text-[11px] leading-relaxed"
          style={{ borderColor: "var(--bb-border)", color: "var(--bb-text-dim)" }}
        >
          <p className="mb-1">
            Refinery backend{" "}
            <span className="font-mono">c626g-iyaaa-aaaau-agpoa-cai</span> ·
            frontend{" "}
            <span className="font-mono">cqyto-tiaaa-aaaau-agppa-cai</span> ·
            built on{" "}
            <a
              href="https://internetcomputer.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
              style={{ color: "var(--bb-brand)" }}
            >
              Internet Computer Protocol
            </a>
          </p>
          <p>
            banking.cafreso.com is an interim home while banking.brave awaits
            ICANN. The canister URL above keeps working regardless — bookmark
            it if you prefer an address nobody can take away.
          </p>
        </footer>
      </div>
    </div>
  );
}
