import { JOURNEY } from "../lib/journey";

/** Icons per canonical journey step (lib/journey is the copy authority). */
const STEP_ICONS = ["🔐", "💼", "⛏", "🪙"];
const STEP_DESC = [
  "Open your vault with Face ID or a fingerprint — no seed phrase, no custodian.",
  "Connect the Ethereum wallet holding your UNI (MetaMask or Brave Wallet).",
  "Two taps in your wallet approve the deposit; Ethereum confirms in ~3 minutes.",
  "sGLDT — a 1:1 wrapper of Gold DAO's physically backed GLDT — lands in your vault.",
];

/** Static four-step explainer strip under the refinery widget. */
export function HowItWorksStrip() {
  return (
    <div className="mt-12 rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6 sm:p-8">
      <h3 className="t-label text-zinc-500 mb-5 text-center">How the Refinery Works</h3>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {JOURNEY.map((s, i) => (
          <div key={s.n} className="flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg">{STEP_ICONS[i]}</div>
            <div className="t-label text-yellow-500/60">Step {s.n}</div>
            <div className="text-sm font-bold text-white">{s.title}</div>
            <div className="text-[11px] text-zinc-500 leading-relaxed">{STEP_DESC[i]}</div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-[11px] text-zinc-500 leading-relaxed">
        Each GLDT is backed by 0.01&nbsp;g of vaulted physical gold; sGLDT wraps
        it 1:1 for 10,000× lower fees. New to GLDT?{" "}
        <a
          href="https://gldt.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
        >
          gldt.org
        </a>{" "}
        explains the gold behind it.
      </p>
    </div>
  );
}
