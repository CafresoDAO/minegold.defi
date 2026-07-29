import { Clock, Coins, LogOut, Settings, UserCircle2, XCircle } from "lucide-react";
import type { RefObject } from "react";
import { ThemeToggle } from "./ThemeToggle";

type NavUser = {
  principal: string;
  identityType: string;
};

type Props = {
  user: NavUser | null;
  isAdmin: boolean;
  showAdmin: boolean;
  showHistory: boolean;
  showTreasury: boolean;
  treasuryPanelRef: RefObject<HTMLDivElement | null>;
  // Treasury dropdown data
  displaySGLDTBalance: bigint;
  displaySGLDTLoading: boolean;
  displayCkUNIBalance: bigint;
  displayCkUNILoading: boolean;
  treasuryEthUniBalance: string | null;
  treasuryEthUniLoading: boolean;
  treasuryEthUniUnavailable: boolean;
  // Price ticker
  ethPrice: number | null;
  uniPrice: number | null;
  sgldtPrice: number | null;
  // Handlers
  onBackToBankingBrave: () => void;
  onHome: () => void;
  onToggleTreasury: () => void;
  onToggleAdmin: () => void;
  onToggleHistory: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
};

/** Sticky top navigation: brand crumbs, treasury dropdown, live price ticker,
 *  and the admin / history / profile / logout buttons. */
