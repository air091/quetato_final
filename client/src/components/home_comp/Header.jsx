import React from "react";
import { Menu } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const Header = () => {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between px-4 py-2 border">
      <div className="flex items-center gap-x-4">
        <div>
          <button className="cursor-pointer">
            <Menu size={20} />
          </button>
        </div>
        <h1 className="relative font-bold w-fit">
          QuetatoSport
          <span className="absolute bg-red-500 text-white text-[8px] -right-10 font-medium px-2 py-0.5 rounded-full bottom-1">
            Beta
          </span>
        </h1>
      </div>
      <div>
        <span className="cursor-pointer">{user.username}</span>
      </div>
    </header>
  );
};

export default Header;
