import { useQuery } from "@tanstack/react-query";

interface CoinGeckoResponse {
  uniswap?: { usd: number };
  "gold-token"?: { usd: number };
}

interface CoinGeckoPrices {
  batPrice: number; // kept for compatibility (mapped to UNI price)
  uniPrice: number;
  sgldtPrice: number;
  /** true if prices came from cache/fallback rather than a live fetch */
  isCached: boolean;
  /** true if prices are from hardcoded defaults (worst-case fallback) */
  isDefault: boolean;
}

// Hardcoded safe-fallback prices — used only when live AND cached data are both unavailable.
// These prevent NaN/0 crashes, but a visible warning is shown so users know rates may be stale.
const DEFAULT_PRICES = { uniPrice: 3.55, sgldtPrice: 1.49, ethPrice: 2500 };
const CACHE_KEY = "minegold_last_prices";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedPrices {
  uniPrice: number;
  sgldtPrice: number;
  ethPrice: number;
  timestamp: number;
}

function saveToCache(prices: {
  uniPrice: number;
  sgldtPrice: number;
  ethPrice: number;
}) {
  try {
    const entry: CachedPrices = { ...prices, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage may be unavailable (private browsing, storage full)
  }
}

function loadFromCache(): { prices: CachedPrices; isStale: boolean } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedPrices = JSON.parse(raw);
    if (!parsed.uniPrice || !parsed.sgldtPrice || parsed.sgldtPrice <= 0)
      return null;
    const isStale = Date.now() - parsed.timestamp > CACHE_MAX_AGE_MS;
    return { prices: parsed, isStale };
  } catch {
    return null;
  }
}

async function fetchCoinGeckoPrices(): Promise<CoinGeckoPrices> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=uniswap%2Cgold-token%2Cethereum&vs_currencies=usd",
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data: CoinGeckoResponse & { ethereum?: { usd: number } } =
      await response.json();

    const uniPrice = data?.uniswap?.usd ?? 0;
    const sgldtPrice = data?.["gold-token"]?.usd ?? 0;
    const ethPrice = data?.ethereum?.usd ?? DEFAULT_PRICES.ethPrice;

    if (uniPrice > 0 && sgldtPrice > 0) {
      // Live fetch succeeded — save to cache
      saveToCache({ uniPrice, sgldtPrice, ethPrice });
      return {
        batPrice: uniPrice,
        uniPrice,
        sgldtPrice,
        isCached: false,
        isDefault: false,
      };
    }

    // Response was OK but prices were missing — fall through to cache
    throw new Error("Missing price data in response");
  } catch {
    // Live fetch failed — try localStorage cache
    const cached = loadFromCache();
    if (cached) {
      const { prices } = cached;
      return {
        batPrice: prices.uniPrice,
        uniPrice: prices.uniPrice,
        sgldtPrice: prices.sgldtPrice,
        isCached: true,
        isDefault: false,
      };
    }

    // No cache available — use hardcoded defaults to prevent NaN crashes
    return {
      batPrice: DEFAULT_PRICES.uniPrice,
      uniPrice: DEFAULT_PRICES.uniPrice,
      sgldtPrice: DEFAULT_PRICES.sgldtPrice,
      isCached: false,
      isDefault: true,
    };
  }
}

export function useCoinGeckoPrices() {
  return useQuery<CoinGeckoPrices>({
    queryKey: ["coinGeckoPrices"],
    queryFn: fetchCoinGeckoPrices,
    refetchInterval: 60_000,
    staleTime: 55_000,
    // Never return undefined — always return a safe default via the queryFn fallback logic
    placeholderData: {
      batPrice: DEFAULT_PRICES.uniPrice,
      uniPrice: DEFAULT_PRICES.uniPrice,
      sgldtPrice: DEFAULT_PRICES.sgldtPrice,
      isCached: false,
      isDefault: true,
    },
  });
}
