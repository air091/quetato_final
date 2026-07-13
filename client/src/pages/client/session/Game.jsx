import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import PlayersContainer, {
  PlayerTimer,
} from "../../../components/session_comp/game/PlayersContainer";
import MatchCourt from "../../../components/session_comp/game/MatchCourt";
import QueueCourt from "../../../components/session_comp/game/QueueCourt";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import { AlertTriangle, Gamepad2, X } from "lucide-react";
import PlayerAvatar from "../../../components/PlayerAvatar";
import { useSession } from "../../../hooks/useSession";
import { API_URL } from "../../../contexts/AuthContext";

const resolveSessionPlayerId = (player) =>
  player?.id || player?.sessionPlayerId || null;

const resolveSlotSessionPlayerId = (slot) =>
  slot?.sessionPlayerId || resolveSessionPlayerId(slot?.sessionPlayer);

const shouldResetPlayerTimer = (currentStatus, nextStatus) =>
  (currentStatus !== "playing" && nextStatus === "playing") ||
  (currentStatus !== "paid" && nextStatus === "paid") ||
  (currentStatus === "playing" &&
    (nextStatus === "queued" || nextStatus === "waiting"));

const setPlayerGameStatus = (
  player,
  sessionPlayerId,
  gameStatus,
  timestamp,
) => {
  if (resolveSessionPlayerId(player) !== sessionPlayerId) return player;

  const updatedPlayer = {
    ...player,
    gameStatus,
  };

  if (timestamp && shouldResetPlayerTimer(player?.gameStatus, gameStatus)) {
    updatedPlayer.updateStatus = timestamp;
  }

  return updatedPlayer;
};

const getPlayerUsername = (player) =>
  player?.sessionPlayer?.communityPlayer?.username ||
  player?.communityPlayer?.username ||
  player?.username ||
  "Unknown Player";

const formatTimes = (count) => `${count} ${count === 1 ? "time" : "times"}`;

const getSlotStatus = (court, courtType) =>
  (court?.type || courtType) === "match" &&
  (court?.status === "started" || court?.status === "paused")
    ? "playing"
    : "queued";

const createOptimisticSlotPlayer = (
  player,
  sessionPlayerId,
  gameStatus,
  timestamp,
) => {
  const username = getPlayerUsername(player);
  const communityPlayer = {
    ...(player?.sessionPlayer?.communityPlayer ||
      player?.communityPlayer ||
      {}),
    username,
  };

  const resetsTimer = shouldResetPlayerTimer(player?.gameStatus, gameStatus);

  return {
    ...player,
    id: sessionPlayerId,
    sessionPlayerId,
    gameStatus,
    updateStatus: resetsTimer ? timestamp : player?.updateStatus,
    updatedAt: resetsTimer ? timestamp : player?.updatedAt,
    username,
    communityPlayer,
    sessionPlayer: {
      ...(player?.sessionPlayer || {}),
      communityPlayer,
    },
  };
};

const createOptimisticSlot = ({
  baseSlot,
  courtId,
  position,
  sessionPlayerId,
  sessionPlayer,
  queuedAt,
}) => ({
  ...(baseSlot || {}),
  id: baseSlot?.id || `opt-${courtId}-${position}-${sessionPlayerId}`,
  courtId,
  position,
  team: position % 2 === 0 ? "a" : "b",
  sessionPlayerId,
  sessionPlayer,
  queuedAt: queuedAt ?? baseSlot?.queuedAt,
});

const findCourtLocation = (sessionData, courtId) => {
  for (const [courtsKey, courtType] of [
    ["matchCourts", "match"],
    ["queueCourts", "queue"],
  ]) {
    const court = sessionData?.[courtsKey]?.courts?.find(
      (candidateCourt) => candidateCourt.id === courtId,
    );

    if (court) return { courtsKey, courtType, court };
  }

  return null;
};

const findSlotLocation = (sessionData, predicate) => {
  for (const [courtsKey, courtType] of [
    ["matchCourts", "match"],
    ["queueCourts", "queue"],
  ]) {
    for (const court of sessionData?.[courtsKey]?.courts || []) {
      const slot = (court.slots || []).find((candidateSlot) =>
        predicate(candidateSlot, court),
      );

      if (slot) return { courtsKey, courtType, court, slot };
    }
  }

  return null;
};

const sortSlotsByPosition = (slots) =>
  [...slots].sort(
    (left, right) => (left?.position ?? 0) - (right?.position ?? 0),
  );

