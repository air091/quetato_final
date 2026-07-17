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
    <header className="flex items-center justify-between px-3.5 py-2 bg-white border-b border-stone-200/80 shadow-sm sticky top-0 z-40">
      {/* 🍔 Left Side: Menu Toggle & Brand Logo */}
      <div className="flex items-center gap-x-4">
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <NavLink to="/" className="flex items-center gap-x-2 w-fit group">
          <h1 className="font-bold text-stone-900 tracking-tight transition-colors group-hover:text-stone-700">
            QUE<span className="text-orange-500">TATO</span> SPORTS
          </h1>
          <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full select-none">
            BETA
          </span>
        </NavLink>
      </div>

      {/* 👤 Right Side: User Dropdown Controls */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsUserDropdownOpen((prev) => !prev)}
          className="flex items-center gap-x-2 p-1.5 pr-2.5 rounded-full hover:bg-stone-100 transition-colors cursor-pointer text-left border border-transparent hover:border-stone-200/60"
        >
          <PlayerAvatar username={user?.username || "Player"} size="sm" />
          <span className="hidden sm:block text-xs font-semibold text-stone-700 max-w-[120px] truncate select-none">
            {user?.username || "Guest"}
          </span>
          <ChevronDown
            size={14}
            className={`text-stone-400 transition-transform duration-200 ${
              isUserDropdownOpen ? "rotate-180" : ""
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
