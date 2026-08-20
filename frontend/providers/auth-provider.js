"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);
const TOKEN_KEY = "azff_access_token";
const ADMIN_KEY = "azff_admin";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = window.localStorage.getItem(TOKEN_KEY);
    const savedAdmin = window.localStorage.getItem(ADMIN_KEY);
    if (savedToken) setToken(savedToken);
    if (savedAdmin) {
      try { setAdmin(JSON.parse(savedAdmin)); } catch { window.localStorage.removeItem(ADMIN_KEY); }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token) return;
    api.auth.me()
      .then((result) => {
        if (result?.admin) {
          setAdmin(result.admin);
          window.localStorage.setItem(ADMIN_KEY, JSON.stringify(result.admin));
        }
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(ADMIN_KEY);
        setToken(null);
        setAdmin(null);
      });
  }, [token]);

  const login = async (credentials) => {
    const result = await api.auth.login(credentials);
    setToken(result.token);
    setAdmin(result.admin);
    window.localStorage.setItem(TOKEN_KEY, result.token);
    window.localStorage.setItem(ADMIN_KEY, JSON.stringify(result.admin));
    return result;
  };

  const logout = async () => {
    try { if (token) await api.auth.logout(); } finally {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(ADMIN_KEY);
      setToken(null);
      setAdmin(null);
    }
  };

  const value = useMemo(() => ({ token, admin, loading, isAuthenticated: Boolean(token), login, logout, setAdmin }), [token, admin, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}

export { TOKEN_KEY };
