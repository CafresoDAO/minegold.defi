import { AuthClient } from "@dfinity/auth-client";
import {
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
  isDelegationValid,
} from "@dfinity/identity";
import type { Identity } from "@icp-sdk/core/agent";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const II_URL = "https://identity.ic0.app";
const OISY_URL = "https://oisy.com/sign";
const DAYS_30_NS = BigInt(30) * BigInt(24) * BigInt(60) * BigInt(60) * BigInt(1_000_000_000);

/**
 * CANONICAL II DERIVATION ORIGIN — NEVER CHANGE THIS STRING.
 *
 * Every user principal (and therefore every sGLDT / ckUNI balance on the
 * ICRC-1 ledgers) is a function of (anchor, this string). Editing it — a
 * trailing slash, icp0.io→ic0.app, moving to a custom domain — silently
 * reassigns every existing user a NEW principal and strands their tokens.
 * There is no recovery path: the admin transfer methods move treasury
 * funds, not user funds.
 *
 * It is the raw canister origin ON PURPOSE: it is the one origin that can
 * never expire, be lost at a registrar, or be revoked by ICANN. Human-facing
 * domains (banking.cafreso.com, cafreso.com, …, a future banking.brave) are
 * added to /.well-known/ii-alternative-origins instead — II then derives
 * the SAME principal for logins from those domains.
 *
 * Format must be exactly window.location.origin form: lowercase
 * scheme + host, no port, no path, NO trailing slash.
 */
const II_DERIVATION_ORIGIN = "https://cqyto-tiaaa-aaaau-agppa-cai.icp0.io";
if (!/^https:\/\/[a-z0-9-]+\.icp0\.io$/.test(II_DERIVATION_ORIGIN)) {
  // Fail LOUDLY at module load. A malformed origin string must never reach
  // a login call — it would mint wrong principals silently.
  throw new Error("II_DERIVATION_ORIGIN malformed — refusing to initialize auth");
}

/** Local dev (vite on localhost) is not in the alternative-origins
 *  whitelist, so passing derivationOrigin there would make II reject the
 *  login outright. Dev falls back to per-origin principals, same as today. */
const IS_LOCAL_DEV = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

/** Bump this string whenever derivation-origin semantics change. Any cached
 *  delegation minted under an older epoch is purged once: a pre-pin
 *  delegation replayed on an alternative origin would resurrect the old
 *  per-origin principal for up to 30 days. On the canonical origin the
 *  purge is a pure re-login — the principal is byte-identical before/after. */
const AUTH_EPOCH = "2026-07-derivation-origin-pin";
const EPOCH_KEY = "minegold.auth_epoch";

/**
 * OISY (ICRC-34 relying-party delegation) session storage. II sessions are
 * persisted by AuthClient in IndexedDB; OISY sessions we persist ourselves:
 * a browser-held session key plus the delegation chain OISY signed for it.
 * Same trust model as II — the wallet approves ONCE at connect time, then
 * queries and calls sign silently until the chain expires (30 days).
 *
 * PRINCIPAL PINNING (the same hazard the II block above documents): the
 * Signer is created with `derivationOrigin` = the canonical canister origin,
 * sent as `icrc95DerivationOrigin`. OISY validates it against the SAME
 * /.well-known/ii-alternative-origins file II uses — already deployed. A
 * login from minegold.cafreso.com, the raw canister origin, or a future
 * minegold.brave therefore derives the SAME principal. Do not remove.
 */
const OISY_SESSION_KEY = "minegold.oisy_session";

type WalletKind = "ii" | "oisy";

type LoginStatus = "initializing" | "idle" | "logging-in" | "success" | "loginError";

interface AuthContextValue {
  identity?: Identity;
  /** Which wallet produced `identity` — undefined when signed out. */
  walletKind?: WalletKind;
  login: () => void;
  loginOisy: () => void;
  clear: () => void;
  loginStatus: LoginStatus;
  isInitializing: boolean;
  isLoginIdle: boolean;
  isLoggingIn: boolean;
  isLoginSuccess: boolean;
  isLoginError: boolean;
  loginError?: Error;
}

const Ctx = createContext<AuthContextValue | null>(null);

