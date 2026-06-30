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
  DragOverlay, // <-- Added tracking overlay context wrapper
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

  // Track currently dragged node to project clean mirror overlays
  const [activePlayerData, setActivePlayerData] = useState(null);

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

    setSessionData((prev) => ({
      ...prev,
      matchCourts: removeFromCourtsList(prev.matchCourts),
      queueCourts: removeFromCourtsList(prev.queueCourts),
    }));

    try {
      if (typeof slotId === "string" && slotId.startsWith("opt-")) {
        return;
      }
      await removePlayerToSlot(courtId, slotId);
    } catch (error) {
      setSessionData(previousSessionData);
    }
  };

  // Cache data block parameters right when node is selected
  const handleDragStart = (event) => {
    const { active } = event;
    const player = active.data.current?.player;
    if (player) {
      const username =
        player?.sessionPlayer?.communityPlayer?.username ||
        player?.communityPlayer?.username ||
        player?.username ||
        "Unknown Player";
      setActivePlayerData({ ...player, resolvedUsername: username });
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActivePlayerData(null); // Wipe tracking pointer cleanly

    if (!over) return;

    const player = active.data.current?.player;
    if (!player) return;

    if (over.id.startsWith("slot-")) {
      const [_, courtId, positionStr] = over.id.split("-");
      const position = parseInt(positionStr, 10);

      const previousSessionData = structuredClone(sessionData);

      let sourceCourtId = null;
      let sourcePosition = null;
      let sourceSlotId = null;

      const locateSource = (courtObj) => {
        courtObj?.courts?.forEach((c) => {
          c.slots?.forEach((s) => {
            if (s.sessionPlayerId === player.id) {
              sourceCourtId = c.id;
              sourcePosition = s.position;
              sourceSlotId = s.id;
            }
          });
        });
      };
      locateSource(sessionData.matchCourts);
      locateSource(sessionData.queueCourts);

      let displacedPlayer = null;
      let displacedSlotId = null;

      const locateTarget = (courtObj) => {
        courtObj?.courts?.forEach((c) => {
          if (c.id === courtId) {
            const targetSlot = c.slots?.find((s) => s.position === position);
            if (targetSlot?.sessionPlayerId) {
              displacedSlotId = targetSlot.id;
              displacedPlayer =
                sessionData.players.find(
                  (p) => p.id === targetSlot.sessionPlayerId,
                ) || targetSlot.sessionPlayer;
            }
          }
        });
      };
      locateTarget(sessionData.matchCourts);
      locateTarget(sessionData.queueCourts);

      const updateCourtsListOptimistically = (currentCourtsObj) => {
        if (!currentCourtsObj?.courts) return currentCourtsObj;

        const updatedCourts = currentCourtsObj.courts.map((court) => {
          let updatedSlots = court.slots ? [...court.slots] : [];

          if (court.id === sourceCourtId && sourcePosition !== null) {
            updatedSlots = updatedSlots.map((slot) => {
              if (slot.position === sourcePosition) {
                if (displacedPlayer && courtId === sourceCourtId) {
                  return {
                    ...slot,
                    sessionPlayerId: displacedPlayer.id,
                    sessionPlayer: displacedPlayer,
                  };
                } else {
                  return {
                    ...slot,
                    sessionPlayerId: null,
                    sessionPlayer: null,
                  };
                }
              }
              return slot;
            });
          }

          if (
            court.id === sourceCourtId &&
            sourcePosition !== null &&
            courtId !== sourceCourtId &&
            displacedPlayer
          ) {
            const matchingSlotIdx = updatedSlots.findIndex(
              (s) => s.position === sourcePosition,
            );
            const feedbackStructure = {
              id: sourceSlotId || `opt-${sourcePosition}`,
              position: sourcePosition,
              sessionPlayerId: displacedPlayer.id,
              sessionPlayer: displacedPlayer,
            };
            if (matchingSlotIdx !== -1)
              updatedSlots[matchingSlotIdx] = feedbackStructure;
            else updatedSlots.push(feedbackStructure);
          }

          updatedSlots = updatedSlots.map((slot) => {
            if (
              slot.position !== position &&
              court.id === courtId &&
              slot.sessionPlayerId === player.id
            ) {
              return { ...slot, sessionPlayerId: null, sessionPlayer: null };
            }
            if (
              displacedPlayer &&
              slot.position !== sourcePosition &&
              court.id === sourceCourtId &&
              slot.sessionPlayerId === displacedPlayer.id
            ) {
              return { ...slot, sessionPlayerId: null, sessionPlayer: null };
            }
            return slot;
          });

          if (court.id === courtId) {
            const targetSlotIndex = updatedSlots.findIndex(
              (s) => s.position === position,
            );
            const targetSlotStructure = {
              id:
                displacedSlotId ||
                updatedSlots[targetSlotIndex]?.id ||
                `opt-${position}`,
              position: position,
              sessionPlayerId: player.id,
              sessionPlayer: player,
            };

            if (targetSlotIndex !== -1) {
              updatedSlots[targetSlotIndex] = targetSlotStructure;
            } else {
              updatedSlots.push(targetSlotStructure);
            }
          }

          return {
            ...court,
            slots: updatedSlots.filter(
              (s) => s.sessionPlayerId !== null || court.id === courtId,
            ),
          };
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
        setSessionData(previousSessionData);
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    }),
  );

  const createMatchCourtOnBackend = useCallback(async () => {
    const response = await fetchWithAuth(
      `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/courts/match`,
      { method: "POST", headers: { "Content-Type": "application/json" } },
    );
    if (!response.ok) throw new Error("Failed to add new match court");
    return await response.json();
  }, [communityId, sessionId, fetchWithAuth]);

  const createQueueCourtOnBackend = useCallback(async () => {
    const response = await fetchWithAuth(
      `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/courts/queue`,
      { method: "POST", headers: { "Content-Type": "application/json" } },
    );
    if (!response.ok) throw new Error("Failed to add new queue court");
    return await response.json();
  }, [communityId, sessionId, fetchWithAuth]);

  const handleAddMatchCourt = async () => {
    try {
      const newCourtData = await createMatchCourtOnBackend();
      const finalizedCourt = newCourtData.court || newCourtData;
      setSessionData((prev) => {
        const currentMatchObj = prev.matchCourts || {
          courts: [],
          counts: { match: 0 },
        };
        const fallbackCourtsList = currentMatchObj.courts || [];
        return {
          ...prev,
          matchCourts: {
            ...currentMatchObj,
            courts: [...fallbackCourtsList, finalizedCourt],
            counts: {
              ...currentMatchObj.counts,
              match: (currentMatchObj.counts?.match || 0) + 1,
            },
          },
        };
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddQueueCourt = async () => {
    try {
      const newCourtData = await createQueueCourtOnBackend();
      const finalizedCourt = newCourtData.court || newCourtData;
      setSessionData((prev) => {
        const currentMatchObj = prev.queueCourts || {
          courts: [],
          counts: { queue: 0 },
        };
        const fallbackCourtsList = currentMatchObj.courts || [];
        return {
          ...prev,
          queueCourts: {
            ...currentMatchObj,
            courts: [...fallbackCourtsList, finalizedCourt],
            counts: {
              ...currentMatchObj.counts,
              queue: (currentMatchObj.counts?.queue || 0) + 1,
            },
          },
        };
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateCourtName = useCallback((courtId, newName) => {
    const updateNameInList = (currentCourtsObj) => {
      if (!currentCourtsObj?.courts) return currentCourtsObj;
      return {
        ...currentCourtsObj,
        courts: currentCourtsObj.courts.map((court) =>
          court.id === courtId ? { ...court, name: newName } : court,
        ),
      };
    };

    setSessionData((prev) => ({
      ...prev,
      matchCourts: updateNameInList(prev.matchCourts),
      queueCourts: updateNameInList(prev.queueCourts), // Handles queue courts if they use it too
    }));
  }, []);

  const handleDeleteCourt = useCallback((courtId) => {
    const filterOutCourt = (currentCourtsObj) => {
      if (!currentCourtsObj?.courts) return currentCourtsObj;
      return {
        ...currentCourtsObj,
        courts: currentCourtsObj.courts.filter((court) => court.id !== courtId),
      };
    };

    setSessionData((prev) => ({
      ...prev,
      matchCourts: filterOutCourt(prev.matchCourts),
      queueCourts: filterOutCourt(prev.queueCourts),
    }));
  }, []);

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
      onDragStart={handleDragStart} // <-- Captures item configuration data
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-x-2 h-full">
        <PlayersContainer players={sessionData.players} />

        <div className="flex-1 flex flex-col gap-y-2 overflow-y-auto py-2">
          <MatchCourt
            matchCourts={sessionData.matchCourts}
            players={sessionData.players}
            onRemovePlayer={handleRemovePlayer}
            onAddCourt={handleAddMatchCourt}
            onUpdateCourtName={handleUpdateCourtName}
            onDeleteCourt={handleDeleteCourt}
          />
          <QueueCourt
            queueCourts={sessionData.queueCourts}
            players={sessionData.players}
            onRemovePlayer={handleRemovePlayer}
            onAddCourt={handleAddQueueCourt}
            onUpdateCourtName={handleUpdateCourtName}
            onDeleteCourt={handleDeleteCourt}
          />
        </div>
      </div>

      {/* GLOBAL DRAG OVERLAY PORTAL CONTAINER */}
      <DragOverlay dropAnimation={null}>
        {activePlayerData ? (
          <div className="w-[164px] h-[41px] flex items-center justify-between p-2 bg-white rounded-md border border-blue-500 shadow-md text-sm font-medium select-none text-gray-800 opacity-95 architecture-dragged-active">
            <span className="truncate flex-1 text-black font-semibold">
              {activePlayerData.resolvedUsername}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default Game;
