import { ArrowRight, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { IncidentBanner } from "../components/IncidentBanner";
import { ThemeToggle } from "../components/ThemeToggle";
import { Reveal } from "../components/landing/Reveal";
import { ProofBand } from "../components/landing/ProofBand";
import { FAQ } from "../components/landing/FAQ";
import { JOURNEY } from "../lib/journey";
import { fetchCkBatStatus, type CkBatStatus } from "../lib/ckMinter";

/**
 * minegold.defi's public front door. Before I6, signing out left `/` as a
 * login wall — a stranger could not read a single claim without a passkey.
 * The root is now adaptive: signed-out lands here, signed-in goes to the
 * refinery dashboard (App owns that switch).
 *
 * BRAND BOUNDARY — two distinct products, one ecosystem:
 *
 *   Banking.Brave   the institution, powered by CafresoDAO. Its own product
 *                   and its own surface (/portfolio). NOT this page's brand.
 *   minegold.defi   THIS application: an ERC-20 → ICP refinery producing
 *                   gold-backed sGLDT. minegold.brave is the domain we own
 *                   and where this app will eventually live.
 *   minegold.uni    the configuration that works today — the UNI path, and
 *                   how the application is being tested on mainnet.
 *
 * So this page wears minegold's identity, not the lion seal; Banking.Brave
 * appears as ecosystem attribution in the footer, where an owner belongs.
 *
 * Three paths stay open: skeptic (proof, no sign-in), operator-minded
 * (sticky CTA), and BAT holder (the live ckBAT gate).
 */
type Props = {
  onOpenRefinery: () => void;
  onOpenBrave: () => void;
  onOpenProof: () => void;
  /** Follow an in-app path ("/docs", "/docs/risks") through the router. */
  onNavigatePath: (path: string) => void;
};

export function LandingPage({
  onOpenRefinery,
  onOpenBrave,
  onOpenProof,
  onNavigatePath,
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
        ? "BAT is listed on the chain-key minter — BAT intake can open"
        : bat.error
          ? "minter status check unavailable"
          : "BAT not yet listed by DFINITY's minter — checked live just now";

  return (
    <div
      data-ocid="landing.page"
      className="min-h-screen"
      style={{ background: "var(--bb-bg)", color: "var(--bb-text)" }}
    >
      {/* An open incident belongs above the pitch, not below it. */}
      <IncidentBanner onNavigatePath={onNavigatePath} />
      {/* Sticky CTA — appears once the hero is behind you. */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 px-4 pb-4 pointer-events-none sm:px-6"
        style={{
          opacity: sticky ? 1 : 0,
          transform: sticky ? "none" : "translateY(12px)",
          transition:
            "opacity 300ms var(--ease-settle), transform 300ms var(--ease-settle)",
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
        <div className="flex items-center justify-between mb-10">
          <span className="text-lg font-black tracking-tight">
            minegold<span style={{ color: "var(--gold-500)" }}>.defi</span>
          </span>
          <ThemeToggle />
        </div>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <header className="mb-16 max-w-3xl">
          <p
            className="t-label mb-3"
            style={{ color: "var(--bb-text-dim)" }}
          >
            An ERC-20 refinery on the Internet Computer
          </p>
          <h1 className="t-display">Tokens in. Gold out.</h1>
          <p
            className="mt-4 max-w-2xl text-[15px] leading-relaxed"
            style={{ color: "var(--bb-text-muted)" }}
          >
            minegold.defi bridges an ERC-20 token from Ethereum onto ICP and
            refines it into{" "}
            <strong style={{ color: "var(--gold-500)" }}>sGLDT</strong> — a 1:1
            wrapper of Gold DAO&apos;s GLDT, each token backed by 0.01&nbsp;g of
            LBMA-sourced physical gold held in audited Swiss vaults. The entire
            refinery is a canister: no server, no company holding your funds,
            and an exit path that works the same day you arrive.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
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
              Read the proof first ›
            </button>
          </div>

          {/* Status, truth-gated. */}
          <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px]">
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
              UNI intake live on mainnet
            </span>
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
                  background: bat?.supported
                    ? "var(--trust-verified)"
                    : "var(--trust-unknown)",
                }}
              />
              {batChip}
            </button>
          </div>
        </header>

        {/* ── Three beats ──────────────────────────────────────────────── */}
        <Reveal className="mb-16">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                accent: "var(--royal-400)",
                kicker: "Bridge",
                body: "DFINITY's chain-key minter moves your ERC-20 onto ICP and credits it to your own account — not to ours.",
              },
              {
                accent: "var(--gold-500)",
                kicker: "Refine",
                body: "One atomic swap converts it to sGLDT at the canister's own on-chain rate. A failed swap refunds you automatically.",
              },
              {
                accent: "var(--trust-verified)",
                kicker: "Hold or exit",
                body: "The gold sits in a vault only your passkey opens. Redeem back to ckUNI whenever you want.",
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
            The wait in step 3 is Ethereum&apos;s, not ours — 12 blocks. You can
            close the tab; the payout happens on-chain either way.
          </p>
        </Reveal>

        {/* ── Where the application stands ─────────────────────────────── */}
        <Reveal className="mb-16">
          <h2
            className="t-display mb-4"
            style={{ fontSize: "clamp(1.5rem, 1.2rem + 1.4vw, 2rem)" }}
          >
            Where this stands today
          </h2>
          <div
            className="rounded-3xl border p-6"
            style={{
              borderColor: "var(--bb-border)",
              background: "var(--bb-surface)",
            }}
          >
            <dl className="grid gap-5 sm:grid-cols-3">
              <div>
                <dt className="t-label mb-1" style={{ color: "var(--bb-text-dim)" }}>
                  Live intake
                </dt>
                <dd className="text-sm font-bold">minegold.uni</dd>
                <dd
                  className="mt-1 text-[12px] leading-relaxed"
                  style={{ color: "var(--bb-text-muted)" }}
                >
                  UNI → ckUNI → sGLDT. The path that works on mainnet today,
                  and the one the application is being proven on.
                </dd>
              </div>
              <div>
                <dt className="t-label mb-1" style={{ color: "var(--bb-text-dim)" }}>
                  Next intake
                </dt>
                <dd className="text-sm font-bold">BAT</dd>
                <dd
                  className="mt-1 text-[12px] leading-relaxed"
                  style={{ color: "var(--bb-text-muted)" }}
                >
                  Opens if and when DFINITY&apos;s chain-key minter lists BAT.
                  The status chip above reads that list live, on every visit —
                  it is not a promise we control.{" "}
                  <button
                    type="button"
                    onClick={onOpenBrave}
                    className="underline underline-offset-2"
                    style={{ color: "var(--bb-brand)" }}
                  >
                    Live status ›
                  </button>
                </dd>
              </div>
              <div>
                <dt className="t-label mb-1" style={{ color: "var(--bb-text-dim)" }}>
                  Home
                </dt>
                <dd className="text-sm font-bold">minegold.brave</dd>
                <dd
                  className="mt-1 text-[12px] leading-relaxed"
                  style={{ color: "var(--bb-text-muted)" }}
                >
                  The domain this application will move to. Until then it runs
                  at its canister address — which keeps working afterwards
                  regardless.
                </dd>
              </div>
            </dl>
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
          {/* Docs sit in the footer as a plain list, including the risks
              page by name. Burying "risks" behind a friendlier label would
              undercut the reason for writing it. */}
          <nav className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
            {[
              ["How it works", "/docs/how-it-works"],
              ["Risks & limitations", "/docs/risks"],
              ["How the rate is made", "/docs/rate-methodology"],
              ["Redeem & recovery", "/docs/redeem-and-recovery"],
              ["Status & incidents", "/status"],
            ].map(([label, path]) => (
              <button
                key={path}
                type="button"
                data-ocid={`landing.footer${path.replace(/\//g, ".")}`}
                onClick={() => onNavigatePath(path)}
                className="min-h-[32px] font-semibold underline underline-offset-2"
                style={{ color: "var(--bb-brand)" }}
              >
                {label}
              </button>
            ))}
          </nav>
          <p className="mb-2">
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
          {/* Ecosystem attribution — Banking.Brave is a separate product that
              this one belongs to, not this page's brand. */}
          <p className="flex flex-wrap items-center gap-1.5">
            <img
              src="/brand/icon-512.png"
              alt=""
              width={16}
              height={16}
              className="rounded-full"
            />
            minegold.defi is part of the Banking.Brave ecosystem, powered by
            CafresoDAO.
          </p>
        </footer>
      </div>
    </div>
  );
}
