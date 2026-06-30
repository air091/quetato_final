import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/home_comp/Header";
import Sidebar from "../components/community_comp/Sidebar";

const CommunityLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Function to toggle open/closed
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  // Function specifically to close it
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="grid grid-rows-[auto_1fr] w-full max-w-[1920px] mx-auto h-screen overflow-hidden">
      <Header onMenuClick={toggleSidebar} />
      <main className="flex min-h-0">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className="flex-1 w-full overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default CommunityLayout;
