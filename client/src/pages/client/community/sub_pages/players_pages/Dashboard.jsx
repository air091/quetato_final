import { useCallback, useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../../../hooks/useAuth";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import PlayerAvatar from "../../../../../components/PlayerAvatar";
import { API_URL } from "../../../../../contexts/AuthContext";
import PlayerSettings from "../../../../../components/community_comp/players/PlayerSettings"; // Adjust path if needed

const Dashboard = () => {
  const { fetchWithAuth, user } = useAuth();
  const [players, setPlayers] = useState([]);
  const { communityId } = useParams();

  // Settings popover state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const toggleButtonRef = useRef(null);

  // State configurations for interactive table sorting
  const [sortBy, setSortBy] = useState("points"); // Default column key to sort by
  const [order, setOrder] = useState("desc"); // Default sorting order ('desc' or 'asc')

  const getPlayers = useCallback(async () => {
    if (!communityId) return;
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players/total-community-games`,
        { method: "GET" },
      );
      if (!response.ok) throw new Error("Http error", response.status);
      const data = await response.json();
      if (!data.success) throw new Error(data?.message);

      // Filter results to only keep players with status "accepted"
      const acceptedPlayers = (data?.results ?? []).filter(
        (player) =>
          player?.status === "accepted" ||
          player?.communityPlayer?.status === "accepted",
      );

      setPlayers(acceptedPlayers);
    } catch (error) {
      console.error(error);
    }
  }, [communityId, fetchWithAuth]);

  useEffect(() => {
    getPlayers();
  }, [getPlayers]);

  // Click handler to toggle sort column and direction
  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setOrder((prevOrder) => (prevOrder === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(columnKey);
      setOrder("desc"); // Default to highest performance metrics first when swapping columns
    }
  };

  // Helper function to dynamically sort data locally
  const getSortedPlayers = () => {
    if (!players) return [];

    return [...players].sort((a, b) => {
      const aWins = a?.totalCommunityWins ?? 0;
      const bWins = b?.totalCommunityWins ?? 0;
      const aLosses = a?.totalCommunityLosses ?? 0;
      const bLosses = b?.totalCommunityLosses ?? 0;
      const aGames = a?.totalCommunityGames ?? 0;
      const bGames = b?.totalCommunityGames ?? 0;
      const aPoints = a?.totalCommunityPoints ?? aWins;
      const bPoints = b?.totalCommunityPoints ?? bWins;

      let valA = 0;
      let valB = 0;

      if (sortBy === "wins") {
        valA = aWins;
        valB = bWins;
      } else if (sortBy === "losses") {
        valA = aLosses;
        valB = bLosses;
      } else if (sortBy === "points") {
        valA = aPoints;
        valB = bPoints;
      } else if (sortBy === "games") {
        valA = aGames;
        valB = bGames;
      }

      return order === "desc" ? valB - valA : valA - valB;
    });
  };

  // Render sort direction icon indicator helper
  const renderSortIcon = (columnKey) => {
    const isActive = sortBy === columnKey;

    return (
      <div className="relative flex items-center justify-center w-4 h-4">
        <ArrowUpDown
          size={14}
          className={`absolute transition-all duration-300 ${
            isActive
              ? "opacity-0 scale-75 pointer-events-none"
              : "opacity-30 group-hover:opacity-100 scale-100"
          }`}
        />
        <ArrowDown
          size={14}
          className={`absolute text-stone-900 transition-all duration-300 ease-in-out ${
            isActive
              ? "opacity-100 scale-100"
              : "opacity-0 scale-75 pointer-events-none"
          } ${isActive && order === "asc" ? "rotate-180" : "rotate-0"}`}
        />
      </div>
    );
  };

  const handlePlayerClick = (e, player) => {
    toggleButtonRef.current = e.currentTarget;
    setSelectedPlayer(player);
  };

  const sortedPlayers = getSortedPlayers();

  return (
    <div className="w-full max-w-[720px] mx-auto select-none border border-stone-200 rounded-xl overflow-hidden shadow-sm bg-white mt-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-stone-50/70 border-b border-stone-200 text-xs font-semibold text-stone-600 uppercase tracking-wider">
              <th className="p-4 text-stone-700 normal-case text-sm font-bold">
                Player
              </th>
              <th
                onClick={() => handleSort("wins")}
                className="p-4 cursor-pointer hover:bg-stone-100/80 transition-colors select-none group w-[95px] text-center"
              >
                <div className="flex items-center justify-center gap-x-1">
                  <span>Wins</span>
                  <span className="text-stone-400 group-hover:text-stone-600 transition-colors">
                    {renderSortIcon("wins")}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("losses")}
                className="p-4 cursor-pointer hover:bg-stone-100/80 transition-colors select-none group w-[95px] text-center"
              >
                <div className="flex items-center justify-center gap-x-1">
                  <span>Losses</span>
                  <span className="text-stone-400 group-hover:text-stone-600 transition-colors">
                    {renderSortIcon("losses")}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("points")}
                className="p-4 cursor-pointer hover:bg-stone-100/80 transition-colors select-none group w-[120px] text-center"
              >
                <div className="flex items-center justify-center gap-x-1">
                  <span>Points</span>
                  <span className="text-stone-400 group-hover:text-stone-600 transition-colors">
                    {renderSortIcon("points")}
                  </span>
                </div>
              </th>
              <th
                onClick={() => handleSort("games")}
                className="p-4 cursor-pointer hover:bg-stone-100/80 transition-colors select-none group w-[120px] text-center"
              >
                <div className="flex items-center justify-center gap-x-1">
                  <span>Games</span>
                  <span className="text-stone-400 group-hover:text-stone-600 transition-colors">
                    {renderSortIcon("games")}
                  </span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100">
            {sortedPlayers.map((player) => {
              const totalWins = player?.totalCommunityWins ?? 0;
              const totalLosses = player?.totalCommunityLosses ?? 0;
              const totalGames = player?.totalCommunityGames ?? 0;
              const totalPoints = player?.totalCommunityPoints ?? totalWins;

              const isCurrentUser =
                user && player?.communityPlayer?.id === user?.id;

              return (
                <tr
                  key={player?.id}
                  onClick={(e) => handlePlayerClick(e, player)}
                  className={`cursor-pointer transition-colors duration-150 ${
                    isCurrentUser
                      ? "bg-amber-50/60 hover:bg-amber-100"
                      : "hover:bg-stone-200"
                  }`}
                >
                  {/* Primary Identifier */}
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-x-3 max-w-[260px]">
                      <PlayerAvatar
                        username={player?.communityPlayer?.username}
                        size="md"
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-x-2">
                          <span className="font-semibold text-stone-900 truncate">
                            {player?.communityPlayer?.username}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-x-1.5 text-[11px] font-semibold mt-0.5">
                          <span
                            className={`px-1.5 py-0.5 rounded-md capitalize border ${
                              player?.communityPlayer?.type === "static"
                                ? "bg-purple-50 text-purple-700 border-purple-100"
                                : "bg-stone-50 text-stone-600 border-stone-200"
                            }`}
                          >
                            {player?.communityPlayer?.type || "Regular"}
                          </span>
                          <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-md uppercase">
                            {player?.communityPlayer?.skillLevel || "UNRANKED"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4 text-sm text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 font-bold text-green-700 bg-green-50/60 rounded-md min-w-[36px] border border-green-100/50">
                      {totalWins}
                    </span>
                  </td>

                  <td className="p-4 text-sm text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 font-semibold text-stone-600 bg-stone-50 rounded-md min-w-[36px] border border-stone-200/40">
                      {totalLosses}
                    </span>
                  </td>

                  <td className="p-4 text-sm text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 font-bold text-amber-700 bg-amber-50/60 rounded-md min-w-[36px] border border-amber-100/50">
                      {totalPoints}
                    </span>
                  </td>

                  <td className="p-4 text-sm text-center font-semibold text-stone-500">
                    {totalGames}
                  </td>
                </tr>
              );
            })}

            {sortedPlayers.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-12 text-center text-sm text-stone-400 italic bg-stone-50/20"
                >
                  No statistical roster data available yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Render settings popover when a player is selected */}
      {selectedPlayer && (
        <PlayerSettings
          player={selectedPlayer}
          type={selectedPlayer?.communityPlayer?.type || "user"}
          toggleButtonRef={toggleButtonRef}
          onClose={() => setSelectedPlayer(null)}
          onUpdatePlayerStatus={getPlayers}
        />
      )}
    </div>
  );
};

export default Dashboard;
