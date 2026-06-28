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
  const [sessionData, setSessionData] = useState({
    players: [],
    matchCourts: [],
    queueCourts: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchDashboardContext = useCallback(
    async (isSilentRefetch = false) => {
      if (!communityId || !sessionId) return;

      try {
        if (!isSilentRefetch) {
          setIsLoading(true);
        }

        const baseUrl = `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}`;

        const [playersRes, matchRes, queueRes] = await Promise.all([
          fetchWithAuth(`${baseUrl}/players`, { method: "GET" }),
          fetchWithAuth(`${baseUrl}/courts?type=match`, { method: "GET" }),
          fetchWithAuth(`${baseUrl}/courts?type=queue`, { method: "GET" }),
        ]);

        if (!playersRes.ok || !matchRes.ok || !queueRes.ok) {
          throw new Error("One or more dashboard resources failed to load.");
        }

        const [playersData, matchData, queueData] = await Promise.all([
          playersRes.json(),
          matchRes.json(),
          queueRes.json(),
        ]);

        setSessionData({
          players: playersData.players || [],
          matchCourts: matchData.courts || [],
          queueCourts: queueData.courts || [],
        });
      } catch (error) {
        console.error("Dashboard initialization error:", error.message);
      } finally {
        if (!isSilentRefetch) {
          setIsLoading(false);
        }
      }
    },
    [communityId, sessionId, fetchWithAuth],
  );

  useEffect(() => {
    fetchDashboardContext(false);
  }, [fetchDashboardContext]);

  const assignPlayerToSlot = useCallback(
    async (targetCourtId, sessionPlayerId, targetPosition) => {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/courts/${targetCourtId}/slots/assign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionPlayerId,
            position: targetPosition,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Assignment failed.");
      }

      return await response.json();
    },
    [communityId, sessionId, fetchWithAuth],
  );

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // --- CASE A: REORDERING POOL LOBBY ---
    if (
      source.droppableId === "player-pool" &&
      destination.droppableId === "player-pool"
    ) {
      const reorderedPlayers = Array.from(sessionData.players);
      const [removed] = reorderedPlayers.splice(source.index, 1);
      reorderedPlayers.splice(destination.index, 0, removed);
      setSessionData((prev) => ({ ...prev, players: reorderedPlayers }));
      return;
    }

    // --- CASE B: DRAGGING INTO A COURT SLOT (OPTIMISTIC) ---
    if (destination.droppableId.includes("-court-")) {
      const isMatchCourt = destination.droppableId.startsWith("match-court-");
      const parts = destination.droppableId.split("-");
      const targetCourtId = parts[2];
      const targetPosition = parseInt(parts[4], 10);
      const sessionPlayerId = draggableId; // This is the ID of the dragged player

      setIsUpdating(true);

      try {
        await assignPlayerToSlot(
          targetCourtId,
          sessionPlayerId,
          targetPosition,
        );

        await fetchDashboardContext(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsUpdating(false);
      }
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
    <DragDropContext onDragEnd={isUpdating ? undefined : handleDragEnd}>
      <div className="flex gap-x-2">
        <PlayersContainer players={sessionData.players} />

        <div className="flex-1 flex flex-col gap-y-2">
          <MatchCourt
            matchCourts={sessionData.matchCourts}
            allPlayers={sessionData.players}
          />
          <QueueCourt
            queueCourts={sessionData.queueCourts}
            allPlayers={sessionData.players}
          />
        </div>
      </div>
    </DragDropContext>
  );
};

export default Game;
