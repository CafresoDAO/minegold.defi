import { GoldCTA } from "./ui/GoldCTA";

type Props = {
  isLoggingIn: boolean;
  onLogin: () => void;
};

/** Full-screen sign-in gate shown while there is no authenticated II user. */
export function LoginOverlay({ isLoggingIn, onLogin }: Props) {
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
        <h1 className="text-3xl font-black text-white mb-1">
          minegold<span className="text-yellow-400">.defi</span>
        </h1>
        <p className="text-xs text-yellow-500/60 font-mono uppercase tracking-widest mb-3">Cross-Chain Gold Refinery</p>
        <p className="text-zinc-400 text-sm mb-6 px-4">
          Swap UNI (Ethereum) for sGLDT — a 1:1 wrapper of Gold DAO’s physically backed GLDT — on the Internet Computer. Your keys, your account.
        </p>
        {/* How it works — 3 steps */}
        <div className="grid grid-cols-3 gap-2 mb-6 text-left">
          {[
            { n: "1", title: "Connect", sub: "ICP + ETH wallets" },
            { n: "2", title: "Deposit", sub: "UNI via ckERC-20" },
            { n: "3", title: "Receive", sub: "sGLDT on ICP" },
          ].map((step) => (
            <div key={step.n} className="bg-zinc-800/60 border border-zinc-700/50 rounded-2xl p-3">
              <div className="text-[10px] font-black text-yellow-500/60 mb-1">STEP {step.n}</div>
              <div className="text-xs font-bold text-white">{step.title}</div>
              <div className="text-[9px] text-zinc-500 mt-0.5">{step.sub}</div>
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
          {isLoggingIn ? "Signing in…" : "Sign in with Internet Identity"}
        </GoldCTA>

      </div>
    </div>
  );
}
