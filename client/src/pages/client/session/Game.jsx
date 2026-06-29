import React, { useCallback, useEffect, useMemo, useState } from "react";
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

        setSessionData({
          players:
            playersData.players ||
            (Array.isArray(playersData) ? playersData : []),
          matchCourts:
            matchData.courts ||
            matchData.data ||
            (Array.isArray(matchData) ? matchData : []),
          queueCourts:
            queueData.courts ||
            queueData.data ||
            (Array.isArray(queueData) ? queueData : []),
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

  // Retained in case your child components still trigger explicit manual assignments (e.g., via click buttons)
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

  const assignedPlayerIds = useMemo(() => {
    const validMatches = Array.isArray(sessionData?.matchCourts)
      ? sessionData.matchCourts
      : [];
    const validQueues = Array.isArray(sessionData?.queueCourts)
      ? sessionData.queueCourts
      : [];

    console.log(
      [...validMatches, ...validQueues]
        .flatMap((court) => court?.slots || [])
        .map((slot) => String(slot?.sessionPlayerId)),
    );

    return [...validMatches, ...validQueues]
      .flatMap((court) => court?.slots || [])
      .map((slot) => String(slot?.sessionPlayerId));
  }, [sessionData?.matchCourts, sessionData?.queueCourts]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm font-medium text-gray-500 animate-pulse">
        Loading session dashboard...
      </div>
    );
  }

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const playerId = active.id;
    const courtId = over.id;

    console.log(`Player: ${playerId} | Court: ${courtId}`);
  };

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
