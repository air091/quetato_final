import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/home_comp/Header";
import Sidebar from "../components/session_comp/Sidebar";
import { SessionProvider } from "../contexts/SessionContext";

const SessionLayout = () => {
  // Initialize sidebar open state based on screen width (closed on mobile by default)
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => window.innerWidth >= 768,
  );

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="grid grid-rows-[auto_1fr] w-full max-w-[1920px] mx-auto h-screen overflow-hidden relative">
      <Header onMenuClick={toggleSidebar} />
      <main className="flex min-h-0 relative">
        {/* Mobile Backdrop Overlay when sidebar is open */}
        {isSidebarOpen && (
          <div
            className="absolute inset-0 z-40 bg-stone-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <SessionProvider>
          <div className="flex-1 w-full px-1 sm:px-2 lg:px-4 py-6 overflow-y-auto">
            <Outlet />
          </div>
        </SessionProvider>
      </main>
    </div>
  );
};

export default SessionLayout;
