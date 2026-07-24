import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import {
  X,
  Trophy,
  Frown,
  Calendar,
  Clock,
  Trash2,
  Loader2,
  AlertCircle,
  Swords,
  ArrowRightLeft,
  Check,
  UserCheck,
  Search,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { API_URL } from "../../contexts/AuthContext";

const PlayerGameHistory = ({ player, onClose, onGamesTransferred }) => {
  const { fetchWithAuth } = useAuth();
  const { communityId, sessionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Transfer Feature State
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [communityPlayers, setCommunityPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [targetCommunityPlayerId, setTargetCommunityPlayerId] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Ref to track the inner modal card container
  const modalRef = useRef(null);

  const sessionPlayerId = player?.id;
  const username =
    player?.sessionPlayer?.communityPlayer?.username ||
    player?.communityPlayer?.username ||
    player?.username ||
    "Player";

  const [searchQuery, setSearchQuery] = useState("");

  // Compute filtered players dynamically
  const filteredCommunityPlayers = communityPlayers.filter((cp) => {
    const name = cp.communityPlayer?.username || cp.username || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  useEffect(() => {
    if (!sessionPlayerId) return;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await fetchWithAuth(
          `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/players/${sessionPlayerId}/history`,
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
    fetchHistory();
  }, [communityId, sessionId, sessionPlayerId]);

  // Fetch Community Players for Transfer Dropdown
  const fetchCommunityPlayers = async () => {
    try {
      setLoadingPlayers(true);
      const res = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players`,
        { method: "GET" },
      );
      if (!res.ok) throw new Error("Failed to load community players");
      const playersData = await res.json();

      // Extract list based on structure
      const rawList = Array.isArray(playersData.player)
        ? playersData.player
        : Array.isArray(playersData.results)
          ? playersData.results
          : Array.isArray(playersData)
            ? playersData
            : [];

      // Filter out:
      // 1. Current source player
      // 2. Players whose status is NOT "accepted"
      const availablePlayers = rawList.filter((cp) => {
        const isNotCurrentPlayer =
          cp.id !== player?.playerId &&
          cp.id !== player?.sessionPlayer?.playerId;

        const isAccepted =
          cp.status === "accepted" || cp.communityPlayer?.status === "accepted";

        return isNotCurrentPlayer && isAccepted;
      });

      setCommunityPlayers(availablePlayers);
    } catch (err) {
      setTransferError(err.message);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleOpenTransferModal = () => {
    setIsTransferOpen(true);
    setIsDropdownOpen(false); // 👈 Ensures menu is hidden on start
    setSearchQuery("");
    setTransferError(null);
    fetchCommunityPlayers();
  };

  // Toggle match selection for transfer
  const handleToggleSelectMatch = (matchHistoryId) => {
    setSelectedMatchIds((prev) =>
      prev.includes(matchHistoryId)
        ? prev.filter((id) => id !== matchHistoryId)
        : [...prev, matchHistoryId],
    );
  };

  // Select/Deselect All Matches
  const handleSelectAll = () => {
    if (!data?.history) return;
    if (selectedMatchIds.length === data.history.length) {
      setSelectedMatchIds([]);
    } else {
      setSelectedMatchIds(data.history.map((m) => m.matchHistoryId));
    }
  };

  // Execute Transfer API Call
  const handleExecuteTransfer = async () => {
    if (!targetCommunityPlayerId) {
      setTransferError("Please select a target player to transfer matches to.");
      return;
    }

    try {
      setIsTransferring(true);
      setTransferError(null);

      const payload = {
        targetCommunityPlayerId,
        matchHistoryIds: selectedMatchIds, // Empty array transfers ALL matches
      };

      const res = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/players/${sessionPlayerId}/transfer-games`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to transfer games");
      }

      // Filter local state based on transferred matches
      setData((prevData) => {
        if (!prevData) return prevData;

        const isTransferringAll = selectedMatchIds.length === 0;
        const updatedHistory = isTransferringAll
          ? []
          : prevData.history.filter(
              (item) => !selectedMatchIds.includes(item.matchHistoryId),
            );

        const totalGames = updatedHistory.length;
        const totalWins = updatedHistory.filter(
          (g) => g.playerPersonalResult === "win",
        ).length;
        const totalLosses = totalGames - totalWins;
        const winRate =
          totalGames > 0
            ? `${Math.round((totalWins / totalGames) * 100)}%`
            : "0%";

        return {
          ...prevData,
          summary: {
            totalGames,
            totalWins,
            totalLosses,
            winRate,
          },
          history: updatedHistory,
        };
      });

      // Reset transfer states
      setIsTransferOpen(false);
      setSelectedMatchIds([]);
      setTargetCommunityPlayerId("");

      if (typeof onGamesTransferred === "function") {
        onGamesTransferred();
      }
    } catch (err) {
      setTransferError(err.message || "An error occurred during transfer.");
    } finally {
      setIsTransferring(false);
    }
  };

  // Handle Match Deletion
  const handleDeleteMatch = async (matchHistoryId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this match history entry?",
      )
    ) {
      return;
    }

    try {
      setDeletingId(matchHistoryId);

      const res = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/players/${sessionPlayerId}/history/${matchHistoryId}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete match history");
      }

      // Dynamically filter out the deleted match & update state summary
      setData((prevData) => {
        if (!prevData) return prevData;

        const updatedHistory = prevData.history.filter(
          (item) => item.matchHistoryId !== matchHistoryId,
        );

        const totalGames = updatedHistory.length;
        const totalWins = updatedHistory.filter(
          (g) => g.playerPersonalResult === "win",
        ).length;
        const totalLosses = totalGames - totalWins;
        const winRate =
          totalGames > 0
            ? `${Math.round((totalWins / totalGames) * 100)}%`
            : "0%";

        return {
          ...prevData,
          summary: {
            totalGames,
            totalWins,
            totalLosses,
            winRate,
          },
          history: updatedHistory,
        };
      });
    } catch (err) {
      alert(err.message || "An error occurred while deleting.");
    } finally {
      setDeletingId(null);
    }
  };

  // Detect true "clicks outside"
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [onClose, isTransferOpen]);

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
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans selection:bg-orange-500/20 selection:text-orange-900">
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onDragStart={(e) => e.preventDefault()}
        ref={modalRef}
        className="bg-white w-full max-w-md rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200/80 flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header Section */}
        <header className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div>
            <h3 className="text-base font-bold text-stone-900 tracking-tight">
              Match History
            </h3>
            <p className="text-xs text-stone-500 font-medium truncate max-w-[280px]">
              Records for{" "}
              <span className="text-orange-600 font-bold">{username}</span>
            </p>
          </div>
          <div className="flex items-center gap-x-2">
            {!loading && data?.history?.length > 0 && (
              <button
                type="button"
                onClick={handleOpenTransferModal}
                className="flex items-center gap-x-1.5 px-2.5 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
                title="Transfer games to another player"
              >
                <ArrowRightLeft size={13} className="text-orange-600" />
                Transfer
              </button>
            )}
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 cursor-pointer transition-colors"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="flex flex-col items-center justify-center space-y-2.5 py-12 text-center">
              <Loader2 className="animate-spin h-6 w-6 text-orange-500" />
              <p className="text-xs font-semibold text-stone-400">
                Loading match history...
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-x-2.5 rounded-xl bg-red-50 border border-red-100 p-3.5 text-xs text-red-800 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{error}</span>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Performance Metrics Cards */}
              <div className="grid grid-cols-4 gap-2 bg-stone-50/70 p-3 rounded-xl border border-stone-200/60 text-center">
                <div>
                  <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    Played
                  </span>
                  <span className="text-sm font-bold text-stone-800">
                    {data.summary?.totalGames || 0}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                    Wins
                  </span>
                  <span className="text-sm font-bold text-emerald-700">
                    {data.summary?.totalWins || 0}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                    Losses
                  </span>
                  <span className="text-sm font-bold text-rose-600">
                    {data.summary?.totalLosses || 0}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                    Win Rate
                  </span>
                  <span className="text-sm font-bold text-orange-600">
                    {data.summary?.winRate || "0%"}
                  </span>
                </div>
              </div>

              {/* Match Feed Header & Actions */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-x-2">
                    <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      Match Log
                    </h4>
                    {selectedMatchIds.length > 0 && (
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60">
                        {selectedMatchIds.length} Selected
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-x-2">
                    {data.history?.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-[10px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                      >
                        {selectedMatchIds.length === data.history.length
                          ? "Deselect All"
                          : "Select All"}
                      </button>
                    )}
                    <span className="text-[10px] font-bold text-stone-400">
                      {data.history?.length || 0} Matches
                    </span>
                  </div>
                </div>

                {!data.history || data.history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-stone-200 rounded-xl bg-stone-50/30">
                    <Swords size={24} className="text-stone-300 mb-1.5" />
                    <p className="text-xs font-medium italic text-stone-400">
                      No matches recorded for this session yet.
                    </p>
                  </div>
                ) : (
                  data.history.map((match) => {
                    const isWin = match.playerPersonalResult === "win";
                    const isDeleting = deletingId === match.matchHistoryId;
                    const isSelected = selectedMatchIds.includes(
                      match.matchHistoryId,
                    );

                    return (
                      <div
                        key={match.matchHistoryId}
                        className={`p-3 rounded-xl border flex flex-col gap-y-2.5 transition-all duration-150 relative ${
                          isSelected
                            ? "bg-orange-50/30 border-orange-300 ring-1 ring-orange-400/20"
                            : isWin
                              ? "bg-emerald-50/20 border-emerald-200/60 hover:border-emerald-300"
                              : "bg-rose-50/20 border-rose-100 hover:border-rose-200"
                        }`}
                      >
                        {/* Match Header */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-x-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                handleToggleSelectMatch(match.matchHistoryId)
                              }
                              className="rounded border-stone-300 text-orange-500 focus:ring-orange-500/20 cursor-pointer"
                            />
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-x-1 ${
                                isWin
                                  ? "bg-emerald-100/80 text-emerald-800"
                                  : "bg-rose-100/80 text-rose-800"
                              }`}
                            >
                              {isWin ? (
                                <Trophy size={11} />
                              ) : (
                                <Frown size={11} />
                              )}
                              {match.playerPersonalResult}
                            </span>
                            <span className="font-bold text-stone-800">
                              {match.courtName}
                            </span>
                          </div>

                          <div className="flex items-center gap-x-2 text-stone-400 text-[11px] font-medium">
                            <span className="flex items-center gap-x-1">
                              <Calendar size={12} />{" "}
                              {formatDate(match.startedAt)}
                            </span>
                            <span className="flex items-center gap-x-1">
                              <Clock size={12} />{" "}
                              {formatDuration(match.startedAt, match.endedAt)}
                            </span>

                            {/* Delete Entry Button */}
                            <button
                              onClick={() =>
                                handleDeleteMatch(match.matchHistoryId)
                              }
                              disabled={isDeleting}
                              title="Delete match entry"
                              className="text-stone-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors disabled:opacity-50 ml-0.5"
                            >
                              {isDeleting ? (
                                <Loader2 className="animate-spin h-3 w-3 text-rose-600" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Matchup Teams Panel */}
                        <div className="grid grid-cols-2 gap-x-3 pt-2 border-t border-dashed border-stone-200/70 text-xs">
                          {/* Team A */}
                          <div className="flex flex-col">
                            <span
                              className={`text-[9px] font-bold tracking-wide uppercase mb-1 ${
                                match.winningTeam === "a"
                                  ? "text-emerald-700"
                                  : "text-stone-400"
                              }`}
                            >
                              Team A {match.winningTeam === "a" && "🏆"}
                            </span>
                            <div className="flex flex-wrap gap-x-1 text-stone-700 font-medium text-[11px]">
                              {match.teamA.map((tPlayer, idx) => (
                                <span
                                  key={tPlayer.sessionPlayerId}
                                  className={
                                    tPlayer.sessionPlayerId === sessionPlayerId
                                      ? "font-bold text-orange-600 underline underline-offset-2"
                                      : ""
                                  }
                                >
                                  {tPlayer.username}
                                  {idx < match.teamA.length - 1 ? "," : ""}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Team B */}
                          <div className="flex flex-col border-l pl-3 border-stone-200/60">
                            <span
                              className={`text-[9px] font-bold tracking-wide uppercase mb-1 ${
                                match.winningTeam === "b"
                                  ? "text-emerald-700"
                                  : "text-stone-400"
                              }`}
                            >
                              Team B {match.winningTeam === "b" && "🏆"}
                            </span>
                            <div className="flex flex-wrap gap-x-1 text-stone-700 font-medium text-[11px]">
                              {match.teamB.map((tPlayer, idx) => (
                                <span
                                  key={tPlayer.sessionPlayerId}
                                  className={
                                    tPlayer.sessionPlayerId === sessionPlayerId
                                      ? "font-bold text-orange-600 underline underline-offset-2"
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

      {/* Transfer Games Modal Overlay */}
      {isTransferOpen && (
        <div
          className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center z-60 p-4 font-sans animate-in fade-in duration-150"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-stone-200/80 p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-x-2">
                <ArrowRightLeft className="text-orange-500" size={18} />
                <h4 className="text-sm font-bold text-stone-900">
                  Transfer Games
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Transfer{" "}
              <span className="font-bold text-stone-900">
                {selectedMatchIds.length === 0
                  ? "ALL"
                  : selectedMatchIds.length}
              </span>{" "}
              matches from{" "}
              <span className="font-bold text-orange-600">{username}</span> to
              another user:
            </p>

            {transferError && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-800 flex items-start gap-x-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span>{transferError}</span>
              </div>
            )}

            {/* Target Player Selection & Search */}
            <div className="space-y-1.5 relative">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Target Player
              </label>

              {loadingPlayers ? (
                <div className="flex items-center gap-x-2 py-2 text-xs text-stone-500">
                  <Loader2 className="animate-spin h-3.5 w-3.5 text-orange-500" />
                  Loading players...
                </div>
              ) : (
                <div className="relative">
                  {/* Search Input Box */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search and select target player..."
                      value={searchQuery}
                      onFocus={() => setIsDropdownOpen(true)} // 💡 Show dropdown on focus
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setTargetCommunityPlayerId(""); // Clear selection on typing
                        setIsDropdownOpen(true); // 💡 Keep open while typing
                      }}
                      className="w-full rounded-xl border border-stone-200 pl-8 pr-8 py-2 text-xs font-medium text-stone-850 placeholder-stone-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10 bg-stone-50/50 transition-all"
                    />
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setTargetCommunityPlayerId("");
                          setIsDropdownOpen(true);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 rounded-full hover:bg-stone-200/60"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Floating Options Dropdown (Only renders when active) */}
                  {isDropdownOpen && (
                    <div
                      className="absolute left-0 right-0 top-full mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-stone-200/80 bg-white shadow-xl z-30 p-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {filteredCommunityPlayers.length === 0 ? (
                        <div className="py-3 text-center text-xs text-stone-400 italic">
                          No players found
                        </div>
                      ) : (
                        filteredCommunityPlayers.map((cp) => {
                          const pName =
                            cp.communityPlayer?.username ||
                            cp.username ||
                            "Unknown";
                          const pType =
                            cp.communityPlayer?.type || cp.type || "user";
                          const isSelected = targetCommunityPlayerId === cp.id;

                          return (
                            <button
                              key={cp.id}
                              type="button"
                              onClick={() => {
                                setTargetCommunityPlayerId(cp.id);
                                setSearchQuery(pName); // Fill input with chosen name
                                setIsDropdownOpen(false); // 💡 Hide menu on selection!
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-orange-500 text-white font-bold"
                                  : "hover:bg-stone-100 text-stone-700"
                              }`}
                            >
                              <div className="flex items-center gap-x-2 truncate">
                                <span className="truncate">{pName}</span>
                                <span
                                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                                    isSelected
                                      ? "bg-orange-600 text-white"
                                      : "bg-stone-100 text-stone-500"
                                  }`}
                                >
                                  {pType === "static" ? "Static" : "User"}
                                </span>
                              </div>
                              {isSelected && (
                                <Check size={14} className="shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-x-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsTransferOpen(false)}
                className="w-full py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isTransferring || !targetCommunityPlayerId}
                onClick={handleExecuteTransfer}
                className="w-full py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 rounded-xl transition-all shadow-md shadow-orange-500/10 flex items-center justify-center gap-x-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {isTransferring ? (
                  <Loader2 className="animate-spin h-3.5 w-3.5" />
                ) : (
                  <>
                    <UserCheck size={14} />
                    Transfer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
};

export default PlayerGameHistory;
