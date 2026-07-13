import React, { useState, useEffect, useCallback } from "react";
import { Outlet, useParams } from "react-router-dom";
import Header from "../components/home_comp/Header";
import Sidebar from "../components/community_comp/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { API_URL } from "../contexts/AuthContext";

const CommunityLayout = () => {
  const { communityId } = useParams();
  const { accessToken, fetchWithAuth } = useAuth(); // Make sure you have fetchWithAuth here
  const [community, setCommunity] = useState(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  // 1. Fetch details for the active community ID
  const fetchCommunityDetails = useCallback(async () => {
    if (!accessToken || !communityId) return;

    try {
      // Adjust this URL to match your actual backend endpoint for a single community
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}`,
      );
      if (response && response.ok) {
        const data = await response.json();
        // Adjust based on your API response structure (e.g., data or data.community)
        setCommunity(data?.community || data);
      }
    } catch (error) {
      console.error("Failed to fetch community layout details:", error);
    }
  }, [communityId, accessToken, fetchWithAuth]);

  // 2. Automatically sync every time the user clicks a different community link
  useEffect(() => {
    fetchCommunityDetails();
  }, [fetchCommunityDetails]);

  return (
    <div
      key={communityId} // 👈 Add this key here!
      className="grid grid-rows-[auto_1fr] w-full max-w-[1920px] mx-auto h-screen overflow-hidden"
    >
      <Header onMenuClick={toggleSidebar} communityName={community?.name} />
      <main className="flex min-h-0">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className="flex-1 w-full overflow-y-auto">
          <Outlet context={{ community, setCommunity }} />
        </div>
      </main>
    </div>
  );
};

export default CommunityLayout;
