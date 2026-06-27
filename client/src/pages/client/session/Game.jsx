import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useParams } from "react-router-dom";

const Game = () => {
  const { fetchWithAuth } = useAuth();
  const { communityId, sessionId } = useParams();
  const [players, setPlayers] = useState([]);

  const getAllPlayers = useCallback(async () => {
    const response = await fetchWithAuth(
      `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/players`,
      {
        method: "GET",
      },
    );
    if (!response.ok) throw new Error("HTTP failed", response.status);
    const data = await response.json();

    if (!data.success) throw new Error(data?.message);

    console.log(data.players);
  }, []);

  useEffect(() => {
    getAllPlayers();
  }, [getAllPlayers]);

  return (
    <div>
      {/* PLAYERS */}
      <div className="border w-full max-w-[320px]">
        <header>
          <h4>Players</h4>
          <div className="flex items-center my-2">
            <button className="text-[14px] cursor-pointer hover:bg-gray-200 px-2 py-0.5 rounded w-full">
              All
            </button>
            <button className="text-[14px] cursor-pointer hover:bg-gray-200 px-2 py-0.5 rounded w-full">
              Waiting
            </button>
            <button className="text-[14px] cursor-pointer hover:bg-gray-200 px-2 py-0.5 rounded w-full">
              Queued
            </button>
            <button className="text-[14px] cursor-pointer hover:bg-gray-200 px-2 py-0.5 rounded w-full">
              Court
            </button>
            <button className="text-[14px] cursor-pointer hover:bg-gray-200 px-2 py-0.5 rounded w-full">
              Paid
            </button>
          </div>
        </header>
      </div>
      {/* COURTS */}
      <div></div>
    </div>
  );
};

export default Game;
