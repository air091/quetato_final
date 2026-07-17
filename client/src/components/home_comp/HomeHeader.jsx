import { Compass, Handshake, LayersPlus } from "lucide-react";
import React from "react";
import { NavLink } from "react-router-dom";

const HomeHeader = () => {
  return (
    <div className="w-full max-w-[720px] mx-auto selection:bg-orange-500/10 selection:text-orange-950">
      <nav>
        <ul className="grid grid-cols-3 gap-3.5 p-3 bg-white border border-stone-200/80 rounded-2xl shadow-sm shadow-stone-100/50 mt-4">
          {/* FIND COMMUNITY */}
          <li>
            <NavLink
              to="/community/find"
              className="group flex flex-col justify-center items-center h-full p-4 gap-y-2.5 text-xs font-bold text-stone-700 bg-stone-50/40 border border-stone-200/60 rounded-xl hover:bg-orange-50/10 hover:text-stone-900 hover:border-orange-500/20 transition-all duration-200 select-none text-center active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/10"
            >
              <Compass
                size={26}
                className="text-stone-500 group-hover:text-orange-500 group-hover:scale-105 transition-all duration-200"
              />
              <span className="tracking-tight">Find Community</span>
            </NavLink>
          </li>

          {/* FIND FRIENDS */}
          <li>
            <NavLink
              to="/find-friends"
              className="group flex flex-col justify-center items-center h-full p-4 gap-y-2.5 text-xs font-bold text-stone-700 bg-stone-50/40 border border-stone-200/60 rounded-xl hover:bg-orange-50/10 hover:text-stone-900 hover:border-orange-500/20 transition-all duration-200 select-none text-center active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/10"
            >
              <Handshake
                size={26}
                className="text-stone-500 group-hover:text-orange-500 group-hover:scale-105 transition-all duration-200"
              />
              <span className="tracking-tight">Find Friends</span>
            </NavLink>
          </li>

          {/* CREATE COMMUNITY */}
          <li>
            <NavLink
              to="/community/create-community"
              className="group flex flex-col justify-center items-center h-full p-4 gap-y-2.5 text-xs font-bold text-stone-700 bg-stone-50/40 border border-stone-200/60 rounded-xl hover:bg-orange-50/10 hover:text-stone-900 hover:border-orange-500/20 transition-all duration-200 select-none text-center active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/10"
            >
              <LayersPlus
                size={26}
                className="text-stone-500 group-hover:text-orange-500 group-hover:scale-105 transition-all duration-200"
              />
              <span className="tracking-tight">Create Community</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default HomeHeader;
