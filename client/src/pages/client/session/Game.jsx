import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import PlayersContainer from "../../../components/session_comp/game/PlayersContainer";
import MatchCourt from "../../../components/session_comp/game/MatchCourt";
import QueueCourt from "../../../components/session_comp/game/QueueCourt";
import { DndContext, pointerWithin } from "@dnd-kit/core";

const Game = () => {
  const { fetchWithAuth } = useAuth();
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
        if (!isSilentRefetch) setIsLoading(true);
        const baseUrl = `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}`;

        const [playersRes, matchRes, queueRes] = await Promise.all([
          fetchWithAuth(`${baseUrl}/players`, { method: "GET" }),
          fetchWithAuth(`${baseUrl}/courts?type=match`, { method: "GET" }),
          fetchWithAuth(`${baseUrl}/courts?type=queue`, { method: "GET" }),
        ]);

        if (!playersRes.ok || !matchRes.ok || !queueRes.ok)
          throw new Error("Resource endpoint returned an HTTP error status");

        const [playersData, matchData, queueData] = await Promise.all([
          playersRes.json(),
          matchRes.json(),
          queueRes.json(),
        ]);

        // Standardized structures matching what the components expect
        const extractedMatch =
          matchData.courts ||
          matchData.data ||
          (Array.isArray(matchData) ? matchData : []);
        const extractedQueue =
          queueData.courts ||
          queueData.data ||
          (Array.isArray(queueData) ? queueData : []);

        setSessionData({
          players:
            playersData.players ||
            (Array.isArray(playersData) ? playersData : []),
          matchCourts: Array.isArray(extractedMatch)
            ? { courts: extractedMatch, counts: matchData.counts }
            : extractedMatch,
          queueCourts: Array.isArray(extractedQueue)
            ? { courts: extractedQueue, counts: queueData.counts }
            : extractedQueue,
        });
      } catch (error) {
        console.error("Dashboard engine data loading error:", error.message);
      } finally {
        setIsLoading(false);
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
        `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/courts/slots/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courtId: targetCourtId,
            sessionPlayerId: sessionPlayerId,
            position: Number(targetPosition),
          }),
        },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Backend validation details:", errorData);
        throw new Error("Assignment failed");
      }
      return await response.json();
    },
    [communityId, sessionId, fetchWithAuth],
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) return;

    const player = active.data.current?.player;
    if (!player) return;

    if (over.id.startsWith("slot-")) {
      const [_, courtId, positionStr] = over.id.split("-");
      const position = parseInt(positionStr, 10);

      // 1. SNAPSHOT CURRENT STATES FOR INSURANCE ROLLBACK
      const previousSessionData = structuredClone(sessionData);

      // 2. BUILD OPTIMISTIC ALTERED DATA STRUCTS
      const updateCourtsListOptimistically = (currentCourtsObj) => {
        if (!currentCourtsObj?.courts) return currentCourtsObj;

        const updatedCourts = currentCourtsObj.courts.map((court) => {
          // A. Clean out the player from their original slot anywhere else on this group canvas
          let slots = (court.slots || []).map((slot) => {
            if (slot.sessionPlayerId === player.id) {
              return { ...slot, sessionPlayerId: null, sessionPlayer: null };
            }
            return slot;
          });

          // B. Inject player into their target layout coordinates
          if (court.id === courtId) {
            const slotIndex = slots.findIndex((s) => s.position === position);
            const targetSlotStructure = {
              position: position,
              sessionPlayerId: player.id,
              sessionPlayer: player,
            };

            if (slotIndex !== -1) {
              slots[slotIndex] = targetSlotStructure;
            } else {
              slots.push(targetSlotStructure);
            }
          }

          return { ...court, slots };
        });

        return { ...currentCourtsObj, courts: updatedCourts };
      };

      // 3. FORCE OPTIMISTIC LOCAL STATE CHANGE INSTANTLY
      setSessionData((prev) => ({
        ...prev,
        matchCourts: updateCourtsListOptimistically(prev.matchCourts),
        queueCourts: updateCourtsListOptimistically(prev.queueCourts),
      }));

      // 4. SYNC WITH THE BACKEND API IN THE BACKGROUND
      try {
        await assignPlayerToSlot(courtId, player.id, position);
        console.log("⚡ Success: Server synced perfectly.");
      } catch (error) {
        console.error(
          "❌ API Sync failed! Reverting view changes optimistically...",
          error,
        );
        // 5. ROLLBACK ON FAILURE
        setSessionData(previousSessionData);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm font-medium text-gray-500 animate-pulse">
        Loading session dashboard...
      </div>
    );
  }

  return (
    <DndContext collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      <div className="flex gap-x-2">
        <PlayersContainer players={sessionData.players} />

        <div className="flex-1 flex flex-col gap-y-2">
          <MatchCourt
            matchCourts={sessionData.matchCourts}
            players={sessionData.players}
          />
          <QueueCourt
            queueCourts={sessionData.queueCourts}
            players={sessionData.players}
          />
        </div>
      </div>
    </DndContext>
  );
};

export default Game;
