import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("token");
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
              localStorage.setItem("token", newToken);
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
            localStorage.setItem("token", newToken);
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
    // Store token only. Role will be verified from backend.
    localStorage.setItem("token", token);
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
          localStorage.setItem("token", newToken);
          const me2 = await authAPI.me();
          setUser({ id: me2.data.id, role: me2.data.role });
          return me2.data;
        }
      } catch (e) {
        // fallback: clear token
        localStorage.removeItem("token");
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
    localStorage.removeItem("token");
  };

  const isAdmin = () => user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
