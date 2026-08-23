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
  MapPin,
  Users,
  Clock,
} from "lucide-react";
import AddSessionModal from "../../../../components/community_comp/activities/AddSessionModal";
import EditSessionModal from "../../../../components/community_comp/activities/EditSessionModal";
import { API_URL } from "../../../../contexts/AuthContext";

const CommunityActivities = () => {
  const { accessToken, fetchWithAuth, user } = useAuth();
  const context = useOutletContext();
  const communityPlayer = context?.communityPlayer;

  const { communityId } = useParams();
  const [sessions, setSessions] = useState([]);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    currentPage: 1,
  });
  const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] =
    useState(false);
  const [isEditSessionModalOpen, setIsEditSessionModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const [status, setStatus] = useState("");
  const [sport, setSport] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [order, setOrder] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

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
  }, [status, sport, debouncedSearch, sortBy, order]);

  const getAllSessions = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({
        sortBy,
        order,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });

      if (status) queryParams.append("status", status);
      if (sport) queryParams.append("sport", sport);
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
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Get all sessions failed", error);
    }
  }, [
    communityId,
    sortBy,
    order,
    status,
    sport,
    debouncedSearch,
    currentPage,
    fetchWithAuth,
  ]);

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
  const canOpenSession = (session) =>
    isManagement ||
    session?.players?.some(
      (sessionPlayer) =>
        sessionPlayer.isHost &&
        sessionPlayer.sessionPlayer?.communityPlayer?.id === user?.id,
    );
  const isGuest = !communityPlayer || communityPlayer?.status === "requested";

  const totalPages = pagination?.totalPages || 1;

  // Reusable helper to calculate hosts for both desktop and mobile views
  const getSessionHosts = useCallback(
    (session) => {
      const explicitSessionHosts =
        session?.players
          ?.filter((p) => {
            const role = p?.sessionPlayer?.role;
            return p?.isHost || role === "owner" || role === "admin";
          })
          ?.map((p) => p?.sessionPlayer?.communityPlayer?.username)
          ?.filter(Boolean) || [];

      const communityRoster =
        context?.community?.players || context?.players || [];

      const communityManagementUsernames =
        communityRoster
          ?.filter(
            (member) => member?.role === "owner" || member?.role === "admin",
          )
          ?.map(
            (member) => member?.username || member?.communityPlayer?.username,
          )
          ?.filter(Boolean) || [];

      const sessionUsernames =
        session?.players
          ?.map((p) => p?.sessionPlayer?.communityPlayer?.username)
          ?.filter(Boolean) || [];

      const activeManagementHosts = communityManagementUsernames.filter(
        (username) => sessionUsernames.includes(username),
      );

      const allHosts = Array.from(
        new Set([...explicitSessionHosts, ...activeManagementHosts]),
      );

      if (allHosts.length === 0 && isManagement && communityPlayer?.username) {
        return [communityPlayer.username];
      }
      return allHosts;
    },
    [context, isManagement, communityPlayer],
  );

  return (
    <>
      <main className="w-full max-w-7xl mx-auto select-none mt-6 px-4 sm:px-6 lg:px-8 selection:bg-orange-500/10 selection:text-orange-950">
        {/* Top Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-4 pb-5 border-b border-stone-200/80">
          <div className="w-full sm:w-auto">
            {isManagement ? (
              <>
                <button
                  onClick={() => setIsCreateSessionModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 text-sm sm:text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98] rounded-xl transition-all cursor-pointer shadow-md shadow-orange-500/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/10"
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
              <div className="text-center sm:text-left">
                <h2 className="text-base sm:text-lg font-extrabold text-stone-900 flex items-center justify-center sm:justify-start gap-x-2 tracking-tight">
                  <Calendar size={18} className="text-orange-500" /> Community
                  Activities
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 font-medium mt-1">
                  Explore schedules and look up active matches.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto sm:justify-end">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full sm:w-auto bg-stone-50/50 border border-stone-200 px-3 py-2.5 sm:py-1.5 text-xs font-bold text-stone-700 cursor-pointer rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all sm:h-[38px] min-w-[130px]"
            >
              <option value="">All Statuses</option>
              <option value="available">Available Only</option>
            </select>

            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full sm:w-auto bg-stone-50/50 border border-stone-200 px-3 py-2.5 sm:py-1.5 text-xs font-bold text-stone-700 cursor-pointer rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all sm:h-[38px] min-w-[130px]"
            >
              <option value="">All Sports</option>
              <option value="badminton">Badminton</option>
              <option value="volleyball">Volleyball</option>
            </select>

            <div className="relative flex items-center w-full sm:max-w-[240px]">
              <input
                type="search"
                placeholder="Search sessions..."
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-stone-200 pl-9 pr-8 py-2.5 sm:py-1.5 text-xs text-stone-900 font-medium rounded-xl outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 bg-stone-50/50 transition-all sm:h-[38px] [&::-webkit-search-cancel-button]:appearance-none"
              />
              <span className="absolute left-3 text-stone-400 pointer-events-none">
                <Search size={14} />
              </span>
              {searchQuery && (
                <span
                  className="absolute right-3 cursor-pointer text-stone-400 hover:text-stone-600 transition-colors p-1"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={14} />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Empty State / Content Routing */}
        {!sessions || sessions.length === 0 ? (
          <div className="w-full mt-6 bg-white border border-stone-200/80 rounded-2xl p-12 flex flex-col items-center justify-center text-stone-400 shadow-sm shadow-stone-100/50">
            <Calendar size={28} className="text-stone-300 mb-3" />
            <span className="text-sm font-bold text-stone-600">
              No scheduled sessions found
            </span>
            <span className="text-xs font-medium mt-1">
              Check back later or adjust your filters.
            </span>
          </div>
        ) : (
          <>
            {/* 1. MOBILE/TABLET VIEW: Card Layout (< 1024px) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden mt-6">
              {sessions.map((session) => {
                const hosts = getSessionHosts(session);

                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      if (canOpenSession(session))
                        navigate(
                          `/community/${communityId}/sessions/${session.id}`,
                        );
                    }}
                    className={`bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col gap-y-4 transition-all duration-200 group ${
                      canOpenSession(session)
                        ? "hover:border-orange-500/30 hover:shadow-md cursor-pointer active:scale-[0.99]"
                        : "cursor-default"
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm sm:text-base font-extrabold text-stone-900 line-clamp-2 tracking-tight group-hover:text-orange-600 transition-colors">
                          {session?.name}
                        </span>
                        <span className="inline-flex text-[10px] font-bold uppercase tracking-wider rounded-md bg-orange-50/80 text-orange-700 px-2 py-0.5 border border-orange-100/60 w-fit">
                          {session?.sport}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                          session?.isAvailable
                            ? "bg-green-50 text-green-700 border-green-100"
                            : "bg-stone-50 text-stone-500 border-stone-200"
                        }`}
                      >
                        {session?.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </div>

                    {/* Card Body Data */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs mt-1">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-stone-400 font-medium flex items-center gap-x-1.5 mb-0.5">
                          <Clock size={12} /> Schedule
                        </span>
                        <span className="font-bold text-stone-700">
                          {formatDate(session?.startAt) || "Anytime"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-stone-400 font-medium flex items-center gap-x-1.5 mb-0.5">
                          <MapPin size={12} /> Location
                        </span>
                        <span
                          className="font-bold text-stone-700 truncate"
                          title={session?.location}
                        >
                          {session?.location || "—"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-stone-400 font-medium flex items-center gap-x-1.5 mb-0.5">
                          <Users size={12} /> Players
                        </span>
                        <span className="font-bold text-stone-700">
                          {session?._count.players || 0}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-stone-400 font-medium flex items-center gap-x-1.5 mb-0.5">
                          <SquarePen size={12} /> Hosts
                        </span>
                        <span
                          className="font-bold text-stone-700 truncate"
                          title={hosts?.join(", ")}
                        >
                          {hosts && hosts.length > 0
                            ? hosts.join(", ")
                            : "None"}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div
                      className="pt-3.5 sm:pt-4 border-t border-stone-100 mt-auto flex justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isManagement ? (
                        <>
                          <button
                            onClick={() => {
                              setSelectedSession(session);
                              setIsEditSessionModalOpen(true);
                            }}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 rounded-xl transition-all cursor-pointer font-bold text-xs outline-none active:scale-[0.98] border border-stone-200/80"
                          >
                            <SquarePen size={14} /> Edit
                          </button>
                          <button
                            onClick={() => deleteSession(session?.id)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:text-white bg-red-50 hover:bg-red-500 rounded-xl transition-all cursor-pointer font-bold text-xs outline-none active:scale-[0.98] border border-red-100 hover:border-red-500"
                          >
                            <Trash size={14} /> Delete
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            if (canOpenSession(session)) {
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
                          className={`w-full sm:w-auto px-4 py-2 text-xs font-bold border border-orange-500/20 bg-orange-50 text-orange-650 hover:bg-orange-500 hover:text-white rounded-xl transition-all cursor-pointer outline-none active:scale-[0.98] ${
                            isGuest ? "hidden" : ""
                          }`}
                        >
                          {canOpenSession(session) ? "Open Session" : "Join Session"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. DESKTOP VIEW: Table Layout (>= 1024px) */}
            <div className="hidden lg:block w-full border border-stone-200/80 rounded-2xl overflow-hidden shadow-sm shadow-stone-100/50 bg-white mt-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
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
                                <ArrowDown
                                  size={14}
                                  className="text-stone-900"
                                />
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
                                <ArrowDown
                                  size={14}
                                  className="text-stone-900"
                                />
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
                      <th className="p-4 text-xs text-stone-500 font-bold normal-case w-[100px] text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-100">
                    {sessions.map((session) => {
                      const hosts = getSessionHosts(session);

                      return (
                        <tr
                          key={session.id}
                          onClick={() => {
                            if (canOpenSession(session))
                              navigate(
                                `/community/${communityId}/sessions/${session.id}`,
                              );
                          }}
                          className={`transition-all duration-150 ${
                            canOpenSession(session)
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
                              {session?.isAvailable
                                ? "Available"
                                : "Unavailable"}
                            </span>
                          </td>

                          <td
                            className="p-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-x-2">
                              {isManagement ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedSession(session);
                                      setIsEditSessionModalOpen(true);
                                    }}
                                    className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer outline-none active:scale-[0.96]"
                                  >
                                    <SquarePen size={16} />
                                  </button>
                                  <button
                                    onClick={() => deleteSession(session?.id)}
                                    className="p-2 text-stone-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer outline-none active:scale-[0.96]"
                                  >
                                    <Trash size={16} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (canOpenSession(session)) {
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
                                  className={`px-4 py-1.5 text-xs font-bold border border-orange-500/20 bg-orange-50/40 text-orange-650 hover:bg-orange-500 hover:text-white rounded-lg transition-all cursor-pointer outline-none active:scale-[0.96] ${
                                    isGuest ? "hidden" : ""
                                  }`}
                                >
                                  {canOpenSession(session) ? "Open" : "Join"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Shared Pagination Controls Footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-x-1.5 pt-6 pb-2">
                {Array.from({ length: totalPages }, (_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`min-w-[32px] h-[32px] flex items-center justify-center px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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
                    className="h-[32px] px-3 flex items-center justify-center text-xs font-bold rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 transition-all cursor-pointer ml-1"
                  >
                    Next
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Edit Modal (Shared) */}
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
