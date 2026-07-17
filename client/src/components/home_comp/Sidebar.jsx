import { Handshake, House, UsersRound } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

const Sidebar = ({ isOpen, onClose }) => {
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedElement = event.target;

      const isInteractive =
        clickedElement.closest("button") ||
        clickedElement.closest("a") ||
        clickedElement.closest("input") ||
        clickedElement.closest("select") ||
        clickedElement.closest("textarea"); // Added consistency check

      if (isInteractive) {
        return;
      }

      // If sidebar is minimized (not fully open), we don't trigger click-away close behavior
      if (!isOpen) return;

      if (sidebarRef.current && !sidebarRef.current.contains(clickedElement)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <nav
      ref={sidebarRef}
      className={`h-screen bg-stone-50 border-r border-stone-200 p-2 transition-all duration-300 ease-in-out flex flex-col justify-between ${
        isOpen ? "w-[260px]" : "w-[60px]"
      }`}
    >
      <ul className="flex flex-col gap-y-1">
        {/* HOME */}
        <li>
          <NavLink
            to="/"
            end
            title={!isOpen ? "Home" : undefined}
            className={({ isActive }) =>
              `flex items-center p-2.5 rounded-xl transition-all duration-200 text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 group ${
                isOpen ? "gap-x-4 justify-start" : "justify-center"
              } ${isActive ? "font-semibold bg-stone-200 text-stone-900" : ""}`
            }
          >
            <House
              size={20}
              className="shrink-0 transition-transform duration-200 group-hover:scale-105"
            />
            <span
              className={`text-sm tracking-wide transition-all duration-200 whitespace-nowrap overflow-hidden ${
                isOpen
                  ? "opacity-100 max-w-[200px]"
                  : "opacity-0 max-w-0 pointer-events-none"
              }`}
            >
              Home
            </span>
          </NavLink>
        </li>

        {/* FRIENDS */}
        <li>
          <NavLink
            to="/find-friends"
            title={!isOpen ? "Friends" : undefined}
            className={({ isActive }) =>
              `flex items-center p-2.5 rounded-xl transition-all duration-200 text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 group ${
                isOpen ? "gap-x-4 justify-start" : "justify-center"
              } ${isActive ? "font-semibold bg-stone-200 text-stone-900" : ""}`
            }
          >
            <Handshake
              size={20}
              className="shrink-0 transition-transform duration-200 group-hover:scale-105"
            />
            <span
              className={`text-sm tracking-wide transition-all duration-200 whitespace-nowrap overflow-hidden ${
                isOpen
                  ? "opacity-100 max-w-[200px]"
                  : "opacity-0 max-w-0 pointer-events-none"
              }`}
            >
              Friends
            </span>
          </NavLink>
        </li>

        {/* COMMUNITY */}
        <li>
          <NavLink
            to="/community/sessions"
            title={!isOpen ? "Community" : undefined}
            className={({ isActive }) =>
              `flex items-center p-2.5 rounded-xl transition-all duration-200 text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 group ${
                isOpen ? "gap-x-4 justify-start" : "justify-center"
              } ${isActive ? "font-semibold bg-stone-200 text-stone-900" : ""}`
            }
          >
            <UsersRound
              size={20}
              className="shrink-0 transition-transform duration-200 group-hover:scale-105"
            />
            <span
              className={`text-sm tracking-wide transition-all duration-200 whitespace-nowrap overflow-hidden ${
                isOpen
                  ? "opacity-100 max-w-[200px]"
                  : "opacity-0 max-w-0 pointer-events-none"
              }`}
            >
              Community
            </span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;