/** Restore a persisted OISY session, or null if absent/expired/corrupt. */
function restoreOisySession(): DelegationIdentity | null {
  try {
    const raw = localStorage.getItem(OISY_SESSION_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as { key: unknown; chain: unknown };
    const sessionKey = Ed25519KeyIdentity.fromJSON(JSON.stringify(stored.key));
    const chain = DelegationChain.fromJSON(JSON.stringify(stored.chain));
    if (!isDelegationValid(chain)) {
      localStorage.removeItem(OISY_SESSION_KEY);
      return null;
    }
    return DelegationIdentity.fromDelegation(sessionKey, chain);
  } catch {
    try {
      localStorage.removeItem(OISY_SESSION_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function InternetIdentityProvider({ children }: { children: ReactNode }) {
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [identity, setIdentity] = useState<Identity | undefined>(undefined);
  const [walletKind, setWalletKind] = useState<WalletKind | undefined>(undefined);
  const [loginStatus, setLoginStatus] = useState<LoginStatus>("initializing");
  const [loginError, setLoginError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    AuthClient.create({
      idleOptions: { disableIdle: true, disableDefaultIdleCallback: true },
    })
      .then(async (client) => {
        if (cancelled) return;
        // One-shot epoch purge (see AUTH_EPOCH). Must run BEFORE
        // isAuthenticated() so a stale delegation can't hydrate the session.
        let stale = false;
        try {
          stale = localStorage.getItem(EPOCH_KEY) !== AUTH_EPOCH;
        } catch {
          /* storage unavailable — treat as fresh */
        }
        if (stale) {
          await client.logout();
          try {
            // Epoch purge covers OISY sessions too — a delegation minted
            // under older derivation semantics must not hydrate either.
            localStorage.removeItem(OISY_SESSION_KEY);
            localStorage.setItem(EPOCH_KEY, AUTH_EPOCH);
          } catch {
            /* ignore */
          }
        }
        if (cancelled) return;
        setAuthClient(client);
        if (await client.isAuthenticated()) {
          if (cancelled) return;
          setIdentity(client.getIdentity());
          setWalletKind("ii");
        } else {
          // No II session — try a persisted OISY delegation instead.
          const oisy = restoreOisySession();
          if (oisy && !cancelled) {
            setIdentity(oisy);
            setWalletKind("oisy");
          }
        }
        if (!cancelled) setLoginStatus("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("AuthClient.create failed:", err);
        setLoginError(err instanceof Error ? err : new Error(String(err)));
        setLoginStatus("loginError");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(() => {
    if (!authClient) {
      console.warn("login called before authClient is ready");
      return;
    }
    setLoginStatus("logging-in");
    setLoginError(undefined);
    authClient.login({
      identityProvider: II_URL,
      // Pins principal derivation to the canonical origin regardless of which
      // domain served this page. On the canonical origin itself this is a
      // no-op (II short-circuits when derivationOrigin === caller origin), so
      // existing users keep their exact principals.
      ...(IS_LOCAL_DEV ? {} : { derivationOrigin: II_DERIVATION_ORIGIN }),
      maxTimeToLive: DAYS_30_NS,
      onSuccess: () => {
        setIdentity(authClient.getIdentity());
        setWalletKind("ii");
        setLoginStatus("success");
      },
      onError: (err) => {
        console.error("II login onError:", err);
        setLoginError(new Error(err ?? "Login failed"));
        setLoginStatus("loginError");
      },
    });
  }, [authClient]);

  /**
   * OISY sign-in via the ICRC-25/29 signer standard + ICRC-34 delegation.
   *
   * Why delegation and not SignerAgent: SignerAgent upgrades EVERY query to
   * a wallet-approved call. This app's dashboard polls balances and receipts
   * continuously — that would be an approval popup per refresh. A relying-
   * party delegation is approved once and then behaves exactly like an II
   * session: silent queries, silent calls, 30-day expiry.
   *
   * The signer lib (v5) sits on @icp-sdk/core v5 while this app is on v4 —
   * the DelegationChain crosses that seam BY VALUE (toJSON → fromJSON), the
   * one pattern that is safe across agent-js majors.
   */
  const loginOisy = useCallback(() => {
    setLoginStatus("logging-in");
    setLoginError(undefined);
    void (async () => {
      try {
        const [{ Signer }, { PostMessageTransport }] = await Promise.all([
          import("@icp-sdk/signer"),
          import("@icp-sdk/signer/web"),
        ]);
        const transport = new PostMessageTransport({
          url: OISY_URL,
          windowOpenerFeatures: "width=440,height=680",
        });
        const signer = new Signer({
          transport,
          // ICRC-95: pin principal derivation to the canonical origin (see
          // the derivation-origin block at the top of this file). Local dev
          // is not whitelisted, so it falls back to per-origin principals —
          // same tradeoff the II path makes.
          ...(IS_LOCAL_DEV ? {} : { derivationOrigin: II_DERIVATION_ORIGIN }),
        });
        try {
          const sessionKey = Ed25519KeyIdentity.generate();
          const chainV5 = await signer.requestDelegation({
            // v3 public key object is structurally compatible with the v5
            // PublicKey interface (toDer()); nominal types differ.
            publicKey: sessionKey.getPublicKey() as never,
            maxTimeToLive: DAYS_30_NS,
          });
          // Cross the v5→v3 seam by value.
          const chain = DelegationChain.fromJSON(
            JSON.stringify(chainV5.toJSON()),
          );
          const oisyIdentity = DelegationIdentity.fromDelegation(
            sessionKey,
            chain,
          );
          try {
            localStorage.setItem(
              OISY_SESSION_KEY,
              JSON.stringify({
                key: sessionKey.toJSON(),
                chain: chain.toJSON(),
              }),
            );
          } catch {
            /* storage unavailable — session just won't survive reload */
          }
          setIdentity(oisyIdentity);
          setWalletKind("oisy");
          setLoginStatus("success");
        } finally {
          signer.closeChannel();
        }
      } catch (err) {
        console.error("OISY login failed:", err);
        setLoginError(err instanceof Error ? err : new Error(String(err)));
        setLoginStatus("loginError");
      }
    })();
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(OISY_SESSION_KEY);
    } catch {
      /* ignore */
    }
    if (!authClient) {
      setIdentity(undefined);
      setWalletKind(undefined);
      setLoginStatus("idle");
      setLoginError(undefined);
      return;
    }
    void authClient.logout().then(() => {
      setIdentity(undefined);
      setWalletKind(undefined);
      setLoginStatus("idle");
      setLoginError(undefined);
    });
  }, [authClient]);

  const value: AuthContextValue = {
    identity,
    walletKind,
    login,
    loginOisy,
    clear,
    loginStatus,
    isInitializing: loginStatus === "initializing",
    isLoginIdle: loginStatus === "idle",
    isLoggingIn: loginStatus === "logging-in",
    isLoginSuccess: loginStatus === "success",
    isLoginError: loginStatus === "loginError",
    loginError,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInternetIdentity(): AuthContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("InternetIdentityProvider is not present.");
  return ctx;
}
