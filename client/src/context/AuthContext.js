import React, { createContext, useState, useEffect } from "react";
import { getClientId } from "../services/clientId";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // ensure a session-scoped clientId exists for this tab so refresh is scoped to this tab
      try {
        getClientId();
      } catch (e) {}
      const token = sessionStorage.getItem("token");
      if (token) {
        try {
          const { authAPI } = await import("../services/api");
          const me = await authAPI.me();
          setUser({ id: me.data.id, role: me.data.role });
          setLoading(false);
          return;
        } catch (err) {
          // If token verification fails, try refresh
          try {
            const { authAPI } = await import("../services/api");
            const resp = await authAPI.refresh();
            const newToken = resp.data.token;
            if (newToken) {
              sessionStorage.setItem("token", newToken);
              const me2 = await authAPI.me();
              setUser({ id: me2.data.id, role: me2.data.role });
            }
          } catch (e) {
            // ignore
          } finally {
            setLoading(false);
          }
        }
      } else {
        // No token: try refresh (in case httpOnly cookie present)
        try {
          const { authAPI } = await import("../services/api");
          const resp = await authAPI.refresh();
          const newToken = resp.data.token;
          if (newToken) {
            sessionStorage.setItem("token", newToken);
            const me = await authAPI.me();
            setUser({ id: me.data.id, role: me.data.role });
          }
        } catch (e) {
          // ignore
        } finally {
          setLoading(false);
        }
      }
    })();
  }, []);

  const login = async (token) => {
    // Store token per-tab (sessionStorage) only. Role will be verified from backend.
    sessionStorage.setItem("token", token);
    try {
      const { authAPI } = await import("../services/api");
      const me = await authAPI.me();
      setUser({ id: me.data.id, role: me.data.role });
      return me.data; // return user info for callers
    } catch (err) {
      // If /me fails after login, try refresh
      try {
        const { authAPI } = await import("../services/api");
        const resp = await authAPI.refresh();
        const newToken = resp.data.token;
        if (newToken) {
          sessionStorage.setItem("token", newToken);
          const me2 = await authAPI.me();
          setUser({ id: me2.data.id, role: me2.data.role });
          return me2.data;
        }
      } catch (e) {
        // fallback: clear token
        sessionStorage.removeItem("token");
        throw e;
      }
    }
  };

  const logout = async () => {
    try {
      const { authAPI } = await import("../services/api");
      await authAPI.logout();
    } catch (err) {
      // ignore
    }
    setUser(null);
    sessionStorage.removeItem("token");
  };

  const isAdmin = () => user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
