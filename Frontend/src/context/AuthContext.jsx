import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, setAuthToken } from "../api/client";

const AuthContext = createContext(null);
const STORAGE_KEY = "meshboard_auth";

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const stored = loadStored();
    if (stored?.token) {
      setAuthToken(stored.token);
      setToken(stored.token);
      setUser(stored.user);
      api
        .me()
        .then(({ user: u }) => setUser(u))
        .catch(() => {
          localStorage.removeItem(STORAGE_KEY);
          setAuthToken(null);
          setToken(null);
          setUser(null);
        })
        .finally(() => setBooting(false));
    } else {
      setBooting(false);
    }
  }, []);

  const persist = useCallback((nextUser, nextToken) => {
    setUser(nextUser);
    setToken(nextToken);
    setAuthToken(nextToken);
    if (nextToken) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, token: nextToken }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login({ email, password });
    persist(data.user, data.token);
    return data.user;
  }, [persist]);

  const register = useCallback(async (body) => {
    const data = await api.register(body);
    persist(data.user, data.token);
    return data.user;
  }, [persist]);

  const updateProfile = useCallback(async (body) => {
    const data = await api.updateProfile(body);
    persist(data.user, data.token);
    return data.user;
  }, [persist]);

  const logout = useCallback(() => {
    persist(null, null);
  }, [persist]);

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        booting,
        login,
        register,
        updateProfile,
        logout,
        isAuthenticated: Boolean(token),
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
