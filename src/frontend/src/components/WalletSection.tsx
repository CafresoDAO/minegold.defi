import {
  Activity,
  AlertCircle,
  ArrowRightLeft,
  Coins,
  Loader2,
  Send,
  Wallet,
} from "lucide-react";
import type React from "react";
import { safeBalance } from "../lib/format";
import { GoldCTA } from "./ui/GoldCTA";
import type { TransferToken } from "./TransferModal";

/** Structural view of App's BalanceDiagnostic — only what this UI reads. */
type DiagView = {
  source: string | null;
  outcomes: Record<string, string | null | undefined>;
};

type Props = {
  ethAddress: string | null;
  walletConnectLog: string[];
  walletConnectionError: string | null;
  balanceRefreshing: boolean;
  ethBalanceDiag: DiagView | null;
  uniBalanceDiag: DiagView | null;
  ethBalance: string | null;
  uniBalance: string | null;
  sgldtBalance: string | null;
  ethUsd: string | null;
  uniUsd: string | null;
  sgldtUsd: string | null;
  liveRate: number;
  uniPrice: number | null;
  sgldtPrice: number | null;
  onOpenConnect: () => void;
  onRefreshBalances: () => void;
  onOpenTransfer: (token: TransferToken) => void;
  onOpenRedeem: () => void;
};

const StatCard = ({
  title,
  value,
  sub,
  icon,
}: {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
}) => (
  <div
    data-ocid="stat.card"
    className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl hover:border-zinc-700 transition-all group"
  >
    <div className="flex justify-between items-start mb-4">
      <span className="t-label text-zinc-500">
        {title}
      </span>
      <div className="p-2 bg-zinc-800 rounded-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
    </div>
    <div className="text-2xl font-black text-white">{value}</div>
    <div className="text-xs text-zinc-400 mt-1 font-medium">{sub}</div>
  </div>
);

/** Top-of-page wallet area: the "connect wallet" card when no ETH wallet is
 *  linked, or the connected-wallet dashboard (error banner, balance-path
 *  diagnostics, balances grid with transfer buttons, stat cards). */
