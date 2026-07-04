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
      <main className="w-full max-w-[1000px] mx-auto select-none mt-4 px-2">
        {/* Optimized Top Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-3 pb-4 border-b border-stone-200">
          <div>
            <button
              onClick={() => setIsCreateSessionModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold bg-stone-900 text-stone-100 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Create Session
            </button>

            <AddSessionModal
              accessToken={accessToken}
              communityId={communityId}
              getAllSessions={getAllSessions}
              isCreateSessionModalOpen={isCreateSessionModalOpen}
              setIsCreateSessionModalOpen={setIsCreateSessionModalOpen}
            />
          </div>

          <div className="flex items-center gap-x-2 w-full sm:w-auto sm:justify-end">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-stone-50 border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 cursor-pointer rounded-lg outline-none focus:border-stone-400 transition-colors h-[34px]"
            >
              <option value="">All Statuses</option>
              <option value="available">Available Only</option>
            </select>

            <div className="relative flex items-center w-full max-w-[240px]">
              <input
                type="search"
                placeholder="Search sessions..."
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border border-stone-200 pl-8 pr-8 py-1.5 text-xs text-stone-900 rounded-lg w-full outline-none focus:border-stone-400 bg-stone-50/50 transition-colors h-[34px] [&::-webkit-search-cancel-button]:appearance-none"
              />
              <span className="absolute left-2.5 text-stone-400 pointer-events-none">
                <Search size={14} />
              </span>
              {searchQuery && (
                <span
                  className="absolute right-2.5 cursor-pointer text-stone-400 hover:text-stone-600 transition-colors"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={14} />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Table Layout Wrapper Card */}
        <div className="w-full border border-stone-200 rounded-xl overflow-hidden shadow-sm bg-white mt-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-stone-50/70 border-b border-stone-200 text-xs font-semibold text-stone-600 uppercase tracking-wider">
                  <th
                    className="group p-4 cursor-pointer hover:bg-stone-100/80 transition-colors select-none text-stone-700 normal-case text-sm font-bold"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-x-1">
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
                            size={12}
                            className="opacity-40 group-hover:opacity-100"
                          />
                        )}
                      </span>
                    </div>
                  </th>

                  <th className="p-4 w-[140px]">Hosts</th>
                  <th className="p-4 w-[100px] text-center">Sport</th>
                  <th className="p-4 w-[85px] text-center">Players</th>
                  <th className="p-4 w-[160px]">Location</th>

                  <th
                    className="group p-4 cursor-pointer hover:bg-stone-100/80 transition-colors select-none w-[200px]"
                    onClick={() => handleSort("schedule")}
                  >
                    <div className="flex items-center gap-x-1">
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
                            size={12}
                            className="opacity-40 group-hover:opacity-100"
                          />
                        )}
                      </span>
                    </div>
                  </th>

                  <th className="p-4 w-[110px] text-center">Status</th>
                  <th className="p-4 w-[90px] text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100">
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
                        navigate(
                          `/community/${communityId}/sessions/${session.id}`,
                        )
                      }
                      className="hover:bg-stone-50/40 cursor-pointer transition-colors duration-150"
                    >
                      <td className="p-4 text-sm font-semibold text-stone-900">
                        <span
                          className="block max-w-[240px] truncate"
                          title={session?.name}
                        >
                          {session?.name}
                        </span>
                      </td>

                      <td className="p-4 text-xs text-stone-600 font-medium">
                        {hosts && hosts?.length > 0 ? (
                          <span
                            className="block truncate max-w-[130px]"
                            title={hosts?.join(", ")}
                          >
                            {hosts?.join(", ")}
                          </span>
                        ) : (
                          <span className="text-stone-400 italic font-normal">
                            No hosts assigned
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <span className="inline-block text-[11px] font-bold uppercase tracking-wider rounded-md bg-stone-100 text-stone-700 px-2 py-0.5 border border-stone-200/40">
                          {session?.sport}
                        </span>
                      </td>

                      <td className="p-4 text-center text-sm font-semibold text-stone-700">
                        {session?._count.players || 0}
                      </td>

                      <td className="p-4 text-xs text-stone-600 font-medium">
                        <span
                          className="block max-w-[150px] truncate"
                          title={session?.location}
                        >
                          {session?.location || "—"}
                        </span>
                      </td>

                      <td className="p-4 text-xs text-stone-600">
                        <div className="flex flex-col gap-y-0.5 justify-center font-medium">
                          <span className="text-stone-800">
                            <span className="text-stone-400 font-normal mr-1">
                              Starts:
                            </span>
                            {formatDate(session?.startAt) || "Anytime"}
                          </span>
                          <span className="text-[11px] text-stone-500">
                            <span className="text-stone-400 font-normal mr-1">
                              Ends:
                            </span>
                            {formatDate(session?.endAt) || "Anytime"}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            session?.isAvailable
                              ? "bg-green-50 text-green-700 border-green-100"
                              : "bg-red-50 text-red-600 border-red-100"
                          }`}
                        >
                          {session?.isAvailable ? "Available" : "Unavailable"}
                        </span>
                      </td>

                      {/* ACTIONS COLUMN */}
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSession(session);
                              setIsEditSessionModalOpen(true);
                            }}
                            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-md transition-colors cursor-pointer outline-none"
                          >
                            <SquarePen size={15} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(session?.id);
                            }}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer outline-none"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {(!sessions || sessions.length === 0) && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-12 text-center text-sm text-stone-400 italic bg-stone-50/20"
                    >
                      No scheduled sessions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

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
