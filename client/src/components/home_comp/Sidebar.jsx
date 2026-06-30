import { Handshake, House, UsersRound } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

// 1. Accept isOpen and onClose props from the parent
const Sidebar = ({ isOpen, onClose }) => {
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedElement = event.target;

      // 2. Identify interactive things to completely ignore
      const isInteractive =
        clickedElement.closest("button") ||
        clickedElement.closest("a") ||
        clickedElement.closest("input") ||
        clickedElement.closest("select");

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
    <nav
      ref={sidebarRef}
      className="w-full max-w-[260px] p-2 bg-white shadow-md h-screen"
    >
      <ul className="flex flex-col gap-y-1">
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
            <Handshake size={20} /> Friends
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/community/sessions"
            className={({ isActive }) =>
              `flex items-center gap-x-4 hover:bg-gray-300 p-2 rounded ${isActive ? "font-medium bg-gray-200" : null}`
            }
          >
            <UsersRound size={20} /> Community
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;