const applyOptimisticSlotAssignment = (
  sessionData,
  { targetType, courtId, position, player, sessionPlayerId, timestamp },
) => {
  const targetCourtLocation = findCourtLocation(sessionData, courtId);
  const targetCourt = targetCourtLocation?.court;
  const activeMatchLocation = findSlotLocation(
    sessionData,
    (slot, court) =>
      resolveSlotSessionPlayerId(slot) === sessionPlayerId &&
      court.type === "match" &&
      (court.status === "started" || court.status === "paused"),
  );
  const queueSourceLocation = findSlotLocation(
    sessionData,
    (slot, court) =>
      resolveSlotSessionPlayerId(slot) === sessionPlayerId &&
      court.type === "queue",
  );
  const sourceLocation =
    targetType === "queue"
      ? queueSourceLocation ||
        (activeMatchLocation
          ? null
          : findSlotLocation(
              sessionData,
              (slot) => resolveSlotSessionPlayerId(slot) === sessionPlayerId,
            ))
      : findSlotLocation(
          sessionData,
          (slot) => resolveSlotSessionPlayerId(slot) === sessionPlayerId,
        );
  const occupiedLocation = findSlotLocation(
    sessionData,
    (slot, court) => court.id === courtId && slot.position === position,
  );
  const occupiedPlayerId = resolveSlotSessionPlayerId(occupiedLocation?.slot);
  const hasDistinctOccupiedPlayer =
    occupiedPlayerId && occupiedPlayerId !== sessionPlayerId;
  const isSwap = Boolean(sourceLocation && hasDistinctOccupiedPlayer);
  const targetStatus = getSlotStatus(targetCourt, targetType);
  const sourceStatus = sourceLocation
    ? getSlotStatus(sourceLocation.court, sourceLocation.courtType)
    : "waiting";
  const targetSlotPlayer = createOptimisticSlotPlayer(
    player,
    sessionPlayerId,
    targetType === "queue" && player.gameStatus === "playing"
      ? "playing"
      : targetStatus,
    timestamp,
  );
  const occupiedPlayer =
    occupiedLocation?.slot?.sessionPlayer ||
    sessionData.players.find(
      (candidatePlayer) =>
        resolveSessionPlayerId(candidatePlayer) === occupiedPlayerId,
    );
  const occupiedSourceSlotPlayer =
    isSwap && occupiedPlayer
      ? createOptimisticSlotPlayer(
          occupiedPlayer,
          occupiedPlayerId,
          sourceStatus,
          timestamp,
        )
      : null;

  const updateCourtsList = (currentCourtsObj) => {
    if (!currentCourtsObj?.courts) return currentCourtsObj;

    return {
      ...currentCourtsObj,
      courts: currentCourtsObj.courts.map((court) => {
        const cleanedSlots = (court.slots || []).filter((slot) => {
          if (
            sourceLocation &&
            court.id === sourceLocation.court.id &&
            slot.position === sourceLocation.slot.position
          ) {
            return false;
          }
          if (court.id === courtId && slot.position === position) return false;
          return true;
        });

        const nextSlots = [...cleanedSlots];

        if (court.id === courtId) {
          nextSlots.push(
            createOptimisticSlot({
              baseSlot: sourceLocation?.slot || occupiedLocation?.slot,
              courtId,
              position,
              sessionPlayerId,
              sessionPlayer: targetSlotPlayer,
              queuedAt: targetType === "queue" ? timestamp : null,
            }),
          );
        }

        if (isSwap && court.id === sourceLocation.court.id) {
          nextSlots.push(
            createOptimisticSlot({
              baseSlot: occupiedLocation.slot,
              courtId: sourceLocation.court.id,
              position: sourceLocation.slot.position,
              sessionPlayerId: occupiedPlayerId,
              sessionPlayer: occupiedSourceSlotPlayer,
              queuedAt: sourceLocation.slot.queuedAt,
            }),
          );
        }

        return { ...court, slots: sortSlotsByPosition(nextSlots) };
      }),
    };
  };

  return {
    ...sessionData,
    matchCourts: updateCourtsList(sessionData.matchCourts),
    queueCourts: updateCourtsList(sessionData.queueCourts),
    players: sessionData.players.map((candidatePlayer) => {
      const candidatePlayerId = resolveSessionPlayerId(candidatePlayer);

      if (candidatePlayerId === sessionPlayerId) {
        if (
          targetType === "queue" &&
          candidatePlayer.gameStatus === "playing"
        ) {
          return candidatePlayer;
        }

        return setPlayerGameStatus(
          candidatePlayer,
          sessionPlayerId,
          targetStatus,
          timestamp,
        );
      }

      if (hasDistinctOccupiedPlayer && candidatePlayerId === occupiedPlayerId) {
        return setPlayerGameStatus(
          candidatePlayer,
          occupiedPlayerId,
          isSwap ? sourceStatus : "waiting",
          timestamp,
        );
      }

      return candidatePlayer;
    }),
  };
};

