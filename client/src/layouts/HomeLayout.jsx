import React from "react";
import Header from "../components/home_comp/Header";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/home_comp/Sidebar";

const HomeLayout = () => {
  return (
    <div className="flex flex-col w-full max-w-[1920px] border-2 border-red-500 mx-auto h-screen">
      <Header />
      <main className="border-2 border-blue-500 h-full flex">
        <Sidebar />
        <div className="px-4 py-2 border w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default HomeLayout;
