import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMe, logoutUser } from "./api";
import { clearSession } from "./auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = anonymous
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        setUser(me);
        if (me) {
          localStorage.setItem("name", me.name);
          localStorage.setItem("role", me.role);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback((u) => {
    setUser(u);
    localStorage.setItem("name", u.name);
    localStorage.setItem("role", u.role);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // ignore — clear client state regardless
    }
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
