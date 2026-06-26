import {
  ArrowLeft,
  CreditCard,
  Gamepad2,
  Handshake,
  House,
  LayoutDashboard,
  UsersRound,
} from "lucide-react";
import React from "react";
import { NavLink, useParams } from "react-router-dom"; // 👈 Swap useNavigate for useParams

const Sidebar = () => {
  const { communityId } = useParams(); // 👈 Grab the current community ID

  return (
    <nav className="w-full max-w-[260px] p-2">
      <ul className="flex flex-col gap-y-1">
        <li>
          <NavLink
            to={`/community/${communityId}/sessions`} // 👈 Explicit path back to the community
            end
            className={({ isActive }) =>
              `flex items-center gap-x-4 hover:bg-gray-300 p-2 rounded ${isActive ? "font-medium bg-gray-200" : ""}`
            }
          >
            <ArrowLeft size={20} /> Back to community
          </NavLink>
        </li>
        <li>
          <NavLink
            to="dashboard"
            className={({ isActive }) =>
              `flex items-center gap-x-4 hover:bg-gray-300 p-2 rounded ${isActive ? "font-medium bg-gray-200" : ""}`
            }
          >
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to="players"
            className={({ isActive }) =>
              `flex items-center gap-x-4 hover:bg-gray-300 p-2 rounded ${isActive ? "font-medium bg-gray-200" : ""}`
            }
          >
            <UsersRound size={20} /> Players
          </NavLink>
        </li>
        <li>
          <NavLink
            to="game"
            className={({ isActive }) =>
              `flex items-center gap-x-4 hover:bg-gray-300 p-2 rounded ${isActive ? "font-medium bg-gray-200" : ""}`
            }
          >
            <Gamepad2 size={20} /> Game
          </NavLink>
        </li>
        <li>
          <NavLink
            to="payment"
            className={({ isActive }) =>
              `flex items-center gap-x-4 hover:bg-gray-300 p-2 rounded ${isActive ? "font-medium bg-gray-200" : ""}`
            }
          >
            <CreditCard size={20} /> Payment
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;
