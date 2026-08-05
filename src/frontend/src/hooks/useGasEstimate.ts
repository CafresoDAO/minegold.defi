import { useEffect, useState } from "react";
import { publicClient } from "../lib/eth";

/** approve (~55k) + ckERC-20 helper deposit (~200k), with headroom. Unused
 *  gas is refunded by the EVM, so overestimating costs the user nothing;
 *  underestimating strands them mid-flow. */
const TOTAL_GAS_CEILING = 260_000n;
const REFRESH_MS = 90_000;

export type GasEstimate = {
  /** Raw ETH estimate, or null while first loading / after a failed read. */
  gasEstimateEth: number | null;
  /** Display string, e.g. "~0.0031 ETH ($7.44)". Null until known. */
  gasEstimate: string | null;
  /** Set when the connected wallet can't cover the estimated gas — the
   *  deposit would fail partway, so the UI blocks it up front. */
  gasShortfall: string | null;
};

/**
 * Live gas estimate for the two-transaction deposit flow, refreshed every
 * 90s while a wallet is connected. Replaced a hardcoded "~0.002 ETH" chip
 * that went stale every time mainnet gas moved.
 *
 * `ethPrice` and `ethBalance` are inputs rather than internal reads so this
 * hook stays a pure function of what the caller already knows — it does one
 * thing: ask the chain what gas costs right now.
 */
export function useGasEstimate(
  ethAddress: string | null,
  ethPrice: number | null,
  ethBalance: string | null,
): GasEstimate {
  const [gasEstimateEth, setGasEstimateEth] = useState<number | null>(null);

  useEffect(() => {
    if (!ethAddress) {
      setGasEstimateEth(null);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      try {
        const gasPrice = await publicClient.getGasPrice();
        if (!cancelled) {
          setGasEstimateEth(Number(TOTAL_GAS_CEILING * gasPrice) / 1e18);
        }
      } catch {
        // RPC hiccup — keep the previous estimate (or null → "estimating…")
      }
    };
    void refresh();
    const t = setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [ethAddress]);

  const gasEstimate =
    gasEstimateEth != null
      ? `~${gasEstimateEth.toFixed(4)} ETH${
          ethPrice ? ` ($${(gasEstimateEth * ethPrice).toFixed(2)})` : ""
        }`
      : null;

  const gasShortfall =
    gasEstimateEth != null &&
    ethBalance != null &&
    Number.parseFloat(ethBalance) < gasEstimateEth
      ? `Needs ~${gasEstimateEth.toFixed(4)} ETH for gas — you have ${ethBalance} ETH.`
      : null;

  return { gasEstimateEth, gasEstimate, gasShortfall };
}
