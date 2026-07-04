import {
  ArrowDown,
  ArrowUp,
  Search,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useAuth } from "../../../../hooks/useAuth";
import { useParams } from "react-router-dom";
import PlayerCard from "../../../../components/session_comp/players/PlayerCard";

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
  const { communityId, sessionId } = useParams();
  const { fetchWithAuth } = useAuth();
  const [players, setPlayers] = useState([]);

  // Functional States for Filter Pipeline
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "desc",
  });

  const loadAcceptedPlayers = useCallback(async () => {
    const response = await fetchWithAuth(
      `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/players`,
      { method: "GET" },
    );

    if (!response || !response.ok) {
      throw new Error(`HTTP error! Status: ${response?.status || "Unknown"}`);
    }

    const data = await response.json();

    if (data.status !== "success" && !data.success) {
      throw new Error(data?.message || "Failed to fetch players");
    }

    return data.players || [];
  }, [communityId, sessionId, fetchWithAuth]);

  const getAcceptedPlayers = useCallback(async () => {
    try {
      const nextPlayers = await loadAcceptedPlayers();
      setPlayers(nextPlayers);
    } catch (error) {
      console.error("Fetch players failed:", error.message);
    }
  }, [loadAcceptedPlayers]);

  useEffect(() => {
    let isCurrent = true;

    loadAcceptedPlayers()
      .then((nextPlayers) => {
        if (isCurrent) setPlayers(nextPlayers);
      })
      .catch((error) => {
        console.error("Fetch players failed:", error.message);
      });

    return () => {
      isCurrent = false;
    };
  }, [loadAcceptedPlayers]);

  // Handles updating active state sorting configurations
  const handleSortToggle = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        // Toggle direction if clicking same sort metric, or reset
        if (prev.direction === "desc") return { key, direction: "asc" };
        return { key: null, direction: "desc" };
      }
      return { key, direction: "desc" };
    });
  };

  // Processed, Filtered, and Sorted Collection computation engine
  const processedPlayers = useMemo(() => {
    // 1. Text Search filtering execution step
    let result = players.filter((player) => {
      const username =
        player.sessionPlayer?.communityPlayer?.username || "Unknown";
      return username.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // 2. Metrics sorting processing execution step
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

  // Split configurations for sub-sections safely
  const adminGroup = useMemo(() => {
    return processedPlayers.filter((p) => isAdminRole(p.sessionPlayer?.role));
  }, [processedPlayers]);

  const regularGroup = useMemo(() => {
    return processedPlayers.filter((p) => !isAdminRole(p.sessionPlayer?.role));
  }, [processedPlayers]);

  return (
    <div className="w-full max-w-[1024px] mx-auto flex flex-col gap-y-6 px-4 sm:px-0">
      {/* ACTIONS CONTROLS HEADER */}
      <header className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input with Integrated Icon */}
        <div className="relative flex-1 max-w-full sm:max-w-[320px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Search size={15} />
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search player..."
            className="w-full pl-9 pr-9 py-2 bg-white border border-stone-200 rounded-xl text-sm placeholder-stone-400 text-stone-800 font-medium outline-none shadow-sm focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Metric Filter Tags */}
        <div className="flex items-center gap-x-2 self-end sm:self-auto">
          <button className="px-3 py-1.5 text-xs font-semibold bg-stone-900 text-stone-100 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer shadow-sm">
            Add player
          </button>
          <button
            onClick={() => handleSortToggle("games")}
            className={`flex items-center gap-x-1.5 border px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm outline-none ${
              sortConfig.key === "games"
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200 bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50"
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
            onClick={() => handleSortToggle("wins")}
            className={`flex items-center gap-x-1.5 border px-3 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm outline-none ${
              sortConfig.key === "wins"
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200 bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50"
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
        {/* Global Empty State */}
        {players.length > 0 && processedPlayers.length === 0 && (
          <div className="border border-stone-200 rounded-xl bg-stone-50/50 p-8 text-center text-sm font-medium text-stone-400 italic">
            No matching players found for "{searchQuery}"
          </div>
        )}

        {/* OWNER / ADMIN / HOST SECTION */}
        {adminGroup.length > 0 && (
          <div className="flex flex-col gap-y-3">
            <div className="flex items-center gap-x-2 px-1">
              <ShieldAlert size={15} className="text-stone-500" />
              <h4 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Creator, Admins, & Hosts
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {adminGroup.map((player) => (
                <article
                  key={player.id}
                  className="relative rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-all duration-150 hover:border-stone-300 hover:shadow-md"
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

        {/* PLAYER / STATIC SECTION */}
        {regularGroup.length > 0 && (
          <div className="flex flex-col gap-y-3">
            <div className="flex items-center gap-x-2 px-1">
              <Users size={15} className="text-stone-500" />
              <h4 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Players & Statics
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {regularGroup.map((player) => (
                <article
                  key={player.id}
                  className="relative rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-all duration-150 hover:border-stone-300 hover:shadow-md"
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

        {/* Missing Absolute Base Case Scenario Handling */}
        {players.length === 0 && (
          <div className="border border-stone-200 border-dashed rounded-xl p-10 text-center text-sm text-stone-400 italic bg-white shadow-sm">
            No registered players found in this session.
          </div>
        )}
      </main>
    </div>
  );
};

export default AllPlayers;
