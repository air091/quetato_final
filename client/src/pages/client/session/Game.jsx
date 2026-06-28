import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { DragDropContext } from "@hello-pangea/dnd";
import PlayersContainer from "../../../components/session_comp/game/PlayersContainer";
import MatchCourt from "../../../components/session_comp/game/MatchCourt";
import QueueCourt from "../../../components/session_comp/game/QueueCourt";

const Game = () => {
  const { user, fetchWithAuth } = useAuth();
  const { communityId, sessionId } = useParams();

  const [sessionData, setSessionData] = useState({
    players: [],
    matchCourts: [],
    queueCourts: [],
  });
  const [isLoading, setIsLoading] = useState(true);

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
      if (!communityId || !sessionId || !targetCourtId || !sessionPlayerId) {
        console.warn("Missing critical parameters for slot assignment");
        return null;
      }

      try {
        const response = await fetchWithAuth(
          `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/courts/${targetCourtId}/slots/assign`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sessionPlayerId,
              position: parseInt(targetPosition, 10),
            }),
          },
        );

        if (!response || !response.ok) {
          throw new Error(
            `Failed to assign player. Status: ${response?.status || "Unknown"}`,
          );
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data?.message || "Server rejected slot assignment");
        }

        return data;
      } catch (error) {
        console.error(
          "Failed to execute assignPlayerToSlot operation:",
          error.message,
        );
        throw error;
      }
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

    const rollbackState = { ...sessionData };

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

    // --- CASE B: DRAGGING INTO ANY COURT SLOT ---
    if (destination.droppableId.includes("-court-")) {
      const isQueue = destination.droppableId.startsWith("queue-");
      const parts = destination.droppableId.split("-");

      // Clean split configuration mapping:
      // Queue format: ["queue", "court", "courtId", "pos", "position"]
      // Match format: ["match", "court", "courtId", "pos", "position"]
      const targetCourtId = parts[2];
      const targetPosition = parts[4];
      const sessionPlayerId = draggableId;
      const targetPosInt = parseInt(targetPosition, 10);

      // 1. OPTIMISTIC UPDATE
      setSessionData((prev) => {
        const movingPlayer = prev.players.find((p) => p.id === sessionPlayerId);
        if (!movingPlayer) return prev;

        const newSlotItem = {
          position: targetPosInt,
          sessionPlayerId: movingPlayer.id,
          sessionPlayer: movingPlayer,
        };

        if (!isQueue) {
          const currentCourts =
            prev.matchCourts?.courts ||
            (Array.isArray(prev.matchCourts) ? prev.matchCourts : []);
          const updated = currentCourts.map((court) => {
            if (court.id !== targetCourtId) return court;
            const updatedSlots = Array.from(court.slots || []);
            const idx = updatedSlots.findIndex(
              (s) => s.position === targetPosInt,
            );
            if (idx !== -1) updatedSlots[idx] = newSlotItem;
            else updatedSlots.push(newSlotItem);
            return { ...court, slots: updatedSlots };
          });

          return {
            ...prev,
            matchCourts: Array.isArray(prev.matchCourts)
              ? updated
              : { ...prev.matchCourts, courts: updated },
          };
        } else {
          const currentCourts =
            prev.queueCourts?.courts ||
            (Array.isArray(prev.queueCourts) ? prev.queueCourts : []);
          const updated = currentCourts.map((court) => {
            if (court.id !== targetCourtId) return court;
            const updatedSlots = Array.from(court.slots || []);
            const idx = updatedSlots.findIndex(
              (s) => s.position === targetPosInt,
            );
            if (idx !== -1) updatedSlots[idx] = newSlotItem;
            else updatedSlots.push(newSlotItem);
            return { ...court, slots: updatedSlots };
          });

          return {
            ...prev,
            queueCourts: Array.isArray(prev.queueCourts)
              ? updated
              : { ...prev.queueCourts, courts: updated },
          };
        }
      });

      // 2. BACKEND MUTATION
      try {
        await assignPlayerToSlot(
          targetCourtId,
          sessionPlayerId,
          targetPosition,
        );
        await fetchDashboardContext(true);
      } catch (err) {
        console.error(
          "Backend assignment rejected. Rolling back layout...",
          err.message,
        );
        setSessionData(rollbackState);
      }
      return;
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
      <div className="flex flex-col md:flex-row">
        <PlayersContainer players={sessionData.players} />

        <div className="flex-1 flex flex-col gap-4">
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
