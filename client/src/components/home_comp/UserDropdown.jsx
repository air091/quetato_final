import { useAuth } from "../../hooks/useAuth";
import PlayerAvatar from "../PlayerAvatar";
import { LogOut, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

const UserDropdown = () => {
  const { user, logout } = useAuth();

  return (
    <div className="absolute top-10 right-0 w-48 bg-white border border-stone-200 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-100 overflow-hidden">
      {/* 👤 User Profile Info Header */}
      <div className="flex items-center gap-x-2.5 px-3 py-2.5 bg-stone-50 border-b border-stone-100">
        <PlayerAvatar username={user?.username || "Player"} size="md" />
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-stone-800 truncate">
            {user?.username || "Guest Player"}
          </span>
          <span className="text-[10px] text-stone-400 font-medium truncate">
            {user?.email || "Active Session"}
          </span>
        </div>
      </div>

      {/* ⚙️ Dropdown Navigation Action Item */}
      <div className="p-1">
        <Link
          to="/profile"
          className="flex items-center gap-x-2 w-full px-2.5 py-1.5 text-left text-xs font-semibold text-stone-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
        >
          <UserRound size={14} className="shrink-0 text-stone-400" />
          <span>Profile settings</span>
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-x-2 w-full px-2.5 py-1.5 text-left text-xs font-semibold text-stone-600 hover:text-red-650 hover:bg-red-50 rounded transition-colors cursor-pointer"
        >
          <LogOut
            size={14}
            className="shrink-0 text-stone-400 group-hover:text-red-500"
          />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
};

export default UserDropdown;
