import { useEffect, useState } from "react";

const PRICE_CACHE_KEY = "minegold_last_prices";
const PRICE_REFRESH_MS = 60_000;

type CachedPrices = {
  uniPrice: number;
  sgldtPrice: number;
  ethPrice: number;
  timestamp: number;
};

export type Prices = {
  uniPrice: number | null;
  sgldtPrice: number | null;
  ethPrice: number | null;
  /** UNI/sGLDT derived from the two USD legs. Only a display hint — the
   *  canister's own on-chain rate is authoritative at settlement. */
  liveRate: number;
  /** Non-null when we're serving cached or no prices. Rendered in the UI:
   *  a stale rate the user can't see is worse than no rate. */
  priceWarning: string | null;
};

/**
 * Live USD prices for UNI, ETH (CoinGecko) and sGLDT (GeckoTerminal, from the
 * sGLDT/ICP pool on ICPSwap where sGLDT is the base token), refreshed every
 * 60s.
 *
 * Three-tier degradation, in order:
 *   1. Live fetch succeeds → cache to localStorage, no warning.
 *   2. Live fetch fails → serve the localStorage cache, warn (and warn
 *      harder past 24h).
 *   3. No cache either → leave prices null and warn. Downstream code
 *      disables the swap button rather than sending a guessed rate: a
 *      fabricated hint would either fall outside the canister's ±50% band
 *      (underpaying the user) or settle at a stale on-chain rate.
 *
 * Extracted from App.tsx — nothing outside this hook writes these values.
 */
export function usePrices(): Prices {
  const [uniPrice, setUniPrice] = useState<number | null>(null);
  const [sgldtPrice, setSgldtPrice] = useState<number | null>(null);
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [liveRate, setLiveRate] = useState(0);
  const [priceWarning, setPriceWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchPrices = async () => {
      try {
        const [cgRes, gtRes] = await Promise.all([
          fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=uniswap%2Cethereum&vs_currencies=usd",
          ),
          fetch(
            "https://api.geckoterminal.com/api/v2/networks/icp/pools/jedlb-haaaa-aaaar-qbrma-cai",
          ),
        ]);
        if (cancelled) return;

        let fetchedUniPrice: number | null = null;
        let fetchedSgldtPrice: number | null = null;
        let fetchedEthPrice: number | null = null;

        if (cgRes.ok) {
          const d = await cgRes.json();
          if (d?.uniswap?.usd) {
            fetchedUniPrice = Number(d.uniswap.usd);
            setUniPrice(fetchedUniPrice);
          }
          if (d?.ethereum?.usd) {
            fetchedEthPrice = Number(d.ethereum.usd);
            setEthPrice(fetchedEthPrice);
          }
        }

        if (gtRes.ok) {
          const gt = await gtRes.json();
          const basePrice = Number(gt?.data?.attributes?.base_token_price_usd);
          if (Number.isFinite(basePrice) && basePrice > 0) {
            fetchedSgldtPrice = basePrice;
            setSgldtPrice(fetchedSgldtPrice);
          }
        }

        if (fetchedUniPrice && fetchedSgldtPrice && fetchedSgldtPrice > 0) {
          setLiveRate(fetchedUniPrice / fetchedSgldtPrice);
          try {
            localStorage.setItem(
              PRICE_CACHE_KEY,
              JSON.stringify({
                uniPrice: fetchedUniPrice,
                sgldtPrice: fetchedSgldtPrice,
                ethPrice: fetchedEthPrice ?? 2500,
                timestamp: Date.now(),
              }),
            );
          } catch {
            // localStorage may be unavailable
          }
          setPriceWarning(null);
          return;
        }
      } catch {
        // fall through to cache/default
      }

      if (cancelled) return;

      // Live fetch failed — try localStorage cache
      try {
        const raw = localStorage.getItem(PRICE_CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as CachedPrices;
          if (cached.uniPrice > 0 && cached.sgldtPrice > 0) {
            setUniPrice(cached.uniPrice);
            setSgldtPrice(cached.sgldtPrice);
            setEthPrice(cached.ethPrice ?? 2500);
            setLiveRate(cached.uniPrice / cached.sgldtPrice);
            const ageHours = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
            if (ageHours > 24) {
              setPriceWarning(
                "Using cached prices — live feed unavailable (>24h old)",
              );
            } else {
              setPriceWarning("Using cached prices — live feed unavailable");
            }
            return;
          }
        }
      } catch {
        // ignore
      }

      // No cache AND live fetch failed — we cannot sign an honest rate hint
      // from nothing. Leave prices null so downstream code disables the swap
      // button instead of silently sending a stale/guessed rate.
      setPriceWarning(
        "Live exchange rate unavailable. Check your connection or wallet's content filters (Brave Shields blocks some price APIs) and retry.",
      );
    };
    fetchPrices();
    const id = setInterval(fetchPrices, PRICE_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { uniPrice, sgldtPrice, ethPrice, liveRate, priceWarning };
}
