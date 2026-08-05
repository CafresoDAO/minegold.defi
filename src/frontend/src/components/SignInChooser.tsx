import { GoldCTA } from "./ui/GoldCTA";
import { MinegoldMark } from "./ui/MinegoldMark";

type Props = {
  open: boolean;
  isLoggingIn: boolean;
  onChooseInternetIdentity: () => void;
  onClose: () => void;
};

const ICP_MARK = (
  <svg width="22" height="11" viewBox="0 0 358.8 179.8" fill="none" aria-label="Internet Computer">
    <defs>
      <linearGradient id="chooserIcpA" gradientUnits="userSpaceOnUse" x1="224.7853" y1="257.7536" x2="348.0663" y2="133.4581" gradientTransform="matrix(1 0 0 -1 0 272)">
        <stop offset="0.21" stopColor="#F15A24" />
        <stop offset="0.6841" stopColor="#FBB03B" />
      </linearGradient>
      <linearGradient id="chooserIcpB" gradientUnits="userSpaceOnUse" x1="133.9461" y1="106.4262" x2="10.6653" y2="230.7215" gradientTransform="matrix(1 0 0 -1 0 272)">
        <stop offset="0.21" stopColor="#ED1E79" />
        <stop offset="0.8929" stopColor="#522785" />
      </linearGradient>
    </defs>
    <path fill="url(#chooserIcpA)" d="M271.6,0c-20,0-41.9,10.9-65,32.4c-10.9,10.1-20.5,21.1-27.5,29.8c0,0,11.2,12.9,23.5,26.8 c6.7-8.4,16.2-19.8,27.3-30.1c20.5-19.2,33.9-23.1,41.6-23.1c28.8,0,52.2,24.2,52.2,54.1c0,29.6-23.4,53.8-52.2,54.1 c-1.4,0-3-0.2-5-0.6c8.4,3.9,17.5,6.7,26,6.7c52.8,0,63.2-36.5,63.8-39.1c1.5-6.7,2.4-13.7,2.4-20.9C358.6,40.4,319.6,0,271.6,0z" />
    <path fill="url(#chooserIcpB)" d="M87.1,179.8c20,0,41.9-10.9,65-32.4c10.9-10.1,20.5-21.1,27.5-29.8c0,0-11.2-12.9-23.5-26.8 c-6.7,8.4-16.2,19.8-27.3,30.1c-20.5,19-34,23.1-41.6,23.1c-28.8,0-52.2-24.2-52.2-54.1c0-29.6,23.4-53.8,52.2-54.1 c1.4,0,3,0.2,5,0.6c-8.4-3.9-17.5-6.7-26-6.7C13.4,29.6,3,66.1,2.4,68.8C0.9,75.5,0,82.5,0,89.7C0,139.4,39,179.8,87.1,179.8z" />
    <path fill="#29ABE2" fillRule="evenodd" clipRule="evenodd" d="M127.3,59.7c-5.8-5.6-34-28.5-61-29.3C18.1,29.2,4,64.2,2.7,68.7C12,29.5,46.4,0.2,87.2,0 c33.3,0,67,32.7,91.9,62.2c0,0,0.1-0.1,0.1-0.1c0,0,11.2,12.9,23.5,26.8c0,0,14,16.5,28.8,31c5.8,5.6,33.9,28.2,60.9,29 c49.5,1.4,63.2-35.6,63.9-38.4c-9.1,39.5-43.6,68.9-84.6,69.1c-33.3,0-67-32.7-92-62.2c0,0.1-0.1,0.1-0.1,0.2 c0,0-11.2-12.9-23.5-26.8C156.2,90.8,142.2,74.2,127.3,59.7z M2.7,69.1c0-0.1,0-0.2,0.1-0.3C2.7,68.9,2.7,69,2.7,69.1z" />
  </svg>
);

const OISY_MARK = (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-label="OISY Wallet">
    <circle cx="16" cy="16" r="16" fill="#4A26FB" />
    <path d="M9 20.5 L16 9 L23 20.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

/**
 * Sign-in method picker. Internet Identity is the only door that actually
 * opens today — see docs/oisy-integration.md for why OISY isn't wired to
 * identity yet: it has no ICRC-34 delegation, so a "silent" OISY vault
 * session isn't possible without either (a) polling the wallet for approval
 * every ~60s, which was shipped once and reverted, or (b) the backend
 * growing ICRC-21 consent messages so OISY can approve per-action instead —
 * neither exists yet. OISY stays visible and named here on purpose, rather
 * than left out, so the door is obviously coming rather than silently
 * missing. Don't wire its onClick to anything until one of those is real.
 */
export function SignInChooser({ open, isLoggingIn, onChooseInternetIdentity, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      data-ocid="signin.chooser"
      className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-chooser-title"
      >
        <div className="w-14 h-14 bg-gradient-to-br from-yellow-600 to-yellow-400 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-yellow-500/30">
          <MinegoldMark size={28} />
        </div>
        <h2 id="signin-chooser-title" className="t-headline text-white text-center mb-1">
          Sign in
        </h2>
        <p className="text-xs text-zinc-500 text-center mb-5 px-2">
          Choose how you want to open your vault.
        </p>

        <button
          type="button"
          data-ocid="signin.chooser.ii"
          onClick={onChooseInternetIdentity}
          disabled={isLoggingIn}
          className="w-full min-h-[68px] rounded-2xl border border-zinc-700 bg-zinc-800/60 hover:border-yellow-500/50 hover:bg-zinc-800 transition-colors p-4 flex items-center gap-3 text-left disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
        >
          <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0">{ICP_MARK}</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-white">
              {isLoggingIn ? "Signing in…" : "Internet Identity"}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
              Face&nbsp;ID, fingerprint, or a security key. Creates your vault the first time.
            </div>
          </div>
        </button>

        <div
          data-ocid="signin.chooser.oisy"
          className="w-full mt-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-center gap-3 text-left opacity-60"
          aria-disabled="true"
        >
          <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center shrink-0">{OISY_MARK}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">OISY Wallet</span>
              <span className="t-label bg-zinc-700/60 text-zinc-300 rounded-full px-2 py-0.5">Coming soon</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
              OISY can't hold a silent vault session yet — every read would need
              a wallet approval. We're not shipping that door until it doesn't
              mean a popup once a minute.
            </div>
          </div>
        </div>

        <button
          type="button"
          data-ocid="signin.chooser.close"
          onClick={onClose}
          className="mt-4 w-full text-center text-[11px] text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
        >
          Not yet — take me back
        </button>
      </div>
    </div>
  );
}
