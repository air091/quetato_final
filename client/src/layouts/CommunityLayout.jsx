import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/home_comp/Header";
import Sidebar from "../components/community_comp/Sidebar";

const CommunityLayout = () => {
  return (
    <div className="grid grid-rows-[auto_1fr] w-full max-w-[1920px] mx-auto h-screen overflow-hidden">
      <Header />
      <main className="flex min-h-0">
        <Sidebar />
        <div className="flex-1 w-full overflow-y-auto border">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default CommunityLayout;
