import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import SubHeader from "./SubHeader";

const MainContent = ({ outletContext, communityPlayer }) => {
  return (
    <div className="px-4 flex flex-col gap-y-2 py-2 overflow-hidden">
      {/* sub header */}
      <SubHeader />

      {/* main */}
      <main className="">
        <Outlet context={outletContext} />
      </main>
    </div>
  );
};

export default MainContent;
