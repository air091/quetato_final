import { EllipsisVertical } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { useParams } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import PlayersContainer from "../../../components/session_comp/game/PlayersContainer";

const Game = () => {
  const { fetchWithAuth } = useAuth();
  const { communityId, sessionId } = useParams();
  const [players, setPlayers] = useState([]);

  const getAllPlayers = useCallback(async () => {
    // Guard against missing URL parameters on initial component render
    if (!communityId || !sessionId) return;

    try {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/players`,
        {
          method: "GET",
        },
      );

      if (!response || !response.ok) {
        throw new Error(
          `HTTP failed with status: ${response?.status || "Unknown"}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data?.message || "Failed to retrieve player roster");
      }

      setPlayers(data.players);
    } catch (error) {
      console.error("Failed to fetch session roster:", error.message);
    }
  }, [communityId, sessionId, fetchWithAuth]);

  useEffect(() => {
    getAllPlayers();
  }, [getAllPlayers]);

  const handleDragEnd = (result) => {
    const { source, destination } = result;

    // Dropped outside a valid container layout zone
    if (!destination) return;

    // Dropped back in the same list at the same index positioning
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Optional: Rearrange pool list locally if just reordering within the pool
    if (
      source.droppableId === "player-pool" &&
      destination.droppableId === "player-pool"
    ) {
      const reorderedPlayers = Array.from(players);
      const [removed] = reorderedPlayers.splice(source.index, 1);
      reorderedPlayers.splice(destination.index, 0, removed);
      setPlayers(reorderedPlayers);
    }
  };

  return (
    // 🌟 1. Context wrapper around your main board architecture
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-6 p-4">
        {/* PLAYERS */}
        <PlayersContainer players={players} />

        {/* COURTS SECTION DROP TARGETS GO HERE */}
        <div className="flex-1 border border-dashed rounded-lg flex items-center justify-center bg-gray-50 text-gray-400">
          Courts layout placeholder
        </div>
      </div>
    </DragDropContext>
  );
};

export default Game;
