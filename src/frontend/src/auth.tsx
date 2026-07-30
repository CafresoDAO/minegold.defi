import { AuthClient } from "@dfinity/auth-client";
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

type LoginStatus = "initializing" | "idle" | "logging-in" | "success" | "loginError";

interface AuthContextValue {
  identity?: Identity;
  login: () => void;
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

export function InternetIdentityProvider({ children }: { children: ReactNode }) {
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [identity, setIdentity] = useState<Identity | undefined>(undefined);
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
        setLoginStatus("success");
      },
      onError: (err) => {
        console.error("II login onError:", err);
        setLoginError(new Error(err ?? "Login failed"));
        setLoginStatus("loginError");
      },
    });
  }, [authClient]);

  const clear = useCallback(() => {
    if (!authClient) return;
    void authClient.logout().then(() => {
      setIdentity(undefined);
      setLoginStatus("idle");
      setLoginError(undefined);
    });
  }, [authClient]);

  const value: AuthContextValue = {
    identity,
    login,
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