export function NavBar({
  user,
  isAdmin,
  showAdmin,
  showHistory,
  showTreasury,
  treasuryPanelRef,
  displaySGLDTBalance,
  displaySGLDTLoading,
  displayCkUNIBalance,
  displayCkUNILoading,
  treasuryEthUniBalance,
  treasuryEthUniLoading,
  treasuryEthUniUnavailable,
  ethPrice,
  uniPrice,
  sgldtPrice,
  onBackToBankingBrave,
  onHome,
  onToggleTreasury,
  onToggleAdmin,
  onToggleHistory,
  onOpenProfile,
  onLogout,
}: Props) {
  return (
    <nav className="sticky top-0 z-50 bg-[#080808]/80 backdrop-blur-md border-b border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToBankingBrave}
            aria-label="Back to Banking.Brave"
            title="Back to Banking.Brave"
            className="flex items-center gap-2 cursor-pointer bg-transparent border-none p-0 group"
          >
            <div
              className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform"
              style={{ background: "#1D4ED8" }}
            >
              <img
                src="/bankingbrave.png"
                alt="Banking.Brave"
                className="w-[115%] h-[115%] object-cover"
              />
            </div>
            <span className="hidden sm:block text-sm font-black tracking-tight" style={{ color: "var(--bb-brand)" }}>
              Banking<span style={{ color: "var(--bb-text)" }}>.Brave</span>
            </span>
          </button>
          <span className="text-zinc-700">/</span>
          <button
            type="button"
            className="flex items-center gap-3 cursor-pointer bg-transparent border-none p-0"
            onClick={onHome}
            aria-label="minegold.defi home"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-yellow-600 to-yellow-400 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-900/30">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M3 17 L15 4" stroke="#3B1F00" strokeWidth="2.5" strokeLinecap="square"/>
                <rect x="12" y="2" width="7" height="3" rx="0.5" fill="white" opacity="0.95"/>
                <path d="M18 1 L20 3 L18 5 L16 3 Z" fill="white" opacity="0.85"/>
                <path d="M12 5 L10 7 L12 7 Z" fill="white" opacity="0.7"/>
                <circle cx="4" cy="16" r="1.5" fill="#FFD700" opacity="0.9"/>
              </svg>
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight">
              minegold<span className="text-yellow-400">.defi</span>
            </span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <button
              type="button"
              data-ocid="nav.profile.link"
              onClick={onOpenProfile}
              className="hidden md:flex flex-col items-end mr-2 text-[10px] text-zinc-500 uppercase tracking-tighter hover:text-pink-400 transition-colors cursor-pointer"
            >
              <span className="font-bold text-pink-500">
                {user.identityType}
              </span>
              <span>{user.principal.slice(0, 12)}...</span>
            </button>
          )}
          {/* Treasury panel button + dropdown */}
          <div className="relative hidden sm:block" ref={treasuryPanelRef}>
            <button
              type="button"
              data-ocid="nav.treasury.button"
              onClick={onToggleTreasury}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                showTreasury
                  ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-300"
                  : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
              title="Treasury Balances"
            >
              <Coins size={12} />
              Treasury
            </button>
            {showTreasury && (
              <div
                data-ocid="nav.treasury.panel"
                className="absolute right-0 top-full mt-2 w-64 bg-zinc-950 border border-zinc-700 rounded-2xl shadow-2xl z-50 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                    Treasury Holdings
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <span className="text-[9px] font-black text-yellow-400">
                          S
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-zinc-300">
                        sGLDT
                      </span>
                    </div>
                    <span
                      data-ocid="treasury.panel.sgldt_balance"
                      className="text-[12px] font-black text-yellow-300 font-mono"
                    >
                      {displaySGLDTLoading
                        ? "..."
                        : (Number(displaySGLDTBalance) / 1e8).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <span className="text-[9px] font-black text-blue-400">
                          U
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-zinc-300">
                        ckUNI
                      </span>
                    </div>
                    <span
                      data-ocid="treasury.panel.ckuni_balance"
                      className="text-[12px] font-black text-blue-300 font-mono"
                    >
                      {displayCkUNILoading
                        ? "..."
                        : (Number(displayCkUNIBalance) / 1e18).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 4,
                              maximumFractionDigits: 4,
                            },
                          )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-pink-500/5 border border-pink-500/20 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center">
                        <span className="text-[9px] font-black text-pink-400">
                          U
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-zinc-300">
                          UNI (ETH)
                        </span>
                        <p className="text-[8px] text-zinc-600 font-mono leading-none mt-0.5">
                          0x2258...B91FF
                        </p>
                      </div>
                    </div>
                    <span
                      data-ocid="treasury.panel.eth_uni_balance"
                      className="text-[12px] font-black text-pink-300 font-mono"
                      title={
                        treasuryEthUniUnavailable
                          ? "Balance temporarily unavailable"
                          : undefined
                      }
                    >
                      {treasuryEthUniLoading
                        ? "..."
                        : treasuryEthUniUnavailable
                          ? "—"
                          : (treasuryEthUniBalance ?? "0.0000")}
                    </span>
                  </div>
                </div>
                <p className="text-[9px] text-zinc-600 mt-3 text-center">
                  Principal: c626g-iyaaa-aaaau-agpoa-cai
                </p>
              </div>
            )}
          </div>
          {/* Live price ticker */}
          <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold text-zinc-500 mr-2">
            {ethPrice && (
              <span>
                ETH{" "}
                <span className="text-blue-400">
                  $
                  {ethPrice.toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </span>
            )}
            {uniPrice && (
              <span>
                UNI <span className="text-white">${uniPrice.toFixed(2)}</span>
              </span>
            )}
            {sgldtPrice && (
              <span>
                sGLDT{" "}
                <span className="text-yellow-400">
                  ${sgldtPrice.toFixed(4)}
                </span>
              </span>
            )}
          </div>
          {user && isAdmin && (
            <button
              type="button"
              data-ocid="nav.admin.button"
              onClick={onToggleAdmin}
              className="w-11 h-11 inline-flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors text-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
              title={showAdmin ? "Back to Refinery" : "Admin Panel"}
              aria-label={showAdmin ? "Back to Refinery" : "Open admin panel"}
              aria-pressed={showAdmin}
            >
              {showAdmin ? <XCircle size={18} /> : <Settings size={18} />}
            </button>
          )}
          {user && (
            <button
              type="button"
              data-ocid="nav.history.button"
              onClick={onToggleHistory}
              className={`w-11 h-11 inline-flex items-center justify-center border rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400 ${
                showHistory
                  ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-400"
                  : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400"
              }`}
              title="Transaction History"
              aria-label="Transaction history"
              aria-pressed={showHistory}
            >
              <Clock size={18} />
            </button>
          )}
          {user && (
            <button
              type="button"
              data-ocid="nav.profile.button"
              onClick={onOpenProfile}
              className="w-11 h-11 inline-flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors text-zinc-400 md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
              title="Your Profile"
              aria-label="Open your profile"
            >
              <UserCircle2 size={18} />
            </button>
          )}
          {user && (
            <button
              type="button"
              data-ocid="nav.logout.button"
              onClick={onLogout}
              className="w-11 h-11 inline-flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-colors text-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
