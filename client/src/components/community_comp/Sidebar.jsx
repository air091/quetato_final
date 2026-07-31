import { Compass, House, Newspaper, Plus } from "lucide-react";
import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCommunity } from "../../hooks/useCommunity";

const Sidebar = ({ isOpen }) => {
  const { accessToken } = useAuth();
  const { myCommunities, getMyCommunities } = useCommunity();

  useEffect(() => {
    if (accessToken) {
      getMyCommunities();
    }
  }, [accessToken, getMyCommunities]);

  // 🛠️ COMBINE OWNED AND JOINED COMMUNITIES INTO A SINGLE FLAT ARRAY SAFELY
  const flatCommunities = [
    ...(myCommunities?.owned || []),
    ...(myCommunities?.joined || []),
  ];

  return (
    <nav
      className={`absolute lg:relative z-50 h-full bg-stone-50 border-r border-stone-200/80 p-2 transition-all duration-300 ease-in-out flex flex-col justify-between selection:bg-orange-500/10 selection:text-orange-950 ${
        isOpen
          ? "translate-x-0 w-[260px]" // Mobile & Desktop Open State
          : "-translate-x-full lg:translate-x-0 lg:w-[60px]" // Mobile Closed (hidden) vs Desktop Closed (60px)
      }`}
    >
      <div className="flex flex-col gap-y-4">
        {/* CORE NAV LINKS */}
        <ul className="flex flex-col gap-y-1">
          {/* HOME */}
          <li>
            <NavLink
              to="/"
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

          {/* SESSIONS */}
          <li>
            <NavLink
              to="/community/sessions"
              end
              title={!isOpen ? "Sessions" : undefined}
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
                  <Newspaper
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
                    Sessions
                  </span>
                </>
              )}
            </NavLink>
          </li>

          {/* FIND */}
          <li>
            <NavLink
              to="/community/find"
              title={!isOpen ? "Find" : undefined}
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
                  <Compass
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
                    Find
                  </span>
                </>
              )}
            </NavLink>
          </li>

          {/* CREATE COMMUNITY BUTTON */}
          <li className="mt-2">
            <NavLink
              to="create-community"
              title={!isOpen ? "Create community" : undefined}
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
                  <Plus
                    size={18}
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
                    Create community
                  </span>
                </>
              )}
            </NavLink>
          </li>
        </ul>

        {/* COMMUNITIES LIST SECTION */}
        <div className="flex flex-col gap-y-2 border-t border-stone-200/80 pt-4">
          <div
            className={`items-center justify-between px-2 transition-all duration-200 ${
              isOpen ? "flex opacity-100" : "hidden opacity-0"
            }`}
          >
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              Communities
            </span>
            <NavLink
              to="my-community-all"
              className="text-[10px] font-bold text-orange-500 hover:text-orange-600 hover:underline transition-colors"
            >
              See all
            </NavLink>
          </div>

          <ul className="flex flex-col gap-y-1">
            {flatCommunities.map((myCommunity) => (
              <li key={myCommunity.id}>
                <NavLink
                  to={`/community/${myCommunity.id}/sessions`}
                  title={!isOpen ? myCommunity.name : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl transition-all duration-200 group relative ${
                      isOpen
                        ? "p-2.5 gap-x-4 justify-start px-4 text-xs"
                        : "p-2 justify-center"
                    } ${
                      isActive
                        ? "font-bold bg-orange-50/60 text-orange-600 border-l-2 border-orange-500 rounded-l-none"
                        : "text-stone-600 hover:bg-stone-200/50 hover:text-stone-900"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isOpen ? (
                        <span className="truncate tracking-wide font-bold">
                          {myCommunity.name}
                        </span>
                      ) : (
                        /* Elegant single-letter potato fallback badge when minimized */
                        <div
                          className={`w-8 h-8 rounded-lg font-extrabold flex items-center justify-center text-xs uppercase shadow-sm transition-all duration-200 group-hover:scale-105 ${
                            isActive
                              ? "bg-orange-500 text-white shadow-orange-500/10"
                              : "bg-orange-50/80 text-orange-600 border border-orange-100 group-hover:bg-orange-100"
                          }`}
                        >
                          {myCommunity.name?.charAt(0) || "C"}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
