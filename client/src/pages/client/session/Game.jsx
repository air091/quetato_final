import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import PlayersContainer from "../../../components/session_comp/game/PlayersContainer";
import MatchCourt from "../../../components/session_comp/game/MatchCourt";
import QueueCourt from "../../../components/session_comp/game/QueueCourt";
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

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

  const removePlayerToSlot = useCallback(
    async (courtId, slotId) => {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/courts/${courtId}/slots/${slotId}/remove`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Backend deletion failure details:", errorData);
        throw new Error("Failed to remove player from slot");
      }
      return true;
    },
    [communityId, sessionId, fetchWithAuth],
  );

  const handleRemovePlayer = async (courtId, slotId) => {
    const previousSessionData = structuredClone(sessionData);

    const removeFromCourtsList = (currentCourtsObj) => {
      if (!currentCourtsObj?.courts) return currentCourtsObj;

      const updatedCourts = currentCourtsObj.courts.map((court) => {
        if (court.id !== courtId) return court;

        const updatedSlots = (court.slots || []).map((slot) => {
          // SAFE MATCH: If the unique string ID matches, OR if a freshly dragged player matching slotId matches
          if (
            slot.id === slotId ||
            slot.sessionPlayerId === slotId ||
            `opt-${slot.position}` === slotId
          ) {
            return { ...slot, sessionPlayerId: null, sessionPlayer: null };
          }
          return slot;
        });

        return { ...court, slots: updatedSlots };
      });

      return { ...currentCourtsObj, courts: updatedCourts };
    };

    // 1. Force state wipe on frontend instantly
    setSessionData((prev) => ({
      ...prev,
      matchCourts: removeFromCourtsList(prev.matchCourts),
      queueCourts: removeFromCourtsList(prev.queueCourts),
    }));

    try {
      // If it's a completely temporary client-side ID, we don't dispatch it to the backend yet
      if (typeof slotId === "string" && slotId.startsWith("opt-")) {
        console.log("⚡ Success: Cleared an unsaved optimistic slot wrapper.");
        return;
      }

      await removePlayerToSlot(courtId, slotId);
    } catch (error) {
      console.error("❌ Deletion dropped! Restoring state context...", error);
      setSessionData(previousSessionData);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) return;

    const player = active.data.current?.player;
    if (!player) return;

    if (over.id.startsWith("slot-")) {
      const [_, courtId, positionStr] = over.id.split("-");
      const position = parseInt(positionStr, 10);

      const previousSessionData = structuredClone(sessionData);

      const updateCourtsListOptimistically = (currentCourtsObj) => {
        if (!currentCourtsObj?.courts) return currentCourtsObj;

        const updatedCourts = currentCourtsObj.courts.map((court) => {
          let slots = (court.slots || []).map((slot) => {
            if (slot.sessionPlayerId === player.id) {
              return { ...slot, sessionPlayerId: null, sessionPlayer: null };
            }
            return slot;
          });

          if (court.id === courtId) {
            const slotIndex = slots.findIndex((s) => s.position === position);

            // FIX: Inject a fallback ID so handleRemovePlayer doesn't break if clicked immediately
            const targetSlotStructure = {
              id: slots[slotIndex]?.id || `opt-${position}`,
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

      setSessionData((prev) => ({
        ...prev,
        matchCourts: updateCourtsListOptimistically(prev.matchCourts),
        queueCourts: updateCourtsListOptimistically(prev.queueCourts),
      }));

      try {
        const syncedPayload = await assignPlayerToSlot(
          courtId,
          player.id,
          position,
        );

        // Quietly update the temp placeholder ID with the official one from the database
        if (syncedPayload?.id || syncedPayload?.slot?.id) {
          const realSlotId = syncedPayload.id || syncedPayload.slot?.id;
          setSessionData((prev) => {
            const updateId = (obj) => ({
              ...obj,
              courts: obj.courts.map((c) =>
                c.id !== courtId
                  ? c
                  : {
                      ...c,
                      slots: c.slots.map((s) =>
                        s.position === position ? { ...s, id: realSlotId } : s,
                      ),
                    },
              ),
            });
            return {
              ...prev,
              matchCourts: updateId(prev.matchCourts),
              queueCourts: updateId(prev.queueCourts),
            };
          });
        }
      } catch (error) {
        console.error("❌ API Sync failed! Reverting view changes...", error);
        setSessionData(previousSessionData);
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Requires moving the cursor at least 1 pixel to start a drag.
        // This lets pure static button clicks bypass dnd-kit entirely!
        distance: 1,
      },
    }),
  );

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm font-medium text-gray-500 animate-pulse">
        Loading session dashboard...
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-x-2">
        <PlayersContainer players={sessionData.players} />

        <div className="flex-1 flex flex-col gap-y-2">
          <MatchCourt
            matchCourts={sessionData.matchCourts}
            players={sessionData.players}
            onRemovePlayer={handleRemovePlayer}
          />
          <QueueCourt
            queueCourts={sessionData.queueCourts}
            players={sessionData.players}
            onRemovePlayer={handleRemovePlayer}
          />
        </div>
      </div>
    </DndContext>
  );
};

export default Game;
