import React from "react";
import Header from "../components/home_comp/Header";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/home_comp/Sidebar";

const HomeLayout = () => {
  return (
    <div className="grid grid-rows-[auto_1fr] w-full max-w-[1920px] mx-auto h-screen overflow-hidden">
      <Header />
      <main className="flex min-h-0">
        <Sidebar />
        <div className="flex-1 w-full px-4 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default HomeLayout;
