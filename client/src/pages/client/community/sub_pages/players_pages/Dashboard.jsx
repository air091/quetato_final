import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../../../hooks/useAuth";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

const Dashboard = () => {
  const { fetchWithAuth } = useAuth();
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
    if (sortBy !== columnKey) {
      return (
        <ArrowUpDown
          size={14}
          className="opacity-30 group-hover:opacity-100 transition-opacity"
        />
      );
    }
    return order === "desc" ? (
      <ArrowDown size={14} className="text-stone-900" />
    ) : (
      <ArrowUp size={14} className="text-stone-900" />
    );
  };

  const sortedPlayers = getSortedPlayers();

  return (
    <div className="w-full max-w-[720px] mx-auto select-none border border-stone-200 rounded-lg overflow-hidden shadow-sm bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-stone-50 border-b border-stone-200 text-sm">
            <th className="p-3 font-semibold text-stone-700 text-left">
              Player
            </th>

            {/* Clickable Wins Column Header */}
            <th
              onClick={() => handleSort("wins")}
              className="p-3 font-semibold text-stone-700 cursor-pointer hover:bg-stone-100 transition-colors select-none group w-[95px]"
            >
              <div className="flex items-center justify-center gap-x-1">
                <span>Wins</span>
                {renderSortIcon("wins")}
              </div>
            </th>

            {/* Clickable Losses Column Header */}
            <th
              onClick={() => handleSort("losses")}
              className="p-3 font-semibold text-stone-700 cursor-pointer hover:bg-stone-100 transition-colors select-none group w-[95px]"
            >
              <div className="flex items-center justify-center gap-x-1">
                <span>Losses</span>
                {renderSortIcon("losses")}
              </div>
            </th>

            {/* Clickable Total Points Column Header */}
            <th
              onClick={() => handleSort("points")}
              className="p-3 font-semibold text-stone-700 cursor-pointer hover:bg-stone-100 transition-colors select-none group w-[115px]"
            >
              <div className="flex items-center justify-center gap-x-1">
                <span>Total Points</span>
                {renderSortIcon("points")}
              </div>
            </th>

            {/* Clickable Total Games Column Header */}
            <th
              onClick={() => handleSort("games")}
              className="p-3 font-semibold text-stone-700 cursor-pointer hover:bg-stone-100 transition-colors select-none group w-[125px]"
            >
              <div className="flex items-center justify-center gap-x-1">
                <span>Total Games</span>
                {renderSortIcon("games")}
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

            return (
              <tr
                key={player?.id}
                className="hover:bg-stone-50/70 transition-colors duration-150"
              >
                {/* Primary Identifier */}
                <td className="p-3 text-sm font-medium text-stone-900">
                  {player?.communityPlayer?.username}
                </td>

                {/* Wins Count - Light Green accent */}
                <td className="p-3 text-sm text-center">
                  <span className="inline-block px-2 py-0.5 font-semibold text-green-700 bg-green-50 rounded-md min-w-[32px]">
                    {totalWins}
                  </span>
                </td>

                {/* Losses Count - Light Red accent */}
                <td className="p-3 text-sm text-center">
                  <span className="inline-block px-2 py-0.5 font-semibold text-red-700 bg-red-50 rounded-md min-w-[32px]">
                    {totalLosses}
                  </span>
                </td>

                {/* Total Points Metric */}
                <td className="p-3 text-sm text-center font-bold text-stone-700">
                  {totalPoints}
                </td>

                {/* Total Summary Field */}
                <td className="p-3 text-sm text-center font-medium text-stone-500">
                  {totalGames}
                </td>
              </tr>
            );
          })}
          {sortedPlayers.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="p-8 text-center text-sm text-stone-400 italic"
              >
                No data available yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
