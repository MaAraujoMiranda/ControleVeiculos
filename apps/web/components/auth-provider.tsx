"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError, api } from "../lib/api";
import type { AuthSession, LoginPayload } from "../lib/types";

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshSession() {
    setLoading(true);

    try {
      const nextSession = await api.getSession();
      setSession(nextSession);
      return nextSession;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setSession(null);
        return null;
      }

      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function login(payload: LoginPayload) {
    const nextSession = await api.login(payload);
    setSession(nextSession);
    return nextSession;
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      setSession(null);
    }
  }

  useEffect(() => {
    async function hydrateSession() {
      try {
        await refreshSession();
      } catch {
        setSession(null);
      }
    }

    function handleUnauthorized() {
      setSession(null);
      setLoading(false);
    }

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    void hydrateSession();

    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth precisa estar dentro de AuthProvider.");
  }

  return context;
}
