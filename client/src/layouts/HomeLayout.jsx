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
    <div className="grid grid-rows-[auto_1fr] w-full max-w-[1920px] mx-auto h-screen overflow-hidden bg-white">
      <Header onMenuClick={toggleSidebar} />
      {/* Added 'relative' to main so the absolute sidebar and backdrop fit perfectly */}
      <main className="relative flex min-h-0">
        {/* Backdrop Overlay for Mobile/Tablet (Visible only when open and screen < 1024px) */}
        {isSidebarOpen && (
          <div
            className="absolute inset-0 z-40 bg-stone-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

        {/* Responsive padding updates: px-4 (mobile) -> px-6 (tablet) -> px-8 (desktop) */}
        <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default HomeLayout;
