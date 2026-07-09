import React from "react";
import { useAuth } from "../../hooks/useAuth";
import PlayerAvatar from "../PlayerAvatar";

const UserDropdown = () => {
  const { user, logout } = useAuth();
  return (
    <div className="absolute border top-8 right-0 w-[164px] rounded">
      <div className="flex items-center gap-x-2 px-2 py-1">
        <PlayerAvatar username={user.username} size="md" />
        <span>{user.username}</span>
      </div>
      <nav className="mt-2">
        <ul>
          <li className="hover:bg-red-200 rounded">
            <button
              onClick={logout}
              className="px-2 py-1 cursor-pointer w-full text-start text-[14px]"
            >
              Log out
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default UserDropdown;
