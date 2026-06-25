import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../../hooks/useAuth";
import {
  SquarePen,
  Trash,
  ArrowUpDown,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  ArrowUp,
  ArrowDown,
  Search,
  X,
} from "lucide-react";

const CommunityActivities = () => {
  const { accessToken } = useAuth();
  const { communityId } = useParams();
  const [sessions, setSessions] = useState([]);

  // 1. Filter and Sorting States (Default to sorting by Name A-Z)
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [order, setOrder] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");

  // ==================== ADDED DEBOUNCE LOGIC HERE ====================
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce effect: waits 300ms after the last keystroke to update debouncedSearch
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);
  // ===================================================================

  const getAllSessions = useCallback(async () => {
    try {
      // Build your URL Query parameters
      const queryParams = new URLSearchParams({
        sortBy,
        order,
      });

      if (status) queryParams.append("status", status);

      // CHANGED: Use debouncedSearch instead of searchQuery here
      if (debouncedSearch.trim()) {
        queryParams.append("search", debouncedSearch.trim());
      }

      const response = await fetch(
        `http://localhost:8000/api/communities/${communityId}/sessions?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (!response.ok) throw new Error("Http error", response.status);

      const data = await response.json();
      if (!data.success)
        throw new Error(data?.message || "Internal server error");

      setSessions(data.sessions);
    } catch (error) {
      console.error("Get all sessions failed", error);
    }
    // CHANGED: Added debouncedSearch to dependencies, removed searchQuery
  }, [accessToken, communityId, sortBy, order, status, debouncedSearch]);

  // 3. Re-run fetch whenever dependencies change
  useEffect(() => {
    if (communityId && accessToken) {
      getAllSessions();
    }
  }, [getAllSessions, communityId, accessToken]);

  // 4. Handle Column Header Click Toggles
  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(columnKey);
      setOrder("asc");
    }
  };

  return (
    <div className="border">
      <main>
        <div className="flex items-center py-1 px-2 gap-x-4">
          <button className="block cursor-pointer bg-gray-800 text-white px-2 py-1 rounded-md">
            Add session
          </button>

          {/* Status Filter Dropdown */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border px-2 py-1 rounded-md bg-white cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="available">Available Only</option>
          </select>

          <div className="relative flex items-center w-full max-w-[284px]">
            <input
              type="search"
              placeholder="Search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border pl-8 pr-8 py-1 rounded-md w-full [&::-webkit-search-cancel-button]:appearance-none"
            />

            <span className="absolute left-2 text-gray-400">
              <Search size={18} />
            </span>

            {searchQuery && (
              <span
                className="absolute right-2 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setSearchQuery("")}
              >
                <X size={18} />
              </span>
            )}
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b bg-stone-50 text-stone-600 text-sm font-semibold">
              {/* Clickable Header: Name */}
              <th
                className="group p-3 text-start cursor-pointer transition-colors duration-150 ease-in-out hover:bg-stone-200 hover:text-stone-900 select-none"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center justify-between gap-x-2">
                  <span>Name</span>
                  <span className="text-stone-400 group-hover:text-stone-600 transition-colors">
                    {sortBy === "name" ? (
                      order === "asc" ? (
                        <ArrowUp size={14} className="text-stone-900" />
                      ) : (
                        <ArrowDown size={14} className="text-stone-900" />
                      )
                    ) : (
                      <ArrowUpDown
                        size={14}
                        className="opacity-40 group-hover:opacity-100"
                      />
                    )}
                  </span>
                </div>
              </th>

              {/* Non-clickable Header */}
              <th className="p-3 text-start select-none">Hosts</th>
              <th className="p-3 text-center w-[98px] select-none">Sport</th>
              <th className="p-3 text-start select-none">Location</th>

              {/* Clickable Header: Schedule */}
              <th
                className="group p-3 text-start w-[240px] cursor-pointer transition-colors duration-150 ease-in-out hover:bg-stone-200 hover:text-stone-900 select-none"
                onClick={() => handleSort("schedule")}
              >
                <div className="flex items-center justify-between gap-x-2">
                  <span>Schedule</span>
                  <span className="text-stone-400 group-hover:text-stone-600 transition-colors">
                    {sortBy === "schedule" ? (
                      order === "asc" ? (
                        <ArrowUp size={14} className="text-stone-900" />
                      ) : (
                        <ArrowDown size={14} className="text-stone-900" />
                      )
                    ) : (
                      <ArrowUpDown
                        size={14}
                        className="opacity-40 group-hover:opacity-100"
                      />
                    )}
                  </span>
                </div>
              </th>

              {/* Clickable Header: Status / Created At */}
              <th
                className="group p-3 text-center w-[140px] cursor-pointer transition-colors duration-150 ease-in-out hover:bg-stone-200 hover:text-stone-900 select-none"
                onClick={() => handleSort("createdAt")}
              >
                <div className="flex items-center justify-between gap-x-2">
                  <span className="w-full text-center pl-4">Created At</span>
                  <span className="text-stone-400 group-hover:text-stone-600 transition-colors flex-shrink-0">
                    {sortBy === "createdAt" ? (
                      order === "asc" ? (
                        <ArrowUp size={14} className="text-stone-900" />
                      ) : (
                        <ArrowDown size={14} className="text-stone-900" />
                      )
                    ) : (
                      <ArrowUpDown
                        size={14}
                        className="opacity-40 group-hover:opacity-100"
                      />
                    )}
                  </span>
                </div>
              </th>

              <th className="p-3 text-center w-[98px] select-none">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions?.map((session) => {
              const hosts = session?.players
                ?.filter(
                  (p) =>
                    p?.sessionPlayer?.role === "owner" ||
                    p?.sessionPlayer?.role === "admin",
                )
                ?.map((p) => p?.sessionPlayer?.communityPlayer?.username);

              return (
                <tr
                  key={session.id}
                  className="odd:bg-stone-100 cursor-pointer hover:bg-gray-200"
                >
                  <td className="text-start p-2">
                    <span className="block w-full truncate">
                      {session?.name}
                    </span>
                  </td>

                  <td className="text-start p-2">
                    {hosts && hosts.length > 0 ? (
                      <span className="block truncate w-full">
                        {hosts.join(", ")}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">No host yet</span>
                    )}
                  </td>

                  <td className="text-center p-2">
                    <span className="text-[12px] rounded-full bg-gray-200 px-2 py-0.5">
                      {session?.sport}
                    </span>
                  </td>
                  <td className="text-start p-2">
                    {session?.location || "N/A"}
                  </td>
                  <td className="text-start p-2">
                    <div className="flex flex-col justify-center">
                      <span className="block">
                        Starts at:{" "}
                        <span className="font-medium">
                          {session?.startAt ?? "Anytime"}
                        </span>
                      </span>
                      <span className="block text-[12px] text-gray-700">
                        Ends at:{" "}
                        <span className="font-medium">
                          {session?.endAt ?? "Anytime"}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="text-center p-2">
                    <span
                      className={`text-[12px] px-2 py-0.5 rounded-full ${session?.isAvailable ? "text-white bg-green-600" : "text-red-600"}`}
                    >
                      {session?.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </td>
                  <td className="text-start p-2">
                    <div className="flex items-center justify-center gap-x-2">
                      <button className="cursor-pointer text-gray-500 p-1 hover:bg-gray-300 hover:text-blue-500 rounded-md">
                        <SquarePen size={20} />
                      </button>
                      <button className="cursor-pointer text-gray-500 p-1 hover:bg-gray-300 hover:text-red-500 rounded-md">
                        <Trash size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </main>
    </div>
  );
};

export default CommunityActivities;
