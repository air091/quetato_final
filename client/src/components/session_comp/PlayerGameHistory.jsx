import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { X, Trophy, Frown, Calendar, Clock } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const PlayerGameHistory = ({ player, onClose }) => {
  const { fetchWithAuth } = useAuth();
  const { communityId, sessionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const sessionPlayerId = player?.id;
  const username =
    player?.sessionPlayer?.communityPlayer?.username ||
    player?.communityPlayer?.username ||
    player?.username ||
    "Player";

  useEffect(() => {
    if (!sessionPlayerId) return;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await fetchWithAuth(
          `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/players/${sessionPlayerId}/history`,
          { method: "GET" },
        );
        if (!res.ok) throw new Error("Http error", res.status);
        const gameData = await res.json();
        setData(gameData.results);
      } catch (err) {
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };
    console.log(fetchHistory());
    fetchHistory();
  }, [communityId, sessionId, sessionPlayerId]);

  // Helper formatting utility for game durations
  const formatDuration = (start, end) => {
    if (!start || !end) return "N/A";
    const diff = Math.max(0, new Date(end) - new Date(start));
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Helper utility for human dates
  const formatDate = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return createPortal(
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-9999 p-4"
    >
      <div className="bg-white w-full max-w-md rounded-lg shadow-xl flex flex-col max-h-[85vh] border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header section */}
        <header className="p-3 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Game History</h3>
            <p className="text-[11px] text-gray-500 font-medium truncate max-w-[280px]">
              Match records for{" "}
              <span className="text-blue-600 font-semibold">{username}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </header>

        {/* Content body wrapper */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {loading && (
            <div className="space-y-3 py-6 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-gray-400 font-medium">
                Loading match history records...
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded bg-red-50 text-red-600 text-xs font-medium text-center border border-red-100">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Summary Performance Cards Grid */}
              <div className="grid grid-cols-4 gap-2 bg-stone-50 p-2.5 rounded-md border text-center">
                <div>
                  <span className="block text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                    Played
                  </span>
                  <span className="text-sm font-bold text-gray-800">
                    {data.summary?.totalGames || 0}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-green-600 font-medium uppercase tracking-wider">
                    Wins
                  </span>
                  <span className="text-sm font-bold text-green-600">
                    {data.summary?.totalWins || 0}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-red-500 font-medium uppercase tracking-wider">
                    Losses
                  </span>
                  <span className="text-sm font-bold text-red-500">
                    {data.summary?.totalLosses || 0}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-blue-600 font-medium uppercase tracking-wider">
                    Win Rate
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {data.summary?.winRate || "0%"}
                  </span>
                </div>
              </div>

              {/* History Match Items Feed */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Match Log
                </h4>

                {!data.history || data.history.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 font-medium py-8 border border-dashed rounded-md">
                    No matches played in this session yet.
                  </div>
                ) : (
                  data.history.map((match) => {
                    const isWin = match.playerPersonalResult === "win";

                    return (
                      <div
                        key={match.matchHistoryId}
                        className={`p-2.5 rounded-md border flex flex-col gap-y-1.5 transition-all ${
                          isWin
                            ? "bg-green-50/30 border-green-200/60 hover:bg-green-50/50"
                            : "bg-red-50/20 border-red-100 hover:bg-red-50/40"
                        }`}
                      >
                        {/* Upper row header */}
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-x-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-x-0.5 ${
                                isWin
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {isWin ? (
                                <Trophy size={10} />
                              ) : (
                                <Frown size={10} />
                              )}
                              {match.playerPersonalResult}
                            </span>
                            <span className="font-semibold text-gray-700">
                              {match.courtName}
                            </span>
                          </div>

                          <div className="flex items-center gap-x-2 text-gray-400 font-medium">
                            <span className="flex items-center gap-x-0.5">
                              <Calendar size={11} />{" "}
                              {formatDate(match.startedAt)}
                            </span>
                            <span className="flex items-center gap-x-0.5">
                              <Clock size={11} />{" "}
                              {formatDuration(match.startedAt, match.endedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Lower row matchup content */}
                        <div className="grid grid-cols-2 gap-x-4 pt-1 border-t border-dashed border-gray-200/70 text-xs">
                          {/* Team A Panel */}
                          <div className="flex flex-col">
                            <span
                              className={`text-[9px] font-bold tracking-wide uppercase mb-0.5 ${match.winningTeam === "a" ? "text-green-600" : "text-gray-400"}`}
                            >
                              Team A {match.winningTeam === "a" && "🏆"}
                            </span>
                            <div className="flex flex-wrap gap-x-1 text-gray-600 font-medium text-[11px]">
                              {match.teamA.map((tPlayer, idx) => (
                                <span
                                  key={tPlayer.sessionPlayerId}
                                  className={
                                    tPlayer.sessionPlayerId === sessionPlayerId
                                      ? "font-bold text-blue-600 underline"
                                      : ""
                                  }
                                >
                                  {tPlayer.username}
                                  {idx < match.teamA.length - 1 ? "," : ""}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Team B Panel */}
                          <div className="flex flex-col border-l pl-3 border-gray-200/60">
                            <span
                              className={`text-[9px] font-bold tracking-wide uppercase mb-0.5 ${match.winningTeam === "b" ? "text-green-600" : "text-gray-400"}`}
                            >
                              Team B {match.winningTeam === "b" && "🏆"}
                            </span>
                            <div className="flex flex-wrap gap-x-1 text-gray-600 font-medium text-[11px]">
                              {match.teamB.map((tPlayer, idx) => (
                                <span
                                  key={tPlayer.sessionPlayerId}
                                  className={
                                    tPlayer.sessionPlayerId === sessionPlayerId
                                      ? "font-bold text-blue-600 underline"
                                      : ""
                                  }
                                >
                                  {tPlayer.username}
                                  {idx < match.teamB.length - 1 ? "," : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default PlayerGameHistory;
