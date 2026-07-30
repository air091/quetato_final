import { useCallback, useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useAuth } from "../../../../hooks/useAuth";
import {
  SquarePen,
  Trash,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  Calendar,
} from "lucide-react";
import AddSessionModal from "../../../../components/community_comp/activities/AddSessionModal";
import EditSessionModal from "../../../../components/community_comp/activities/EditSessionModal";
import { API_URL } from "../../../../contexts/AuthContext";

const CommunityActivities = () => {
  const { accessToken, fetchWithAuth } = useAuth();
  const context = useOutletContext();
  const communityPlayer = context?.communityPlayer;

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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Reset to page 1 whenever filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [status, debouncedSearch, sortBy, order]);

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

      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/sessions?${queryParams.toString()}`,
        {
          method: "GET",
        },
      );
      if (!response) return;

      if (!response.ok) throw new Error("Http error", response.status);

      const data = await response.json();
      if (!data.success)
        throw new Error(data?.message || "Internal server error");

      setSessions(data.sessions);
    } catch (error) {
      console.error("Get all sessions failed", error);
    }
  }, [communityId, sortBy, order, status, debouncedSearch, fetchWithAuth]);

  const deleteSession = useCallback(
    async (sessionId) => {
      if (!accessToken) return;

      let backupSessions;

      setSessions((prevSessions) => {
        backupSessions = prevSessions;
        return prevSessions.filter((session) => session.id !== sessionId);
      });

      try {
        const response = await fetchWithAuth(
          `${API_URL}/api/communities/${communityId}/sessions/${sessionId}`,
          {
            method: "DELETE",
          },
        );

        if (!response) return;

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
    [accessToken, communityId, fetchWithAuth],
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

  const isManagement =
    communityPlayer?.role === "owner" || communityPlayer?.role === "admin";
  const canOpenSession = isManagement || communityPlayer?.role === "host";
  const isGuest = !communityPlayer || communityPlayer?.status === "requested";

  // Pagination calculations
  const totalPages = Math.ceil((sessions?.length || 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentSessions = sessions?.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  return (
    <>
      <main className="w-full max-w-[1024px] mx-auto select-none mt-6 px-4 selection:bg-orange-500/10 selection:text-orange-950">
        {/* Optimized Top Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-4 pb-5 border-b border-stone-200/80">
          <div>
            {isManagement ? (
              <>
                <button
                  onClick={() => setIsCreateSessionModalOpen(true)}
                  className="px-5 py-2.5 text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98] rounded-xl transition-all cursor-pointer shadow-md shadow-orange-500/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/10"
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
              </>
            ) : (
              <div>
                <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-x-2 tracking-tight">
                  <Calendar size={18} className="text-orange-500" /> Community
                  Activities
                </h2>
                <p className="text-xs text-stone-500 font-medium mt-1">
                  Explore schedules and look up active matches.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-x-2.5 w-full sm:w-auto sm:justify-end">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-stone-50/50 border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700 cursor-pointer rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all h-[38px] min-w-[130px]"
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
                className="border border-stone-200 pl-9 pr-8 py-1.5 text-xs text-stone-900 font-medium rounded-xl w-full outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 bg-stone-50/50 transition-all h-[38px] [&::-webkit-search-cancel-button]:appearance-none"
              />
              <span className="absolute left-3 text-stone-400 pointer-events-none">
                <Search size={14} />
              </span>
              {searchQuery && (
                <span
                  className="absolute right-3 cursor-pointer text-stone-400 hover:text-stone-600 transition-colors"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={14} />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Table Layout Wrapper Card */}
        <div className="w-full border border-stone-200/80 rounded-2xl overflow-hidden shadow-sm shadow-stone-100/50 bg-white mt-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-stone-50/50 border-b border-stone-200/80 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th
                    className="group p-4 cursor-pointer hover:bg-stone-100/50 transition-colors select-none text-stone-700 normal-case text-xs font-bold w-[260px]"
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

                  <th className="p-4 text-xs text-stone-500 font-bold normal-case w-[140px]">
                    Hosts
                  </th>
                  <th className="p-4 text-xs text-stone-500 font-bold normal-case w-[100px] text-center">
                    Sport
                  </th>
                  <th className="p-4 text-xs text-stone-500 font-bold normal-case w-[85px] text-center">
                    Players
                  </th>
                  <th className="p-4 text-xs text-stone-500 font-bold normal-case w-[160px]">
                    Location
                  </th>

                  <th
                    className="group p-4 cursor-pointer hover:bg-stone-100/50 transition-colors select-none w-[200px]"
                    onClick={() => handleSort("schedule")}
                  >
                    <div className="flex items-center gap-x-1 text-stone-700 normal-case text-xs font-bold">
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

                  <th className="p-4 text-xs text-stone-500 font-bold normal-case w-[110px] text-center">
                    Status
                  </th>
                  <th className="p-4 text-xs text-stone-500 font-bold normal-case w-[95px] text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100">
                {currentSessions?.map((session) => {
                  const hosts = (() => {
                    const explicitSessionHosts =
                      session?.players
                        ?.filter((p) => {
                          const role = p?.sessionPlayer?.role;
                          return (
                            role === "host" ||
                            role === "owner" ||
                            role === "admin"
                          );
                        })
                        ?.map(
                          (p) => p?.sessionPlayer?.communityPlayer?.username,
                        )
                        ?.filter(Boolean) || [];

                    const communityRoster =
                      context?.community?.players || context?.players || [];

                    const communityManagementUsernames =
                      communityRoster
                        ?.filter(
                          (member) =>
                            member?.role === "owner" ||
                            member?.role === "admin",
                        )
                        ?.map(
                          (member) =>
                            member?.username ||
                            member?.communityPlayer?.username,
                        )
                        ?.filter(Boolean) || [];

                    const sessionUsernames =
                      session?.players
                        ?.map(
                          (p) => p?.sessionPlayer?.communityPlayer?.username,
                        )
                        ?.filter(Boolean) || [];

                    const activeManagementHosts =
                      communityManagementUsernames.filter((username) =>
                        sessionUsernames.includes(username),
                      );

                    const allHosts = Array.from(
                      new Set([
                        ...explicitSessionHosts,
                        ...activeManagementHosts,
                      ]),
                    );

                    if (
                      allHosts.length === 0 &&
                      isManagement &&
                      communityPlayer?.username
                    ) {
                      return [communityPlayer.username];
                    }
                    return allHosts;
                  })();

                  return (
                    <tr
                      key={session.id}
                      onClick={() => {
                        if (canOpenSession)
                          navigate(
                            `/community/${communityId}/sessions/${session.id}`,
                          );
                      }}
                      className={`transition-all duration-150 ${
                        canOpenSession
                          ? "hover:bg-orange-50/10 cursor-pointer"
                          : "cursor-default text-stone-500"
                      }`}
                    >
                      <td className="p-4 text-sm font-bold text-stone-900">
                        <span
                          className="block max-w-[240px] truncate"
                          title={session?.name}
                        >
                          {session?.name}
                        </span>
                      </td>

                      <td className="p-4 text-xs text-stone-600 font-semibold">
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
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider rounded-md bg-orange-50/50 text-orange-700 px-2 py-0.5 border border-orange-100/40">
                          {session?.sport}
                        </span>
                      </td>

                      <td className="p-4 text-center text-sm font-extrabold text-stone-700">
                        {session?._count.players || 0}
                      </td>

                      <td className="p-4 text-xs text-stone-600 font-semibold">
                        <span
                          className="block max-w-[150px] truncate"
                          title={session?.location}
                        >
                          {session?.location || "—"}
                        </span>
                      </td>

                      <td className="p-4 text-xs text-stone-600">
                        <div className="flex flex-col gap-y-0.5 justify-center font-bold">
                          <span className="text-stone-850">
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
                          className={`inline-flex items-center text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                            session?.isAvailable
                              ? "bg-green-50 text-green-700 border-green-100"
                              : "bg-stone-50 text-stone-400 border-stone-200"
                          }`}
                        >
                          {session?.isAvailable ? "Available" : "Unavailable"}
                        </span>
                      </td>

                      {/* ACTIONS COLUMN */}
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-x-1">
                          {isManagement ? (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedSession(session);
                                  setIsEditSessionModalOpen(true);
                                }}
                                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer outline-none"
                              >
                                <SquarePen size={15} />
                              </button>
                              <button
                                onClick={() => deleteSession(session?.id)}
                                className="p-1.5 text-stone-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer outline-none"
                              >
                                <Trash size={15} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                if (canOpenSession) {
                                  navigate(
                                    `/community/${communityId}/sessions/${session.id}`,
                                  );
                                  return;
                                }
                                if (!isGuest) {
                                  setSelectedSession(session);
                                  setIsEditSessionModalOpen(true);
                                }
                              }}
                              className={`px-3 py-1 text-xs font-bold border border-orange-500/20 bg-orange-50/40 text-orange-650 hover:bg-orange-500 hover:text-white rounded-lg transition-all cursor-pointer outline-none active:scale-[0.96] ${
                                isGuest ? "hidden" : ""
                              }`}
                            >
                              {canOpenSession ? "Open" : "Join"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {(!currentSessions || currentSessions.length === 0) && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-12 text-center text-xs text-stone-400 font-semibold italic bg-stone-50/20"
                    >
                      No scheduled sessions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-x-1.5 p-4 border-t border-stone-200/80 bg-stone-50/30">
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNumber = index + 1;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      currentPage === pageNumber
                        ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                        : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              {currentPage < totalPages && (
                <button
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 transition-all cursor-pointer ml-1"
                >
                  next
                </button>
              )}
            </div>
          )}
        </div>

        {isManagement && (
          <EditSessionModal
            accessToken={accessToken}
            communityId={communityId}
            getAllSessions={getAllSessions}
            isEditSessionModalOpen={isEditSessionModalOpen}
            setIsEditSessionModalOpen={setIsEditSessionModalOpen}
            session={selectedSession}
          />
        )}
      </main>
    </>
  );
};

export default CommunityActivities;
