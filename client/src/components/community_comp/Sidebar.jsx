import { Compass, Handshake, House, Newspaper, Plus } from "lucide-react";
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

      return setMyCommunities(data.myCommunities);
    } catch (error) {
      console.error("Failed to fetch communities:", error);
    }
  }, [accessToken]);

  useEffect(() => {
    getMyCommunity();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedElement = event.target;

      // 2. Identify interactive things to completely ignore
      const isInteractive =
        clickedElement.closest("button") ||
        clickedElement.closest("a") ||
        clickedElement.closest("input") ||
        clickedElement.closest("select") ||
        clickedElement.closest("textarea");

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
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-x-4 hover:bg-gray-300 p-2 rounded ${isActive ? "font-medium bg-gray-200" : null}`
            }
          >
            <House size={20} /> Home
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/community/sessions"
            end
            className={({ isActive }) =>
              `flex items-center gap-x-4 hover:bg-gray-300 p-2 rounded ${isActive ? "font-medium bg-gray-200" : null}`
            }
          >
            <Newspaper size={20} /> Sessions
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/community/find"
            className={({ isActive }) =>
              `flex items-center gap-x-4 hover:bg-gray-300 p-2 rounded ${isActive ? "font-medium bg-gray-200" : null}`
            }
          >
            <Compass size={20} /> Find
          </NavLink>
        </li>
        <li>
          <button className="w-full flex items-center justify-center gap-x-2 border p-2 cursor-pointer rounded">
            <Plus size={18} />
            Create community
          </button>
        </li>
      </ul>

      <ul className="flex flex-col gap-y-1 border-t mt-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-[14px]">Community you've joined</span>
          <NavLink
            to="my-community-all"
            className="text-[14px] text-blue-400 underline"
          >
            See all
          </NavLink>
        </div>

        {myCommunities?.map((myCommunity) => (
          <NavLink
            key={myCommunity.id}
            to={`/community/${myCommunity.id}`}
            className={({ isActive }) =>
              `flex items-center gap-x-4 hover:bg-gray-300 p-2 rounded ${isActive ? "font-medium bg-gray-200" : null}`
            }
          >
            {myCommunity.name}
          </NavLink>
        ))}
      </ul>
    </nav>
  );
};

export default Sidebar;
