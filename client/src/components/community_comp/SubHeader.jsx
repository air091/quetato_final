import React from "react";
import { NavLink } from "react-router-dom";

const SubHeader = () => {
  return (
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
  );
};

export default SubHeader;
