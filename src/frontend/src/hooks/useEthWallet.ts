import { useCallback, useEffect, useRef, useState } from "react";
import {
  type BalanceDiagnostic,
  type EthProvider,
  type EthWindow,
  fetchEthBalanceRaw,
  fetchUniBalanceRaw,
  isIOS,
  isMobile,
} from "../lib/ethRaw";

/**
 * Everything this app does to reach the user's Ethereum wallet: obtaining an
 * address, keeping ETH/UNI balances fresh, and reporting when either fails.
 *
 * It is one hook rather than two because connecting and reading balances
 * write the same error state — a failed balance read and a failed connect
 * are the same fact to the user ("we can't see your wallet"), and splitting
 * them produced a circular dependency between the two halves.
 *
 * Most of the length here is not complexity for its own sake; it is mobile
 * wallet reality. The load-bearing quirks, each of which cost a real
 * debugging session:
 *
 *   - Mobile Brave sometimes resolves `eth_requestAccounts` never, even
 *     after the user approves. Every request is therefore raced against a
 *     read-only `eth_accounts` poll, and whichever answers first wins.
 *   - Wallet bridges return the address in at least four shapes: a bare
 *     string, an array, `{result: [...]}`, `{accounts: [...]}`. All are
 *     unwrapped defensively, and anything that isn't a 40-hex address is
 *     discarded rather than passed along.
 *   - iOS regular tabs never inject `window.ethereum` at all (Apple blocks
 *     wallet extensions), so that case gets its own instruction rather than
 *     a generic failure.
 *
 * ADDRESS SAFETY: every path that can produce an address validates it
 * against /^0x[a-fA-F0-9]{40}$/ before it is stored. A wrong address here
 * would be handed to the deposit flow and sent real funds.
 */

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/** Set while a connect is mid-flight, so a page reload during the wallet
 *  app's approval round-trip resumes probing instead of giving up. */
const CONNECT_PENDING_KEY = "bb_wallet_connect_pending";

const BALANCE_REFRESH_MS = 60_000;