const reconcileAssignedSlotIds = (
  sessionData,
  backendSlots = [],
  { preserveLiveMatchSlotForPlayerId } = {},
) => {
  if (!Array.isArray(backendSlots) || backendSlots.length === 0) {
    return sessionData;
  }

  const validBackendSlots = backendSlots.filter(
    (slot) => slot?.sessionPlayerId,
  );
  // A player can occupy both a live Match Court and a Queue Court for their
  // next match. Court position, rather than player ID, is therefore the
  // stable identity for reconciling the returned slot layout.
  const getSlotLocationKey = (courtId, position) => `${courtId}:${position}`;
  const backendSlotLocationKeys = new Set(
    validBackendSlots.map((slot) =>
      getSlotLocationKey(slot.courtId, slot.position),
    ),
  );
  const backendPlayerIds = new Set(
    validBackendSlots.map((slot) => slot.sessionPlayerId),
  );
  const currentSlotByLocation = new Map();

  for (const courtsObj of [sessionData.matchCourts, sessionData.queueCourts]) {
    for (const court of courtsObj?.courts || []) {
      for (const slot of court.slots || []) {
        currentSlotByLocation.set(
          getSlotLocationKey(court.id, slot.position),
          slot,
        );
      }
    }
  }

  const reconcileCourtsList = (currentCourtsObj) => {
    if (!currentCourtsObj?.courts) return currentCourtsObj;

    return {
      ...currentCourtsObj,
      courts: currentCourtsObj.courts.map((court) => {
        const untouchedSlots = (court.slots || []).filter((slot) => {
          const locationKey = getSlotLocationKey(court.id, slot.position);
          const isLiveMatchSlotToPreserve =
            preserveLiveMatchSlotForPlayerId &&
            resolveSlotSessionPlayerId(slot) ===
              preserveLiveMatchSlotForPlayerId &&
            court.type === "match" &&
            (court.status === "started" || court.status === "paused") &&
            !backendSlotLocationKeys.has(locationKey);

          return (
            isLiveMatchSlotToPreserve ||
            (!backendSlotLocationKeys.has(locationKey) &&
              !backendPlayerIds.has(resolveSlotSessionPlayerId(slot)))
          );
        });
        const reconciledSlots = validBackendSlots
          .filter((backendSlot) => backendSlot.courtId === court.id)
          .map((backendSlot) => ({
            ...(currentSlotByLocation.get(
              getSlotLocationKey(backendSlot.courtId, backendSlot.position),
            ) || {}),
            id: backendSlot.id,
            courtId: backendSlot.courtId,
            position: backendSlot.position,
            team: backendSlot.team,
            sessionPlayerId: backendSlot.sessionPlayerId,
            queuedAt: backendSlot.queuedAt,
          }));

        return {
          ...court,
          slots: sortSlotsByPosition([...untouchedSlots, ...reconciledSlots]),
        };
      }),
    };
  };

  return {
    ...sessionData,
    matchCourts: reconcileCourtsList(sessionData.matchCourts),
    queueCourts: reconcileCourtsList(sessionData.queueCourts),
  };
};

const applyOptimisticSlotRemoval = (
  sessionData,
  { courtId, slotId, sessionPlayerId },
) => {
  const matchesRemovedSlot = (slot) =>
    slot.id === slotId ||
    slot.sessionPlayerId === slotId ||
    `opt-${slot.position}` === slotId;

  const removeFromCourtsList = (currentCourtsObj) => {
    if (!currentCourtsObj?.courts) return currentCourtsObj;

    return {
      ...currentCourtsObj,
      courts: currentCourtsObj.courts.map((court) =>
        court.id === courtId
          ? {
              ...court,
              slots: (court.slots || []).filter(
                (slot) => !matchesRemovedSlot(slot),
              ),
            }
          : court,
      ),
    };
  };

  return {
    ...sessionData,
    matchCourts: removeFromCourtsList(sessionData.matchCourts),
    queueCourts: removeFromCourtsList(sessionData.queueCourts),
    players: sessionPlayerId
      ? sessionData.players.map((player) =>
          setPlayerGameStatus(player, sessionPlayerId, "waiting"),
        )
      : sessionData.players,
  };
};

