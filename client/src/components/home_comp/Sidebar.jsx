import { Handshake, House, Info, UsersRound } from "lucide-react";
import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar = ({ isOpen }) => {
  return (
    <nav
      className={`absolute lg:relative z-50 h-full bg-stone-50 border-r border-stone-200/80 p-2 transition-all duration-300 ease-in-out flex flex-col justify-between selection:bg-orange-500/10 selection:text-orange-950 ${
        isOpen
          ? "translate-x-0 w-[260px]" // Mobile & Desktop Open State
          : "-translate-x-full lg:translate-x-0 lg:w-[60px]" // Mobile Closed (hidden) vs Desktop Closed (60px)
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
                <House
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
                  Home
                </span>
              </>
            )}
          </NavLink>
        </li>

        {/* FRIENDS */}
        <li>
          <NavLink
            to="/find-friends"
            title={!isOpen ? "Friends" : undefined}
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
                <Handshake
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
                  Friends
                </span>
              </>
            )}
          </NavLink>
        </li>

        {/* COMMUNITY */}
        <li>
          <NavLink
            to="/community/sessions"
            title={!isOpen ? "Community" : undefined}
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
                <UsersRound
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
                  Community
                </span>
              </>
            )}
          </NavLink>
        </li>

        {/* About */}
        <li>
          <NavLink
            to="/Notice"
            title={!isOpen ? "Notice" : undefined}
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
                <Info
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
                  Notice
                </span>
              </>
            )}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;
