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
        <div>
          <h4>Creator, admins, & hosts</h4>
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
                className="relative flex items-center justify-between border w-fit gap-x-4 px-3 py-1 rounded"
              >
                <div className="flex flex-col">
                  <span className="font-semibold leading-5">
                    {player.sessionPlayer?.communityPlayer?.username}
                  </span>
                  <span className="text-[14px] bg-blue-500/80 text-blue-100 rounded px-1 w-fit">
                    {player.sessionPlayer?.role}
                  </span>
                </div>
                <button className="hover:bg-gray-200 hover:text-gray-700 text-gray-400 p-1 font-medium text-[14px] cursor-pointer rounded-full">
                  <EllipsisVertical size={16} />
                </button>

                {/* win / games */}
                <span></span>
              </div>
            ))}
        </div>
      </main>
    </>
  );
};

export default AllPlayers;
