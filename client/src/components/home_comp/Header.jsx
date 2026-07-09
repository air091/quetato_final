import React, { useState } from "react";
import { Menu } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { NavLink } from "react-router-dom";
import UserDropdown from "./UserDropdown";

const Header = ({ onMenuClick }) => {
  const { user } = useAuth();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  return (
    <header className="flex items-center justify-between px-4 py-2 border">
      <div className="flex items-center gap-x-4">
        <div>
          <button onClick={onMenuClick} className="block cursor-pointer">
            <Menu size={20} />
          </button>
        </div>
        <NavLink to="/" className="flex items-center gap-x-2 font-bold w-fit">
          <h1>
            QUE<span className="text-orange-500">TATO</span> SPORTS
          </h1>
          <h1 className="bg-red-500 text-white text-[8px] -right-10 font-medium px-2 py-0.5 rounded-full bottom-1">
            Beta
          </h1>
        </NavLink>
      </div>
      <div
        onClick={() => setIsUserDropdownOpen((prev) => !prev)}
        className="relative"
      >
        <span className="cursor-pointer">{user.username}</span>
        {isUserDropdownOpen && <UserDropdown />}
      </div>
    </header>
  );
};

export default Header;
