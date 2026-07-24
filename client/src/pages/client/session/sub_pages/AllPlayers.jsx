import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import PlayerCard from "../../../../components/session_comp/players/PlayerCard";
import { useSession } from "../../../../hooks/useSession";
import { useAuth } from "../../../../hooks/useAuth";
import AddPlayerModal from "../../../../components/session_comp/players/AddPlayerModal";
import { SKILL_LEVEL_LABELS } from "../../../../components/community_comp/players/AddStaticPlayer";
import { API_URL } from "../../../../contexts/AuthContext";
import {
  getPlayerNameValidation,
  parsePlayerNames,
} from "../../../../utils/playerNameValidation";

const getPlayerMetric = (player, metric) => {
  const value =
    player?.stats?.[metric] ??
    player?.[metric] ??
    player?.sessionPlayer?.[metric] ??
    0;

  return Number(value) || 0;
};

const isAdminRole = (role) => ["owner", "admin", "host"].includes(role);

const AllPlayers = () => {
  const { fetchWithAuth } = useAuth();
  const {
    communityId,
    sessionId,
    sessionPlayers: players,
    refreshPlayers,
    isSessionLoading,
  } = useSession();

  // Functional States for Filter Pipeline
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "desc",
  });

  // Modal State Management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlayerNames, setNewPlayerNames] = useState(""); // Tracks multiline text
  const [skillLevel, setSkillLevel] = useState(
    Object.keys(SKILL_LEVEL_LABELS)[0] || "",
  ); // Tracks selected dropdown value
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [communityPlayerNames, setCommunityPlayerNames] = useState([]);
  const [isCheckingNames, setIsCheckingNames] = useState(false);
  const nameValidation = useMemo(
    () => getPlayerNameValidation(newPlayerNames, communityPlayerNames),
    [newPlayerNames, communityPlayerNames],
  );

  // Close modal and clear field handler
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setNewPlayerNames("");
    setSkillLevel(Object.keys(SKILL_LEVEL_LABELS)[0] || "");
  }, []);

  // Keyboard shortcut visibility hooks
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeModal();
    };
    if (isModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeModal]);

  useEffect(() => {
    if (!isModalOpen || !communityId) return;

    let isCurrent = true;

    const getCommunityPlayerNames = async () => {
      setIsCheckingNames(true);
      try {
        const response = await fetchWithAuth(
          `${API_URL}/api/communities/${communityId}/players`,
          { method: "GET" },
        );

        if (!response?.ok) {
          throw new Error(
            `HTTP error! Status: ${response?.status || "Unknown"}`,
          );
        }

        const data = await response.json();
        if (!data?.success) {
          throw new Error(data?.message || "Failed to load community players");
        }

        if (isCurrent) {
          setCommunityPlayerNames(
            (data.player || [])
              .map((player) => player?.communityPlayer?.username)
              .filter(Boolean),
          );
        }
      } catch (error) {
        console.error("Fetch community player names failed:", error.message);
      } finally {
        if (isCurrent) setIsCheckingNames(false);
      }
    };

    getCommunityPlayerNames();

    return () => {
      isCurrent = false;
    };
  }, [isModalOpen, communityId, fetchWithAuth]);

  const getAcceptedPlayers = async () => {
    try {
      await refreshPlayers();
    } catch (error) {
      console.error("Fetch players failed:", error.message);
    }
  };

  const handleSortToggle = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === "desc") return { key, direction: "asc" };
        return { key: null, direction: "desc" };
      }
      return { key, direction: "desc" };
    });
  };

  const processedPlayers = useMemo(() => {
    let result = (players || []).filter((player) => {
      const username =
        player.sessionPlayer?.communityPlayer?.username || "Unknown";
      return username.toLowerCase().includes(searchQuery.toLowerCase().trim());
    });

    if (sortConfig.key !== null) {
      result.sort((a, b) => {
        const metricKey =
          sortConfig.key === "games" ? "totalGames" : "totalWins";
        const valA = getPlayerMetric(a, metricKey);
        const valB = getPlayerMetric(b, metricKey);

        if (valA < valB) return sortConfig.direction === "desc" ? 1 : -1;
        if (valA > valB) return sortConfig.direction === "desc" ? -1 : 1;
        return 0;
      });
    }

    return result;
  }, [players, searchQuery, sortConfig]);

  const adminGroup = useMemo(() => {
    return processedPlayers.filter((p) => isAdminRole(p.sessionPlayer?.role));
  }, [processedPlayers]);

  const regularGroup = useMemo(() => {
    return processedPlayers.filter((p) => !isAdminRole(p.sessionPlayer?.role));
  }, [processedPlayers]);

  const addStaticPlayerInSession = async (e) => {
    if (e) e.preventDefault();
    if (!newPlayerNames.trim() || isSubmitting) return;
    if (nameValidation.hasError) return;

    const usernamesArray = parsePlayerNames(newPlayerNames);

    if (usernamesArray.length === 0) return;

    setIsSubmitting(true);
    try {
      const createStaticRes = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players/static`,
        {
          method: "POST",
          body: JSON.stringify({
            usernames: usernamesArray,
            skillLevel: skillLevel,
          }),
        },
      );

      const createdPlayersData = await createStaticRes.json();
      if (!createStaticRes.ok || !createdPlayersData?.success) {
        throw new Error(
          createdPlayersData?.message || "Failed to create static profiles",
        );
      }

      const targetPlayersArray = Array.isArray(createdPlayersData)
        ? createdPlayersData
        : createdPlayersData?.players;

      if (!targetPlayersArray || !Array.isArray(targetPlayersArray)) {
        throw new Error(
          "Invalid response format from player initialization backend",
        );
      }

      const sessionAcceptPromises = targetPlayersArray.map((user) => {
        const communityPlayerId = user.players?.[0]?.id || user.id;
        if (!communityPlayerId) return Promise.resolve();

        return fetchWithAuth(
          `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/${communityPlayerId}/accept`,
          { method: "POST" },
        );
      });

      await Promise.all(sessionAcceptPromises);

      await refreshPlayers();
      closeModal();
    } catch (error) {
      console.error("Error setting up static session players:", error);
      alert(error.message || "Failed to add users to session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSessionLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center p-6">
        <div className="flex items-center gap-2 rounded-2xl border border-stone-200/80 bg-white px-5 py-4 text-xs font-bold text-stone-600 shadow-sm">
          <Loader2 className="animate-spin text-orange-500" size={16} />
          Loading players directory...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-y-5 selection:bg-orange-500/10 selection:text-orange-950">
      {/* ACTIONS CONTROLS HEADER */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-full sm:max-w-[320px] flex items-center">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
            <Search size={15} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search player..."
            className="w-full rounded-xl border border-stone-200/80 bg-white py-2 pl-9 pr-8 text-xs font-medium text-stone-800 placeholder-stone-400 shadow-sm transition-all duration-200 hover:border-stone-300 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-orange-500 text-white hover:bg-orange-600 px-3.5 text-xs font-bold  shadow-sm transition-all duration-200  active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-stone-900/10 cursor-pointer"
          >
            <Plus size={15} />
            Add player
          </button>

          <button
            type="button"
            onClick={() => handleSortToggle("games")}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold shadow-sm transition-all duration-200 active:scale-[0.99] cursor-pointer ${
              sortConfig.key === "games"
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200/80 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900 hover:border-stone-300"
            }`}
          >
            Games
            {sortConfig.key === "games" && sortConfig.direction === "asc" ? (
              <ArrowUp size={13} />
            ) : (
              <ArrowDown
                size={13}
                className={
                  sortConfig.key === "games" ? "text-white" : "text-stone-400"
                }
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSortToggle("wins")}
            className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold shadow-sm transition-all duration-200 active:scale-[0.99] cursor-pointer ${
              sortConfig.key === "wins"
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200/80 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900 hover:border-stone-300"
            }`}
          >
            Wins
            {sortConfig.key === "wins" && sortConfig.direction === "asc" ? (
              <ArrowUp size={13} />
            ) : (
              <ArrowDown
                size={13}
                className={
                  sortConfig.key === "wins" ? "text-white" : "text-stone-400"
                }
              />
            )}
          </button>
        </div>
      </header>

      {/* MAIN DIRECTORY INTERFACE */}
      <main className="flex flex-col gap-y-6">
        {players.length > 0 && processedPlayers.length === 0 && (
          <div className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-8 text-center text-xs font-medium italic text-stone-500 shadow-sm">
            No matching players found for "{searchQuery}"
          </div>
        )}

        {adminGroup.length > 0 && (
          <div className="flex flex-col gap-y-3">
            <div className="flex items-center gap-x-2 px-1">
              <ShieldAlert size={15} className="text-orange-500" />
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Creator, Admins, & Hosts
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {adminGroup.map((player) => (
                <article
                  key={player.id}
                  className={`relative rounded-2xl border bg-white p-4 shadow-sm shadow-stone-200/40 transition-all duration-200 hover:border-stone-300 hover:shadow-md ${
                    player?.isHide
                      ? "border-red-200 bg-red-50/30"
                      : "border-stone-200/80"
                  }`}
                >
                  <PlayerCard
                    player={player}
                    onRefreshData={getAcceptedPlayers}
                  />
                </article>
              ))}
            </div>
          </div>
        )}

        {regularGroup.length > 0 && (
          <div className="flex flex-col gap-y-3">
            <div className="flex items-center gap-x-2 px-1">
              <Users size={15} className="text-stone-400" />
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Players & Statics
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {regularGroup.map((player) => (
                <article
                  key={player.id}
                  className={`relative rounded-2xl border bg-white p-4 shadow-sm shadow-stone-200/40 transition-all duration-200 hover:border-stone-300 hover:shadow-md ${
                    player?.isHide
                      ? "border-red-200 bg-red-50/30"
                      : "border-stone-200/80"
                  }`}
                >
                  <PlayerCard
                    player={player}
                    onRefreshData={getAcceptedPlayers}
                  />
                </article>
              ))}
            </div>
          </div>
        )}

        {players.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-10 text-center text-xs font-medium italic text-stone-400 shadow-sm">
            No registered players found in this session.
          </div>
        )}
      </main>

      <AddPlayerModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={addStaticPlayerInSession}
        newPlayerNames={newPlayerNames}
        setNewPlayerNames={setNewPlayerNames}
        skillLevel={skillLevel}
        setSkillLevel={setSkillLevel}
        SKILL_LEVEL_LABELS={SKILL_LEVEL_LABELS}
        isSubmitting={isSubmitting}
        existingPlayerNames={communityPlayerNames}
        isCheckingNames={isCheckingNames}
      />
    </div>
  );
};

export default AllPlayers;
