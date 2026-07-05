import React, { useCallback, useEffect, useState } from "react";
import PlayerAvatar from "../../../../components/PlayerAvatar";
import { useAuth } from "../../../../hooks/useAuth";
import { useParams } from "react-router-dom";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { useSession } from "../../../../hooks/useSession";

const RequestPlayers = () => {
  const { fetchWithAuth } = useAuth();
  const { refreshSessionContext } = useSession();
  const { communityId, sessionId } = useParams();
  const [staticPlayers, setStaticPlayers] = useState([]);
  const [isStaticMinimized, setIsStaticMinimized] = useState(false);

  const getStaticPlayersNotInSession = useCallback(async () => {
    if (!communityId || !sessionId) return;
    try {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/players/static`,
        { method: "GET" },
      );

      if (!response || !response.ok) {
        throw new Error(`HTTP error! Status: ${response?.status || "Unknown"}`);
      }

      const data = await response.json();

      if (!data?.success) {
        throw new Error(data?.message);
      }

      setStaticPlayers(data?.results || []);
    } catch (error) {
      console.error("Fetch available static players failed:", error.message);
    }
  }, [communityId, sessionId, fetchWithAuth]);

  useEffect(() => {
    getStaticPlayersNotInSession();
  }, [getStaticPlayersNotInSession]);

  const addToSession = useCallback(
    async (communityPlayerId) => {
      if (!communityId || !sessionId || !communityPlayerId) return;
      try {
        const response = await fetchWithAuth(
          `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/${communityPlayerId}/accept`,
          { method: "POST" },
        );

        if (!response || !response.ok) {
          throw new Error(
            `HTTP error! Status: ${response?.status || "Unknown"}`,
          );
        }

        const data = await response.json();
        if (!data?.success) {
          throw new Error(data?.message);
        }

        // Optimistically remove from view for snap UI feedback
        setStaticPlayers((prevPlayers) =>
          prevPlayers.filter(
            (wrapper) =>
              wrapper.id !== communityPlayerId &&
              wrapper.communityPlayer?.id !== communityPlayerId,
          ),
        );

        // Fetch fresh state from the source
        await getStaticPlayersNotInSession();
        await refreshSessionContext({ silent: true });
      } catch (error) {
        console.error("Fetch available static players failed:", error.message);
      }
    },
    [
      communityId,
      sessionId,
      fetchWithAuth,
      getStaticPlayersNotInSession,
      refreshSessionContext,
    ],
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* TOP TOOLBAR */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        {/* Sort Menu */}
        <div className="flex items-center gap-x-2">
          <label
            htmlFor="sort"
            className="text-xs font-medium text-stone-500 flex items-center gap-x-1"
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
      </div>

      {/* STATIC PLAYERS PROFILE CONTAINER */}
      <div className="border border-stone-200/80 rounded-xl bg-white overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setIsStaticMinimized((prev) => !prev)}
          className="w-full flex items-center justify-between cursor-pointer bg-stone-50/70 hover:bg-stone-50 py-3 px-4 transition-colors border-b border-stone-100"
        >
          <div className="flex items-center gap-x-2">
            <h4 className="font-semibold text-sm text-stone-800">Statics</h4>
            <span className="text-xs text-stone-400 font-normal">
              ({staticPlayers?.length || 0})
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
          <div className="p-2 animate-in fade-in slide-in-from-top-1 duration-150">
            {staticPlayers.length === 0 ? (
              <p className="text-xs text-stone-400 italic p-3 text-center">
                No available static guest accounts found.
              </p>
            ) : (
              <div className="flex flex-col gap-y-1">
                {staticPlayers.map((wrapper) => (
                  <div
                    key={wrapper.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-stone-50 transition-colors group"
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
                      onClick={() => addToSession(wrapper?.id)}
                      className="cursor-pointer text-xs bg-stone-900 hover:bg-stone-800 text-white font-medium py-1.5 px-3 rounded-lg shadow-sm transition-colors shrink-0"
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