export function WalletSection({
  ethAddress,
  walletConnectLog,
  walletConnectionError,
  balanceRefreshing,
  ethBalanceDiag,
  uniBalanceDiag,
  ethBalance,
  uniBalance,
  sgldtBalance,
  ethUsd,
  uniUsd,
  sgldtUsd,
  liveRate,
  uniPrice,
  sgldtPrice,
  onOpenConnect,
  onRefreshBalances,
  onOpenTransfer,
  onOpenRedeem,
}: Props) {
  if (!ethAddress) {
    return (
      <div className="mb-12 bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 p-8 rounded-[2rem]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-md text-center md:text-left">
            <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="t-label text-yellow-500">Step 2 of 4 · Wallet</span>
            </div>
            <h2 className="t-headline mb-2">
              You&apos;ll use two things — here&apos;s why
            </h2>
            <ul className="text-sm space-y-1.5 text-left">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0">✓</span>
                <span className="text-zinc-400">
                  <span className="text-zinc-200 font-semibold">Your vault</span>{" "}
                  — done. It&apos;s where the gold will live.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 font-bold shrink-0">2</span>
                <span className="text-zinc-400">
                  <span className="text-zinc-200 font-semibold">Your wallet</span>{" "}
                  — next. It holds the UNI you&apos;re spending; connect
                  MetaMask or Brave Wallet so you can approve the deposit.
                </span>
              </li>
            </ul>
          </div>
          <GoldCTA
            data-ocid="wallet.connect.primary_button"
            onClick={onOpenConnect}
            size="md"
            fullWidth={false}
            leadingIcon={<Wallet />}
            trailingIcon={null}
            className="w-full md:w-auto md:px-10"
          >
            Connect Wallet
          </GoldCTA>
        </div>
        {walletConnectLog.length > 0 && (
          <details
            className="mt-4 rounded-2xl border border-zinc-800 bg-black/40 overflow-hidden group"
            open={!!walletConnectionError}
          >
            <summary className="cursor-pointer select-none list-none flex items-center justify-between gap-2 px-4 py-2.5 t-label text-zinc-500 hover:text-zinc-300 transition-colors">
              <span>Connection diagnostics</span>
              <span className="text-[9px] font-normal text-zinc-600 normal-case tracking-normal">
                {walletConnectLog.length}{" "}
                {walletConnectLog.length === 1 ? "entry" : "entries"}
                <span className="ml-2 inline-block transition-transform group-open:rotate-90">
                  ›
                </span>
              </span>
            </summary>
            <div className="border-t border-zinc-800 px-4 py-3 space-y-1 max-h-40 overflow-y-auto font-mono text-[11px]">
              {walletConnectLog.map((line, i) => (
                <div
                  key={`${i}-${line.slice(0, 20)}`}
                  className="text-zinc-400 break-all"
                >
                  {line}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Wallet connection error — shown on mobile when all retries fail */}
      {walletConnectionError && (
        <div
          data-ocid="wallet.connection_error"
          className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 flex items-start gap-3 text-xs text-amber-400 font-medium"
        >
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <div>{walletConnectionError}</div>
            <button
              type="button"
              disabled={balanceRefreshing}
              onClick={onRefreshBalances}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold disabled:opacity-50"
            >
              {balanceRefreshing ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <ArrowRightLeft size={10} />
              )}
              Retry balance fetch
            </button>
          </div>
        </div>
      )}
      {/* Balance diagnostic — visible compact readout of which path
          succeeded for each balance. Helps diagnose mobile failures
          without Web Inspector. */}
      {(ethBalanceDiag || uniBalanceDiag) && (
        <details className="mb-3 text-[10px] font-mono">
          <summary className="cursor-pointer text-zinc-500 hover:text-zinc-400 select-none">
            ▸ Balance path diagnostics{ethBalanceDiag?.source ? ` · ETH=${ethBalanceDiag.source}` : ""}{uniBalanceDiag?.source ? ` · UNI=${uniBalanceDiag.source}` : ""}
          </summary>
          <div className="mt-2 bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-zinc-400 space-y-1">
            {ethBalanceDiag && (
              <div>
                <span className="text-zinc-500">ETH ·&nbsp;</span>
                {["wallet", "rpc", "canister"].map((k) => {
                  const o = ethBalanceDiag.outcomes[k];
                  const color =
                    o === "ok" ? "text-emerald-400"
                      : o === "null" ? "text-zinc-500"
                        : o === "err" ? "text-red-400" : "text-zinc-700";
                  return (
                    <span key={k} className={`mr-2 ${color}`}>
                      {k}={o ?? "…"}
                    </span>
                  );
                })}
              </div>
            )}
            {uniBalanceDiag && (
              <div>
                <span className="text-zinc-500">UNI ·&nbsp;</span>
                {["wallet", "rpc", "canister"].map((k) => {
                  const o = uniBalanceDiag.outcomes[k];
                  const color =
                    o === "ok" ? "text-emerald-400"
                      : o === "null" ? "text-zinc-500"
                        : o === "err" ? "text-red-400" : "text-zinc-700";
                  return (
                    <span key={k} className={`mr-2 ${color}`}>
                      {k}={o ?? "…"}
                    </span>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              disabled={balanceRefreshing}
              onClick={onRefreshBalances}
              className="mt-2 w-full py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold disabled:opacity-50"
            >
              {balanceRefreshing ? "Refreshing…" : "Refresh now"}
            </button>
          </div>
        </details>
      )}
      {/* Wallet Stats Dashboard */}
      <div
        data-ocid="wallet.stats.card"
        className="mb-6 bg-gradient-to-br from-zinc-900 via-zinc-900 to-black border border-yellow-500/20 rounded-[2rem] overflow-hidden shadow-xl shadow-yellow-500/5"
      >
        <div className="px-6 pt-5 pb-3 border-b border-zinc-800/70 flex items-center gap-2">
          <Wallet size={14} className="text-yellow-500" />
          <span className="t-label text-yellow-500">
            Connected Wallet
          </span>
          <span className="ml-auto text-[10px] font-mono text-zinc-600">
            {ethAddress.slice(0, 6)}...{ethAddress.slice(-4)}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-zinc-800/70">
          {/* ETH Balance */}
          <div className="p-5">
            <div className="t-label text-zinc-500 mb-2">
              ETH Balance
            </div>
            <div className="text-xl font-black text-blue-400">
              {ethBalance !== null ? (
                safeBalance(ethBalance)
              ) : (
                <span className="text-zinc-600">&mdash;</span>
              )}
            </div>
            {ethUsd && (
              <div className="text-xs text-zinc-400 mt-1">
                ${ethUsd} USD
              </div>
            )}
            <button
              type="button"
              data-ocid="wallet.eth.transfer_button"
              onClick={() => onOpenTransfer("eth")}
              className="mt-1 -mx-2 flex items-center gap-1 min-h-[44px] px-2 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Send size={11} /> Transfer ETH
            </button>
          </div>
          {/* UNI Balance */}
          <div className="p-5">
            <div className="t-label text-zinc-500 mb-2">
              UNI Balance
            </div>
            <div className="text-xl font-black text-pink-400">
              {uniBalance !== null ? (
                safeBalance(uniBalance)
              ) : (
                <span className="text-zinc-600">&mdash;</span>
              )}
            </div>
            {uniUsd && (
              <div className="text-xs text-zinc-400 mt-1">
                ${uniUsd} USD
              </div>
            )}
            <button
              type="button"
              data-ocid="wallet.uni.transfer_button"
              onClick={() => onOpenTransfer("uni")}
              className="mt-1 -mx-2 flex items-center gap-1 min-h-[44px] px-2 text-[11px] font-bold text-pink-400 hover:text-pink-300 transition-colors"
            >
              <Send size={11} /> Transfer UNI
            </button>
          </div>
          {/* sGLDT Balance */}
          <div className="p-5">
            <div className="t-label text-zinc-500 mb-2">
              sGLDT Balance
            </div>
            <div className="text-xl font-black text-yellow-500">
              {sgldtBalance ?? (
                <span className="text-zinc-600">&mdash;</span>
              )}
            </div>
            {sgldtUsd && (
              <div className="text-xs text-zinc-400 mt-1">
                ${sgldtUsd} USD
              </div>
            )}
            <div className="mt-1 -mx-2 flex flex-wrap items-center gap-x-2 gap-y-0">
              <button
                type="button"
                data-ocid="wallet.sgldt.transfer_button"
                onClick={() => onOpenTransfer("sgldt")}
                className="flex items-center gap-1 min-h-[44px] px-2 text-[11px] font-bold text-yellow-500 hover:text-yellow-400 transition-colors"
              >
                <Send size={11} /> Transfer
              </button>
              <button
                type="button"
                data-ocid="wallet.sgldt.redeem_button"
                onClick={onOpenRedeem}
                className="flex items-center gap-1 min-h-[44px] px-2 text-[11px] font-bold text-pink-400 hover:text-pink-300 transition-colors"
              >
                <ArrowRightLeft size={11} /> Redeem to ckUNI
              </button>
            </div>
          </div>
          {/* Exchange Rate */}
          <div className="p-5">
            <div className="t-label text-zinc-500 mb-2">
              Exchange Rate
            </div>
            <div className="text-xl font-black text-yellow-400">
              {liveRate > 0 ? (
                liveRate.toFixed(4)
              ) : (
                <span className="text-zinc-600">&mdash;</span>
              )}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              sGLDT per UNI
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
        <StatCard
          title="Linked Address"
          value={`${ethAddress.slice(0, 6)}...${ethAddress.slice(-4)}`}
          sub="Ethereum Mainnet"
          icon={<Activity className="text-pink-500" />}
        />
        <StatCard
          title="UNI Balance"
          value={uniBalance !== null ? safeBalance(uniBalance) : "..."}
          sub={uniUsd ? `≈ $${uniUsd} USD` : "Uniswap ERC-20"}
          icon={<Coins className="text-pink-400" />}
        />
        <StatCard
          title="Exchange Rate"
          value={liveRate.toFixed(4)}
          sub={`UNI $${uniPrice?.toFixed(2) ?? "—"} / sGLDT $${sgldtPrice?.toFixed(4) ?? "—"}`}
          icon={<ArrowRightLeft className="text-zinc-500" />}
        />
      </div>
    </>
  );
}
