const STEPS = [
  { icon: "🔗", step: "1", title: "Sign In", desc: "Authenticate with Internet Identity — no seed phrase, no custodian." },
  { icon: "💼", step: "2", title: "Connect Wallet", desc: "Link MetaMask or Brave Wallet on Ethereum mainnet." },
  { icon: "⛏", step: "3", title: "Approve & Deposit", desc: "Approve UNI spend, then the ckERC-20 helper pulls funds on-chain." },
  { icon: "🪙", step: "4", title: "Receive sGLDT", desc: "sGLDT (synthetic gold) lands in your ICP account automatically." },
];

/** Static four-step explainer strip under the refinery widget. */
export function HowItWorksStrip() {
  return (
    <div className="mt-12 rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6 sm:p-8">
      <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-5 text-center">How the Refinery Works</h3>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {STEPS.map((s) => (
          <div key={s.step} className="flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg">{s.icon}</div>
            <div className="text-[9px] font-black text-yellow-500/60 uppercase tracking-widest">Step {s.step}</div>
            <div className="text-sm font-bold text-white">{s.title}</div>
            <div className="text-[11px] text-zinc-500 leading-relaxed">{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
