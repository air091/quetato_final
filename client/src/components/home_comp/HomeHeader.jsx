import { Compass, Handshake, LayersPlus } from "lucide-react";
import React from "react";
import { NavLink } from "react-router-dom";

const HomeHeader = () => {
  return (
    <div className="w-full max-w-[720px] mx-auto">
      <nav>
        <ul className="grid grid-cols-3 gap-3 p-3 bg-white border border-stone-200 rounded-xl shadow-sm mt-4">
          <li>
            <NavLink
              to="/community/find"
              className="flex flex-col justify-center items-center h-full p-4 gap-y-2 text-xs sm:text-sm font-semibold text-stone-700 bg-stone-50/50 border border-stone-200/70 rounded-lg hover:bg-stone-100 hover:text-stone-900 hover:border-stone-300 transition-all duration-150 select-none text-center"
            >
              <Compass
                size={26}
                className="text-stone-500 group-hover:text-stone-800"
              />
              <span>Find Community</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/find-friends"
              className="flex flex-col justify-center items-center h-full p-4 gap-y-2 text-xs sm:text-sm font-semibold text-stone-700 bg-stone-50/50 border border-stone-200/70 rounded-lg hover:bg-stone-100 hover:text-stone-900 hover:border-stone-300 transition-all duration-150 select-none text-center"
            >
              <Handshake
                size={26}
                className="text-stone-500 group-hover:text-stone-800"
              />
              <span>Find Friends</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/community/create-community"
              className="flex flex-col justify-center items-center h-full p-4 gap-y-2 text-xs sm:text-sm font-semibold text-stone-700 bg-stone-50/50 border border-stone-200/70 rounded-lg hover:bg-stone-100 hover:text-stone-900 hover:border-stone-300 transition-all duration-150 select-none text-center"
            >
              <LayersPlus
                size={26}
                className="text-stone-500 group-hover:text-stone-800"
              />
              <span>Create Community</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default HomeHeader;
