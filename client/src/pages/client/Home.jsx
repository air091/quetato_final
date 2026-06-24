import { Handshake, LayersPlus, UsersRound } from "lucide-react";
import React from "react";
import { NavLink } from "react-router-dom";

const Home = () => {
  return (
    <div className=" ">
      <nav className="">
        <ul className="flex items-center justify-center gap-x-16 border">
          <li>
            <NavLink
              to="/find-community"
              className="flex flex-col justify-center items-center border p-4 gap-y-2 font-medium rounded-lg"
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
              className="flex flex-col justify-center items-center border p-4 gap-y-2 font-medium rounded-lg"
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
              className="flex flex-col justify-center items-center border p-4 gap-y-2 font-medium rounded-lg"
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

export default Home;
