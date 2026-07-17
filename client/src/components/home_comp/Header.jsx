import React, { useState, useEffect, useRef } from "react";
import { Menu, ChevronDown } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { NavLink } from "react-router-dom";
import UserDropdown from "./UserDropdown";
import PlayerAvatar from "../PlayerAvatar"; // Using your existing Avatar component

const Header = ({ onMenuClick }) => {
  const { user } = useAuth();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };

    if (isUserDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserDropdownOpen]);

  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-stone-200/80 shadow-sm sticky top-0 z-40">
      {/* 🍔 Left Side: Menu Toggle & Brand Logo */}
      <div className="flex items-center gap-x-4">
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <NavLink to="/" className="flex items-center gap-x-2.5 w-fit group">
          <h1 className="font-extrabold text-stone-900 tracking-tight transition-colors group-hover:text-orange-600">
            QUE
            <span className="text-orange-500 transition-colors group-hover:text-orange-500">
              TATO
            </span>{" "}
            SPORTS
          </h1>
          <span className="bg-amber-500/10 text-amber-700 border border-amber-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full select-none tracking-wider uppercase">
            Beta
          </span>
        </NavLink>
      </div>

      {/* 👤 Right Side: User Dropdown Controls */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsUserDropdownOpen((prev) => !prev)}
          className={`flex items-center gap-x-2 p-1.5 pr-2.5 rounded-full transition-all cursor-pointer text-left border ${
            isUserDropdownOpen
              ? "bg-stone-100 border-stone-200/80"
              : "border-transparent hover:bg-stone-100 hover:border-stone-200/60"
          }`}
        >
          <PlayerAvatar username={user?.username || "Player"} size="sm" />
          <span className="hidden sm:block text-xs font-bold text-stone-700 max-w-[120px] truncate select-none">
            {user?.username || "Guest"}
          </span>
          <ChevronDown
            size={14}
            className={`text-stone-400 transition-transform duration-200 ${
              isUserDropdownOpen ? "rotate-180 text-orange-500" : ""
            }`}
          />
        </button>

        {isUserDropdownOpen && (
          <UserDropdown onClose={() => setIsUserDropdownOpen(false)} />
        )}
      </div>
    </header>
  );
};

export default Header;
