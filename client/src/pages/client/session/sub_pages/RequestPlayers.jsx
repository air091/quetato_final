import React, { useCallback, useEffect, useState, useMemo } from "react";
import PlayerAvatar from "../../../../components/PlayerAvatar";
import { useAuth } from "../../../../hooks/useAuth";
import { useParams } from "react-router-dom";
import { ArrowUpDown, ChevronDown, Search, X } from "lucide-react";
import { useSession } from "../../../../hooks/useSession";
import { API_URL } from "../../../../contexts/AuthContext";

const RequestPlayers = () => {
  const { fetchWithAuth } = useAuth();
  const { refreshSessionContext } = useSession();
  const { communityId, sessionId } = useParams();

  const [staticPlayers, setStaticPlayers] = useState([]);
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [Players, setPlayers] = useState([]);

  const [isStaticMinimized, setIsStaticMinimized] = useState(false);
  const [isRegisteredMinimized, setIsRegisteredMinimized] = useState(false);
  const [isRequestsMinimized, setIsRequestsMinimized] = useState(false);

  // Search & Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("a-z");

  // 1. Fetch pending requests for this session
  const getRequestedPlayers = useCallback(async () => {
    if (!communityId || !sessionId) return;
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/players/requested`,
        { method: "GET" },
      );

      if (!response || !response.ok) {
        throw new Error(`HTTP error! Status: ${response?.status || "Unknown"}`);
      }

      const data = await response.json();
      if (!data?.success) throw new Error(data?.message);

      setPlayers(data?.results || []);
    } catch (error) {
      console.error("Fetch requested session players failed:", error.message);
    }
  }, [communityId, sessionId, fetchWithAuth]);

  // 3. Fetch static players who aren't in this session
  const getStaticPlayersNotInSession = useCallback(async () => {
    if (!communityId || !sessionId) return;
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/players/static`,
        { method: "GET" },
      );

      if (!response || !response.ok) {
        throw new Error(`HTTP error! Status: ${response?.status || "Unknown"}`);
      }

      const data = await response.json();
      if (!data?.success) throw new Error(data?.message);

      setStaticPlayers(data?.results || []);
    } catch (error) {
      console.error("Fetch available static players failed:", error.message);
    }
  }, [communityId, sessionId, fetchWithAuth]);

  // Trigger initial lifecycle data collection
  useEffect(() => {
    getRequestedPlayers();
    getStaticPlayersNotInSession();
  }, [getRequestedPlayers, getStaticPlayersNotInSession]);

  // 4. Accept a pending session request OR add an available player directly
  const addToSession = useCallback(
    async (communityPlayerId, isIncomingRequest = false) => {
      if (!communityId || !sessionId || !communityPlayerId) return;
      try {
        const response = await fetchWithAuth(
          `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/${communityPlayerId}/accept`,
          { method: "POST" },
        );

        if (!response || !response.ok) {
          throw new Error(
            `HTTP error! Status: ${response?.status || "Unknown"}`,
          );
        }

        const data = await response.json();
        if (!data?.success) throw new Error(data?.message);

        // Optimistically clean up active arrays immediately
        if (isIncomingRequest) {
          setPlayers((prev) =>
            prev.filter((request) => request.playerId !== communityPlayerId),
          );
        } else {
          setRegisteredPlayers((prev) =>
            prev.filter((p) => p.id !== communityPlayerId),
          );
          setStaticPlayers((prev) =>
            prev.filter((p) => p.id !== communityPlayerId),
          );
        }

        // Re-sync all state lists safely
        await Promise.all([
          getRequestedPlayers(),
          getStaticPlayersNotInSession(),
        ]);
        await refreshSessionContext({ silent: true });
      } catch (error) {
        console.error("Adding player to session failed:", error.message);
      }
    },
    [
      communityId,
      sessionId,
      fetchWithAuth,
      getRequestedPlayers,
      getStaticPlayersNotInSession,
      refreshSessionContext,
    ],
  );

  // Helper for sorting list by username
  const sortList = (list, getUsername) => {
    return [...list].sort((a, b) => {
      const nameA = (getUsername(a) || "").toLowerCase();
      const nameB = (getUsername(b) || "").toLowerCase();

      if (sortOption === "a-z" || sortOption === "asc") {
        return nameA.localeCompare(nameB);
      } else if (sortOption === "desc") {
        return nameB.localeCompare(nameA);
      }
      return 0;
    });
  };

  // Filter & Sort requests
  const filteredRequests = useMemo(() => {
    let result = Players;
    if (searchQuery.trim()) {
      result = result.filter((request) => {
        const username =
          request?.sessionPlayer?.communityPlayer?.username || "";
        return username.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    return sortList(
      result,
      (req) => req?.sessionPlayer?.communityPlayer?.username,
    );
  }, [Players, searchQuery, sortOption]);

  // Filter & Sort static players
  const filteredStaticPlayers = useMemo(() => {
    let result = staticPlayers;
    if (searchQuery.trim()) {
      result = result.filter((wrapper) => {
        const username = wrapper?.communityPlayer?.username || "";
        return username.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    return sortList(result, (wrapper) => wrapper?.communityPlayer?.username);
  }, [staticPlayers, searchQuery, sortOption]);

  return (
    <div className="w-full flex flex-col gap-y-5 selection:bg-orange-500/10 selection:text-orange-950">
      {/* TOP TOOLBAR WITH SEARCH & SORT */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Sort Controls */}
        <div className="flex items-center gap-x-2">
          <label
            htmlFor="sort"
            className="flex items-center gap-x-1.5 text-xs font-bold text-stone-500 whitespace-nowrap"
          >
            <ArrowUpDown size={14} className="text-stone-400" /> Sort
          </label>
          <select
            name="sort"
            id="sort"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="h-9 cursor-pointer rounded-xl border border-stone-200/80 bg-white pl-3 pr-8 text-xs font-medium text-stone-800 shadow-sm transition-all duration-200 hover:border-stone-300 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            <option value="a-z">A-Z</option>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-full sm:max-w-[320px]">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
            <Search size={15} />
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players..."
            className="w-full rounded-xl border border-stone-200/80 bg-white py-2 pl-9 pr-8 text-xs font-medium text-stone-800 placeholder-stone-400 shadow-sm transition-all duration-200 hover:border-stone-300 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </header>

      {/* 1. PENDING REQUESTS CONTAINER */}
      <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm shadow-stone-200/40 transition-all duration-200">
        <button
          type="button"
          onClick={() => setIsRequestsMinimized((prev) => !prev)}
          className="flex w-full cursor-pointer items-center justify-between border-b border-stone-100 bg-amber-50/40 px-4.5 py-3.5 transition-colors hover:bg-amber-50/70"
        >
          <div className="flex items-center gap-x-2">
            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              Session Join Requests
            </h4>
            <span className="rounded-full bg-amber-100/80 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              {filteredRequests?.length || 0}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-amber-800 transition-transform duration-200 ${
              isRequestsMinimized ? "-rotate-90" : ""
            }`}
          />
        </button>

        {!isRequestsMinimized && (
          <div className="p-2 animate-in fade-in duration-150">
            {filteredRequests.length === 0 ? (
              <p className="p-6 text-center text-xs font-medium italic text-stone-400">
                {searchQuery.trim()
                  ? `No pending requests found matching "${searchQuery}"`
                  : "No pending session requests found."}
              </p>
            ) : (
              <div className="flex flex-col gap-y-1">
                {filteredRequests.map((request) => {
                  const targetUser = request?.sessionPlayer?.communityPlayer;
                  return (
                    <div
                      key={request.id}
                      className="flex items-center justify-between rounded-xl p-2.5 transition-colors hover:bg-stone-50/70"
                    >
                      <div className="flex min-w-0 items-center gap-x-3">
                        <PlayerAvatar
                          username={targetUser?.username}
                          size="md"
                        />
                        <div className="min-w-0">
                          <h5 className="truncate text-xs font-bold text-stone-900">
                            {targetUser?.username}
                          </h5>
                          <div className="mt-0.5 flex items-center gap-x-1.5 text-[10px] font-bold uppercase tracking-wider">
                            {targetUser?.skillLevel && (
                              <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-700 border border-amber-200/60">
                                {targetUser?.skillLevel}
                              </span>
                            )}
                            <span className="font-medium text-stone-400 normal-case">
                              requested to join
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToSession(request?.playerId, true)}
                        className="inline-flex h-8 cursor-pointer items-center justify-center rounded-xl bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-emerald-600/15"
                      >
                        Approve Request
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. STATIC PLAYERS PANEL */}
      <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm shadow-stone-200/40 transition-all duration-200">
        <button
          type="button"
          onClick={() => setIsStaticMinimized((prev) => !prev)}
          className="flex w-full cursor-pointer items-center justify-between border-b border-stone-100 bg-stone-50/60 px-4.5 py-3.5 transition-colors hover:bg-stone-100/60"
        >
          <div className="flex items-center gap-x-2">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Statics
            </h4>
            <span className="rounded-full bg-stone-200/60 px-2 py-0.5 text-[10px] font-bold text-stone-600">
              {filteredStaticPlayers?.length || 0}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-stone-500 transition-transform duration-200 ${
              isStaticMinimized ? "-rotate-90" : ""
            }`}
          />
        </button>

        {!isStaticMinimized && (
          <div className="p-2 animate-in fade-in duration-150">
            {filteredStaticPlayers.length === 0 ? (
              <p className="p-6 text-center text-xs font-medium italic text-stone-400">
                {searchQuery.trim()
                  ? `No static players found matching "${searchQuery}"`
                  : "No available static guest accounts found."}
              </p>
            ) : (
              <div className="flex flex-col gap-y-1">
                {filteredStaticPlayers.map((wrapper) => (
                  <div
                    key={wrapper.id}
                    className="flex items-center justify-between rounded-xl p-2.5 transition-colors hover:bg-stone-50/70"
                  >
                    <div className="flex min-w-0 items-center gap-x-3">
                      <PlayerAvatar
                        username={wrapper?.communityPlayer?.username}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h5 className="truncate text-xs font-bold text-stone-900">
                          {wrapper?.communityPlayer?.username}
                        </h5>
                        <div className="mt-0.5 flex items-center gap-x-1.5 text-[10px] font-bold uppercase tracking-wider">
                          {wrapper?.communityPlayer?.skillLevel && (
                            <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-700 border border-amber-200/60">
                              {wrapper?.communityPlayer?.skillLevel}
                            </span>
                          )}
                          <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-stone-600 font-bold">
                            {wrapper.role || "Guest"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addToSession(wrapper?.id, false)}
                      className="inline-flex h-8 cursor-pointer items-center justify-center rounded-xl bg-orange-500 px-3.5 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:bg-orange-600 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-orange-500/15"
                    >
                      Add to Session
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default RequestPlayers;
