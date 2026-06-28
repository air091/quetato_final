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

  const assignPlayerToSlot = useCallback(
    async (targetCourtId, sessionPlayerId, targetPosition) => {
      if (!communityId || !sessionId || !targetCourtId || !sessionPlayerId) {
        console.warn("Missing critical parameters for slot assignment");
        return null;
      }

      try {
        // 🟢 Adjust this endpoint match string to match your exact backend routing requirements
        const response = await fetchWithAuth(
          `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/courts/${targetCourtId}/slots/assign`,
          {
            method: "POST", // pattern could be POST or PUT depending on your backend controller design
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

        return data; // Returns data up to handleDragEnd so it can trigger a layout update
      } catch (error) {
        console.error(
          "Failed to execute assignPlayerToSlot operation:",
          error.message,
        );
        throw error; // Bubble error up to the parent catch block so it can handle UI feedback
      }
    },
    [communityId, sessionId, fetchWithAuth],
  );

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    // Moving from pool into a court position slot
    if (
      source.droppableId === "player-pool" &&
      destination.droppableId.startsWith("court-")
    ) {
      // e.g. "court-cmq123-pos-2" -> [, courtId, position]
      const [, targetCourtId, , targetPosition] =
        destination.droppableId.split("-");

      try {
        // 🟢 FIXED: Only pass the parameters your wrapper function actually expects.
        // The user auth validation happens implicitly via fetchWithAuth header tokens.
        await assignPlayerToSlot(
          targetCourtId,
          draggableId, // sessionPlayerId
          targetPosition,
        );

        // Re-fetch context values to update the UI board layout
        await fetchDashboardContext();
      } catch (err) {
        console.error("DND processing error:", err.message);
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
