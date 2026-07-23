import React from "react";
import { NavLink, Outlet } from "react-router-dom";

const Players = () => {
  return (
    <div className="w-full px-4 py-5 sm:px-6 selection:bg-orange-500/10 selection:text-orange-950">
      <div className="mx-auto max-w-[1180px] space-y-4">
        {/* HEADER SECTION */}
        <header className="mb-2">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Players Management
          </h1>
          <p className="mt-1 text-xs font-medium text-stone-500">
            Manage community members, roles, and incoming access requests.
          </p>
        </header>

        <main className="space-y-4">
          {/* NAVIGATION TABS */}
          <nav className="border-b border-stone-200/80">
            <ul className="flex items-center gap-x-6">
              <li>
                <NavLink
                  to="all"
                  className={({ isActive }) => `
                    block pb-2.5 text-xs font-bold border-b-2 transition-all duration-200 relative
                    ${
                      isActive
                        ? "border-orange-500 text-orange-600"
                        : "border-transparent text-stone-500 hover:text-stone-900"
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
                    block pb-2.5 text-xs font-bold border-b-2 transition-all duration-200 relative
                    ${
                      isActive
                        ? "border-orange-500 text-orange-600"
                        : "border-transparent text-stone-500 hover:text-stone-900"
                    }
                  `}
                >
                  Requests
                </NavLink>
              </li>
            </ul>
          </nav>

          {/* INNER VIEW CONTENT */}
          <div className="pt-1">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Players;
