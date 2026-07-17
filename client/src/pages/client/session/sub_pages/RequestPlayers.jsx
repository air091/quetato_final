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

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

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

  // Filter players based on search query
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return Players;
    return Players.filter((request) => {
      const username = request?.sessionPlayer?.communityPlayer?.username || "";
      return username.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [Players, searchQuery]);

  const filteredStaticPlayers = useMemo(() => {
    if (!searchQuery.trim()) return staticPlayers;
    return staticPlayers.filter((wrapper) => {
      const username = wrapper?.communityPlayer?.username || "";
      return username.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [staticPlayers, searchQuery]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* TOP TOOLBAR WITH SEARCH */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-3 gap-3">
        <div className="flex items-center gap-x-2 flex-1">
          <label
            htmlFor="sort"
            className="text-xs font-medium text-stone-500 flex items-center gap-x-1 whitespace-nowrap"
          >
            <ArrowUpDown size={13} /> Sort
          </label>
          <select
            name="sort"
            id="sort"
            className="block bg-white border border-stone-200 pl-2 pr-8 py-1 text-xs font-medium cursor-pointer rounded-lg text-stone-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
          >
            <option value="a-z">A-Z</option>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-[240px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Search size={14} />
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players..."
            className="w-full pl-9 pr-9 py-1.5 bg-white border border-stone-200 rounded-lg text-sm placeholder-stone-400 text-stone-800 font-medium outline-none shadow-sm focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 1. PENDING REQUESTS CONTAINER */}
      <div className="border border-stone-200/80 rounded-xl bg-white overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setIsRequestsMinimized((prev) => !prev)}
          className="w-full flex items-center justify-between cursor-pointer bg-amber-50/40 hover:bg-amber-50/70 py-3 px-4 transition-colors border-b border-stone-100"
        >
          <div className="flex items-center gap-x-2">
            <h4 className="font-semibold text-sm text-amber-900">
              Session Join Requests
            </h4>
            <span className="text-xs text-amber-600 font-medium">
              ({filteredRequests?.length || 0})
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-amber-700 transition-transform duration-200 ${isRequestsMinimized ? "-rotate-90" : ""}`}
          />
        </button>

        {!isRequestsMinimized && (
          <div className="p-2 animate-in fade-in duration-150">
            {filteredRequests.length === 0 ? (
              <p className="text-xs text-stone-400 italic p-3 text-center">
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
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center gap-x-3 min-w-0">
                        <PlayerAvatar
                          username={targetUser?.username}
                          size="md"
                        />
                        <div className="min-w-0">
                          <h5 className="font-semibold text-sm text-stone-900 truncate">
                            {targetUser?.username}
                          </h5>
                          <div className="flex items-center gap-x-1.5 mt-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {targetUser?.skillLevel && (
                              <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md">
                                {targetUser?.skillLevel}
                              </span>
                            )}
                            <span className="text-stone-400 font-normal lowercase">
                              requested to join
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToSession(request?.playerId, true)}
                        className="cursor-pointer text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1.5 px-3 rounded-lg shadow-sm transition-colors"
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
      </div>

      {/* 3. STATIC PLAYERS PANEL */}
      <div className="border border-stone-200/80 rounded-xl bg-white overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setIsStaticMinimized((prev) => !prev)}
          className="w-full flex items-center justify-between cursor-pointer bg-stone-50/70 hover:bg-stone-50 py-3 px-4 transition-colors border-b border-stone-100"
        >
          <div className="flex items-center gap-x-2">
            <h4 className="font-semibold text-sm text-stone-800">Statics</h4>
            <span className="text-xs text-stone-400 font-normal">
              ({filteredStaticPlayers?.length || 0})
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-stone-500 transition-transform duration-200 ${isStaticMinimized ? "-rotate-90" : ""}`}
          />
        </button>

        {!isStaticMinimized && (
          <div className="p-2 animate-in fade-in duration-150">
            {filteredStaticPlayers.length === 0 ? (
              <p className="text-xs text-stone-400 italic p-3 text-center">
                {searchQuery.trim()
                  ? `No static players found matching "${searchQuery}"`
                  : "No available static guest accounts found."}
              </p>
            ) : (
              <div className="flex flex-col gap-y-1">
                {filteredStaticPlayers.map((wrapper) => (
                  <div
                    key={wrapper.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-x-3 min-w-0">
                      <PlayerAvatar
                        username={wrapper?.communityPlayer?.username}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h5 className="font-semibold text-sm text-stone-900 truncate">
                          {wrapper?.communityPlayer?.username}
                        </h5>
                        <div className="flex items-center gap-x-1.5 mt-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {wrapper?.communityPlayer?.skillLevel && (
                            <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md">
                              {wrapper?.communityPlayer?.skillLevel}
                            </span>
                          )}
                          <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-md normal-case font-medium">
                            {wrapper.role || "Guest"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addToSession(wrapper?.id, false)}
                      className="cursor-pointer text-xs bg-stone-900 hover:bg-stone-800 text-white font-medium py-1.5 px-3 rounded-lg shadow-sm transition-colors"
                    >
                      Add to Session
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestPlayers;
