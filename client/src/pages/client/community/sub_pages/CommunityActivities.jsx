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
import Modal from "../../../../components/createPortal";

const CommunityActivities = () => {
  const { accessToken } = useAuth();
  const { communityId } = useParams();
  const [sessions, setSessions] = useState([]);
  const [session, setSession] = useState({
    name: "",
    sport: "badminton",
    location: "",
    startAt: "",
    endAt: "",
    description: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const deleteSession = useCallback(
    async (sessionId) => {
      if (!accessToken) return;

      // 1. Save a backup of the current sessions in case we need to roll back
      let backupSessions;

      setSessions((prevSessions) => {
        backupSessions = prevSessions; // Store the original state
        return prevSessions.filter((session) => session.id !== sessionId);
      });

      try {
        const response = await fetch(
          `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to delete the session");
        }

        // If successful, do nothing! The UI is already updated.
      } catch (error) {
        console.error("Error deleting session, rolling back:", error);

        // 2. 🚨 ERROR HANDLED: Put the data back if the API failed
        if (backupSessions) {
          setSessions(backupSessions);
        }

        // Optional: Alert the user so they know why it came back
        alert("Could not delete session. Please try again.");
      }
    },
    [accessToken, communityId],
  );

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

  const createSession = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/communities/${communityId}/sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: "include",
          body: JSON.stringify(session), // Cleaned up: sends the entire object directly
        },
      );

      if (!response.ok) throw new Error("HTTP failed: " + response.status);

      const data = await response.json();
      if (!data.success)
        throw new Error(data?.message || "Internal server error");

      await getAllSessions();
      // Reset the form state back to default values
      setSession({
        name: "",
        sport: "badminton",
        location: "",
        startAt: "",
        endAt: "",
        description: "",
      });

      setIsModalOpen(false);
    } catch (error) {
      console.error("Error creating session:", error);
    }
    // ✅ FIX: Added necessary dependencies
  }, [accessToken, communityId, session]);

  const handleOnChange = (event) => {
    const { name, value } = event.target;
    setSession((prev) => ({ ...prev, [name]: value }));
  };

  const handleOnSubmit = async (event) => {
    event.preventDefault();
    await createSession();
  };

  return (
    <div>
      <main>
        <div className="flex items-center py-1 px-2 gap-x-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="block cursor-pointer bg-gray-800 text-white px-2 py-1 rounded-md"
          >
            Create session
          </button>

          {/* MODAL */}
          <Modal isOpen={isModalOpen}>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white p-6 rounded-md shadow-lg max-w-[520px] w-full z-999">
                <header className="flex items-center justify-between py-2">
                  <h3 className="font-medium">Create new session</h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="cursor-pointer text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full p-1"
                  >
                    <X size={20} />
                  </button>
                </header>

                <form
                  onSubmit={handleOnSubmit}
                  className="flex flex-col gap-y-2"
                >
                  {/* NAME AND SPORT */}
                  <div className="flex items-center gap-x-2">
                    <div className="w-full">
                      <label htmlFor="name" className="text-[14px]">
                        Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        name="name"
                        value={session.name}
                        onChange={handleOnChange}
                        placeholder="Smash today"
                        className="block px-2 py-1 border w-full rounded-sm mt-0.5"
                      />
                    </div>
                    <div>
                      <label htmlFor="sport" className="text-[14px]">
                        Sport
                      </label>
                      <select
                        name="sport"
                        id="sport"
                        value={session.sport}
                        onChange={handleOnChange}
                        className="block px-2 py-1 min-w-[140px] border cursor-pointer rounded-sm mt-0.5"
                      >
                        <option value="badminton">Badminton</option>
                      </select>
                    </div>
                  </div>

                  {/* LOCATION */}
                  <div>
                    <label htmlFor="location" className="text-[14px]">
                      Location
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={session.location}
                      onChange={handleOnChange}
                      className="block px-2 py-1 border w-full rounded-sm mt-0.5"
                    />
                  </div>

                  {/* START AND END SCHEDULE */}
                  <div className="flex items-center gap-x-2">
                    <div className="w-full">
                      <label htmlFor="startAt" className="text-[14px]">
                        Starts at
                      </label>
                      <input
                        id="startAt"
                        type="datetime-local"
                        name="startAt" // ✅ FIX: Added missing name attribute
                        value={session.startAt}
                        onChange={handleOnChange}
                        className="block px-2 py-1 border w-full rounded-sm mt-0.5"
                      />
                    </div>
                    <div className="w-full">
                      <label htmlFor="endAt" className="text-[14px]">
                        Ends at
                      </label>
                      <input
                        id="endAt"
                        type="datetime-local"
                        name="endAt" // ✅ FIX: Added missing name attribute
                        value={session.endAt}
                        onChange={handleOnChange}
                        className="block px-2 py-1 border w-full rounded-sm mt-0.5"
                      />
                    </div>
                  </div>

                  {/* DESCRIPTION */}
                  <div>
                    <label htmlFor="description" className="text-[14px]">
                      Description
                    </label>
                    <textarea
                      name="description"
                      id="description"
                      rows={3}
                      value={session.description}
                      onChange={handleOnChange}
                      placeholder="Join the queue and start playing with nearby players."
                      className="block px-2 py-1 border w-full rounded-sm mt-0.5"
                    ></textarea>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex items-center justify-end gap-x-3 mt-2">
                    <button
                      type="button" // ✅ FIX: Explicitly mark as type="button" so it doesn't trigger a form submit
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-1 bg-gray-200 hover:bg-gray-300 cursor-pointer rounded-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1 bg-blue-400 hover:bg-blue-500 hover:text-white cursor-pointer rounded-sm"
                    >
                      Add
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </Modal>

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

        <table className="w-full mt-2">
          <thead>
            <tr className="bg-stone-50 text-stone-600">
              {/* Clickable Header: Name */}
              <th
                className="group py-2 pl-2 pr-4 text-start cursor-pointer transition-colors duration-150 ease-in-out hover:bg-stone-200 hover:text-stone-900 select-none text-[14px] font-medium"
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
              <th className=" py-2 text-start select-none text-[14px] font-medium">
                Hosts
              </th>
              <th className="py-2 text-center w-[98px] select-none text-[14px] font-medium">
                Sport
              </th>
              <th className="py-2 text-center w-[92px] select-none text-[14px] font-medium">
                Players
              </th>
              <th className=" py-2 pl-2 pr-4 text-start select-none text-[14px] font-medium">
                Location
              </th>

              {/* Clickable Header: Schedule */}
              <th
                className="group  py-2 pl-2 pr-4 text-start w-[240px] cursor-pointer transition-colors duration-150 ease-in-out hover:bg-stone-200 hover:text-stone-900 select-none text-[14px] font-medium"
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
              <th className="group  py-2 pl-2 pr-4 text-center w-[140px]  transition-colors duration-150 ease-in-out select-none text-[14px] font-medium">
                Status
              </th>

              <th className=" py-2 pl-2 pr-4 text-center w-[98px] select-none text-[14px] font-medium">
                Actions
              </th>
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
                  {/* NAME */}
                  <td className="text-start p-2">
                    <span className="block w-full truncate">
                      {session?.name}
                    </span>
                  </td>

                  {/* HOSTS */}
                  <td className="text-start p-2">
                    {hosts && hosts?.length > 0 ? (
                      <span className="block truncate w-full">
                        {hosts?.join(", ")}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">No host yet</span>
                    )}
                  </td>

                  {/* SPORT */}
                  <td className="text-center p-2">
                    <span className="text-[12px] rounded-full bg-gray-200 px-2 py-0.5">
                      {session?.sport}
                    </span>
                  </td>

                  {/* PLAYERS */}
                  <td className="text-center p-2">
                    {session?._count.players || 0}
                  </td>

                  {/* LOCATION */}
                  <td className="text-start p-2">
                    {session?.location || "N/A"}
                  </td>

                  {/* SCHEDULE */}
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

                  {/* STATUS */}
                  <td className="text-center p-2">
                    <span
                      className={`text-[12px] px-2 py-0.5 rounded-full ${session?.isAvailable ? "text-white bg-green-600" : "text-red-600"}`}
                    >
                      {session?.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="text-start p-2">
                    <div className="flex items-center justify-center gap-x-2">
                      <button className="cursor-pointer text-gray-500 p-1 hover:bg-gray-300 hover:text-blue-500 rounded-md">
                        <SquarePen size={20} />
                      </button>
                      <button
                        onClick={() => deleteSession(session?.id)}
                        className="cursor-pointer text-gray-500 p-1 hover:bg-gray-300 hover:text-red-500 rounded-md"
                      >
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
