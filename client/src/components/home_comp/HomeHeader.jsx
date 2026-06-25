import { Handshake, LayersPlus, UsersRound } from "lucide-react";
import React from "react";
import { NavLink } from "react-router-dom";

const HomeHeader = () => {
  return (
    <div className="w-full max-w-[720px] mx-auto">
      <header>
        <h1 className="text-[18] font-medium my-2">Home</h1>
      </header>
      <nav className="mt-2">
        <ul className="flex items-center justify-center gap-x-16 py-8 border rounded-xl">
          <li>
            <NavLink
              to="/find-community"
              className="flex flex-col justify-center items-center border p-4 gap-y-2 font-medium rounded-lg hover:bg-gray-300"
            >
              <span>
                <UsersRound size={34} />
              </span>
              Find Community
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/find-friends"
              className="flex flex-col justify-center items-center border p-4 gap-y-2 font-medium rounded-lg hover:bg-gray-300"
            >
              <span>
                <Handshake size={34} />
              </span>
              Find Friends
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/create-community"
              className="flex flex-col justify-center items-center border p-4 gap-y-2 font-medium rounded-lg hover:bg-gray-300"
            >
              <span>
                <LayersPlus size={34} />
              </span>
              Create Community
            </NavLink>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default HomeHeader;
