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

  // 🟢 FIXED: Added `isSilentRefetch` flag to prevent UI flickering on updates
  const fetchDashboardContext = useCallback(
    async (isSilentRefetch = false) => {
      if (!communityId || !sessionId) return;

      try {
        // Only show full screen loading on initial mount, skip during background drag updates
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
        // 🟢 FIXED: Only toggle loading state off if we actually toggled it on
        if (!isSilentRefetch) {
          setIsLoading(false);
        }
      }
    },
    [communityId, sessionId, fetchWithAuth],
  );

  useEffect(() => {
    fetchDashboardContext(false); // Initial load is NOT silent
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
          throw new Error(
            data?.message ||
              "Server rejected slot assignment configuration change",
          );
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

    // Save the previous state in case we need to roll back on an error
    const rollbackState = { ...sessionData };

    // --- CASE A: MOVING / REORDERING INSIDE THE PLAYER POOL LOBBY ---
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

    // --- CASE B: DRAGGING INTO A COURT SLOT (OPTIMISTICALLY UPDATED) ---
    if (destination.droppableId.startsWith("court-")) {
      const [, targetCourtId, , targetPosition] =
        destination.droppableId.split("-");
      const sessionPlayerId = draggableId;
      const targetPosInt = parseInt(targetPosition, 10);

      // 1. OPTIMISTIC UPDATE: Instantly change the client-side state
      setSessionData((prev) => {
        const movingPlayer = prev.players.find((p) => p.id === sessionPlayerId);
        if (!movingPlayer) return prev;

        // Target the nested .courts array inside the matchCourts object wrapper
        const currentCourtsArray = prev.matchCourts?.courts || [];

        const updatedCourtsList = currentCourtsArray.map((court) => {
          if (court.id !== targetCourtId) return court;

          const updatedSlots = Array.from(court.slots || []);
          const existingSlotIndex = updatedSlots.findIndex(
            (s) => s.position === targetPosInt,
          );

          const newSlotItem = {
            position: targetPosInt,
            sessionPlayerId: movingPlayer.id,
            sessionPlayer: movingPlayer,
          };

          if (existingSlotIndex !== -1) {
            updatedSlots[existingSlotIndex] = newSlotItem;
          } else {
            updatedSlots.push(newSlotItem);
          }

          return { ...court, slots: updatedSlots };
        });

        // Return the complete updated object tree structure intact
        return {
          ...prev,
          matchCourts: {
            ...prev.matchCourts,
            courts: updatedCourtsList,
          },
        };
      });

      // 2. BACKEND MUTATION
      try {
        await assignPlayerToSlot(
          targetCourtId,
          sessionPlayerId,
          targetPosition,
        );

        // Silently sync with backend database safely without any flashing
        await fetchDashboardContext(true);
      } catch (err) {
        console.error("Backend failed! Rolling back UI layout...", err.message);
        // 3. ROLLBACK: Revert to previous layout state if server rejects the change
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

  // 🟢 RESTORED: Main grid layout context tree structure
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col md:flex-row">
        {/* PLAYERS COLUMN */}
        <PlayersContainer players={sessionData.players} />

        {/* COURTS WORKING GRID */}
        <div className="flex-1 flex flex-col gap-4">
          <MatchCourt
            matchCourts={sessionData.matchCourts}
            allPlayers={sessionData.players}
          />
          <QueueCourt queueCourts={sessionData.queueCourts} />
        </div>
      </div>
    </DragDropContext>
  );
};

export default Game;
