import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const AuthContext = createContext(null);

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/auth";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper for making authenticated requests
  const fetchWithAuth = useCallback(
    async (url, options = {}) => {
      let currentToken = accessToken;

      if (!currentToken) {
        try {
          currentToken = await refreshSession();
        } catch {
          return null; // Silent refresh failed
        }
      }

      const headers = {
        ...options.headers,
        Authorization: `Bearer ${currentToken}`,
        "Content-Type": "application/json",
      };

      let response = await fetch(url, { ...options, headers });

      // Handle Access Token Expiration mid-session
      if (response.status === 401) {
        try {
          const newToken = await refreshSession();
          headers["Authorization"] = `Bearer ${newToken}`;
          response = await fetch(url, { ...options, headers }); // Retry
        } catch (refreshError) {
          logout();
          throw refreshError;
        }
      }

      return response;
    },
    [accessToken],
  );

  // 1. Refresh Session (Handles Token Rotation Payload)
  const refreshSession = async () => {
    try {
      // Must include credentials for httpOnly session cookie
      const response = await fetch(`${API_URL}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.message || "Refresh failed");

      /* CRITICAL FIX: 
        Your refresh service maps access token to `data.tokens.accessToken`.
        Your login/register services map it to `data.tokens.access`.
        We check for both to stay safe.
      */
      const nextAccessToken = data.tokens.accessToken || data.tokens.access;

      setAccessToken(nextAccessToken);
      return nextAccessToken;
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      throw error;
    }
  };

  // 2. Fetch User Profile
  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/profile`);
      if (!response) return;

      const data = await response.json();
      if (response.ok && data.success) {
        setUser(data.user);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  }, [fetchWithAuth]);

  // 3. Initialize Auth App State
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await refreshSession();
        await fetchProfile();
      } catch (e) {
        // Safe rejection: No cookie session present on load
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, [fetchProfile]);

  // 4. Register Action
  const register = async (username, email, password) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message);

      setAccessToken(data.tokens.access);
      await fetchProfile();
      return data;
    } finally {
      setLoading(false);
    }
  };

  // 5. Login Action
  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message);

      setAccessToken(data.tokens.access);
      await fetchProfile();
      return data;
    } finally {
      setLoading(false);
    }
  };

  // 6. Logout Action
  const logout = async () => {
    try {
      await fetch(`${API_URL}/logout`, { method: "POST" });
    } catch (error) {
      console.error("Logout error on server:", error);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    accessToken,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    fetchWithAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
