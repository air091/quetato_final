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
              `block py-1 px-2 bg-stone-100 hover:bg-stone-200 hover:text-stone-800 rounded ${isActive ? "bg-stone-800 text-stone-100" : null}`
            }
          >
            All
          </NavLink>
        </li>
        <li>
          <NavLink
            to="dashboard"
            className={({ isActive }) =>
              `block py-1 px-2 bg-stone-100 hover:bg-stone-200 hover:text-stone-800 rounded ${isActive ? "bg-stone-800 text-stone-100" : null}`
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