const buildOptimisticQueueTransfer = (sessionData, queueCourtId, timestamp) => {
  const queueCourt = sessionData.queueCourts?.courts?.find(
    (court) => court.id === queueCourtId,
  );

  if (!queueCourt) {
    return { canTransfer: false, nextSessionData: sessionData };
  }

  const queueSlotsToMove = (queueCourt.slots || [])
    .filter((slot) => resolveSlotSessionPlayerId(slot))
    .sort((left, right) => left.position - right.position);

  const hasPlayingPlayer = queueSlotsToMove.some((slot) => {
    const sessionPlayerId = resolveSlotSessionPlayerId(slot);
    const player =
      slot.sessionPlayer ||
      sessionData.players.find(
        (candidatePlayer) =>
          resolveSessionPlayerId(candidatePlayer) === sessionPlayerId,
      );

    return player?.gameStatus === "playing";
  });

  if (queueSlotsToMove.length === 0 || hasPlayingPlayer) {
    return { canTransfer: false, nextSessionData: sessionData };
  }

  const targetMatchCourt = sessionData.matchCourts?.courts?.find((court) => {
    const occupiedSlots = (court.slots || []).filter((slot) =>
      resolveSlotSessionPlayerId(slot),
    );

    return court.startedAt === null && occupiedSlots.length < 4;
  });

  if (!targetMatchCourt) {
    return { canTransfer: false, nextSessionData: sessionData };
  }

  const occupiedPositions = (targetMatchCourt.slots || [])
    .filter((slot) => resolveSlotSessionPlayerId(slot))
    .map((slot) => slot.position);
  const openPositions = [0, 1, 2, 3].filter(
    (position) => !occupiedPositions.includes(position),
  );
  const transferSlots = queueSlotsToMove.slice(0, openPositions.length);
  const movedPlayerIds = transferSlots
    .map((slot) => resolveSlotSessionPlayerId(slot))
    .filter(Boolean);

  if (transferSlots.length === 0) {
    return { canTransfer: false, nextSessionData: sessionData };
  }

  const nextMatchCourts = {
    ...sessionData.matchCourts,
    courts: (sessionData.matchCourts?.courts || []).map((court) => {
      if (court.id !== targetMatchCourt.id) return court;

      const optimisticSlots = transferSlots.map((sourceSlot, index) => {
        const sessionPlayerId = resolveSlotSessionPlayerId(sourceSlot);
        const sourcePlayer =
          sourceSlot.sessionPlayer ||
          sessionData.players.find(
            (player) => resolveSessionPlayerId(player) === sessionPlayerId,
          );

        return createOptimisticSlot({
          baseSlot: null,
          courtId: court.id,
          position: openPositions[index],
          sessionPlayerId,
          sessionPlayer: createOptimisticSlotPlayer(
            sourcePlayer,
            sessionPlayerId,
            "queued",
            timestamp,
          ),
        });
      });

      return {
        ...court,
        slots: sortSlotsByPosition([
          ...(court.slots || []),
          ...optimisticSlots,
        ]),
      };
    }),
  };

  const nextQueueCourts = {
    ...sessionData.queueCourts,
    courts: (sessionData.queueCourts?.courts || []).map((court) => {
      if (court.id !== queueCourtId) return court;

      return {
        ...court,
        slots: (court.slots || []).filter(
          (slot) => !movedPlayerIds.includes(resolveSlotSessionPlayerId(slot)),
        ),
      };
    }),
  };

  return {
    canTransfer: true,
    movedPlayerIds,
    nextSessionData: {
      ...sessionData,
      matchCourts: nextMatchCourts,
      queueCourts: nextQueueCourts,
      players: sessionData.players.map((player) =>
        movedPlayerIds.includes(resolveSessionPlayerId(player))
          ? setPlayerGameStatus(
              player,
              resolveSessionPlayerId(player),
              "queued",
            )
          : player,
      ),
    },
  };
};

const getProjectedCourtRelationshipPlayers = (
  sessionData,
  { targetType, courtId, position, player, sessionPlayerId },
) => {
  const projectedSessionData = applyOptimisticSlotAssignment(sessionData, {
    targetType,
    courtId,
    position,
    player,
    sessionPlayerId,
    timestamp: new Date().toISOString(),
  });
  const projectedCourt = findCourtLocation(
    projectedSessionData,
    courtId,
  )?.court;
  const targetTeam = position % 2 === 0 ? "a" : "b";

  return (projectedCourt?.slots || [])
    .filter((slot) => resolveSlotSessionPlayerId(slot))
    .filter((slot) => resolveSlotSessionPlayerId(slot) !== sessionPlayerId)
    .map((slot) => {
      const relatedSessionPlayerId = resolveSlotSessionPlayerId(slot);
      const relatedPlayer =
        slot.sessionPlayer ||
        projectedSessionData.players.find(
          (candidatePlayer) =>
            resolveSessionPlayerId(candidatePlayer) === relatedSessionPlayerId,
        );
      const relatedTeam = slot.team || (slot.position % 2 === 0 ? "a" : "b");

      return {
        sessionPlayerId: relatedSessionPlayerId,
        username: getPlayerUsername(relatedPlayer),
        relationshipType: relatedTeam === targetTeam ? "teamed" : "against",
      };
    });
};

const countPlayerRelationships = (history = [], relatedPlayers = []) => {
  return relatedPlayers.map((relatedPlayer) => {
    const counts = history.reduce(
      (summary, match) => {
        const playerTeam = match.playerPersonalTeam;
        const opponentTeam = playerTeam === "a" ? "b" : "a";
        const teammates = playerTeam === "a" ? match.teamA : match.teamB;
        const opponents = opponentTeam === "a" ? match.teamA : match.teamB;

        if (
          teammates?.some(
            (teammate) =>
              teammate.sessionPlayerId === relatedPlayer.sessionPlayerId,
          )
        ) {
          summary.teamed += 1;
        }

        if (
          opponents?.some(
            (opponent) =>
              opponent.sessionPlayerId === relatedPlayer.sessionPlayerId,
          )
        ) {
          summary.against += 1;
        }

        return summary;
      },
      { teamed: 0, against: 0 },
    );

    return {
      ...relatedPlayer,
      ...counts,
    };
  });
};

