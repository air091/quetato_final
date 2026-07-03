import React, { useCallback, useEffect, useState } from "react";
import PlayerAvatar from "../../../../components/PlayerAvatar";
import { useAuth } from "../../../../hooks/useAuth";
import { useParams } from "react-router-dom";
import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";

const RequestPlayers = () => {
  const { fetchWithAuth } = useAuth();
  const { communityId, sessionId } = useParams();
  const [staticPlayers, setStaticPlayers] = useState([]);
  const [isStaticMinimized, setIsStaticMinimized] = useState(false);
  const [isUserMinimized, setIsUserMinimized] = useState(false);

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

      setStaticPlayers(data?.results);
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

        // 🌟 Remove the player locally for a fast response
        setStaticPlayers((prevPlayers) =>
          prevPlayers.filter(
            (wrapper) =>
              wrapper.id !== communityPlayerId &&
              wrapper.communityPlayer?.id !== communityPlayerId,
          ),
        );

        // 🌟 🔄 Pull fresh, synchronized data directly from your database
        await getStaticPlayersNotInSession();
      } catch (error) {
        console.error("Fetch available static players failed:", error.message);
      }
    },
    [communityId, sessionId, fetchWithAuth, getStaticPlayersNotInSession], // 🌟 Added getStaticPlayersNotInSession here
  );

  return (
    <div className="w-full max-w-[720px] mx-auto">
      <div className="p-2">
        <h4 className="font-medium text-[18px] text-stone-800">Players</h4>
        <select
          name="sort"
          id="sort"
          className="block border px-1 py-0.5 text-[12px] font-medium cursor-pointer rounded-md mt-1"
        >
          <option value="a-z" className="font-medium">
            A-Z
          </option>
          <option value="asc" className="font-medium">
            Ascend
          </option>
          <option value="desc" className="font-medium">
            Descend
          </option>
        </select>
      </div>

      {/* USER PLAYERS CONTAINER */}
      <div className="flex flex-col gap-y-2 p-2">
        <header
          title={
            isUserMinimized
              ? "Expand user container"
              : "Minimize user container"
          }
          onClick={() => setIsUserMinimized((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer hover:bg-stone-200 py-1 px-2 rounded-md"
        >
          <h4 className="font-medium text-[16px] text-stone-800">All user</h4>
          <span className="cursor-pointer rounded-full transition-colors flex items-center justify-center">
            {isUserMinimized ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </span>
        </header>

        {!isUserMinimized && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-150">
            {staticPlayers.length === 0 ? (
              <p className="text-xs text-gray-400 italic p-2">
                No static players found.
              </p>
            ) : (
              <div className="flex flex-col gap-y-2">
                {staticPlayers.map((wrapper) => {
                  return (
                    <div
                      key={wrapper.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center gap-x-3">
                        <PlayerAvatar
                          username={wrapper?.communityPlayer?.username}
                          size="xl"
                        />
                        <div>
                          <h5 className="font-semibold text-stone-900">
                            {wrapper?.communityPlayer?.username}
                          </h5>
                          <div className="flex items-center gap-x-2 text-[12px] text-gray-500 font-medium">
                            <span className="bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded-full uppercase">
                              {wrapper?.communityPlayer?.skillLevel}
                            </span>
                            <span className="capitalize bg-gray-100 px-1.5 py-0.5 rounded-full">
                              {wrapper.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => addToSession(wrapper?.id)}
                          className="cursor-pointer text-[14px] bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded-full shadow-sm transition-colors"
                        >
                          Add to Session
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* STATIC PLAYERS CONTAINER */}
      <div className="flex flex-col gap-y-2 p-2 border-t">
        <header
          title={
            isStaticMinimized
              ? "Expand static container"
              : "Minimize static container"
          }
          onClick={() => setIsStaticMinimized((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer hover:bg-stone-200 py-1 px-2 rounded-md"
        >
          <h4 className="font-medium text-[16px] text-stone-800">All static</h4>
          <span className="cursor-pointer rounded-full transition-colors flex items-center justify-center">
            {isStaticMinimized ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </span>
        </header>

        {!isStaticMinimized && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-150 mt-2">
            {staticPlayers.length === 0 ? (
              <p className="text-xs text-gray-400 italic p-2">
                No static players found.
              </p>
            ) : (
              <div className="flex flex-col gap-y-2">
                {staticPlayers.map((wrapper) => {
                  return (
                    <div
                      key={wrapper.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center gap-x-3">
                        <PlayerAvatar
                          username={wrapper?.communityPlayer?.username}
                          size="xl"
                        />
                        <div>
                          <h5 className="font-semibold text-stone-900">
                            {wrapper?.communityPlayer?.username}
                          </h5>
                          <div className="flex items-center gap-x-2 text-[12px] text-gray-500 font-medium">
                            <span className="bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded-full uppercase">
                              {wrapper?.communityPlayer?.skillLevel}
                            </span>
                            <span className="capitalize bg-gray-100 px-1.5 py-0.5 rounded-full">
                              {wrapper.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => addToSession(wrapper?.id)}
                          className="cursor-pointer text-[14px] bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded-full shadow-sm transition-colors"
                        >
                          Add to Session
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestPlayers;
