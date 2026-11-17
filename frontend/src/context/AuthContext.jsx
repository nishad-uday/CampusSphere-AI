
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(
    () => localStorage.getItem("access_token")
  );

  const [loading, setLoading] = useState(true);

  function saveSession(data) {
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));

    setToken(data.access_token);
    setUser(data.user);
  }

  async function login(email, password) {
    const { data } = await api.post("/auth/login", {
      email: email.trim().toLowerCase(),
      password,
    });

    saveSession(data);
    return data;
  }

  async function refreshUser() {
    const { data } = await api.get("/auth/me");

    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);

    return data;
  }

  async function logout() {
    try {
      if (token) {
        await api.post("/auth/logout");
      }
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");

      setToken(null);
      setUser(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      const savedToken = localStorage.getItem("access_token");

      if (!savedToken) {
        if (mounted) setLoading(false);
        return;
      }

      let savedUser = null;

      try {
        savedUser = JSON.parse(localStorage.getItem("user"));
      } catch {
        savedUser = null;
      }

      // A temporary-password user cannot access /auth/me
      // until the mandatory password change is completed.
      if (savedUser?.must_change_password) {
        if (mounted) {
          setUser(savedUser);
          setToken(savedToken);
          setLoading(false);
        }
        return;
      }

      try {
        const { data } = await api.get("/auth/me");

        if (mounted) {
          localStorage.setItem("user", JSON.stringify(data));
          setUser(data);
          setToken(savedToken);
        }
      } catch {
        if (mounted) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          setToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(token && user),
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
