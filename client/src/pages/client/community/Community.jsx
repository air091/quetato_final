import React, { useState, useEffect, useCallback } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth"; // Adjust path as needed
import Header from "../../../components/community_comp/Header";
import MainContent from "../../../components/community_comp/MainContent";
import MainContentUser from "../../../components/community_comp/MainContentUser";
import { API_URL } from "../../../contexts/AuthContext";

const Community = () => {
  const { accessToken, user, fetchWithAuth } = useAuth();
  const { communityId } = useParams();
  const outletContext = useOutletContext();
  const [communityPlayer, setCommunityPlayer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const getCommunityPlayer = useCallback(async () => {
    // Guard clause: Don't fetch if user or communityId isn't loaded yet
    if (!user?.id || !communityId) return;

    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players/${user?.id}`,
        { method: "GET" },
      );

      if (response.ok) {
        const data = await response.json();
        console.log(data);
        setCommunityPlayer(data.player); // Actually save the data to state
      } else if (response.status === 404) {
        setCommunityPlayer(null);
      }
    } catch (error) {
      console.error("Failed to fetch community player:", error);
    } finally {
      setIsLoading(false);
    }
  }, [communityId, user?.id, fetchWithAuth]); // Dependencies fixed

  useEffect(() => {
    getCommunityPlayer();
  }, [getCommunityPlayer]); // Safe to include now that getCommunityPlayer is properly memoized

  // Optional: Prevent rendering layout elements if user data isn't available yet
  if (!user) {
    return <div>Loading user session...</div>;
  }

  return (
    <>
      <Header
        communityId={communityId}
        communityPlayer={communityPlayer}
        accessToken={accessToken}
      />

      <MainContent
        outletContext={outletContext}
        communityPlayer={communityPlayer}
      />
    </>
  );
};

export default Community;
