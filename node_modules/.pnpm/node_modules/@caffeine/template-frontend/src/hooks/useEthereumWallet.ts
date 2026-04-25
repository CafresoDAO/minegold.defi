/**
 * useEthereumWallet — single-purpose hook for Ethereum wallet connection.
 *
 * Extracted from App.tsx to isolate the mobile-specific connection dance
 * from the swap flow. Handles:
 *
 *   1. EIP-6963 provider announcement (any modern wallet)
 *   2. Legacy window.ethereum with multi-provider support (MetaMask + Brave)
 *   3. Mobile "wallet signed but promise never resolved" recovery via
 *      parallel eth_accounts polling
 *   4. Auto-reconnect on mount if a prior session authorized the dApp
 *   5. accountsChanged listener — switches ethAddress when the user
 *      changes accounts in the wallet app
 *
 * The hook deliberately does NOT hold balance state — balances are owned by
 * useWalletBalances. Keep responsibilities narrow so mobile quirks stay in
 * one file.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { isIOS, isMobile } from "../lib/platform";

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isBraveWallet?: boolean;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  on?: (event: string, handler: (accounts: unknown) => void) => void;
  removeListener?: (event: string, handler: (accounts: unknown) => void) => void;
};

type EthWindow = EthProvider & {
  providers?: EthProvider[];
};

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

function pickProvider(root: EthWindow): EthProvider {
  // Multi-wallet case: MetaMask + Brave injected side-by-side. Prefer Brave
  // since it's the wallet Banking.Brave users typically use.
  if (root.providers && root.providers.length > 0) {
    const brave = root.providers.find((p) => p.isBraveWallet === true);
    if (brave) return brave;
    return root.providers[0];
  }
  return root;
}

async function probe(provider: EthProvider | null): Promise<string | null> {
  if (!provider) return null;
  try {
    const result = (await provider.request({ method: "eth_accounts" })) as unknown;
    if (Array.isArray(result)) {
      const first = result
        .map((a) => (typeof a === "string" ? a.trim() : ""))
        .find((a) => ADDR_RE.test(a));
      if (first) return first;
    }
  } catch {
    /* locked wallet, no permissions, etc. */
  }
  return null;
}

export type UseEthereumWalletResult = {
  ethAddress: string | null;
  setEthAddress: (addr: string | null) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  connecting: boolean;
  connectError: string | null;
  clearConnectError: () => void;
  log: string[];
};

