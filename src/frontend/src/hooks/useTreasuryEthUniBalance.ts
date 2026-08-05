import { useEffect, useState } from "react";
import { isValidHex, UNI_CONTRACT_ADDRESS } from "../lib/ethRaw";

/** The treasury's Ethereum-side deposit address. Published on /proof — this
 *  is a public, verifiable address, not a secret. */
export const TREASURY_ETH_ADDRESS = "0x22582083361bf06579BbfFcC1138D3fc986B91FF";

const REFRESH_MS = 30_000;
const PER_ENDPOINT_TIMEOUT_MS = 5_000;

// Same ranking as PUBLIC_ETH_RPC_ENDPOINTS — Brave first (first-party
// infra, never Shields-blocked), then the anonymous-friendly tier.
const RPC_ENDPOINTS = [
  "https://ethereum-mainnet.wallet.brave.com/",
  "https://eth.llamarpc.com",
  "https://ethereum-rpc.publicnode.com",
  "https://eth-mainnet.public.blastapi.io",
];

export type TreasuryEthUniBalance = {
  balance: string | null;
  loading: boolean;
  /** True when every RPC endpoint failed. The UI shows "—" rather than
   *  "0.0000": claiming an empty treasury because the network was down
   *  would be a lie in the more alarming direction. */
  unavailable: boolean;
};

/**
 * ETH-side UNI balance of the treasury deposit address, read through a
 * multi-endpoint public-RPC fallback chain so it resolves for every visitor
 * — no wallet connection, and no sign-in, required. Refreshed every 30s.
 *
 * Extracted from App.tsx; nothing outside this hook writes these values.
 */
export function useTreasuryEthUniBalance(): TreasuryEthUniBalance {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchTreasuryUniBalance = async () => {
      // balanceOf(address) call data — address padded to 32 bytes
      // (24 zero nibbles + 40 nibble address)
      const callData = `0x70a08231000000000000000000000000${TREASURY_ETH_ADDRESS.replace("0x", "").toLowerCase()}`;

      let successfulRead = false;

      for (const endpoint of RPC_ENDPOINTS) {
        if (cancelled) return;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            PER_ENDPOINT_TIMEOUT_MS,
          );
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_call",
              params: [{ to: UNI_CONTRACT_ADDRESS, data: callData }, "latest"],
              id: 1,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (cancelled) return;
          if (!response.ok) continue;
          const json = await response.json();
          const hex: string = json?.result ?? "";
          // A valid 32-byte response is a non-empty hex string
          if (!isValidHex(hex) || hex === "0x") continue;
          const raw = BigInt(hex);
          successfulRead = true;
          if (!cancelled) {
            setBalance((Number(raw) / 1e18).toFixed(4));
            setLoading(false);
            setUnavailable(false);
          }
          return;
        } catch {
          // Timeout, network error, or parse failure — try next endpoint
        }
      }

      // All endpoints exhausted
      if (!cancelled) {
        setLoading(false);
        if (!successfulRead) {
          setUnavailable(true);
          setBalance(null);
        }
        // If successfulRead but never returned, every valid result was "0x" —
        // genuine zero or malformed. Show 0.0000.
        if (successfulRead) {
          setBalance("0.0000");
          setUnavailable(false);
        }
      }
    };

    fetchTreasuryUniBalance();
    const id = setInterval(fetchTreasuryUniBalance, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { balance, loading, unavailable };
}
