import React from "react";
import { NavLink } from "react-router-dom";

const SubHeader = () => {
  const tabBaseStyles =
    "flex items-center text-sm font-semibold px-1 py-2 border-b-2 transition-all duration-150 outline-none select-none";

  return (
    <header className="border-b border-stone-100 flex items-center justify-center bg-white px-6">
      <nav className="flex items-center gap-x-6">
        <NavLink
          to="sessions"
          end
          className={({ isActive }) =>
            `${tabBaseStyles} ${
              isActive
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-200"
            }`
          }
        >
          Sessions
        </NavLink>

        <NavLink
          to="players"
          className={({ isActive }) =>
            `${tabBaseStyles} ${
              isActive
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-200"
            }`
          }
        >
          Players
        </NavLink>

        <NavLink
          to="details"
          className={({ isActive }) =>
            `${tabBaseStyles} ${
              isActive
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-200"
            }`
          }
        >
          Settings
        </NavLink>
      </nav>
    </header>
  );
};

export default SubHeader;
