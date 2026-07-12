import { createContext, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useState } from "react";
import { useCallback } from "react";
import { API_URL } from "./AuthContext";

// 1. Initialize the Context
export const CommunityContext = createContext(null);

// 2. Define the Provider Component
export const CommunityProvider = ({ children }) => {
  const { accessToken, fetchWithAuth } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [myCommunities, setMyCommunities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // public communities
  const getCommunities = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetchWithAuth(`${API_URL}/api/communities`, {
        method: "GET",
      });
      if (!response) return;
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data?.message || "Internal server error");
      }
      setCommunities(data.communities || []);
    } catch (error) {
      console.error("Failed to fetch communities:", error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, fetchWithAuth]);

  useEffect(() => {
    getCommunities();
  }, [getCommunities]);

  // Define the global re-fetch function
  const getMyCommunities = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/my-communities`,
        {
          method: "GET",
        },
      );

      if (!response) return;

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data?.message || "Internal server error");
      }

      setMyCommunities(data.myCommunities || []);
    } catch (error) {
      console.error("Failed to fetch communities:", error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, fetchWithAuth]);

  // Provide state and updaters to children components
  return (
    <CommunityContext.Provider
      value={{
        communities,
        getCommunities,
        myCommunities,
        getMyCommunities,
        isLoading,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
};
