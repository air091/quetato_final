import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../../../hooks/useAuth";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import PlayerAvatar from "../../../../../components/PlayerAvatar";

const Dashboard = () => {
  const { fetchWithAuth, user } = useAuth();
  const [players, setPlayers] = useState([]);
  const { communityId } = useParams();

  // State configurations for interactive table sorting
  const [sortBy, setSortBy] = useState("points"); // Default column key to sort by
  const [order, setOrder] = useState("desc"); // Default sorting order ('desc' or 'asc')

  const getPlayers = useCallback(async () => {
    if (!communityId) return;
    try {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/players/total-community-games`,
        { method: "GET" },
      );
      if (!response.ok) throw new Error("Http error", response.status);
      const data = await response.json();
      if (!data.success) throw new Error(data?.message);

      setPlayers(data?.results ?? []);
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
        {/* 
        Default generic placeholder icon when column is inactive. 
        Fades out smoothly when the column becomes active.
      */}
        <ArrowUpDown
          size={14}
          className={`absolute transition-all duration-300 ${
            isActive
              ? "opacity-0 scale-75 pointer-events-none"
              : "opacity-30 group-hover:opacity-100 scale-100"
          }`}
        />

        {/* 
        Active state indicator icon. 
        Rotates 180 degrees seamlessly when changing order from 'desc' to 'asc'.
      */}
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

              {/* Clickable Wins Column Header */}
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

              {/* Clickable Losses Column Header */}
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

              {/* Clickable Total Points Column Header */}
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

              {/* Clickable Total Games Column Header */}
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

              // Safely check if this is the current logged-in user
              const isCurrentUser =
                user && player?.communityPlayer?.id === user?.id;

              return (
                <tr
                  key={player?.id}
                  className={`transition-colors duration-150 ${
                    isCurrentUser
                      ? "bg-amber-50/60 hover:bg-amber-50"
                      : "hover:bg-stone-50/40"
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

                  {/* Wins Count - Clear green distinction */}
                  <td className="p-4 text-sm text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 font-bold text-green-700 bg-green-50/60 rounded-md min-w-[36px] border border-green-100/50">
                      {totalWins}
                    </span>
                  </td>

                  {/* Losses Count */}
                  <td className="p-4 text-sm text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 font-semibold text-stone-600 bg-stone-50 rounded-md min-w-[36px] border border-stone-200/40">
                      {totalLosses}
                    </span>
                  </td>

                  {/* Total Points Metric */}
                  <td className="p-4 text-sm text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 font-bold text-amber-700 bg-amber-50/60 rounded-md min-w-[36px] border border-amber-100/50">
                      {totalPoints}
                    </span>
                  </td>

                  {/* Total Summary Field */}
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
    </div>
  );
};

export default Dashboard;
