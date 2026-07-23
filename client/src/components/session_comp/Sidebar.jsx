import React, { useEffect, useRef } from "react";
import { NavLink, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Gamepad2,
  LayoutDashboard,
  UsersRound,
} from "lucide-react";

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
        clickedElement.closest("textarea") ||
        clickedElement.closest(".player");

      if (isInteractive) {
        return;
      }

      // If sidebar is minimized (not fully open), don't trigger click-away close behavior
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

  const navItems = [
    {
      to: `/community/${communityId}/sessions`,
      label: "Back to community",
      icon: ArrowLeft,
      end: true,
      isBackAction: true,
    },
    {
      to: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      to: "players",
      label: "Players",
      icon: UsersRound,
    },
    {
      to: "game",
      label: "Game",
      icon: Gamepad2,
    },
    {
      to: "payment",
      label: "Payment",
      icon: CreditCard,
    },
  ];

  return (
    <nav
      ref={sidebarRef}
      className={`h-screen bg-stone-50 border-r border-stone-200/80 p-2 transition-all duration-300 ease-in-out flex flex-col justify-between selection:bg-orange-500/10 selection:text-orange-950 ${
        isOpen ? "w-[260px]" : "w-[60px]"
      }`}
    >
      <ul className="flex flex-col gap-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <NavLink
                to={item.to}
                end={item.end}
                title={!isOpen ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center p-2.5 rounded-xl rounded-l-none transition-all duration-200 group relative ${
                    isOpen ? "gap-x-4 justify-start px-4" : "justify-center"
                  } ${
                    isActive
                      ? "font-bold bg-orange-50/60 text-orange-600 border-l-2 border-orange-500 rounded-l-none"
                      : "text-stone-600 hover:bg-stone-200/50 hover:text-stone-900"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={20}
                      className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                        isActive
                          ? "text-orange-500"
                          : "text-stone-500 group-hover:text-stone-900"
                      }`}
                    />
                    <span
                      className={`text-xs font-bold tracking-wide transition-all duration-200 whitespace-nowrap overflow-hidden ${
                        isOpen
                          ? "opacity-100 max-w-[200px]"
                          : "opacity-0 max-w-0 pointer-events-none"
                      }`}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default Sidebar;
