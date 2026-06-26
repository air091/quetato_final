import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../../../hooks/useAuth";
import { useParams } from "react-router-dom";

const All = () => {
  const { fetchWithAuth } = useAuth();
  const { communityId } = useParams();
  const [players, setPlayers] = useState([]);

  const getAllSession = useCallback(async () => {
    if (!communityId) return;

    try {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/players`,
        { method: "GET" },
      );

      if (!response.ok) {
        throw new Error(`HTTP request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data?.message || "An unknown error occurred");
      }

      setPlayers(data.player);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  }, [fetchWithAuth, communityId]);

  useEffect(() => {
    getAllSession();
  }, [getAllSession]);

  return (
    <div className="w-full max-w-[480px] mx-auto border rounded-lg">
      <h3 className="p-2 font-medium">All players</h3>
      {/* creator and admin section */}
      <div className="p-2 flex flex-col gap-y-2 border-t">
        <h4 className="font-semibold">Creator & admins</h4>
        {players
          .filter(
            (player) => player.role === "owner" || player.role === "admin",
          )
          .map((player) => (
            <div key={player.id} className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-semibold leading-5">
                  {player.communityPlayer.username}
                </span>
                <span className="text-[14px] bg-blue-500/80 text-blue-100 rounded px-1 w-fit">
                  {player.role}
                </span>
              </div>
              <button className="border px-2 font-medium text-[14px] cursor-pointer rounded py-1">
                Add friend
              </button>
            </div>
          ))}
      </div>

      {/* players & statics section */}
      <div className="p-2 flex flex-col gap-y-2 border-t">
        <h4 className="font-semibold">Players and statics</h4>
        {players
          .filter((player) => player.role === "player")
          .map((player) => (
            <div key={player.id} className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-semibold leading-5">
                  {player.communityPlayer.username}
                </span>
                <span className="text-[14px]">
                  {player.communityPlayer.type}
                </span>
              </div>

              <button className="border px-2 font-medium text-[14px] cursor-pointer rounded py-1">
                Add friend
              </button>
            </div>
          ))}
      </div>
    </div>
  );
};

export default All;
