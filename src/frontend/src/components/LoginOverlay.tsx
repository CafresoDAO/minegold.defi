import { GoldCTA } from "./ui/GoldCTA";
import { JOURNEY } from "../lib/journey";

type Props = {
  isLoggingIn: boolean;
  onLogin: () => void;
  /** OISY wallet sign-in (ICRC-34 delegation) — approved once in the
   *  wallet, then the session behaves exactly like an II session. */
  onLoginOisy: () => void;
  /** Escape hatch back to the public landing page. Provided whenever the
   *  user reached this gate by choice (I6: `/` is a landing page now, not a
   *  wall) — a full-screen gate with no way out is a trap, and browser Back
   *  doesn't undo a state-only entry. */
  onBack?: () => void;
};

/** Full-screen sign-in gate shown while there is no authenticated user. */
export function LoginOverlay({ isLoggingIn, onLogin, onLoginOisy, onBack }: Props) {
  return (
    <div
      data-ocid="login.modal"
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 text-center shadow-2xl">
        {/* Brand mark: stacked gold ingots — geometric, no illustration. */}
        <div className="w-20 h-20 bg-gradient-to-br from-yellow-600 to-yellow-400 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/30">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            {/* bottom pair */}
            <path d="M4.5 30.5 L7.5 23 H17 L20 30.5 Z" fill="#3B2400" />
            <path d="M20.5 30.5 L23.5 23 H33 L36 30.5 Z" fill="#4A2E00" />
            {/* top ingot */}
            <path d="M12.5 20 L15.5 12.5 H25 L28 20 Z" fill="#5C3A00" />
            {/* shine on the top ingot */}
            <path d="M16.5 14.5 H23.5" stroke="rgba(255,255,255,0.55)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="t-display text-white mb-1" style={{ fontSize: "clamp(2rem, 1.6rem + 2vw, 2.75rem)" }}>
          minegold<span className="text-yellow-400">.defi</span>
        </h1>
        <p className="text-xs text-yellow-500/60 font-mono uppercase tracking-widest mb-3">Cross-Chain Gold Refinery</p>
        <p className="t-headline text-white mb-2">Where your gold will live</p>
        <p className="t-body text-zinc-400 mb-6 px-4">
          Face&nbsp;ID or a fingerprint. No seed phrase. Only you can open it.
        </p>
        {/* The canonical journey — same 4 steps everywhere (lib/journey).
            Titles only here: the gate should be glanceable, the detail
            lives on the landing page and in the app. */}
        <div className="grid grid-cols-4 gap-1.5 mb-6">
          {JOURNEY.map((step) => (
            <div key={step.n} className="bg-zinc-800/60 border border-zinc-700/50 rounded-2xl px-2 py-3 text-center">
              <div className="t-label text-yellow-500/70 mb-0.5">{step.n}</div>
              <div className="text-xs font-bold text-white">{step.title}</div>
            </div>
          ))}
        </div>
        <GoldCTA
          data-ocid="login.primary_button"
          onClick={onLogin}
          loading={isLoggingIn}
          size="lg"
          leadingIcon={
            // The OFFICIAL Internet Computer infinity mark — the exact
            // vector DFINITY publishes (two gradient arcs + the blue
            // crossing ribbon), not a redrawn approximation.
            <svg
              width="26"
              height="13"
              viewBox="0 0 358.8 179.8"
              fill="none"
              aria-label="Internet Computer"
            >
              <defs>
                <linearGradient id="icpOffA" gradientUnits="userSpaceOnUse" x1="224.7853" y1="257.7536" x2="348.0663" y2="133.4581" gradientTransform="matrix(1 0 0 -1 0 272)">
                  <stop offset="0.21" stopColor="#F15A24" />
                  <stop offset="0.6841" stopColor="#FBB03B" />
                </linearGradient>
                <linearGradient id="icpOffB" gradientUnits="userSpaceOnUse" x1="133.9461" y1="106.4262" x2="10.6653" y2="230.7215" gradientTransform="matrix(1 0 0 -1 0 272)">
                  <stop offset="0.21" stopColor="#ED1E79" />
                  <stop offset="0.8929" stopColor="#522785" />
                </linearGradient>
              </defs>
              <path fill="url(#icpOffA)" d="M271.6,0c-20,0-41.9,10.9-65,32.4c-10.9,10.1-20.5,21.1-27.5,29.8c0,0,11.2,12.9,23.5,26.8 c6.7-8.4,16.2-19.8,27.3-30.1c20.5-19.2,33.9-23.1,41.6-23.1c28.8,0,52.2,24.2,52.2,54.1c0,29.6-23.4,53.8-52.2,54.1 c-1.4,0-3-0.2-5-0.6c8.4,3.9,17.5,6.7,26,6.7c52.8,0,63.2-36.5,63.8-39.1c1.5-6.7,2.4-13.7,2.4-20.9C358.6,40.4,319.6,0,271.6,0z" />
              <path fill="url(#icpOffB)" d="M87.1,179.8c20,0,41.9-10.9,65-32.4c10.9-10.1,20.5-21.1,27.5-29.8c0,0-11.2-12.9-23.5-26.8 c-6.7,8.4-16.2,19.8-27.3,30.1c-20.5,19-34,23.1-41.6,23.1c-28.8,0-52.2-24.2-52.2-54.1c0-29.6,23.4-53.8,52.2-54.1 c1.4,0,3,0.2,5,0.6c-8.4-3.9-17.5-6.7-26-6.7C13.4,29.6,3,66.1,2.4,68.8C0.9,75.5,0,82.5,0,89.7C0,139.4,39,179.8,87.1,179.8z" />
              <path fill="#29ABE2" fillRule="evenodd" clipRule="evenodd" d="M127.3,59.7c-5.8-5.6-34-28.5-61-29.3C18.1,29.2,4,64.2,2.7,68.7C12,29.5,46.4,0.2,87.2,0 c33.3,0,67,32.7,91.9,62.2c0,0,0.1-0.1,0.1-0.1c0,0,11.2,12.9,23.5,26.8c0,0,14,16.5,28.8,31c5.8,5.6,33.9,28.2,60.9,29 c49.5,1.4,63.2-35.6,63.9-38.4c-9.1,39.5-43.6,68.9-84.6,69.1c-33.3,0-67-32.7-92-62.2c0,0.1-0.1,0.1-0.1,0.2 c0,0-11.2-12.9-23.5-26.8C156.2,90.8,142.2,74.2,127.3,59.7z M2.7,69.1c0-0.1,0-0.2,0.1-0.3C2.7,68.9,2.7,69,2.7,69.1z" />
            </svg>
          }
          trailingIcon={null}
        >
          {isLoggingIn ? "Opening your vault…" : "Create or open your vault"}
        </GoldCTA>
        {/* OISY — secondary door, same vault. One wallet approval at
            connect; after that the session is as silent as II. */}
        <button
          type="button"
          data-ocid="login.oisy_button"
          onClick={onLoginOisy}
          disabled={isLoggingIn}
          className="mt-2.5 inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-800/60 text-sm font-bold text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
        >
          Continue with OISY wallet
        </button>
        <p className="mt-3 text-[11px] text-zinc-500">
          Your vault is an <span className="text-zinc-300 font-semibold">Internet
          Identity</span> passkey, or your <span className="text-zinc-300 font-semibold">OISY</span> wallet
          — whichever you sign in with.
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
