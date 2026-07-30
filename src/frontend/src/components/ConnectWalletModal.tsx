import { Check, ExternalLink, Loader2, ShieldCheck, Smartphone, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { GoldCTA } from "./ui/GoldCTA";

type WalletOption = {
  id: "brave" | "metamask" | "coinbase" | "generic";
  name: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  installUrl: string;
  /** Returns true if this wallet is detected in the current browser. */
  detect: () => boolean;
  /** Extracts the matching provider from window.ethereum (handles
   *  multi-wallet injection where providers live in `ethereum.providers[]`). */
  resolveProvider: () => unknown | null;
};

type Props = {
  open: boolean;
  connecting: boolean;
  connectError: string | null;
  onClose: () => void;
  onConnect: () => void;
};

const isIOS =
  typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
const isMobile =
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

/**
 * Clean modern wallet-picker modal. Detects each supported wallet and shows
 * a card per wallet with a visible status chip:
 *   - Installed → green "Detected" pill
 *   - Not installed → "Install" link to the wallet's official site
 * Follows the RainbowKit / ConnectKit convention: one tap connects via the
 * highest-priority detected wallet. The legacy "Connect" button opens this
 * modal instead of going straight into eth_requestAccounts, so the user
 * always sees what's about to happen.
 */
export function ConnectWalletModal({
  open,
  connecting,
  connectError,
  onClose,
  onConnect,
}: Props) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const wallets: WalletOption[] = useMemo(
    () => [
      {
        id: "brave",
        name: "Brave Wallet",
        description: "Built into the Brave browser — fastest setup.",
        icon: <BraveIcon />,
        accent: "#FB542B",
        installUrl: "https://brave.com/wallet/",
        detect: () => {
          // biome-ignore lint/suspicious/noExplicitAny: window.ethereum shape
          const eth = (window as any).ethereum;
          if (!eth) return false;
          if (eth.isBraveWallet === true) return true;
          if (Array.isArray(eth.providers)) {
            return eth.providers.some(
              // biome-ignore lint/suspicious/noExplicitAny: provider shape
              (p: any) => p?.isBraveWallet === true,
            );
          }
          return false;
        },
        resolveProvider: () => {
          // biome-ignore lint/suspicious/noExplicitAny: window shape
          const eth = (window as any).ethereum;
          if (!eth) return null;
          if (Array.isArray(eth.providers)) {
            return (
              eth.providers.find(
                // biome-ignore lint/suspicious/noExplicitAny: provider shape
                (p: any) => p?.isBraveWallet === true,
              ) ?? null
            );
          }
          return eth.isBraveWallet === true ? eth : null;
        },
      },
      {
        id: "metamask",
        name: "MetaMask",
        description: "The most widely used Ethereum wallet.",
        icon: <MetaMaskIcon />,
        accent: "#F6851B",
        installUrl: "https://metamask.io/download/",
        detect: () => {
          // biome-ignore lint/suspicious/noExplicitAny: window shape
          const eth = (window as any).ethereum;
          if (!eth) return false;
          if (eth.isMetaMask === true && eth.isBraveWallet !== true) return true;
          if (Array.isArray(eth.providers)) {
            return eth.providers.some(
              // biome-ignore lint/suspicious/noExplicitAny: provider shape
              (p: any) => p?.isMetaMask === true && p?.isBraveWallet !== true,
            );
          }
          return false;
        },
        resolveProvider: () => {
          // biome-ignore lint/suspicious/noExplicitAny: window shape
          const eth = (window as any).ethereum;
          if (!eth) return null;
          if (Array.isArray(eth.providers)) {
            return (
              eth.providers.find(
                // biome-ignore lint/suspicious/noExplicitAny: provider shape
                (p: any) => p?.isMetaMask === true && p?.isBraveWallet !== true,
              ) ?? null
            );
          }
          return eth.isMetaMask === true && eth.isBraveWallet !== true ? eth : null;
        },
      },
      {
        id: "coinbase",
        name: "Coinbase Wallet",
        description: "Self-custody wallet from Coinbase.",
        icon: <CoinbaseIcon />,
        accent: "#0052FF",
        installUrl: "https://www.coinbase.com/wallet/downloads",
        detect: () => {
          // biome-ignore lint/suspicious/noExplicitAny: window shape
          const eth = (window as any).ethereum;
          if (!eth) return false;
          if (eth.isCoinbaseWallet === true) return true;
          if (Array.isArray(eth.providers)) {
            return eth.providers.some(
              // biome-ignore lint/suspicious/noExplicitAny: provider shape
              (p: any) => p?.isCoinbaseWallet === true,
            );
          }
          return false;
        },
        resolveProvider: () => {
          // biome-ignore lint/suspicious/noExplicitAny: window shape
          const eth = (window as any).ethereum;
          if (!eth) return null;
          if (Array.isArray(eth.providers)) {
            return (
              eth.providers.find(
                // biome-ignore lint/suspicious/noExplicitAny: provider shape
                (p: any) => p?.isCoinbaseWallet === true,
              ) ?? null
            );
          }
          return eth.isCoinbaseWallet === true ? eth : null;
        },
      },
    ],
    [],
  );

  if (!open) return null;

  // biome-ignore lint/suspicious/noExplicitAny: window shape
  const hasAny = !!(window as any).ethereum;
  const detected = wallets.filter((w) => w.detect());

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-11 h-11 inline-flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
          aria-label="Close wallet picker"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="px-6 pt-8 pb-4 text-center border-b border-zinc-800">
          <div className="inline-flex items-center gap-1.5 t-label text-zinc-500 mb-2">
            <ShieldCheck size={10} />
            Banking.Brave · Self-custody
          </div>
          <h2 id="connect-modal-title" className="font-black text-xl text-white mb-1">
            Connect your Ethereum wallet
          </h2>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
            Pick the wallet that holds your UNI. Your keys never leave your
            device.
          </p>
        </div>

        {/* Wallet list */}
        <div className="p-4 space-y-2">
          {wallets.map((w) => {
            const installed = w.detect();
            return (
              <button
                key={w.id}
                type="button"
                disabled={connecting}
                onClick={() => {
                  if (!installed) {
                    window.open(w.installUrl, "_blank", "noopener,noreferrer");
                    return;
                  }
                  onConnect();
                }}
                className={`w-full min-h-[64px] group relative rounded-2xl border p-4 flex items-center gap-3 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400 ${
                  installed
                    ? "border-zinc-800 bg-zinc-900 hover:border-yellow-500/40 hover:bg-zinc-900/70 cursor-pointer"
                    : "border-zinc-800/60 bg-zinc-900/40 cursor-pointer hover:border-zinc-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                data-ocid={`wallet.connect.${w.id}`}
                aria-label={installed ? `Connect ${w.name}` : `Install ${w.name}`}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                  style={{ background: w.accent, boxShadow: `0 4px 16px ${w.accent}40` }}
                  aria-hidden
                >
                  {w.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white">{w.name}</span>
                    {installed && (
                      <span className="inline-flex items-center gap-1 t-label bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full px-2 py-0.5">
                        <Check size={9} strokeWidth={3} /> Detected
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-zinc-400 mt-0.5 leading-snug">
                    {installed ? w.description : "Not installed · tap to get it"}
                  </div>
                </div>
                {!installed && (
                  <ExternalLink
                    size={16}
                    className="text-zinc-500 shrink-0"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}

          {!hasAny && (
            <div className="mt-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/15 text-amber-300 shrink-0">
                  <Smartphone size={18} strokeWidth={2.2} aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <strong className="block text-[13px] text-amber-200 leading-snug">
                    {isIOS
                      ? "iOS doesn't allow in-browser wallets"
                      : isMobile
                        ? "No wallet detected on this device"
                        : "No wallet detected"}
                  </strong>
                  <p className="mt-1 text-[12px] text-amber-300/90 leading-relaxed">
                    {isIOS ? (
                      <>
                        Apple blocks Web3 in regular browser tabs. To sign the
                        UNI deposit, open <em>this exact URL</em> inside the{" "}
                        <strong>Brave Wallet app's built-in browser</strong>{" "}
                        (tap the globe icon in Brave Wallet). MetaMask and
                        Trust Wallet have the same feature.
                      </>
                    ) : isMobile ? (
                      <>
                        Open this page from inside your wallet app's built-in
                        browser — Brave Wallet, MetaMask, Trust, and Rainbow
                        all ship one.
                      </>
                    ) : (
                      <>
                        Install Brave Wallet, MetaMask, or any EIP-1193
                        extension, then refresh.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {connecting && (
            <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2.5">
              <Loader2 size={14} className="animate-spin shrink-0" />
              <div>
                <div className="font-bold">Connecting…</div>
                <div className="text-[10px] text-yellow-500/80">
                  Confirm the request in your wallet.
                </div>
              </div>
            </div>
          )}

          {connectError && (
            <div className="mt-3 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-[11px] text-red-300 leading-relaxed">
              {connectError}
            </div>
          )}

          {detected.length > 0 && !connecting && (
            <GoldCTA
              data-ocid="wallet.connect.primary"
              onClick={onConnect}
              size="md"
              trailingIcon={null}
              className="mt-4"
            >
              Continue with {detected[0].name}
            </GoldCTA>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-zinc-900/60 border-t border-zinc-800 text-center">
          <div className="text-[10px] text-zinc-600 leading-relaxed">
            Banking.Brave doesn't custody your funds. You sign every transaction
            in your own wallet.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Wallet icons (inline SVG — no external asset deps) ───────────────── */

function BraveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2 L5 4 L6 7 L4 10 L5.5 14 L9 19 L12 22 L15 19 L18.5 14 L20 10 L18 7 L19 4 Z"
        fill="#ffffff"
        stroke="#FB542B"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MetaMaskIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path d="M21 3 L14 8 L15.5 5 L21 3Z" fill="#E2761B" />
      <path d="M3 3 L10 8 L8.5 5 L3 3Z" fill="#E4761B" />
      <path d="M12 10 L9 15 L13 16 L15 15 Z" fill="#ffffff" />
      <circle cx="9" cy="11" r="1" fill="#1f1f1f" />
      <circle cx="15" cy="11" r="1" fill="#1f1f1f" />
    </svg>
  );
}

function CoinbaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#0052FF" />
      <rect x="8" y="8" width="8" height="8" rx="1.5" fill="#ffffff" />
    </svg>
  );
}
