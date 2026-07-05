import { Compass, House, Newspaper, Plus } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const Sidebar = ({ isOpen, onClose }) => {
  const { accessToken } = useAuth();
  const [myCommunities, setMyCommunities] = useState([]);
  const sidebarRef = useRef(null);

  const getMyCommunity = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/communities/my-communities`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
        },
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (!data.success) {
        throw new Error(data?.message || "Internal server error");
      }

      setMyCommunities(data.myCommunities || []);
    } catch (error) {
      console.error("Failed to fetch communities:", error);
    }
  }, [accessToken]);

  useEffect(() => {
    getMyCommunity();
  }, [getMyCommunity]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedElement = event.target;

      const isInteractive =
        clickedElement.closest("button") ||
        clickedElement.closest("a") ||
        clickedElement.closest("input") ||
        clickedElement.closest("select") ||
        clickedElement.closest("textarea");

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
      <div className="flex flex-col gap-y-4">
        {/* CORE NAV LINKS */}
        <ul className="flex flex-col gap-y-1">
          {/* HOME */}
          <li>
            <NavLink
              to="/"
              title={!isOpen ? "Home" : undefined}
              className={({ isActive }) =>
                `flex items-center p-2.5 rounded-xl transition-all duration-200 text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 ${
                  isOpen ? "gap-x-4 justify-start" : "justify-center"
                } ${isActive ? "font-semibold bg-stone-200 text-stone-900" : ""}`
              }
            >
              <House size={20} className="shrink-0" />
              <span
                className={`text-sm tracking-wide whitespace-nowrap ${isOpen ? "block" : "hidden"}`}
              >
                Home
              </span>
            </NavLink>
          </li>

          {/* SESSIONS */}
          <li>
            <NavLink
              to="/community/sessions"
              end
              title={!isOpen ? "Sessions" : undefined}
              className={({ isActive }) =>
                `flex items-center p-2.5 rounded-xl transition-all duration-200 text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 ${
                  isOpen ? "gap-x-4 justify-start" : "justify-center"
                } ${isActive ? "font-semibold bg-stone-200 text-stone-900" : ""}`
              }
            >
              <Newspaper size={20} className="shrink-0" />
              <span
                className={`text-sm tracking-wide whitespace-nowrap ${isOpen ? "block" : "hidden"}`}
              >
                Sessions
              </span>
            </NavLink>
          </li>

          {/* FIND */}
          <li>
            <NavLink
              to="/community/find"
              title={!isOpen ? "Find" : undefined}
              className={({ isActive }) =>
                `flex items-center p-2.5 rounded-xl transition-all duration-200 text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 ${
                  isOpen ? "gap-x-4 justify-start" : "justify-center"
                } ${isActive ? "font-semibold bg-stone-200 text-stone-900" : ""}`
              }
            >
              <Compass size={20} className="shrink-0" />
              <span
                className={`text-sm tracking-wide whitespace-nowrap ${isOpen ? "block" : "hidden"}`}
              >
                Find
              </span>
            </NavLink>
          </li>

          {/* CREATE COMMUNITY BUTTON */}
          <li className="mt-2">
            <NavLink
              to="create-community"
              title={!isOpen ? "Create community" : undefined}
              className={({ isActive }) =>
                `flex items-center p-2.5 rounded-xl transition-all duration-200 text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 ${
                  isOpen ? "gap-x-4 justify-start" : "justify-center"
                } ${isActive ? "font-semibold bg-stone-200 text-stone-900" : ""}`
              }
            >
              <Plus size={18} className="shrink-0" />
              <span className={isOpen ? "block" : "hidden"}>
                Create community
              </span>
            </NavLink>
          </li>
        </ul>

        {/* COMMUNITIES LIST SECTION */}
        <div className="flex flex-col gap-y-2 border-t border-stone-200 pt-4">
          <div
            className={`items-center justify-between px-2 ${isOpen ? "flex" : "hidden"}`}
          >
            <span className="text-[12px] font-bold text-stone-400 uppercase tracking-wider">
              Communities
            </span>
            <NavLink
              to="my-community-all"
              className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 underline"
            >
              See all
            </NavLink>
          </div>

          <ul className="flex flex-col gap-y-1">
            {myCommunities?.map((myCommunity) => (
              <li key={myCommunity.id}>
                <NavLink
                  to={`/community/${myCommunity.id}`}
                  title={!isOpen ? myCommunity.name : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl transition-all duration-200 text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 ${
                      isOpen
                        ? "p-2.5 gap-x-4 justify-start text-sm"
                        : "p-2 justify-center"
                    } ${isActive ? "font-semibold bg-stone-200 text-stone-900" : ""}`
                  }
                >
                  {isOpen ? (
                    <span className="truncate tracking-wide">
                      {myCommunity.name}
                    </span>
                  ) : (
                    /* Elegant single-letter fallback badge when minimized */
                    <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-700 font-bold flex items-center justify-center text-xs uppercase shadow-sm group-hover:bg-stone-300 transition-colors">
                      {myCommunity.name?.charAt(0) || "C"}
                    </div>
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
