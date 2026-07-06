import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { SessionContext } from "./SessionContextValue";
import { API_URL } from "./AuthContext";

const emptyCourtState = { courts: [], counts: {} };

const normalizeCourtsPayload = (payload) => {
  const courts = payload?.courts || payload?.data || [];

  if (Array.isArray(courts)) {
    return { courts, counts: payload?.counts || {} };
  }

  return {
    courts: Array.isArray(courts?.courts) ? courts.courts : [],
    counts: courts?.counts || payload?.counts || {},
  };
};

export const SessionProvider = ({ children }) => {
  const { communityId, sessionId } = useParams();
  const { fetchWithAuth } = useAuth();
  const [sessionData, setSessionData] = useState({
    players: [],
    matchCourts: emptyCourtState,
    queueCourts: emptyCourtState,
  });
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [canManagePlayers, setCanManagePlayers] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");

  const baseUrl = useMemo(() => {
    if (!communityId || !sessionId) return "";
    return `${API_URL}/${communityId}/sessions/${sessionId}`;
  }, [communityId, sessionId]);

  const refreshSessionContext = useCallback(
    async ({ silent = false } = {}) => {
      if (!baseUrl) return null;

      try {
        if (!silent) setIsSessionLoading(true);
        setSessionError("");

        const [playersRes, matchRes, queueRes] = await Promise.all([
          fetchWithAuth(`${baseUrl}/players`, { method: "GET" }),
          fetchWithAuth(`${baseUrl}/courts?type=match`, { method: "GET" }),
          fetchWithAuth(`${baseUrl}/courts?type=queue`, { method: "GET" }),
        ]);

        if (!playersRes?.ok || !matchRes?.ok || !queueRes?.ok) {
          throw new Error("Failed to load session resources");
        }

        const [playersData, matchData, queueData] = await Promise.all([
          playersRes.json(),
          matchRes.json(),
          queueRes.json(),
        ]);

        if (!playersData?.success) {
          throw new Error(playersData?.message || "Failed to load players");
        }

        const nextSessionData = {
          players: playersData.players || [],
          matchCourts: normalizeCourtsPayload(matchData),
          queueCourts: normalizeCourtsPayload(queueData),
        };

        setSessionData(nextSessionData);
        setCurrentUserRole(playersData.currentUserRole || null);
        setCanManagePlayers(Boolean(playersData.canManagePlayers));

        return nextSessionData;
      } catch (error) {
        setSessionError(error.message || "Session failed to load");
        throw error;
      } finally {
        setIsSessionLoading(false);
      }
    },
    [baseUrl, fetchWithAuth],
  );

  const refreshPlayers = useCallback(
    async ({ silent = true } = {}) => {
      if (!baseUrl) return [];

      try {
        if (!silent) setIsSessionLoading(true);
        const response = await fetchWithAuth(`${baseUrl}/players`, {
          method: "GET",
        });

        if (!response?.ok) {
          throw new Error(
            `HTTP error! Status: ${response?.status || "Unknown"}`,
          );
        }

        const data = await response.json();
        if (!data?.success) {
          throw new Error(data?.message || "Failed to load players");
        }

        setSessionData((prev) => ({
          ...prev,
          players: data.players || [],
        }));
        setCurrentUserRole(data.currentUserRole || null);
        setCanManagePlayers(Boolean(data.canManagePlayers));

        return data.players || [];
      } finally {
        setIsSessionLoading(false);
      }
    },
    [baseUrl, fetchWithAuth],
  );

  useEffect(() => {
    let isCurrent = true;

    const timeoutId = window.setTimeout(() => {
      refreshSessionContext().catch((error) => {
        if (isCurrent) {
          console.error("Session context load failed:", error.message);
        }
      });
    }, 0);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [refreshSessionContext]);

  const setPlayerVisibility = useCallback(
    async (sessionPlayerId, shouldHide) => {
      if (!baseUrl || !sessionPlayerId || !canManagePlayers) return null;

      const action = shouldHide ? "hide" : "unhide";
      const response = await fetchWithAuth(
        `${baseUrl}/players/${sessionPlayerId}/${action}`,
        { method: "PATCH" },
      );

      if (!response?.ok) {
        const errorData = await response?.json().catch(() => ({}));
        throw new Error(
          errorData?.message ||
            `Failed to ${shouldHide ? "hide" : "unhide"} player`,
        );
      }

      const data = await response.json();
      if (!data?.success) {
        throw new Error(data?.message || "Player visibility update failed");
      }

      await refreshSessionContext({ silent: true });
      return data.result;
    },
    [baseUrl, canManagePlayers, fetchWithAuth, refreshSessionContext],
  );

  const hidePlayer = useCallback(
    (sessionPlayerId) => setPlayerVisibility(sessionPlayerId, true),
    [setPlayerVisibility],
  );

  const unhidePlayer = useCallback(
    (sessionPlayerId) => setPlayerVisibility(sessionPlayerId, false),
    [setPlayerVisibility],
  );

  const visibleSessionPlayers = useMemo(
    () => sessionData.players.filter((player) => !player?.isHide),
    [sessionData.players],
  );

  const value = useMemo(
    () => ({
      communityId,
      sessionId,
      sessionData,
      setSessionData,
      sessionPlayers: sessionData.players,
      visibleSessionPlayers,
      currentUserRole,
      canManagePlayers,
      isSessionLoading,
      sessionError,
      refreshSessionContext,
      refreshPlayers,
      hidePlayer,
      unhidePlayer,
    }),
    [
      communityId,
      sessionId,
      sessionData,
      visibleSessionPlayers,
      currentUserRole,
      canManagePlayers,
      isSessionLoading,
      sessionError,
      refreshSessionContext,
      refreshPlayers,
      hidePlayer,
      unhidePlayer,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};
