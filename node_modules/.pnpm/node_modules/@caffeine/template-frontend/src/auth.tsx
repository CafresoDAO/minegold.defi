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