export function useEthereumWallet(opts: {
  onConnected?: (address: string) => void;
  onAccountsChanged?: (address: string) => void;
}): UseEthereumWalletResult {
  const [ethAddress, setEthAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const eip6963ProviderRef = useRef<EthProvider | null>(null);

  const appendLog = useCallback((line: string) => {
    console.log(`[ethWallet] ${line}`);
    setLog((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()} ${line}`]);
  }, []);

  // EIP-6963 provider discovery. Wallets that implement this announce
  // themselves via an event — more reliable than scraping window.ethereum.
  useEffect(() => {
    const handleAnnounce = (e: Event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (e as any).detail;
      if (detail?.provider && !eip6963ProviderRef.current) {
        eip6963ProviderRef.current = detail.provider as EthProvider;
      }
    };
    window.addEventListener("eip6963:announceProvider", handleAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () =>
      window.removeEventListener("eip6963:announceProvider", handleAnnounce);
  }, []);

  // accountsChanged listener: fires when the user switches accounts in the
  // wallet app. Without this the dApp would keep showing the old address.
  useEffect(() => {
    const root = (window as unknown as { ethereum?: EthWindow }).ethereum;
    if (!root?.on) return;
    const handler = (accounts: unknown) => {
      if (Array.isArray(accounts) && accounts.length > 0) {
        const addr = String(accounts[0] ?? "").trim();
        if (ADDR_RE.test(addr)) {
          setEthAddress(addr);
          opts.onAccountsChanged?.(addr);
        }
      }
    };
    root.on("accountsChanged", handler);
    return () => root.removeListener?.("accountsChanged", handler);
  }, [opts]);

  // Silent auto-connect on mount. If the wallet previously authorized this
  // origin, eth_accounts returns the address without prompting.
  useEffect(() => {
    if (ethAddress) return;
    const root = (window as unknown as { ethereum?: EthWindow }).ethereum;
    if (!root) return;
    let cancelled = false;
    void (async () => {
      // Small delay so the mobile provider is fully injected
      await new Promise((r) => setTimeout(r, 300));
      const provider = pickProvider(root);
      for (let i = 0; i < 3; i++) {
        if (cancelled) return;
        const existing = await probe(provider);
        if (existing) {
          setEthAddress(existing);
          opts.onConnected?.(existing);
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ethAddress, opts]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setConnectError(null);
    setLog([]);
    appendLog("Connect clicked");

    try {
      const root = (window as unknown as { ethereum?: EthWindow }).ethereum;
      if (!root) {
        // iOS regular tab or desktop without extension
        if (isIOS) {
          setConnectError(
            "iOS doesn't inject Web3 into regular browser tabs. Open this page inside the Brave Wallet app's built-in browser (globe icon) or MetaMask Mobile's dApp browser.",
          );
        } else if (isMobile) {
          setConnectError(
            "No Web3 wallet detected. Open this page inside your wallet app's built-in browser.",
          );
        } else {
          setConnectError(
            "Please install Brave Wallet, MetaMask, or a compatible Web3 wallet browser extension, then refresh.",
          );
        }
        return;
      }

      const provider = pickProvider(root);
      appendLog(
        `Picked provider: isBrave=${!!provider.isBraveWallet} isMetaMask=${!!provider.isMetaMask} isCoinbase=${!!provider.isCoinbaseWallet}`,
      );

      // Race the prompt against a parallel eth_accounts poll. On mobile the
      // signer UI can approve successfully but the promise never resolves —
      // whichever surfaces the address first wins.
      const requestPromise = provider
        .request({ method: "eth_requestAccounts" })
        .catch((err) => {
          const code = (err as { code?: number })?.code;
          if (code === 4001) throw err; // user rejection propagates
          appendLog(`eth_requestAccounts rejected: ${String(err).slice(0, 80)}`);
          return null as unknown;
        });

      const pollPromise = (async () => {
        await new Promise((r) => setTimeout(r, isMobile ? 3000 : 8000));
        for (let i = 0; i < 12; i++) {
          const addr = await probe(provider);
          if (addr) return [addr] as unknown;
          await new Promise((r) => setTimeout(r, 2500));
        }
        return null as unknown;
      })();

      const accounts = await Promise.race([requestPromise, pollPromise]);

      // Defensive extraction — mobile bridges return varied shapes.
      let addr: string | null = null;
      if (Array.isArray(accounts)) {
        const first = accounts
          .map((a) => (typeof a === "string" ? a.trim() : ""))
          .find((a) => ADDR_RE.test(a));
        if (first) addr = first;
      } else if (typeof accounts === "string") {
        const m = accounts.match(/0x[a-fA-F0-9]{40}/);
        if (m) addr = m[0];
      } else if (accounts && typeof accounts === "object") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const any = accounts as any;
        const candidate = any.result ?? any.accounts ?? any[0];
        if (Array.isArray(candidate)) {
          const first = candidate
            .map((a: unknown) => (typeof a === "string" ? a.trim() : ""))
            .find((a: string) => ADDR_RE.test(a));
          if (first) addr = first;
        } else if (typeof candidate === "string" && ADDR_RE.test(candidate.trim())) {
          addr = candidate.trim();
        }
      }

      // Last-ditch recovery: prompt returned nothing but the wallet may have
      // approved silently. Poll eth_accounts for 20s.
      if (!addr) {
        for (let i = 0; i < 10 && !addr; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          addr = await probe(provider);
        }
      }

      if (!addr) {
        if (isIOS) {
          setConnectError(
            "No account returned. Make sure you've opened this page inside the Brave Wallet app (not regular Brave), your wallet is unlocked, and an account is selected.",
          );
        } else if (isMobile) {
          setConnectError(
            "Wallet didn't return an account. Open this page from inside your wallet's in-app browser, unlock it, and try again.",
          );
        } else {
          setConnectError(
            "Wallet didn't return an account. Unlock your wallet and confirm an account is selected, then try again.",
          );
        }
        return;
      }

      appendLog(`Connected: ${addr.slice(0, 10)}…`);
      setEthAddress(addr);
      opts.onConnected?.(addr);
    } catch (err) {
      const code = (err as { code?: number })?.code;
      if (code === 4001) {
        appendLog("User rejected the connection prompt");
        return;
      }
      setConnectError(
        `Wallet connection failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setConnecting(false);
    }
  }, [appendLog, opts]);

  const disconnect = useCallback(() => {
    setEthAddress(null);
    setConnectError(null);
    setLog([]);
  }, []);

  const clearConnectError = useCallback(() => setConnectError(null), []);

  return {
    ethAddress,
    setEthAddress,
    connect,
    disconnect,
    connecting,
    connectError,
    clearConnectError,
    log,
  };
}
