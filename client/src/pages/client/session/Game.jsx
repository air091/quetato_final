import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { DragDropContext } from "@hello-pangea/dnd";
import PlayersContainer from "../../../components/session_comp/game/PlayersContainer";
import MatchCourt from "../../../components/session_comp/game/MatchCourt";
import QueueCourt from "../../../components/session_comp/game/QueueCourt";

const Game = () => {
  const { fetchWithAuth } = useAuth();
  const { communityId, sessionId } = useParams();

  // 🟢 Single state slice for layout data prevents unnecessary multi-render thrashing
  const [sessionData, setSessionData] = useState({
    players: [],
    matchCourts: [],
    queueCourts: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // 🟢 Combined fetch mechanism resolves waterfalling network states
  const fetchDashboardContext = useCallback(async () => {
    if (!communityId || !sessionId) return;

    try {
      setIsLoading(true);
      const baseUrl = `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}`;

      // Concurrent execution on the browser thread
      const [playersRes, matchRes, queueRes] = await Promise.all([
        fetchWithAuth(`${baseUrl}/players`, { method: "GET" }),
        fetchWithAuth(`${baseUrl}/courts?type=match`, { method: "GET" }),
        fetchWithAuth(`${baseUrl}/courts?type=queue`, { method: "GET" }),
      ]);

      // Simple validation gate
      if (!playersRes.ok || !matchRes.ok || !queueRes.ok) {
        throw new Error("One or more dashboard resources failed to load.");
      }

      const [playersData, matchData, queueData] = await Promise.all([
        playersRes.json(),
        matchRes.json(),
        queueRes.json(),
      ]);

      // 🟢 Batch update state exactly ONCE
      setSessionData({
        players: playersData.players || [],
        matchCourts: matchData.courts || [],
        queueCourts: queueData.courts || [],
      });
    } catch (error) {
      console.error("Dashboard initialization error:", error.message);
    } finally {
      setIsLoading(false);
    }
  }, [communityId, sessionId, fetchWithAuth]);

  useEffect(() => {
    fetchDashboardContext();
  }, [fetchDashboardContext]);

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Rearrange player-pool context locally
    if (
      source.droppableId === "player-pool" &&
      destination.droppableId === "player-pool"
    ) {
      const reorderedPlayers = Array.from(sessionData.players);
      const [removed] = reorderedPlayers.splice(source.index, 1);
      reorderedPlayers.splice(destination.index, 0, removed);

      setSessionData((prev) => ({ ...prev, players: reorderedPlayers }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-500 font-medium">
        Loading session configurations...
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col md:flex-row gap-6 p-4">
        {/* PLAYERS COLUMN */}
        <PlayersContainer players={sessionData.players} />

        {/* COURTS WORKING GRID */}
        <div className="flex-1 flex flex-col gap-4">
          <MatchCourt matchCourts={sessionData.matchCourts} />
          <QueueCourt queueCourts={sessionData.queueCourts} />
        </div>
      </div>
    </DragDropContext>
  );
};

export default Game;
