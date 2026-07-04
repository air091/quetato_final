import {
  ArrowLeft,
  CreditCard,
  Gamepad2,
  LayoutDashboard,
  UsersRound,
} from "lucide-react";
import React, { useEffect, useRef } from "react";
import { NavLink, useParams } from "react-router-dom";

const Sidebar = ({ isOpen, onClose }) => {
  const { communityId } = useParams();
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedElement = event.target;

      const isInteractive =
        clickedElement.closest("button") ||
        clickedElement.closest("a") ||
        clickedElement.closest("input") ||
        clickedElement.closest("select") ||
        clickedElement.closest(".player");

      if (isInteractive) {
        return;
      }

      // If sidebar is minimized (not fully open), we don't trigger the click-away close behavior
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
        isOpen ? "w-[228px]" : "w-[60px]"
      }`}
    >
      <ul className="flex flex-col gap-y-1">
        {/* BACK TO COMMUNITY */}
        <li>
          <NavLink
            to={`/community/${communityId}/sessions`}
            end
            title={!isOpen ? "Back to community" : undefined}
            className={({ isActive }) =>
              `flex items-center p-2.5 rounded-xl transition-all duration-200 group text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 ${
                isOpen ? "gap-x-4 justify-start" : "justify-center"
              } ${isActive ? "font-semibold bg-stone-200 text-stone-900" : ""}`
            }
          >
            <ArrowLeft size={20} className="shrink-0" />
            <span
              className={`text-sm tracking-wide transition-opacity duration-200 whitespace-nowrap ${
                isOpen ? "opacity-100" : "hidden"
              }`}
            >
              Back to community
            </span>
          </NavLink>
        </li>

        {/* DASHBOARD */}
        <li>
          <NavLink
            to="dashboard"
            title={!isOpen ? "Dashboard" : undefined}
            className={({ isActive }) =>
              `flex items-center p-2.5 rounded-xl transition-all duration-200 group text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 ${
                isOpen ? "gap-x-4 justify-start" : "justify-center"
              } ${isActive ? "font-semibold bg-stone-200 text-stone-900" : ""}`
            }
          >
            <LayoutDashboard size={20} className="shrink-0" />
            <span
              className={`text-sm tracking-wide transition-opacity duration-200 whitespace-nowrap ${
                isOpen ? "opacity-100" : "hidden"
              }`}
            >
              Dashboard
            </span>
          </NavLink>
        </li>

        {/* PLAYERS */}
        <li>
          <NavLink
            to="players"
            title={!isOpen ? "Players" : undefined}
            className={({ isActive }) =>
              `flex items-center p-2.5 rounded-xl transition-all duration-200 group text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 ${
                isOpen ? "gap-x-4 justify-start" : "justify-center"
              } ${isActive ? "font-semibold bg-stone-200 text-stone-900" : ""}`
            }
          >
            <UsersRound size={20} className="shrink-0" />
            <span
              className={`text-sm tracking-wide transition-opacity duration-200 whitespace-nowrap ${
                isOpen ? "opacity-100" : "hidden"
              }`}
            >
              Players
            </span>
          </NavLink>
        </li>

        {/* GAME */}
        <li>
          <NavLink
            to="game"
            title={!isOpen ? "Game" : undefined}
            className={({ isActive }) =>
              `flex items-center p-2.5 rounded-xl transition-all duration-200 group text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 ${
                isOpen ? "gap-x-4 justify-start" : "justify-center"
              } ${isActive ? "font-semibold bg-stone-200 text-stone-900" : ""}`
            }
          >
            <Gamepad2 size={20} className="shrink-0" />
            <span
              className={`text-sm tracking-wide transition-opacity duration-200 whitespace-nowrap ${
                isOpen ? "opacity-100" : "hidden"
              }`}
            >
              Game
            </span>
          </NavLink>
        </li>

        {/* PAYMENT */}
        <li>
          <NavLink
            to="payment"
            title={!isOpen ? "Payment" : undefined}
            className={({ isActive }) =>
              `flex items-center p-2.5 rounded-xl transition-all duration-200 group text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 ${
                isOpen ? "gap-x-4 justify-start" : "justify-center"
              } ${isActive ? "font-semibold bg-stone-200 text-stone-900" : ""}`
            }
          >
            <CreditCard size={20} className="shrink-0" />
            <span
              className={`text-sm tracking-wide transition-opacity duration-200 whitespace-nowrap ${
                isOpen ? "opacity-100" : "hidden"
              }`}
            >
              Payment
            </span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;