const Game = () => {
  const { fetchWithAuth } = useAuth();
  const {
    communityId,
    sessionId,
    sessionData,
    setSessionData,
    visibleSessionPlayers,
    isSessionLoading,
    refreshSessionContext,
  } = useSession();

  // Track currently dragged node to project clean mirror overlays
  const [activePlayerData, setActivePlayerData] = useState(null);
  const [relationshipToast, setRelationshipToast] = useState(null);
  const slotAssignmentVersionRef = useRef(0);
  const slotRemovalVersionRef = useRef(0);
  const queueTransferVersionRef = useRef(0);
  const queueTransferRequestRef = useRef(null);
  const latestSessionDataRef = useRef(sessionData);
  const relationshipToastTimerRef = useRef(null);
  const queuedSessionPlayerIds = useMemo(
    () =>
      new Set(
        (sessionData.queueCourts?.courts || [])
          .flatMap((court) => court.slots || [])
          .map((slot) => resolveSlotSessionPlayerId(slot))
          .filter(Boolean),
      ),
    [sessionData.queueCourts],
  );
  const visibleSessionPlayersWithQueueState = useMemo(
    () =>
      visibleSessionPlayers.map((player) => ({
        ...player,
        isQueuedForNextMatch: queuedSessionPlayerIds.has(
          resolveSessionPlayerId(player),
        ),
      })),
    [queuedSessionPlayerIds, visibleSessionPlayers],
  );

  useEffect(() => {
    latestSessionDataRef.current = sessionData;
  }, [sessionData]);

  useEffect(() => {
    return () => {
      if (relationshipToastTimerRef.current) {
        clearTimeout(relationshipToastTimerRef.current);
      }
    };
  }, []);

  const dismissRelationshipToast = useCallback(() => {
    if (relationshipToastTimerRef.current) {
      clearTimeout(relationshipToastTimerRef.current);
      relationshipToastTimerRef.current = null;
    }
    setRelationshipToast(null);
  }, []);

  const showRelationshipToast = useCallback(
    (subjectName, relationships, courtName) => {
      const notifications = (relationships || [])
        .map((relationship) => ({
          ...relationship,
          count: Number(relationship[relationship.relationshipType]) || 0,
        }))
        .filter((relationship) => relationship.count > 0);

      if (!notifications.length) return;

      if (relationshipToastTimerRef.current) {
        clearTimeout(relationshipToastTimerRef.current);
      }

      setRelationshipToast({
        id: Date.now(),
        subjectName,
        courtName,
        notifications,
      });

      relationshipToastTimerRef.current = setTimeout(() => {
        setRelationshipToast(null);
        relationshipToastTimerRef.current = null;
      }, 5000);
    },
    [],
  );

  const fetchRelationshipToastData = useCallback(
    async (sessionPlayerId, relatedPlayers) => {
      if (
        !communityId ||
        !sessionId ||
        !sessionPlayerId ||
        !relatedPlayers.length
      ) {
        return [];
      }

      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/players/${sessionPlayerId}/history`,
      );

      if (!response.ok) return [];

      const data = await response.json().catch(() => null);
      const history = data?.success ? data.results?.history || [] : [];

      return countPlayerRelationships(history, relatedPlayers);
    },
    [communityId, sessionId, fetchWithAuth],
  );

  const commitSessionData = useCallback(
    (updater) => {
      setSessionData((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        latestSessionDataRef.current = next;
        return next;
      });
    },
    [setSessionData],
  );

  const fetchDashboardContext = useCallback(
    (isSilentRefetch = false, updateState = true) =>
      refreshSessionContext({
        silent: isSilentRefetch,
        updateState,
      }),
    [refreshSessionContext],
  );

  const assignPlayerToSlot = useCallback(
    async (targetCourtId, sessionPlayerId, targetPosition) => {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/courts/slots/assign`,
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
        `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/courts/${courtId}/slots/${slotId}/remove`,
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
    const previousSessionData = structuredClone(latestSessionDataRef.current);
    const removalVersion = slotRemovalVersionRef.current + 1;
    slotRemovalVersionRef.current = removalVersion;
    const removedPlayerId = [
      previousSessionData.matchCourts,
      previousSessionData.queueCourts,
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

    commitSessionData((prev) =>
      applyOptimisticSlotRemoval(prev, {
        courtId,
        slotId,
        sessionPlayerId: removedPlayerId,
      }),
    );

    try {
      let targetCourtId = courtId;
      let targetSlotId = slotId;

      // If a temporary ID is found, download real IDs right now and find the real replacement ID.
      if (typeof targetSlotId === "string" && targetSlotId.startsWith("opt-")) {
        console.warn(
          "Temporary ID detected during removal. Resolving real database IDs...",
        );

        if (queueTransferRequestRef.current) {
          await queueTransferRequestRef.current.catch(() => null);
        }

        // Fetch persisted IDs without replacing the optimistic empty slot.
        const refreshedSessionData = await fetchDashboardContext(true, false);

        // 2. Scan the freshly fetched database courts data to track down the newly created slot ID
        let resolvedRealSlot = null;
        const scanForRealId = (courtObj) => {
          courtObj?.courts?.forEach((c) => {
            c.slots?.forEach((s) => {
              // Match by the player who was sitting in that position.
              if (
                s.sessionPlayerId === removedPlayerId &&
                typeof s.id === "string" &&
                !s.id.startsWith("opt-")
              ) {
                resolvedRealSlot = s;
              }
            });
          });
        };

        scanForRealId(refreshedSessionData?.matchCourts);
        scanForRealId(refreshedSessionData?.queueCourts);

        if (!resolvedRealSlot) {
          throw new Error(
            "Could not find real database slot ID after refetching context.",
          );
        }

        targetCourtId = resolvedRealSlot.courtId || targetCourtId;
        targetSlotId = resolvedRealSlot.id;
      }

      // Immediately hit the backend endpoint using the newly resolved ID on the same click.
      await removePlayerToSlot(targetCourtId, targetSlotId);
      await fetchDashboardContext(true);
    } catch (error) {
      console.error("Removal engine execution failure:", error);
      if (removalVersion === slotRemovalVersionRef.current) {
        commitSessionData(previousSessionData);
      }
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
          const startedAt = new Date().toISOString();

          const updatedCourts = prev.matchCourts.courts.map((court) => {
            if (court.id !== courtId) return court;

            // Gather player IDs attached to this court
            playerIdsToUpdate = (court.slots || [])
              .map((s) => s.sessionPlayerId)
              .filter(Boolean);

            return {
              ...court,
              status: "started",
              startedAt,
              slots: (court.slots || []).map((slot) => ({
                ...slot,
                sessionPlayer: slot.sessionPlayer
                  ? {
                      ...slot.sessionPlayer,
                      gameStatus: "playing",
                      updateStatus: shouldResetPlayerTimer(
                        slot.sessionPlayer.gameStatus,
                        "playing",
                      )
                        ? startedAt
                        : slot.sessionPlayer.updateStatus,
                      updatedAt: shouldResetPlayerTimer(
                        slot.sessionPlayer.gameStatus,
                        "playing",
                      )
                        ? startedAt
                        : slot.sessionPlayer.updatedAt,
                    }
                  : slot.sessionPlayer,
              })),
            };
          });

          const updatedPlayers = prev.players.map((player) => {
            const pId = player.id || player.sessionPlayerId;
            if (playerIdsToUpdate.includes(pId)) {
              const resetsTimer = shouldResetPlayerTimer(
                player.gameStatus,
                "playing",
              );
              return {
                ...player,
                gameStatus: "playing",
                updateStatus: resetsTimer ? startedAt : player.updateStatus,
              };
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
        const url = `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/courts/${courtId}/start`;
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
    [
      communityId,
      sessionId,
      sessionData,
      fetchWithAuth,
      fetchDashboardContext,
      setSessionData,
    ],
  );

  const handleEndMatchCourt = useCallback(
    async (courtId, winningTeam) => {
      // Accept winningTeam argument.
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
        // reset affected player timers, and empty out its slots array.
        setSessionData((prev) => {
          if (!prev.matchCourts?.courts) return prev;

          // Collect player IDs currently attached to this court before clearing them
          let playerIdsToFree = [];
          const endedAt = new Date().toISOString();
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

          const queuedPlayerIds = new Set(
            (prev.queueCourts?.courts || []).flatMap((court) =>
              (court.slots || []).map((slot) =>
                resolveSlotSessionPlayerId(slot),
              ),
            ),
          );

          // Players already in a Queue Court remain queued for their next game.
          const updatedPlayers = prev.players.map((player) => {
            const pId = player.id || player.sessionPlayerId;
            if (playerIdsToFree.includes(pId)) {
              const nextStatus = queuedPlayerIds.has(pId)
                ? "queued"
                : "waiting";
              const resetsTimer = shouldResetPlayerTimer(
                player.gameStatus,
                nextStatus,
              );

              return {
                ...player,
                gameStatus: nextStatus,
                updateStatus: resetsTimer ? endedAt : player.updateStatus,
                updatedAt: resetsTimer ? endedAt : player.updatedAt,
                totalGames: (Number(player.totalGames) || 0) + 1,
              };
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
        const url = `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/courts/${courtId}/end`;
        const response = await fetchWithAuth(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ winningTeam: winningTeam.toLowerCase() }),
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
    [
      communityId,
      sessionId,
      sessionData,
      fetchWithAuth,
      fetchDashboardContext,
      setSessionData,
    ],
  );

  // Cache data block parameters right when node is selected
  const handleDragStart = (event) => {
    const { active } = event;
    const player = active.data.current?.player;
    if (player && !player?.isHide) {
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
    if (!player || player?.isHide) return;
    if (player.gameStatus === "paid") return;

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

    const isPausedMatchEdit =
      targetType === "match" &&
      dropTarget.courtStatus !== "started" &&
      player.sourceCourtStatus === "paused";

    if (
      targetType === "match" &&
      player.gameStatus === "playing" &&
      !isPausedMatchEdit
    ) {
      console.warn(
        "A player who is already playing must be queued for their next match instead.",
      );
      return;
    }

    const previousSessionData = structuredClone(latestSessionDataRef.current);
    const targetCourtName =
      findCourtLocation(previousSessionData, courtId)?.court?.name || "Court";
    const relatedPlayers = getProjectedCourtRelationshipPlayers(
      previousSessionData,
      {
        targetType,
        courtId,
        position,
        player,
        sessionPlayerId: stableSessionPlayerId,
      },
    );
    const assignmentVersion = slotAssignmentVersionRef.current + 1;
    slotAssignmentVersionRef.current = assignmentVersion;

    // 2. Perform optimistic UI updates
    commitSessionData((prev) =>
      applyOptimisticSlotAssignment(prev, {
        targetType,
        courtId,
        position,
        player,
        sessionPlayerId: stableSessionPlayerId,
        timestamp: new Date().toISOString(),
      }),
    );

    // 3. Send request to the backend service
    try {
      const assignmentResult = await assignPlayerToSlot(
        courtId,
        stableSessionPlayerId, // Sends valid SessionPlayer ID string
        position,
      );

      if (assignmentVersion === slotAssignmentVersionRef.current) {
        commitSessionData((prev) =>
          reconcileAssignedSlotIds(prev, assignmentResult?.updatedSlotsState, {
            // Queuing a playing player is an additional placement; never let
            // reconciliation treat their live Match Court slot as a move.
            preserveLiveMatchSlotForPlayerId:
              targetType === "queue" ? stableSessionPlayerId : undefined,
          }),
        );

        const relationships = await fetchRelationshipToastData(
          stableSessionPlayerId,
          relatedPlayers,
        );

        showRelationshipToast(
          getPlayerUsername(player),
          relationships,
          targetCourtName,
        );
      }
    } catch (error) {
      console.error("Backend slot assignment synchronization failed:", error);
      if (assignmentVersion === slotAssignmentVersionRef.current) {
        commitSessionData(previousSessionData); // Fallback transaction rollback if server errors out
      }
    }
  };

  const collisionDetectionStrategy = (args) => {
    const activePlayer = args.active?.data.current?.player;
    const playerStatus = activePlayer?.gameStatus;
    if (playerStatus === "paid") return [];
    const eligibleDroppables = Array.from(args.droppableContainers).filter(
      (container) => {
        const dropData = container.data.current || {};
        const courtType = dropData.courtType;

        if (courtType === "queue") return true;
        if (courtType === "match") {
          return (
            playerStatus !== "playing" ||
            (activePlayer?.sourceCourtStatus === "paused" &&
              dropData.courtStatus !== "started")
          );
        }

        return true;
      },
    );

    return pointerWithin({
      ...args,
      droppableContainers: eligibleDroppables,
    });
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 2,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 220,
        tolerance: 14,
      },
    }),
  );

  const createMatchCourtOnBackend = useCallback(async () => {
    const response = await fetchWithAuth(
      `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/courts/match`,
      { method: "POST", headers: { "Content-Type": "application/json" } },
    );
    if (!response.ok) throw new Error("Failed to add new match court");
    return await response.json();
  }, [communityId, sessionId, fetchWithAuth]);

  const createQueueCourtOnBackend = useCallback(async () => {
    const response = await fetchWithAuth(
      `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/courts/queue`,
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

  const handleUpdateCourtName = useCallback(
    (courtId, newName) => {
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
    },
    [setSessionData],
  );

  const handleDeleteCourt = useCallback(
    (courtId) => {
      const filterOutCourt = (currentCourtsObj) => {
        if (!currentCourtsObj?.courts) return currentCourtsObj;
        return {
          ...currentCourtsObj,
          courts: currentCourtsObj.courts.filter(
            (court) => court.id !== courtId,
          ),
        };
      };

      setSessionData((prev) => ({
        ...prev,
        matchCourts: filterOutCourt(prev.matchCourts),
        queueCourts: filterOutCourt(prev.queueCourts),
      }));
    },
    [setSessionData],
  );

  const handleTransferQueue = useCallback(
    async (queueCourtId) => {
      if (!communityId || !sessionId || !queueCourtId) return;
      if (queueTransferRequestRef.current) return;

      const previousSessionData = structuredClone(latestSessionDataRef.current);
      const transferVersion = queueTransferVersionRef.current + 1;
      queueTransferVersionRef.current = transferVersion;
      const optimisticTransfer = buildOptimisticQueueTransfer(
        previousSessionData,
        queueCourtId,
        new Date().toISOString(),
      );

      if (optimisticTransfer.canTransfer) {
        commitSessionData(optimisticTransfer.nextSessionData);
      }

      let transferRequest = null;
      let transferCommitted = false;

      try {
        const url = `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/courts/transfer-queue`;
        transferRequest = fetchWithAuth(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ queueCourtId }),
        });
        queueTransferRequestRef.current = transferRequest;

        const response = await transferRequest;

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData.message || "Failed to transfer queue players",
          );
        }
        transferCommitted = true;

        if (transferVersion !== queueTransferVersionRef.current) {
          return;
        }

        // Keep the optimistic layout visible until the transfer transaction
        // has committed, then replace it with one complete server snapshot.
        // Reconciling only the moved slots caused an intermediate stale layout
        // (the visible bounce) before the final match-court state arrived.
        await fetchDashboardContext(true);
      } catch (error) {
        console.error("Transfer Error:", error);
        if (
          !transferCommitted &&
          optimisticTransfer.canTransfer &&
          transferVersion === queueTransferVersionRef.current
        ) {
          commitSessionData(previousSessionData);
        }
        if (!transferCommitted) {
          alert(error.message || "Something went wrong during the transfer.");
        }
      } finally {
        if (queueTransferRequestRef.current === transferRequest) {
          queueTransferRequestRef.current = null;
        }
      }
    },
    [
      communityId,
      sessionId,
      fetchWithAuth,
      fetchDashboardContext,
      commitSessionData,
    ],
  );

  if (isSessionLoading) {
    return (
      <div className="p-8 text-center text-sm font-medium text-gray-500 animate-pulse">
        Loading session dashboard...
      </div>
    );
  }

  // Dynamic background mapping based on required gameStatuses rules.
  const statusBgClasses = {
    waiting: "bg-stone-200 border-gray-500 text-gray-800",
    queued: "bg-amber-200 border-amber-500 text-amber-900",
    playingQueued: "bg-orange-200 border-orange-500 text-orange-950",
    playing: "bg-emerald-200 border-emerald-500 text-emerald-950",
    paid: "bg-rose-200 border-rose-500 text-rose-950",
  };

  const currentStatus = activePlayerData?.gameStatus || "waiting";
  const activeDisplayStatus =
    activePlayerData?.gameStatus === "playing" &&
    activePlayerData?.isQueuedForNextMatch
      ? "playingQueued"
      : currentStatus;
  const bgTheme =
    statusBgClasses[activeDisplayStatus] || statusBgClasses.waiting;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart} // <-- Captures item configuration data
      onDragEnd={handleDragEnd}
    >
      {relationshipToast && (
        <div className="fixed right-5 top-4 z-50 flex w-[min(540px,calc(100vw-2rem))] flex-col gap-1">
          {relationshipToast.notifications.map((notification) => (
            <div
              key={`${notification.sessionPlayerId}-${notification.relationshipType}`}
              className="flex min-h-[46px] items-center gap-3 rounded bg-red-600 px-4 py-2 text-white shadow-lg"
            >
              <AlertTriangle size={17} className="shrink-0" />
              <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                {notification.relationshipType === "teamed" ? (
                  <>
                    {relationshipToast.subjectName} and {notification.username}{" "}
                    have teamed up {formatTimes(notification.count)} before (
                    {relationshipToast.courtName})
                  </>
                ) : (
                  <>
                    {relationshipToast.subjectName} vs {notification.username}{" "}
                    have faced each other {formatTimes(notification.count)}{" "}
                    before ({relationshipToast.courtName})
                  </>
                )}
              </p>
              <Gamepad2 size={16} className="shrink-0" />
              <button
                type="button"
                onClick={dismissRelationshipToast}
                className="shrink-0 rounded p-1 text-white transition cursor-pointer hover:bg-white/15"
                aria-label="Dismiss match history notification"
              >
                <X size={17} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-x-2 h-full">
        <PlayersContainer
          players={visibleSessionPlayersWithQueueState}
          onRefreshData={() => fetchDashboardContext(true)}
          communityId={communityId}
          sessionId={sessionId}
        />

        <div className="flex-1 flex flex-col gap-y-2 overflow-y-auto py-2">
          <MatchCourt
            matchCourts={sessionData.matchCourts}
            players={visibleSessionPlayers}
            onRemovePlayer={handleRemovePlayer}
            onAddCourt={handleAddMatchCourt}
            onUpdateCourtName={handleUpdateCourtName}
            onDeleteCourt={handleDeleteCourt}
            onStartMatchCourt={handleStartMatchCourt}
            onEndMatchCourt={handleEndMatchCourt}
            onRefreshData={() => fetchDashboardContext(true)}
            communityId={communityId}
            sessionId={sessionId}
          />
          <QueueCourt
            queueCourts={sessionData.queueCourts}
            players={visibleSessionPlayers}
            onRemovePlayer={handleRemovePlayer}
            onAddCourt={handleAddQueueCourt}
            onUpdateCourtName={handleUpdateCourtName}
            onDeleteCourt={handleDeleteCourt}
            onTransferQueue={handleTransferQueue}
            onRefreshData={() => fetchDashboardContext(true)}
            communityId={communityId}
            sessionId={sessionId}
          />
        </div>
      </div>

      {/* GLOBAL DRAG OVERLAY PORTAL CONTAINER */}
      <DragOverlay dropAnimation={null}>
        {activePlayerData ? (
          <div
            className={`w-[178px] h-[41px] flex items-center justify-between p-2 ${bgTheme} rounded-md border shadow-md text-sm font-medium select-none text-gray-800 opacity-95 architecture-dragged-active`}
          >
            <div className="flex items-center gap-x-2">
              <PlayerAvatar
                username={
                  activePlayerData.sessionPlayer.communityPlayer.username
                }
                customImageUrl={
                  activePlayerData.sessionPlayer.communityPlayer?.avatarUrl
                }
                size="sm"
              />
              <div>
                <span className="truncate text-black font-semibold max-w-[74px] block text-[12px]">
                  {activePlayerData.sessionPlayer.communityPlayer.username}
                </span>
                <div className="flex items-center gap-x-1">
                  <span className="flex items-center gap-x-1">
                    <Gamepad2 size={12} />
                    <span className="text-[10px]">
                      {activePlayerData.totalGames}
                    </span>
                  </span>
                  <span className="text-[9px] bg-white px-0.5 rounded-full">
                    {
                      activePlayerData?.sessionPlayer?.communityPlayer
                        .skillLevel
                    }
                  </span>
                </div>
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
