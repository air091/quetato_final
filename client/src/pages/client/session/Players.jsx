import { NavLink, Outlet } from "react-router-dom";
import React from "react";

const Players = () => {
  return (
    <div className="px-4">
      <header>
        <h3>Players Management</h3>
      </header>
      <main>
        <nav>
          <ul className="flex items-center gap-x-4">
            <li>
              <NavLink to="all">Players</NavLink>
            </li>
            <li>
              <NavLink to="requests">Requests</NavLink>
            </li>
          </ul>
        </nav>
        <div>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Players;
