import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import PlayersContainer, {
  PlayerTimer,
} from "../../../components/session_comp/game/PlayersContainer";
import MatchCourt from "../../../components/session_comp/game/MatchCourt";
import QueueCourt from "../../../components/session_comp/game/QueueCourt";
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import { Gamepad2 } from "lucide-react";

const resolveSessionPlayerId = (player) =>
  player?.id || player?.sessionPlayerId || null;

const setPlayerGameStatus = (player, sessionPlayerId, gameStatus) => {
  if (resolveSessionPlayerId(player) !== sessionPlayerId) return player;

  return {
    ...player,
    gameStatus,
  };
};

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
    const timeoutId = window.setTimeout(() => {
      fetchDashboardContext(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
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
    const removedPlayerId = [
      sessionData.matchCourts,
      sessionData.queueCourts,
    ].reduce((foundPlayerId, courtsObj) => {
      if (foundPlayerId) return foundPlayerId;

      const targetCourt = courtsObj?.courts?.find(
        (court) => court.id === courtId,
      );
      const targetSlot = targetCourt?.slots?.find(
        (slot) =>
          slot.id === slotId ||
          slot.sessionPlayerId === slotId ||
          `opt-${slot.position}` === slotId,
      );

      return (
        targetSlot?.sessionPlayerId ||
        resolveSessionPlayerId(targetSlot?.sessionPlayer)
      );
    }, null);

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
      players: removedPlayerId
        ? prev.players.map((player) =>
            setPlayerGameStatus(player, removedPlayerId, "waiting"),
          )
        : prev.players,
    }));

    try {
      let targetSlotId = slotId;

      // 🟢 FIX: If a temporary ID is found, download real IDs right now and find the real replacement ID
      if (typeof targetSlotId === "string" && targetSlotId.startsWith("opt-")) {
        console.warn(
          "Temporary ID detected during removal. Resolving real database IDs...",
        );

        // 1. Wait for the server data to download and refresh state completely
        await fetchDashboardContext(true);

        // 2. Scan the freshly fetched database courts data to track down the newly created slot ID
        let resolvedRealId = null;
        const scanForRealId = (courtObj) => {
          courtObj?.courts?.forEach((c) => {
            if (c.id === courtId) {
              c.slots?.forEach((s) => {
                // Match by the player who was sitting in that position
                if (s.sessionPlayerId === removedPlayerId) {
                  resolvedRealId = s.id;
                }
              });
            }
          });
        };

        // Check current state data references
        scanForRealId(sessionData.matchCourts);
        scanForRealId(sessionData.queueCourts);

        if (!resolvedRealId) {
          throw new Error(
            "Could not find real database slot ID after refetching context.",
          );
        }

        targetSlotId = resolvedRealId;
      }

      // 🟢 3. Immediately hit the backend endpoint using the newly resolved ID on the SAME click
      await removePlayerToSlot(courtId, targetSlotId);
      await fetchDashboardContext(true);
    } catch (error) {
      console.error("Removal engine execution failure:", error);
      setSessionData(previousSessionData);
    }
  };

  const handleStartMatchCourt = useCallback(
    async (courtId) => {
      if (!communityId || !sessionId || !courtId) return;

      // Save previous state for rollbacks on failure
      const previousSessionData = structuredClone(sessionData);

      try {
        // 1. Optimistic UI update: Instantly move court status to "started"
        // and match court players' status tags to "playing"
        setSessionData((prev) => {
          if (!prev.matchCourts?.courts) return prev;

          let playerIdsToUpdate = [];

          const updatedCourts = prev.matchCourts.courts.map((court) => {
            if (court.id !== courtId) return court;

            // Gather player IDs attached to this court
            playerIdsToUpdate = (court.slots || [])
              .map((s) => s.sessionPlayerId)
              .filter(Boolean);

            return {
              ...court,
              status: "started",
              startedAt: new Date().toISOString(),
            };
          });

          const updatedPlayers = prev.players.map((player) => {
            const pId = player.id || player.sessionPlayerId;
            if (playerIdsToUpdate.includes(pId)) {
              return { ...player, gameStatus: "playing" };
            }
            return player;
          });

          return {
            ...prev,
            matchCourts: { ...prev.matchCourts, courts: updatedCourts },
            players: updatedPlayers,
          };
        });

        // 2. HTTP Request matching your patch endpoint structure
        const url = `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/courts/${courtId}/start`;
        const response = await fetchWithAuth(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData.message || "Failed to start match court setup.",
          );
        }

        // 3. Verify real state seamlessly from the database payload
        await fetchDashboardContext(true);
      } catch (error) {
        console.error("Match startup failure:", error);
        alert(error.message || "Could not start the match.");
        setSessionData(previousSessionData); // Rollback
      }
    },
    [communityId, sessionId, sessionData, fetchWithAuth, fetchDashboardContext],
  );

  const handleEndMatchCourt = useCallback(
    async (courtId, winningTeam) => {
      // 🌟 UPDATED: Accept winningTeam argument
      if (!communityId || !sessionId || !courtId) return;

      // Ensure a team selection is valid before sending
      if (!winningTeam || !["a", "b"].includes(winningTeam.toLowerCase())) {
        alert(
          "Please select a valid winning team ('a' or 'b') to end the match.",
        );
        return;
      }

      // Save previous state for rollbacks on failure
      const previousSessionData = structuredClone(sessionData);

      try {
        // 1. Optimistic UI update: Instantly move court status back to "idle",
        // clear its timer values, and empty out its slots array.
        setSessionData((prev) => {
          if (!prev.matchCourts?.courts) return prev;

          // Collect player IDs currently attached to this court before clearing them
          let playerIdsToFree = [];
          const targetedCourt = prev.matchCourts.courts.find(
            (c) => c.id === courtId,
          );
          if (targetedCourt) {
            playerIdsToFree = (targetedCourt.slots || [])
              .map((s) => s.sessionPlayerId)
              .filter(Boolean);
          }

          const updatedCourts = prev.matchCourts.courts.map((court) => {
            if (court.id !== courtId) return court;
            return {
              ...court,
              status: "idle",
              startedAt: null,
              slots: [], // Empty the court slots immediately matching deleteMany
            };
          });

          // Set the players who were on this court back to "waiting" state
          const updatedPlayers = prev.players.map((player) => {
            const pId = player.id || player.sessionPlayerId;
            if (playerIdsToFree.includes(pId)) {
              return { ...player, gameStatus: "waiting" };
            }
            return player;
          });

          return {
            ...prev,
            matchCourts: { ...prev.matchCourts, courts: updatedCourts },
            players: updatedPlayers,
          };
        });

        // 2. HTTP Request matching your route structure and body expectation
        const url = `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/courts/${courtId}/end`;
        const response = await fetchWithAuth(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ winningTeam: winningTeam.toLowerCase() }), // 🌟 ADDED: Send winningTeam in body
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to end the match court.");
        }

        // 3. Sync completely with the server database state
        await fetchDashboardContext(true);
      } catch (error) {
        console.error("Match teardown failure:", error);
        alert(error.message || "Could not end the match.");
        setSessionData(previousSessionData); // Rollback state on network error
      }
    },
    [communityId, sessionId, sessionData, fetchWithAuth, fetchDashboardContext],
  );

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
    setActivePlayerData(null);

    if (!over) return;

    const player = active.data.current?.player;
    if (!player) return;

    // 1. Get the true SessionPlayer CUID required by both backend validation and slots
    const stableSessionPlayerId = resolveSessionPlayerId(player);
    if (!stableSessionPlayerId) {
      console.error(
        "Could not resolve valid sessionPlayerId from dragged payload",
        player,
      );
      return;
    }

    const dropTarget = over.data.current || {};
    const targetType = dropTarget.courtType;
    const courtId = dropTarget.courtId;
    const position = Number(dropTarget.position);

    if (
      !["match", "queue"].includes(targetType) ||
      !courtId ||
      !Number.isInteger(position) ||
      position < 0 ||
      position > 3
    ) {
      console.error("Invalid court slot drop target", {
        overId: over.id,
        dropTarget,
      });
      return;
    }

    const previousSessionData = structuredClone(sessionData);

    // Extract the username string cleanly from the dragged item
    const resolvedUsername =
      player?.sessionPlayer?.communityPlayer?.username ||
      player?.communityPlayer?.username ||
      player?.username ||
      "Unknown Player";

    // 2. Perform optimistic UI updates
    setSessionData((prev) => {
      const updateCourtsListOptimistically = (currentCourtsObj) => {
        if (!currentCourtsObj?.courts) return currentCourtsObj;

        return {
          ...currentCourtsObj,
          courts: currentCourtsObj.courts.map((court) => {
            if (court.id !== courtId) return court;

            // Remove player from any existing position on this court layout
            const cleanedSlots = (court.slots || []).filter(
              (s) =>
                (s?.sessionPlayerId || s?.sessionPlayer?.id) !==
                stableSessionPlayerId,
            );

            // 🟢 THE FIX: Nest the object structure so the component's username check succeeds
            const targetSlotStructure = {
              id: `opt-${position}`, // Temporary UI key string
              position: position,
              team: position % 2 === 0 ? "a" : "b",
              courtId: courtId,
              sessionPlayerId: stableSessionPlayerId,
              sessionPlayer: {
                id: stableSessionPlayerId,
                // MatchCourt reads: matchedPoolPlayer.sessionPlayer.communityPlayer.username
                sessionPlayer: {
                  communityPlayer: {
                    username: resolvedUsername,
                  },
                },
                communityPlayer: {
                  username: resolvedUsername,
                },
                username: resolvedUsername,
              },
            };

            return {
              ...court,
              slots: [...cleanedSlots, targetSlotStructure],
            };
          }),
        };
      };

      return {
        ...prev,
        matchCourts:
          targetType === "match"
            ? updateCourtsListOptimistically(prev.matchCourts)
            : prev.matchCourts,
        queueCourts:
          targetType === "queue"
            ? updateCourtsListOptimistically(prev.queueCourts)
            : prev.queueCourts,

        // Update status tag flags in the roster view panel safely
        players: prev.players.map((player) =>
          setPlayerGameStatus(player, stableSessionPlayerId, "queued"),
        ),
      };
    });

    // 3. Send request to the backend service
    try {
      await assignPlayerToSlot(
        courtId,
        stableSessionPlayerId, // Sends valid SessionPlayer ID string
        position,
      );

      await fetchDashboardContext(true);
    } catch (error) {
      console.error("Backend slot assignment synchronization failed:", error);
      setSessionData(previousSessionData); // Fallback transaction rollback if server errors out
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

  const handleTransferQueue = useCallback(
    async (queueCourtId) => {
      if (!communityId || !sessionId || !queueCourtId) return;

      try {
        const url = `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/courts/transfer-queue`;

        const response = await fetchWithAuth(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ queueCourtId }), // 👈 Sends the selected queue court ID in the payload
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(
            errData.message || "Failed to transfer queue players",
          );
        }

        // 2. Silently refetch court slots configurations to render the migration updates
        await fetchDashboardContext(true);
      } catch (error) {
        console.error("Transfer Error:", error);
        alert(error.message || "Something went wrong during the transfer.");
      }
    },
    [communityId, sessionId, fetchWithAuth, fetchDashboardContext],
  );

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm font-medium text-gray-500 animate-pulse">
        Loading session dashboard...
      </div>
    );
  }

  console.log(activePlayerData);

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
            onStartMatchCourt={handleStartMatchCourt}
            onEndMatchCourt={handleEndMatchCourt}
          />
          <QueueCourt
            queueCourts={sessionData.queueCourts}
            players={sessionData.players}
            onRemovePlayer={handleRemovePlayer}
            onAddCourt={handleAddQueueCourt}
            onUpdateCourtName={handleUpdateCourtName}
            onDeleteCourt={handleDeleteCourt}
            onTransferQueue={handleTransferQueue}
          />
        </div>
      </div>

      {/* GLOBAL DRAG OVERLAY PORTAL CONTAINER */}
      <DragOverlay dropAnimation={null}>
        {activePlayerData ? (
          <div className="w-[164px] h-[41px] flex items-center justify-between p-2 bg-white rounded-md border border-blue-500 shadow-md text-sm font-medium select-none text-gray-800 opacity-95 architecture-dragged-active">
            <div>
              <span className="truncate text-black font-semibold max-w-[90px]">
                {activePlayerData.sessionPlayer.communityPlayer.username}
              </span>
              <div className="flex items-center gap-x-2">
                <span className="flex items-center gap-x-1">
                  <Gamepad2 size={12} /> <span className="text-[10px]">0</span>
                </span>
                <span className="text-[11px]">BEG</span>
              </div>
            </div>
            <div>
              <PlayerTimer timestamp={activePlayerData.updateStatus} />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default Game;
