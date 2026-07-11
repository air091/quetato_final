import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

export const AuthContext = createContext(null);
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const API_URL = BASE_URL;
const AUTH_URL = `${BASE_URL}/api/auth`;
const ACCESS_TOKEN_STORAGE_KEY = "quetato_access_token";
const USER_STORAGE_KEY = "quetato_user";
const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60_000;

const getStoredAccessToken = () =>
  window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);

const storeAccessToken = (token) => {
  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
};

const getStoredUser = () => {
  try {
    const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    window.localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

const storeUser = (nextUser) => {
  if (nextUser) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  } else {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }
};

const clearStoredAuth = () => {
  storeAccessToken(null);
  storeUser(null);
};

const getAccessTokenPayload = (token) => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalizedPayload = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const decodedPayload = window.atob(normalizedPayload);
    return JSON.parse(decodedPayload);
  } catch {
    return null;
  }
};

const isAccessTokenValid = (token) => {
  const payload = token ? getAccessTokenPayload(token) : null;
  if (!payload?.exp) return false;

  return payload.exp * 1000 > Date.now() + 30_000;
};

const getAccessTokenExpiresAt = (token) => {
  const payload = token ? getAccessTokenPayload(token) : null;
  return payload?.exp ? payload.exp * 1000 : null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Guard flag to prevent React Strict Mode / Re-renders from double-firing the initialization logic
  const isInitialMount = useRef(true);
  const accessTokenRef = useRef(null);
  const refreshPromiseRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const applyAccessToken = useCallback((token) => {
    accessTokenRef.current = token || null;
    storeAccessToken(token || null);
    setAccessToken(token || null);
  }, []);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const resetAuthState = useCallback(() => {
    clearRefreshTimer();
    clearStoredAuth();
    accessTokenRef.current = null;
    setAccessToken(null);
    setUser(null);
  }, [clearRefreshTimer]);

  // 1. Refresh Session (Handles Token Rotation Payload)
  const refreshSession = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      const response = await fetch(`${AUTH_URL}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Refresh failed");
      }

      const nextAccessToken = data.tokens.accessToken || data.tokens.access;
      if (!nextAccessToken) {
        throw new Error("Refresh did not return an access token");
      }

      applyAccessToken(nextAccessToken);
      return nextAccessToken;
    })();

    try {
      return await refreshPromiseRef.current;
    } catch (error) {
      resetAuthState();
      throw error;
    } finally {
      refreshPromiseRef.current = null;
    }
  }, [applyAccessToken, resetAuthState]);

  // Helper for making authenticated requests
  const fetchWithAuth = useCallback(
    async (url, options = {}) => {
      let currentToken = isAccessTokenValid(accessTokenRef.current)
        ? accessTokenRef.current
        : getStoredAccessToken();

      if (!isAccessTokenValid(currentToken)) {
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
      if (response.status === 401 || response.status === 403) {
        try {
          const newToken = await refreshSession();
          headers["Authorization"] = `Bearer ${newToken}`;
          response = await fetch(url, {
            ...options,
            headers,
            credentials: "include",
          }); // Retry
        } catch (refreshError) {
          resetAuthState();
          throw refreshError;
        }
      }

      return response;
    },
    [refreshSession, resetAuthState],
  );

  // 2. Fetch User Profile
  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`${AUTH_URL}/profile`);
      if (!response) return;

      const data = await response.json();
      if (response.ok && data.success) {
        storeUser(data.user);
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
        const storedToken = getStoredAccessToken();
        const storedUser = getStoredUser();

        if (isAccessTokenValid(storedToken) && storedUser) {
          applyAccessToken(storedToken);
          setUser(storedUser);
          return;
        }

        if (isAccessTokenValid(storedToken)) {
          applyAccessToken(storedToken);
          await fetchProfile();
          return;
        }

        const nextToken = await refreshSession();
        if (getStoredUser()) {
          setUser(getStoredUser());
        } else if (nextToken) {
          await fetchProfile();
        }
      } catch {
        // Safe rejection: No cookie session present on load
        resetAuthState();
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, [applyAccessToken, fetchProfile, refreshSession, resetAuthState]);

  useEffect(() => {
    clearRefreshTimer();

    const expiresAt = getAccessTokenExpiresAt(accessToken);
    if (!expiresAt) return;

    const refreshDelay = Math.max(
      expiresAt - Date.now() - ACCESS_TOKEN_REFRESH_BUFFER_MS,
      0,
    );

    refreshTimerRef.current = setTimeout(() => {
      refreshSession().catch(() => {
        // refreshSession resets auth state on failure.
      });
    }, refreshDelay);

    return clearRefreshTimer;
  }, [accessToken, clearRefreshTimer, refreshSession]);

  // 4. Register Action
  const register = async (username, email, password) => {
    setLoading(true);
    // Explicitly bypass initialization hook when changing auth state dynamically
    isInitialMount.current = false;
    try {
      const response = await fetch(`${AUTH_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message);

      const nextToken = data.tokens.access || data.tokens.accessToken;
      applyAccessToken(nextToken);

      const profileResponse = await fetch(`${AUTH_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${nextToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      const profileData = await profileResponse.json();
      if (profileResponse.ok && profileData.success) {
        storeUser(profileData.user);
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
      const response = await fetch(`${AUTH_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message);

      const nextToken = data.tokens.access || data.tokens.accessToken;
      applyAccessToken(nextToken);

      const profileResponse = await fetch(`${AUTH_URL}/profile`, {
        headers: {
          Authorization: `Bearer ${nextToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      const profileData = await profileResponse.json();
      if (profileResponse.ok && profileData.success) {
        storeUser(profileData.user);
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
      await fetchWithAuth(`${AUTH_URL}/logout`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout error on server:", error);
    } finally {
      resetAuthState();
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
