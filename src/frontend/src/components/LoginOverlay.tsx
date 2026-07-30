import { GoldCTA } from "./ui/GoldCTA";
import { JOURNEY } from "../lib/journey";

type Props = {
  isLoggingIn: boolean;
  onLogin: () => void;
  /** Escape hatch back to the public landing page. Provided whenever the
   *  user reached this gate by choice (I6: `/` is a landing page now, not a
   *  wall) — a full-screen gate with no way out is a trap, and browser Back
   *  doesn't undo a state-only entry. */
  onBack?: () => void;
};

/** Full-screen sign-in gate shown while there is no authenticated II user. */
export function LoginOverlay({ isLoggingIn, onLogin, onBack }: Props) {
  return (
    <div
      data-ocid="login.modal"
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 text-center shadow-2xl">
        {/* Gold pickaxe icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-yellow-600 to-yellow-400 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/30">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 34 L30 8" stroke="#3B1F00" strokeWidth="5" strokeLinecap="square"/>
            <path d="M6 34 L30 8" stroke="#7B4513" strokeWidth="3" strokeLinecap="square"/>
            <rect x="24" y="4" width="14" height="6" rx="1" fill="#FFFFF0"/>
            <rect x="24" y="4" width="14" height="2" rx="1" fill="white"/>
            <path d="M36 2 L40 6 L36 10 L32 6 Z" fill="#F0F0F0"/>
            <path d="M24 10 L20 14 L24 14 Z" fill="#D8D8D8"/>
            <circle cx="8" cy="32" r="3" fill="#FFD700" opacity="0.9"/>
            <circle cx="13" cy="30" r="2" fill="#FFD700" opacity="0.6"/>
          </svg>
        </div>
        <h1 className="t-display text-white mb-1" style={{ fontSize: "clamp(2rem, 1.6rem + 2vw, 2.75rem)" }}>
          minegold<span className="text-yellow-400">.defi</span>
        </h1>
        <p className="text-xs text-yellow-500/60 font-mono uppercase tracking-widest mb-3">Cross-Chain Gold Refinery</p>
        <p className="t-headline text-white mb-2">Where your gold will live</p>
        <p className="t-body text-zinc-400 mb-6 px-4">
          Turn UNI into sGLDT — a 1:1 wrapper of Gold DAO&apos;s physically
          backed GLDT. Your vault opens with Face&nbsp;ID or a fingerprint:
          about 20 seconds to create, no seed phrase to lose, and only you
          can open it.
        </p>
        {/* The canonical journey — same 4 steps everywhere (lib/journey) */}
        <div className="grid grid-cols-4 gap-1.5 mb-6 text-left">
          {JOURNEY.map((step) => (
            <div key={step.n} className="bg-zinc-800/60 border border-zinc-700/50 rounded-2xl p-2.5">
              <div className="t-label text-yellow-500/70 mb-0.5">{step.n}</div>
              <div className="text-xs font-bold text-white">{step.title}</div>
              <div className="text-[10px] text-zinc-500 mt-0.5 leading-snug">{step.sub}</div>
            </div>
          ))}
        </div>
        <GoldCTA
          data-ocid="login.primary_button"
          onClick={onLogin}
          loading={isLoggingIn}
          size="lg"
          leadingIcon={
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-label="ICP"
            >
              <circle cx="12" cy="12" r="12" fill="url(#icpGrad)" />
              <defs>
                <radialGradient id="icpGrad" cx="30%" cy="30%" r="80%">
                  <stop offset="0%" stopColor="#f15a24" />
                  <stop offset="50%" stopColor="#9b2bff" />
                  <stop offset="100%" stopColor="#29abe2" />
                </radialGradient>
              </defs>
              <text
                x="12"
                y="16"
                textAnchor="middle"
                fontSize="9"
                fontWeight="bold"
                fill="white"
                fontFamily="monospace"
              >
                ICP
              </text>
            </svg>
          }
          trailingIcon={null}
        >
          {isLoggingIn ? "Opening your vault…" : "Create or open your vault"}
        </GoldCTA>
        <p className="mt-3 text-[11px] text-zinc-500">
          Your vault is an <span className="text-zinc-300 font-semibold">Internet
          Identity</span> passkey — the sign-in screen that opens next is it.
        </p>
        {onBack && (
          <button
            type="button"
            data-ocid="login.back"
            onClick={onBack}
            className="mt-3 inline-flex min-h-[36px] items-center text-[11px] text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
          >
            Not yet — take me back
          </button>
        )}
      </div>
    </div>
  );
}
