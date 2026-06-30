import React, { useState } from "react";
import Header from "../components/home_comp/Header";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/home_comp/Sidebar";

const HomeLayout = () => {
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
        <div className="flex-1 w-full px-4 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default HomeLayout;
