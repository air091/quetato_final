import { ArrowDown, EllipsisVertical } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../../hooks/useAuth";
import { useParams } from "react-router-dom";

const AllPlayers = () => {
  const { communityId, sessionId } = useParams();
  const { fetchWithAuth } = useAuth();
  const [players, setPlayers] = useState([]);

  const getAcceptedPlayers = useCallback(async () => {
    try {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/players`,
        {
          method: "GET",
        },
      );

      if (!response || !response.ok) {
        throw new Error(`HTTP error! Status: ${response?.status || "Unknown"}`);
      }

      const data = await response.json();

      // Adjusting based on standard JSend formatting (your backend sent 'status: "success"')
      if (data.status !== "success" && !data.success) {
        throw new Error(data?.message || "Failed to fetch players");
      }
      return setPlayers(data.players);
    } catch (error) {
      console.error("Fetch players failed:", error.message);
      throw error;
    }
  }, [communityId, sessionId, fetchWithAuth]); // ✅ Keeps the function reference stable across renders

  useEffect(() => {
    getAcceptedPlayers();
  }, [getAcceptedPlayers]);

  return (
    <>
      <header className="flex items-center gap-x-2 justify-end my-2">
        <div className="w-full max-w-[320px]">
          <input
            type="search"
            placeholder="Search player"
            className="border px-2 py-1 rounded w-full"
          />
        </div>
        <button className="flex items-center text-gray-400 hover:text-gray-700 gap-x-2 border px-2 py-1 rounded cursor-pointer">
          Games <ArrowDown size={16} />
        </button>
        <button className="flex items-center text-gray-400 hover:text-gray-700 gap-x-2 border px-2 py-1 rounded cursor-pointer">
          Wins <ArrowDown size={16} />
        </button>
      </header>

      <main>
        {/* ADMIN */}
        <div className="p-2 flex flex-col gap-y-2 border-t">
          <h4 className="font-semibold">Creator, admins, & hosts</h4>
          <div className="flex flex-wrap gap-2">
            {players
              .filter(
                (player) =>
                  player.sessionPlayer?.role === "owner" ||
                  player.sessionPlayer?.role === "admin" ||
                  player.sessionPlayer?.role === "host",
              )
              .map((player) => (
                <div
                  key={player.id}
                  className="relative flex items-center justify-between border min-w-[182px] px-2 py-1 rounded"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold leading-6">
                      {player.sessionPlayer?.communityPlayer?.username}
                    </span>
                    <div className="flex items-center gap-x-1 font-medium">
                      <span className="text-[12px] bg-gray-500/30 text-black rounded px-1 w-fit">
                        {player.sessionPlayer?.communityPlayer.type}
                      </span>
                      <span className="text-[12px] bg-blue-500/80 text-blue-100 rounded px-1 w-fit">
                        {player.sessionPlayer?.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-x-1">
                    <span className="text-[12px]">00/00</span>
                    <button className="hover:bg-gray-200 hover:text-gray-700 text-gray-400 p-1 font-medium text-[14px] cursor-pointer rounded-full">
                      <EllipsisVertical size={16} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="p-2 flex flex-col gap-y-2 border-t">
          <h4 className="font-semibold">Players & Statics</h4>
          <div className="flex flex-wrap gap-2">
            {players
              .filter(
                (player) =>
                  player.sessionPlayer?.role === "player" ||
                  player.sessionPlayer?.communityPlayer?.type === "static",
              )
              .map((player) => (
                <div
                  key={player.id}
                  className="relative flex items-center justify-between border min-w-[182px] px-2 py-1 rounded"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold leading-6">
                      {player.sessionPlayer?.communityPlayer?.username}
                    </span>
                    <div className="flex items-center gap-x-1 font-medium">
                      <span className="text-[12px] bg-gray-500/30 text-black rounded px-1 w-fit">
                        {player.sessionPlayer?.communityPlayer.type}
                      </span>
                      <span className="text-[12px] bg-blue-500/80 text-blue-100 rounded px-1 w-fit">
                        {player.sessionPlayer?.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-x-1">
                    <span className="text-[12px]">00/00</span>
                    <button className="hover:bg-gray-200 hover:text-gray-700 text-gray-400 p-1 font-medium text-[14px] cursor-pointer rounded-full">
                      <EllipsisVertical size={16} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </main>
    </>
  );
};

export default AllPlayers;
