import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../../hooks/useAuth";
import {
  SquarePen,
  Trash,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
} from "lucide-react";
import AddSessionModal from "../../../../components/community_comp/activities/AddSessionModal";
import EditSessionModal from "../../../../components/community_comp/activities/EditSessionModal";

const CommunityActivities = () => {
  const { accessToken } = useAuth();
  const { communityId } = useParams();
  const [sessions, setSessions] = useState([]);
  const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] =
    useState(false);
  const [isEditSessionModalOpen, setIsEditSessionModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [order, setOrder] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const getAllSessions = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({
        sortBy,
        order,
      });

      if (status) queryParams.append("status", status);
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
  }, [accessToken, communityId, sortBy, order, status, debouncedSearch]);

  const deleteSession = useCallback(
    async (sessionId) => {
      if (!accessToken) return;

      let backupSessions;

      setSessions((prevSessions) => {
        backupSessions = prevSessions;
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
      } catch (error) {
        console.error("Error deleting session, rolling back:", error);
        if (backupSessions) {
          setSessions(backupSessions);
        }
        alert("Could not delete session. Please try again.");
      }
    },
    [accessToken, communityId],
  );

  useEffect(() => {
    if (communityId && accessToken) {
      getAllSessions();
    }
  }, [getAllSessions, communityId, accessToken]);

  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(columnKey);
      setOrder("asc");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  };

  return (
    <>
      <main>
        <div className="flex items-center py-1 px-2 gap-x-4">
          <button
            onClick={() => setIsCreateSessionModalOpen(true)}
            className="block cursor-pointer bg-gray-800 text-white px-2 py-1 rounded-md"
          >
            Create session
          </button>

          <AddSessionModal
            accessToken={accessToken}
            communityId={communityId}
            getAllSessions={getAllSessions}
            isCreateSessionModalOpen={isCreateSessionModalOpen}
            setIsCreateSessionModalOpen={setIsCreateSessionModalOpen}
          />

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
              <th className="py-2 pl-2 text-start select-none text-[14px] font-medium">
                Hosts
              </th>
              <th className="py-2 text-center w-[98px] select-none text-[14px] font-medium">
                Sport
              </th>
              <th className="py-2 text-center w-[92px] select-none text-[14px] font-medium">
                Players
              </th>
              <th className="py-2 pl-2 pr-4 text-start select-none text-[14px] w-[180px] font-medium">
                Location
              </th>
              <th
                className="group py-2 pl-2 pr-4 text-start w-[210px] cursor-pointer transition-colors duration-150 ease-in-out hover:bg-stone-200 hover:text-stone-900 select-none text-[14px] font-medium"
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
              <th className="group py-2 pl-2 pr-4 text-center w-[140px] transition-colors duration-150 ease-in-out select-none text-[14px] font-medium">
                Status
              </th>
              <th className="py-2 pl-2 pr-4 text-center w-[98px] select-none text-[14px] font-medium">
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
                  onClick={() =>
                    navigate(`/community/${communityId}/sessions/${session.id}`)
                  }
                  className="odd:bg-stone-100 cursor-pointer hover:bg-gray-200"
                >
                  <td className="text-start p-2">
                    <span className="block w-full max-w-[280px] truncate">
                      {session?.name}
                    </span>
                  </td>
                  <td className="text-start p-2">
                    {hosts && hosts?.length > 0 ? (
                      <span className="block truncate w-full">
                        {hosts?.join(", ")}
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
                  <td className="text-center p-2">
                    {session?._count.players || 0}
                  </td>
                  <td className="text-start p-2">
                    <span className="block w-full max-w-[180px] truncate">
                      {session?.location || "N/A"}
                    </span>
                  </td>
                  <td className="text-start p-2">
                    <div className="flex flex-col justify-center">
                      <span className="block">
                        Starts at:{" "}
                        <span className="font-medium">
                          {formatDate(session?.startAt) || "Anytime"}
                        </span>
                      </span>
                      <span className="block text-[12px] text-gray-700">
                        Ends at:{" "}
                        <span className="font-medium">
                          {formatDate(session?.endAt) || "Anytime"}
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
                  {/* FIXED ACTIONS COLUMN */}
                  <td className="text-start p-2">
                    <div className="flex items-center justify-center gap-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Stop row click navigation
                          setSelectedSession(session);
                          setIsEditSessionModalOpen(true);
                        }}
                        className="cursor-pointer text-gray-500 p-1 hover:bg-gray-300 hover:text-blue-500 rounded-md"
                      >
                        <SquarePen size={20} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Stop row click navigation
                          deleteSession(session?.id);
                        }}
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

        <EditSessionModal
          accessToken={accessToken}
          communityId={communityId}
          getAllSessions={getAllSessions}
          isEditSessionModalOpen={isEditSessionModalOpen}
          setIsEditSessionModalOpen={setIsEditSessionModalOpen}
          session={selectedSession}
        />
      </main>
    </>
  );
};

export default CommunityActivities;
