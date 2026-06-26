import React from "react";
import { NavLink } from "react-router-dom";

const Navbar = () => {
  return (
    <nav>
      <ul className="flex items-center gap-x-4">
        <li>
          <NavLink to="all" end>
            All
          </NavLink>
        </li>
        <li>
          <NavLink to="dashboard">Dashboard</NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