function readConnectPending(): boolean {
  try {
    return localStorage.getItem(CONNECT_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}
function setConnectPending(pending: boolean) {
  try {
    if (pending) localStorage.setItem(CONNECT_PENDING_KEY, "1");
    else localStorage.removeItem(CONNECT_PENDING_KEY);
  } catch {
    /* localStorage unavailable */
  }
}

/** Pick the provider to talk to. With several wallets injected, prefer the
 *  Brave sub-provider — Brave users are the primary audience and its
 *  in-app browser is the only working path on iOS. */
function preferredProvider(eth: EthWindow): EthProvider {
  if (eth.providers && eth.providers.length > 0) {
    const brave = eth.providers.find((p) => p.isBraveWallet === true);
    if (brave) return brave;
  }
  return eth;
}

/** Pull a valid address out of whatever shape a wallet bridge returned.
 *  Returns null rather than guessing. */
function extractAddress(accounts: unknown): string | null {
  if (Array.isArray(accounts)) {
    const first = accounts
      .map((a) => (typeof a === "string" ? a.trim() : ""))
      .find((a) => ADDRESS_RE.test(a));
    return first ?? null;
  }
  if (typeof accounts === "string") {
    const trimmed = accounts.trim();
    if (ADDRESS_RE.test(trimmed)) return trimmed;
    // Fish an address out of any wrapping text.
    const m = trimmed.match(/0x[a-fA-F0-9]{40}/);
    return m ? m[0] : null;
  }
  if (accounts && typeof accounts === "object") {
    // biome-ignore lint/suspicious/noExplicitAny: wallet bridges return any shape
    const anyAccounts = accounts as any;
    const candidate = anyAccounts.result ?? anyAccounts.accounts ?? anyAccounts[0];
    if (Array.isArray(candidate)) {
      const first = candidate
        .map((a: unknown) => (typeof a === "string" ? a.trim() : ""))
        .find((a: string) => ADDRESS_RE.test(a));
      return first ?? null;
    }
    if (typeof candidate === "string" && ADDRESS_RE.test(candidate.trim())) {
      return candidate.trim();
    }
  }
  return null;
}

export function useEthWallet() {
  const [ethAddress, setEthAddress] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [uniBalance, setUniBalance] = useState<string | null>(null);
  const [walletConnectionError, setWalletConnectionError] = useState<string | null>(
    null,
  );
  // Per-token diagnostics + last-known source (for the collapsible panel).
  const [ethBalanceDiag, setEthBalanceDiag] =
    useState<BalanceDiagnostic<string> | null>(null);
  const [uniBalanceDiag, setUniBalanceDiag] =
    useState<BalanceDiagnostic<string> | null>(null);
  const [balanceRefreshing, setBalanceRefreshing] = useState(false);

  // On-screen diagnostics for Connect Wallet. Appended to as each step runs
  // so mobile users see what's happening without a dev console.
  const [walletConnectLog, setWalletConnectLog] = useState<string[]>([]);
  const appendWalletLog = useCallback((line: string) => {
    console.log(`[connectWallet] ${line}`);
    setWalletConnectLog((prev) => [
      ...prev.slice(-9),
      `${new Date().toLocaleTimeString()} ${line}`,
    ]);
  }, []);

  /**
   * Balance fetch — PARALLEL race of native-ETH paths only.
   *
   * This was once a serial wallet → RPC fallback, which was the root cause
   * of "balance never loads on mobile": on iOS Brave the injected request
   * can hang silently (response dropped, no rejection), blocking the RPC
   * fallback forever. Both paths now race with 6s hard timeouts.
   */
  const refreshBalances = useCallback(async (address: string) => {
    setBalanceRefreshing(true);
    const [ethDiag, uniDiag] = await Promise.all([
      fetchEthBalanceRaw(address),
      fetchUniBalanceRaw(address),
    ]);
    if (ethDiag.value !== null) setEthBalance(ethDiag.value);
    if (uniDiag.value !== null) setUniBalance(uniDiag.value);
    setEthBalanceDiag(ethDiag);
    setUniBalanceDiag(uniDiag);
    setWalletConnectionError(
      ethDiag.value === null && uniDiag.value === null
        ? "Can't read balance. Check your wallet is unlocked on Ethereum mainnet and your network allows reads to ethereum-mainnet.wallet.brave.com / eth.llamarpc.com."
        : null,
    );
    setBalanceRefreshing(false);
  }, []);

  /** Silent probe: return an already-authorized account without prompting.
   *  Used for auto-connect and as the recovery path whenever
   *  `eth_requestAccounts` fails to deliver. */
  const probeExistingAccount = useCallback(
    async (provider: EthProvider | undefined | null): Promise<string | null> => {
      if (!provider) return null;
      try {
        const result = (await provider.request({ method: "eth_accounts" })) as unknown;
        if (Array.isArray(result)) {
          const first = result
            .map((a) => (typeof a === "string" ? a.trim() : ""))
            .find((a) => ADDRESS_RE.test(a));
          if (first) return first;
        }
      } catch {
        // ignore — caller decides whether to keep polling
      }
      return null;
    },
    [],
  );

  // Refresh balances on connect, then every 60s while connected.
  useEffect(() => {
    if (!ethAddress) return;
    refreshBalances(ethAddress);
    const id = setInterval(() => refreshBalances(ethAddress), BALANCE_REFRESH_MS);
    return () => clearInterval(id);
  }, [ethAddress, refreshBalances]);

  // EIP-6963 provider discovery — the standard announcement handshake,
  // reliable in Brave's in-app wallet browser and any compliant wallet.
  const eip6963ProviderRef = useRef<EthProvider | null>(null);
  useEffect(() => {
    const handleAnnounce = (e: Event) => {
      // biome-ignore lint/suspicious/noExplicitAny: CustomEvent detail shape
      const detail = (e as any).detail;
      if (detail?.provider && !eip6963ProviderRef.current) {
        console.log("[eip6963] provider announced:", detail.info);
        eip6963ProviderRef.current = detail.provider as EthProvider;
      }
    };
    window.addEventListener("eip6963:announceProvider", handleAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnounce);
    };
  }, []);

  // `accountsChanged` fires when the user approves access in the wallet app
  // — including when the original request call hung and never resolved.
  useEffect(() => {
    const win = window as unknown as { ethereum?: EthWindow };
    const eth = win.ethereum;
    if (!eth) return;
    // biome-ignore lint/suspicious/noExplicitAny: EIP-1193 event emitter shape
    const anyEth = eth as any;
    if (typeof anyEth.on !== "function") return;
    const handler = (accounts: unknown) => {
      if (
        Array.isArray(accounts) &&
        accounts.length > 0 &&
        typeof accounts[0] === "string"
      ) {
        const addr = accounts[0] as string;
        if (ADDRESS_RE.test(addr)) {
          console.log("[accountsChanged] picked up", addr);
          setEthAddress(addr);
          refreshBalances(addr);
        }
      }
    };
    anyEth.on("accountsChanged", handler);
    return () => {
      if (typeof anyEth.removeListener === "function") {
        anyEth.removeListener("accountsChanged", handler);
      }
    };
  }, [refreshBalances]);

  // Auto-connect if the wallet was already authorized. Probes harder when a
  // connect was interrupted mid-approval (see CONNECT_PENDING_KEY).
  useEffect(() => {
    if (ethAddress) return;
    const win = window as unknown as { ethereum?: EthWindow };
    if (!win.ethereum) return;
    let cancelled = false;
    (async () => {
      // Give a mobile provider time to finish injecting.
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 200));
        if ((window as unknown as { ethereum?: EthWindow }).ethereum) break;
      }
      if (cancelled) return;
      const currentEth = (window as unknown as { ethereum?: EthWindow }).ethereum;
      if (!currentEth) return;
      const provider = preferredProvider(currentEth);
      const probeTries = readConnectPending() ? 15 : 3;
      for (let i = 0; i < probeTries && !cancelled; i++) {
        const existing = await probeExistingAccount(provider);
        if (cancelled) return;
        if (existing) {
          console.log("[auto-connect] found existing account:", existing);
          setConnectPending(false);
          setEthAddress(existing);
          refreshBalances(existing);
          return;
        }
        if (i < probeTries - 1) await new Promise((r) => setTimeout(r, 2000));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ethAddress, probeExistingAccount, refreshBalances]);

  const connectEthereumWallet = useCallback(async () => {
    setWalletConnectLog([]);
    appendWalletLog("Connect clicked");
    setConnectPending(true);
    const win = window as unknown as {
      ethereum?: EthWindow;
      braveEthereum?: EthProvider;
    };
    let eth = win.ethereum;
    appendWalletLog(
      `Probes: window.ethereum=${!!win.ethereum} braveEthereum=${!!win.braveEthereum}`,
    );
    if (eth) {
      appendWalletLog(
        `ethereum flags: isBraveWallet=${!!eth.isBraveWallet} providers=${
          eth.providers ? eth.providers.length : 0
        }`,
      );
    }
    if (!eth) {
      // Mobile may inject window.ethereum slightly after load — poll ~2s.
      if (isMobile) {
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 200));
          eth = (window as unknown as { ethereum?: EthWindow }).ethereum;
          if (eth) break;
        }
      }
      if (!eth) {
        setConnectPending(false);
        if (isIOS) {
          setWalletConnectionError(
            "iOS doesn't inject Web3 into regular browser tabs. Open the Brave Wallet app, tap the compass/browser tab, and navigate to this page from inside it. (MetaMask and Trust Wallet also have in-app browsers that work.)",
          );
        } else if (isMobile) {
          setWalletConnectionError(
            "No Web3 wallet detected. Open this page from inside your wallet app's built-in browser (Brave Wallet, MetaMask, Trust, Rainbow all have one).",
          );
        } else {
          setWalletConnectionError(
            "Please install Brave Wallet, MetaMask, or a compatible Web3 wallet browser extension, then refresh.",
          );
        }
        return;
      }
    }
    // Talk to the raw provider. viem's requestAddresses triggers auxiliary
    // eth_chainId calls that can hang on mobile Brave's injected bridge;
    // a plain eth_requestAccounts is the most compatible path.
    const provider = preferredProvider(eth);
    try {
      // wallet_requestPermissions silently no-ops in mobile Brave's regular
      // tabs. eth_requestAccounts is the one method MetaMask-mobile,
      // Rainbow and Trust all implement consistently.
      appendWalletLog(
        `Calling eth_requestAccounts${provider.isBraveWallet ? " (Brave sub-provider)" : ""}`,
      );

      const requestPromise = provider
        .request({ method: "eth_requestAccounts" })
        .catch((err) => {
          // A user rejection is final and propagates. Anything else is
          // absorbed so the parallel poll can still succeed.
          const code = (err as { code?: number })?.code;
          if (code === 4001) throw err;
          appendWalletLog(`eth_requestAccounts rejected: ${String(err).slice(0, 80)}`);
          return null as unknown;
        });

      // Parallel read-only poll, started after a head start on the happy path.
      const pollPromise = (async () => {
        await new Promise((r) => setTimeout(r, isMobile ? 3000 : 8000));
        for (let i = 0; i < 12; i++) {
          const addr = await probeExistingAccount(provider);
          if (addr) {
            appendWalletLog(`Parallel poll found addr (attempt ${i + 1})`);
            return [addr] as unknown;
          }
          await new Promise((r) => setTimeout(r, 2500));
        }
        return null as unknown;
      })();

      const accounts = await Promise.race([requestPromise, pollPromise]);
      appendWalletLog(
        `Got response: ${JSON.stringify(accounts)?.slice(0, 80) ?? String(accounts)}`,
      );

      let addr = extractAddress(accounts);

      // The wallet may have approved without delivering a usable payload —
      // recover via read-only polling (no second prompt).
      if (!addr) {
        appendWalletLog("No address in response — polling eth_accounts…");
        for (let i = 0; i < 10 && !addr; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          addr = await probeExistingAccount(provider);
          if (addr) {
            appendWalletLog(`Recovered address (attempt ${i + 1}): ${addr.slice(0, 10)}…`);
            break;
          }
          appendWalletLog(`Still waiting (${i + 1}/10)…`);
        }
      }
      if (!addr) {
        appendWalletLog("FAILED — no address after all polls");
        setConnectPending(false);
        if (isIOS) {
          setWalletConnectionError(
            "No account returned. Make sure you've opened this page inside the Brave Wallet app's browser (not regular Brave), your wallet is unlocked, and an account is selected.",
          );
        } else if (isMobile) {
          setWalletConnectionError(
            "Wallet didn't return an account. Open this page from inside your wallet's in-app browser, make sure the wallet is unlocked with an account selected, then try again.",
          );
        } else {
          setWalletConnectionError(
            "Wallet didn't return an account. Make sure your wallet is unlocked and has at least one account selected, then try again.",
          );
        }
        return;
      }
      appendWalletLog(`Connected: ${addr.slice(0, 10)}…`);
      setConnectPending(false);
      setEthAddress(addr);
      await new Promise((r) => setTimeout(r, isMobile ? 1000 : 500));
      await refreshBalances(addr);
    } catch (error) {
      const code = (error as { code?: number })?.code;
      if (code === 4001) {
        appendWalletLog("Rejected by user");
        setConnectPending(false);
        return;
      }
      appendWalletLog(
        `Error: ${error instanceof Error ? error.message : String(error)}`.slice(0, 120),
      );
      console.error("[connectWallet] error:", error);
      // Don't surface the error yet — the wallet may have approved anyway.
      appendWalletLog("Polling eth_accounts after error…");
      let addr: string | null = null;
      for (let i = 0; i < 10 && !addr; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        addr = await probeExistingAccount(provider);
        if (addr) {
          appendWalletLog(`Recovered after error (attempt ${i + 1}): ${addr.slice(0, 10)}…`);
          break;
        }
      }
      setConnectPending(false);
      if (addr) {
        setEthAddress(addr);
        await refreshBalances(addr);
        return;
      }
      setWalletConnectionError(
        `Wallet connection failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }, [appendWalletLog, probeExistingAccount, refreshBalances]);

  /** Forget the wallet locally. Does not revoke anything on-chain — the
   *  approval the user signed lives on Ethereum and is revoked at
   *  revoke.cash, which the UI links to. */
  const resetWallet = useCallback(() => {
    setEthAddress(null);
    setEthBalance(null);
    setUniBalance(null);
  }, []);

  return {
    ethAddress,
    setEthAddress,
    ethBalance,
    uniBalance,
    ethBalanceDiag,
    uniBalanceDiag,
    balanceRefreshing,
    refreshBalances,
    walletConnectionError,
    setWalletConnectionError,
    walletConnectLog,
    connectEthereumWallet,
    resetWallet,
  };
}
