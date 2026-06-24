import { Handshake, House, UsersRound } from "lucide-react";
import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar = () => {
  return (
    <nav className="w-full max-w-[260px] border p-2 h-full">
      <ul>
        <li>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-x-4 hover:bg-gray-300 p-2 rounded ${isActive ? "font-medium bg-gray-200" : null}`
            }
          >
            <House size={20} /> Home
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/find-friends"
            className={({ isActive }) =>
              `flex items-center gap-x-4 hover:bg-gray-300 p-2 rounded ${isActive ? "font-medium bg-gray-200" : null}`
            }
          >
            <Handshake size={20} /> Find Friends
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/find-community"
            className={({ isActive }) =>
              `flex items-center gap-x-4 hover:bg-gray-300 p-2 rounded ${isActive ? "font-medium bg-gray-200" : null}`
            }
          >
            <UsersRound size={20} /> Find Community
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;
