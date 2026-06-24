import { Handshake, House, UsersRound } from "lucide-react";
import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar = () => {
  return (
    <nav className="w-full max-w-[260px] border px-2 h-full">
      <ul>
        <li>
          <NavLink
            to="/"
            className="flex items-center gap-x-4 hover:bg-gray-200 p-2 rounded"
          >
            <House size={20} /> Home
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/find-friends"
            className="flex items-center gap-x-4 hover:bg-gray-200 p-2 rounded"
          >
            <Handshake size={20} /> Find Friends
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/find-community"
            className="flex items-center gap-x-4 hover:bg-gray-200 p-2 rounded"
          >
            <UsersRound size={20} /> Find Community
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;
