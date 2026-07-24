import React from "react";
import { NavLink } from "react-router-dom";

const Navbar = () => {
  return (
    <nav>
      <ul className="flex items-center gap-x-2 justify-center">
        <li>
          <NavLink
            to="all"
            end
            className={({ isActive }) =>
              `block py-1 px-2 hover:bg-orange-200 hover:text-stone-800 rounded transition-colors ${
                isActive
                  ? "bg-orange-500 text-white font-medium"
                  : "bg-stone-100 text-stone-700"
              }`
            }
          >
            All
          </NavLink>
        </li>
        <li>
          <NavLink
            to="dashboard"
            className={({ isActive }) =>
              `block py-1 px-2 hover:bg-orange-200 hover:text-stone-800 rounded transition-colors ${
                isActive
                  ? "bg-orange-500 text-white font-medium"
                  : "bg-stone-100 text-stone-700"
              }`
            }
          >
            Dashboard
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
