import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import SubHeader from "./SubHeader";

const MainContent = () => {
  return (
    <div className="px-4 flex flex-col gap-y-2 py-2 overflow-hidden">
      {/* sub header */}
      <SubHeader />

      {/* main */}
      <main className="">
        <Outlet />
      </main>
    </div>
  );
};

export default MainContent;
