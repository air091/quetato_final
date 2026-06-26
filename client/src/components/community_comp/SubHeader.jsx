import React from "react";
import { NavLink } from "react-router-dom";

const SubHeader = () => {
  return (
    <header>
      <div className="flex items-center gap-x-4 py-1">
        <NavLink
          to="sessions"
          end
          className={({ isActive }) =>
            `flex items-center gap-x-4 hover:border-b-2 hover:border-gray-400 px-3 py-1 ${isActive ? "border-b-2 border-gray-500" : null}`
          }
        >
          Sessions
        </NavLink>
        <NavLink
          to="players"
          className={({ isActive }) =>
            `flex items-center gap-x-4 hover:border-b-2 hover:border-gray-400 px-3 py-1 ${isActive ? "border-b-2 border-gray-500" : null}`
          }
        >
          Players
        </NavLink>
        <NavLink
          to="details"
          className={({ isActive }) =>
            `flex items-center gap-x-4 hover:border-b-2 hover:border-gray-400 px-3 py-1 ${isActive ? "border-b-2 border-gray-500" : null}`
          }
        >
          Details
        </NavLink>
      </div>
      <div></div>
    </header>
  );
};

export default SubHeader;
