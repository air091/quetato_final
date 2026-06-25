import React from "react";
import { NavLink, Outlet } from "react-router-dom";

const MainContent = () => {
  return (
    <div className="border-2 border-red-500 px-4 flex flex-col gap-y-2 py-2 overflow-hidden">
      {/* sub header */}
      <header>
        <div className="flex items-center gap-x-4 py-1">
          <NavLink
            to="activities"
            end
            className={({ isActive }) =>
              `flex items-center gap-x-4 hover:border-b-2 hover:border-gray-300 px-3 py-1 ${isActive ? "border-b-2 border-gray-200" : null}`
            }
          >
            Activities
          </NavLink>
          <NavLink
            to="players"
            className={({ isActive }) =>
              `flex items-center gap-x-4 hover:border-b-2 hover:border-gray-300 px-3 py-1 ${isActive ? "border-b-2 border-gray-200" : null}`
            }
          >
            Players
          </NavLink>
          <NavLink
            to="details"
            className={({ isActive }) =>
              `flex items-center gap-x-4 hover:border-b-2 hover:border-gray-300 px-3 py-1 ${isActive ? "border-b-2 border-gray-200" : null}`
            }
          >
            Details
          </NavLink>
        </div>
        <div></div>
      </header>

      {/* main */}
      <main className="">
        <Outlet />
      </main>
    </div>
  );
};

export default MainContent;
