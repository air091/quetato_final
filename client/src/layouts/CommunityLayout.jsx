import React, { useState, useEffect, useCallback } from "react";
import { Outlet, useParams } from "react-router-dom";
import Header from "../components/home_comp/Header";
import Sidebar from "../components/community_comp/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { API_URL } from "../contexts/AuthContext";

const CommunityLayout = () => {
  const { communityId } = useParams();
  const { accessToken, fetchWithAuth } = useAuth();
  const [community, setCommunity] = useState(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  // 1. Fetch details for the active community ID
  const fetchCommunityDetails = useCallback(async () => {
    if (!accessToken || !communityId) return;

    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}`,
      );
      if (response && response.ok) {
        const data = await response.json();
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
      key={communityId}
      className="grid grid-rows-[auto_1fr] w-full max-w-[1920px] mx-auto h-screen overflow-hidden bg-white"
    >
      <Header onMenuClick={toggleSidebar} communityName={community?.name} />
      {/* Added relative positioning for the mobile absolute sidebar */}
      <main className="relative flex min-h-0">
        {/* Backdrop Overlay for Mobile/Tablet */}
        {isSidebarOpen && (
          <div
            className="absolute inset-0 z-40 bg-stone-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        <Sidebar isOpen={isSidebarOpen} />

        {/* Added responsive padding to match Home layout */}
        <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto">
          <Outlet context={{ community, setCommunity }} />
        </div>
      </main>
    </div>
  );
};

export default CommunityLayout;
