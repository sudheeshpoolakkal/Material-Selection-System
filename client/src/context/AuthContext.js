import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
export const AuthContext = createContext();
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [token, setToken] = useState(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const stored = localStorage.getItem("token");
    if (!stored) {
      setLoading(false);
      return;
    }
    axios
      .get("/api/auth/me", { headers: { Authorization: `Bearer ${stored}` } })
      .then(({ data }) => {
        if (!active) return;
        setToken(stored);
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      })
      .catch((e) => {
        if (e.response?.status === 401 || e.response?.status === 404) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const login = (t, u) => {
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
    setToken(t);
    setUser(u);
  };
  const updateUser = (u) =>
    setUser((prev) => {
      const next = { ...prev, ...u };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };
  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, updateUser, logout }}
    >
      {loading ? (
        <div className="loading-screen">
          <span className="brand-symbol">
            <i />
            <i />
            <i />
          </span>
          <p>Opening your workspace…</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
