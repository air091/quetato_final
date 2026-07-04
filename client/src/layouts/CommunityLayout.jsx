import React, { useState, useEffect, useCallback } from "react";
import { Outlet, useParams } from "react-router-dom";
import Header from "../components/home_comp/Header";
import Sidebar from "../components/community_comp/Sidebar";
import { useAuth } from "../hooks/useAuth"; // Adjust path if needed

const CommunityLayout = () => {
  const { communityId } = useParams();
  const { accessToken } = useAuth();
  const [community, setCommunity] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Single source of truth fetcher for the entire sub-tree
  const getCommunityById = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await fetch(
        `http://localhost:8000/api/communities/${communityId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (!data.success)
        throw new Error(data?.message || "Internal server error");

      setCommunity(data.community);
    } catch (error) {
      console.error("Get community by ID failed", error);
    }
  }, [accessToken, communityId]);

  useEffect(() => {
    getCommunityById();
  }, [getCommunityById]);

  return (
    <div className="grid grid-rows-[auto_1fr] w-full max-w-[1920px] mx-auto h-screen overflow-hidden">
      {/* 1. Pass the dynamic name into the Header prop hook */}
      <Header onMenuClick={toggleSidebar} communityName={community?.name} />
      <main className="flex min-h-0">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className="flex-1 w-full overflow-y-auto">
          {/* 2. Expose layout state down through the router pipeline */}
          <Outlet context={{ community, setCommunity }} />
        </div>
      </main>
    </div>
  );
};

export default CommunityLayout;
