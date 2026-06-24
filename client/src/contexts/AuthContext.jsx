import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

export const AuthContext = createContext(null);

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/auth";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Guard flag to prevent React Strict Mode / Re-renders from double-firing the initialization logic
  const isInitialMount = useRef(true);

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

      let response = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });

      // Handle Access Token Expiration mid-session
      if (response.status === 401) {
        try {
          const newToken = await refreshSession();
          headers["Authorization"] = `Bearer ${newToken}`;
          response = await fetch(url, {
            ...options,
            headers,
            credentials: "include",
          }); // Retry
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
      const response = await fetch(`${API_URL}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.message || "Refresh failed");

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
    // FIX: If this is NOT the absolute first time the app is loading up (e.g. following a manual login sequence), do not auto-refresh!
    if (!isInitialMount.current) {
      return;
    }
    isInitialMount.current = false;

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
    // Explicitly bypass initialization hook when changing auth state dynamically
    isInitialMount.current = false;
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message);

      const nextToken = data.tokens.access;
      setAccessToken(nextToken);

      const profileResponse = await fetch(`${API_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${nextToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      const profileData = await profileResponse.json();
      if (profileResponse.ok && profileData.success) {
        setUser(profileData.user);
      }

      return data;
    } finally {
      setLoading(false);
    }
  };

  // 5. Login Action
  const login = async (email, password) => {
    setLoading(true);
    // Explicitly bypass initialization hook when changing auth state dynamically
    isInitialMount.current = false;
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message);

      const nextToken = data.tokens.access;
      setAccessToken(nextToken);

      const profileResponse = await fetch(`${API_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${nextToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      const profileData = await profileResponse.json();
      if (profileResponse.ok && profileData.success) {
        setUser(profileData.user);
      }

      return data;
    } finally {
      setLoading(false);
    }
  };

  // 6. Logout Action
  const logout = async () => {
    isInitialMount.current = false;
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
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
