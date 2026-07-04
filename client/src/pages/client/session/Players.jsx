import { NavLink, Outlet } from "react-router-dom";
import React from "react";

const Players = () => {
  return (
    <div className="max-w-5xl mx-auto px-6 py-4">
      {/* HEADER SECTION */}
      <header className="mb-3">
        <h3 className="text-xl font-bold tracking-tight text-stone-900">
          Players Management
        </h3>
        <p className="text-xs text-stone-500 mt-0.5">
          Manage community members, roles, and incoming access requests.
        </p>
      </header>

      <main className="space-y-2">
        {/* NAVIGATION TABS */}
        <nav className="border-b border-stone-200">
          <ul className="flex items-center gap-x-6">
            <li>
              <NavLink
                to="all"
                className={({ isActive }) => `
                block pb-2.5 text-sm font-medium border-b-2 transition-all duration-200
                ${
                  isActive
                    ? "border-stone-900 text-stone-900 font-semibold"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }
              `}
              >
                Players
              </NavLink>
            </li>
            <li>
              <NavLink
                to="requests"
                className={({ isActive }) => `
                block pb-2.5 text-sm font-medium border-b-2 transition-all duration-200
                ${
                  isActive
                    ? "border-stone-900 text-stone-900 font-semibold"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }
              `}
              >
                Requests
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* INNER VIEW CONTENT */}
        <div className="pt-2">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Players;
