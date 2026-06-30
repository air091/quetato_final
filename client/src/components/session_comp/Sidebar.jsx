import {
  ArrowLeft,
  CreditCard,
  Gamepad2,
  Handshake,
  House,
  LayoutDashboard,
  UsersRound,
} from "lucide-react";
import React, { useEffect, useRef } from "react";
import { NavLink, useParams } from "react-router-dom"; // 👈 Swap useNavigate for useParams

const Sidebar = ({ isOpen, onClose }) => {
  const { communityId } = useParams(); // 👈 Grab the current community ID
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedElement = event.target;

      // 2. Identify interactive things to completely ignore
      const isInteractive =
        clickedElement.closest("button") ||
        clickedElement.closest("a") ||
        clickedElement.closest("input") ||
        clickedElement.closest("select") ||
        clickedElement.closest(".player");

      // If they clicked a button (like the Menu button!) or a link, do absolutely nothing
      if (isInteractive) {
        return;
      }

      // 3. If they clicked outside the sidebar (empty space/labels), trigger parent close function
      if (sidebarRef.current && !sidebarRef.current.contains(clickedElement)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // 4. Use the prop to control rendering visibility
  if (!isOpen) return null;

  return (
    <nav ref={sidebarRef} className="w-full max-w-[260px] p-2">
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
