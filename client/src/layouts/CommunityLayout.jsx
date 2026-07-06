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
