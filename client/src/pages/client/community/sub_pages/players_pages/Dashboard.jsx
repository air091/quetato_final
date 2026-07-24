import { useCallback, useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../../../hooks/useAuth";
import { ArrowDown, ArrowUpDown, Calendar, RotateCcw } from "lucide-react";
import PlayerAvatar from "../../../../../components/PlayerAvatar";
import { API_URL } from "../../../../../contexts/AuthContext";
import PlayerSettings from "../../../../../components/community_comp/players/PlayerSettings";

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const DAYS_OF_WEEK = [
  { value: "monday", label: "All Mondays" },
  { value: "tuesday", label: "All Tuesdays" },
  { value: "wednesday", label: "All Wednesdays" },
  { value: "thursday", label: "All Thursdays" },
  { value: "friday", label: "All Fridays" },
  { value: "saturday", label: "All Saturdays" },
  { value: "sunday", label: "All Sundays" },
];

const NUMERIC_DAYS = Array.from({ length: 31 }, (_, i) => {
  const dayNum = i + 1;
  return {
    value: dayNum < 10 ? `0${dayNum}` : `${dayNum}`,
    label: `Day ${dayNum}`,
  };
});

const Dashboard = () => {
  const { fetchWithAuth, user } = useAuth();
  const [players, setPlayers] = useState([]);
  const { communityId } = useParams();

  // Settings popover state
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const toggleButtonRef = useRef(null);

  // Date Filter States
  const [selectedMonth, setSelectedMonth] = useState("");
  const [dayFilterType, setDayFilterType] = useState("all"); // 'all' | 'specific' | 'weekday'
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState("");

  // State configurations for interactive table sorting
  const [sortBy, setSortBy] = useState("points"); // Default column key to sort by
  const [order, setOrder] = useState("desc"); // Default sorting order ('desc' or 'asc')

  const getPlayers = useCallback(async () => {
    if (!communityId) return;
    try {
      // Build date query params dynamically
      const queryParams = new URLSearchParams();
      if (selectedMonth) queryParams.append("month", selectedMonth);

      if (dayFilterType === "specific" && selectedDay) {
        queryParams.append("day", selectedDay);
      } else if (dayFilterType === "weekday" && selectedDayOfWeek) {
        queryParams.append("dayOfWeek", selectedDayOfWeek);
      }

      const queryString = queryParams.toString()
        ? `?${queryParams.toString()}`
        : "";

      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players/total-community-games${queryString}`,
        { method: "GET" },
      );
      if (!response.ok) throw new Error("Http error", response.status);
      const data = await response.json();
      console.log(data);
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
  }, [
    communityId,
    fetchWithAuth,
    selectedMonth,
    dayFilterType,
    selectedDay,
    selectedDayOfWeek,
  ]);

  useEffect(() => {
    getPlayers();
  }, [getPlayers]);

  const handleResetFilters = () => {
    setSelectedMonth("");
    setDayFilterType("all");
    setSelectedDay("");
    setSelectedDayOfWeek("");
  };

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

      // 🌟 Explicitly integrate totalCommunityPoints (which encapsulates wins, payments, and manual points)
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
  const isFiltered = Boolean(
    selectedMonth ||
    (dayFilterType === "specific" && selectedDay) ||
    (dayFilterType === "weekday" && selectedDayOfWeek),
  );

  return (
    <div className="w-full max-w-[720px] mx-auto select-none border border-stone-200 rounded-xl overflow-hidden shadow-sm bg-white mt-4">
      {/* Top Controls Header: Filters */}
      <div className="p-3 bg-stone-50/70 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-x-2 text-xs font-semibold text-stone-600">
          <Calendar size={15} className="text-stone-400" />
          <span>Filter Stats:</span>
        </div>

        <div className="flex items-center gap-x-2 flex-wrap">
          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-stone-200 text-stone-700 text-xs font-medium rounded-lg px-2.5 py-1.5 outline-none focus:border-stone-400 transition-colors cursor-pointer"
          >
            <option value="">All Months</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          {/* Day Filter Mode */}
          <select
            value={dayFilterType}
            onChange={(e) => {
              setDayFilterType(e.target.value);
              setSelectedDay("");
              setSelectedDayOfWeek("");
            }}
            className="bg-white border border-stone-200 text-stone-700 text-xs font-medium rounded-lg px-2.5 py-1.5 outline-none focus:border-stone-400 transition-colors cursor-pointer"
          >
            <option value="all">All Days</option>
            <option value="specific">Single Day</option>
            <option value="weekday">Day of Week</option>
          </select>

          {/* Conditional Dropdown for Single Day Selection */}
          {dayFilterType === "specific" && (
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="bg-white border border-stone-200 text-stone-700 text-xs font-medium rounded-lg px-2.5 py-1.5 outline-none focus:border-stone-400 transition-colors cursor-pointer"
            >
              <option value="">Select Day</option>
              {NUMERIC_DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          )}

          {/* Conditional Dropdown for Day of Week Selection */}
          {dayFilterType === "weekday" && (
            <select
              value={selectedDayOfWeek}
              onChange={(e) => setSelectedDayOfWeek(e.target.value)}
              className="bg-white border border-stone-200 text-stone-700 text-xs font-medium rounded-lg px-2.5 py-1.5 outline-none focus:border-stone-400 transition-colors cursor-pointer"
            >
              <option value="">Select Weekday</option>
              {DAYS_OF_WEEK.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          )}

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              title="Reset Filters"
              className="flex items-center gap-x-1 px-2 py-1.5 text-xs text-stone-500 hover:text-stone-800 bg-white border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-stone-50/40 border-b border-stone-200 text-xs font-semibold text-stone-600 uppercase tracking-wider">
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

              // 🌟 Total Points includes wins + payments + manual points returned by backend API
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
                      : "hover:bg-stone-100/80"
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
                  No statistical roster data available for selected period
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
