import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ArrowRightLeft,
  Check,
  Search,
  Loader2,
  UserCheck,
  Trash2,
  Trophy,
  Frown,
  Calendar,
  Clock,
  Swords,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { API_URL } from "../../../contexts/AuthContext";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown date";

const formatDuration = (start, end) => {
  if (!start || !end) return "N/A";
  const diff = Math.max(0, new Date(end) - new Date(start));
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

const CommunityPlayerHistory = ({
  communityId,
  communityPlayerId,
  username,
  onClose,
  onOptimisticTransfer,
  onGamesTransferred,
}) => {
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const modalRef = useRef(null);

  // Transfer Feature State
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [communityPlayers, setCommunityPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [targetCommunityPlayerId, setTargetCommunityPlayerId] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Prevent closing when clicking inside modal, trigger onClose on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (isTransferOpen) return;
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [onClose, isTransferOpen]);

  // Filter accepted community players by search query
  const filteredCommunityPlayers = communityPlayers.filter((cp) => {
    const name = cp.communityPlayer?.username || cp.username || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  useEffect(() => {
    const loadHistory = async () => {
      if (!communityPlayerId) return;

      try {
        setIsLoading(true);
        setError("");
        const response = await fetchWithAuth(
          `${API_URL}/api/communities/${communityId}/players/${communityPlayerId}/history`,
        );
        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Could not load player history");
        }

        setData(result.results);
      } catch (loadError) {
        setError(loadError.message || "Could not load player history");
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [communityId, communityPlayerId, fetchWithAuth]);

  // Fetch Community Players with Status = "accepted"
  const fetchCommunityPlayers = async () => {
    try {
      setLoadingPlayers(true);
      setTransferError(null);
      const res = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players`,
        { method: "GET" },
      );
      if (!res.ok) throw new Error("Failed to load community players");
      const playersData = await res.json();

      const rawList = Array.isArray(playersData.player)
        ? playersData.player
        : Array.isArray(playersData.results)
          ? playersData.results
          : Array.isArray(playersData)
            ? playersData
            : [];

      // Filter out self and ensure status is "accepted"
      const availablePlayers = rawList.filter((cp) => {
        const isNotCurrentPlayer =
          cp.id !== communityPlayerId &&
          cp.communityPlayerId !== communityPlayerId;

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
    setIsDropdownOpen(false);
    setSearchQuery("");
    setTransferError(null);
    fetchCommunityPlayers();
  };

  // Checkbox Select Toggles
  const handleToggleSelectMatch = (matchHistoryId) => {
    setSelectedMatchIds((prev) =>
      prev.includes(matchHistoryId)
        ? prev.filter((id) => id !== matchHistoryId)
        : [...prev, matchHistoryId],
    );
  };

  const handleSelectAll = () => {
    if (!data?.history) return;
    if (selectedMatchIds.length === data.history.length) {
      setSelectedMatchIds([]);
    } else {
      setSelectedMatchIds(data.history.map((m) => m.matchHistoryId));
    }
  };

  // Perform Community-Level Transfer
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
        matchHistoryIds: selectedMatchIds,
      };

      // Call Community-Scoped Transfer API endpoint
      const res = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players/${communityPlayerId}/transfer-games`,
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

      // Optimistically update local parent roster component
      if (typeof onOptimisticTransfer === "function") {
        onOptimisticTransfer(communityPlayerId, targetCommunityPlayerId);
      }

      // Locally update history modal UI
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
          (g) => g.result === "win" || g.playerPersonalResult === "win",
        ).length;
        const paymentPoints = prevData.summary.paymentPoints || 0;

        return {
          ...prevData,
          summary: {
            ...prevData.summary,
            totalGames,
            totalWins,
            totalLosses: totalGames - totalWins,
            winPoints: totalWins,
            totalPoints: totalWins + paymentPoints,
          },
          history: updatedHistory,
        };
      });

      setIsTransferOpen(false);
      setSelectedMatchIds([]);
      setTargetCommunityPlayerId("");

      // Re-fetch parent data from backend
      if (typeof onGamesTransferred === "function") {
        onGamesTransferred();
      }
    } catch (err) {
      setTransferError(err.message || "An error occurred during transfer.");
    } finally {
      setIsTransferring(false);
    }
  };

  // Delete Match Entry
  const handleDeleteMatch = async (matchHistoryId) => {
    if (!window.confirm("Are you sure you want to delete this match record?")) {
      return;
    }

    try {
      setDeletingId(matchHistoryId);

      const res = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players/${communityPlayerId}/history/${matchHistoryId}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete match record");
      }

      setData((prevData) => {
        if (!prevData) return prevData;

        const updatedHistory = prevData.history.filter(
          (item) => item.matchHistoryId !== matchHistoryId,
        );

        const totalGames = updatedHistory.length;
        const totalWins = updatedHistory.filter(
          (g) => g.result === "win" || g.playerPersonalResult === "win",
        ).length;
        const paymentPoints = prevData.summary.paymentPoints || 0;

        return {
          ...prevData,
          summary: {
            ...prevData.summary,
            totalGames,
            totalWins,
            totalLosses: totalGames - totalWins,
            winPoints: totalWins,
            totalPoints: totalWins + paymentPoints,
          },
          history: updatedHistory,
        };
      });

      if (typeof onGamesTransferred === "function") {
        onGamesTransferred();
      }
    } catch (err) {
      alert(err.message || "An error occurred while deleting.");
    } finally {
      setDeletingId(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 font-sans backdrop-blur-xs selection:bg-orange-500/20 selection:text-orange-900">
      <div
        ref={modalRef}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onDragStart={(e) => e.preventDefault()}
        className="flex max-h-[85vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xl shadow-stone-200/50 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header Section */}
        <header className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 px-5 py-4">
          <div>
            <h3 className="text-base font-bold tracking-tight text-stone-900">
              Community Points History
            </h3>
            <p className="max-w-[280px] truncate text-xs font-medium text-stone-500">
              Records for{" "}
              <span className="font-bold text-orange-600">{username}</span>
            </p>
          </div>
          <div className="flex items-center gap-x-2">
            {!isLoading && data?.history?.length > 0 && (
              <button
                type="button"
                onClick={handleOpenTransferModal}
                className="flex items-center gap-x-1.5 rounded-xl bg-stone-100 px-2.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
                title="Transfer games to another player"
              >
                <ArrowRightLeft size={13} className="text-orange-600" />
                Transfer
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer"
              title="Close history"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {isLoading && (
            <div className="flex flex-col items-center justify-center space-y-2.5 py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              <p className="text-xs font-semibold text-stone-400">
                Loading point history...
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-x-2.5 rounded-xl border border-red-100 bg-red-50 p-3.5 text-xs text-red-800 animate-in fade-in duration-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span className="font-semibold leading-relaxed">{error}</span>
            </div>
          )}

          {!isLoading && !error && data && (
            <>
              {/* Performance / Summary Metrics Cards */}
              <div className="grid grid-cols-3 gap-2 rounded-xl border border-stone-200/60 bg-stone-50/70 p-3 text-center">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Matches
                  </span>
                  <span className="text-sm font-bold text-stone-800">
                    {data.summary.totalGames}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    Wins · Points
                  </span>
                  <span className="text-sm font-bold text-emerald-700">
                    {data.summary.totalWins} · +{data.summary.winPoints}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    Total Points
                  </span>
                  <span className="text-sm font-bold text-blue-700">
                    {data.summary.totalPoints}
                  </span>
                </div>
              </div>

              {/* Points breakdown notice */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900 leading-relaxed">
                <span className="font-bold">Points breakdown:</span> +
                {data.summary.winPoints} from wins and +
                {data.summary.paymentPoints} from {data.payments.length} paid
                {data.payments.length === 1 ? " session" : " sessions"} (3
                points each).
              </div>

              {/* Match Feed Header & Actions */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-x-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Match Log
                    </h4>
                    {selectedMatchIds.length > 0 && (
                      <span className="rounded-md border border-orange-200/60 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                        {selectedMatchIds.length} Selected
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-x-2">
                    {data.history.length > 0 && (
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
                      {data.history.length} Matches
                    </span>
                  </div>
                </div>

                {!data.history || data.history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/30 p-8 text-center">
                    <Swords size={24} className="mb-1.5 text-stone-300" />
                    <p className="text-xs font-medium italic text-stone-400">
                      No completed matches across this community yet.
                    </p>
                  </div>
                ) : (
                  data.history.map((match) => {
                    const isWin =
                      match.result === "win" ||
                      match.playerPersonalResult === "win";
                    const isDeleting = deletingId === match.matchHistoryId;
                    const isSelected = selectedMatchIds.includes(
                      match.matchHistoryId,
                    );

                    return (
                      <div
                        key={match.matchHistoryId}
                        className={`relative flex flex-col gap-y-2.5 rounded-xl border p-3 transition-all duration-150 ${
                          isSelected
                            ? "border-orange-300 bg-orange-50/30 ring-1 ring-orange-400/20"
                            : isWin
                              ? "border-emerald-200/60 bg-emerald-50/20 hover:border-emerald-300"
                              : "border-rose-100 bg-rose-50/20 hover:border-rose-200"
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
                              className={`flex items-center gap-x-1 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
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
                              {match.result || match.playerPersonalResult} · +
                              {match.points}
                            </span>
                            <span className="font-bold text-stone-800 truncate max-w-[120px]">
                              {match.sessionName || match.courtName}
                            </span>
                          </div>

                          <div className="flex items-center gap-x-2 text-[11px] font-medium text-stone-400">
                            <span className="flex items-center gap-x-1">
                              <Calendar size={12} />{" "}
                              {formatDate(match.endedAt || match.startedAt)}
                            </span>
                            {match.startedAt && match.endedAt && (
                              <span className="flex items-center gap-x-1">
                                <Clock size={12} />{" "}
                                {formatDuration(match.startedAt, match.endedAt)}
                              </span>
                            )}

                            {/* Delete Entry Button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteMatch(match.matchHistoryId)
                              }
                              disabled={isDeleting}
                              title="Delete match entry"
                              className="ml-0.5 rounded-lg p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3 w-3 animate-spin text-rose-600" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Matchup Teams Panel */}
                        <div className="grid grid-cols-2 gap-x-3 border-t border-dashed border-stone-200/70 pt-2 text-xs">
                          {/* Team A */}
                          <div className="flex flex-col">
                            <span
                              className={`mb-1 text-[9px] font-bold uppercase tracking-wide ${
                                match.winningTeam === "a"
                                  ? "text-emerald-700"
                                  : "text-stone-400"
                              }`}
                            >
                              Team A {match.winningTeam === "a" && "🏆"}
                            </span>
                            <div className="flex flex-wrap gap-x-1 text-[11px] font-medium text-stone-700">
                              {match.teamA.map((tPlayer, idx) => (
                                <span
                                  key={
                                    tPlayer.communityPlayerId ||
                                    tPlayer.username ||
                                    idx
                                  }
                                  className={
                                    tPlayer.username === username
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
                          <div className="flex flex-col border-l border-stone-200/60 pl-3">
                            <span
                              className={`mb-1 text-[9px] font-bold uppercase tracking-wide ${
                                match.winningTeam === "b"
                                  ? "text-emerald-700"
                                  : "text-stone-400"
                              }`}
                            >
                              Team B {match.winningTeam === "b" && "🏆"}
                            </span>
                            <div className="flex flex-wrap gap-x-1 text-[11px] font-medium text-stone-700">
                              {match.teamB.map((tPlayer, idx) => (
                                <span
                                  key={
                                    tPlayer.communityPlayerId ||
                                    tPlayer.username ||
                                    idx
                                  }
                                  className={
                                    tPlayer.username === username
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

              {/* Paid Sessions Section */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Paid Sessions
                </h4>
                <div className="space-y-2">
                  {data.payments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/30 p-4 text-center">
                      <p className="text-xs font-medium italic text-stone-400">
                        No paid sessions recorded.
                      </p>
                    </div>
                  ) : (
                    data.payments.map((payment) => (
                      <article
                        key={payment.sessionId}
                        className="flex items-center justify-between rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-stone-800">
                            {payment.sessionName}
                          </p>
                          <p className="text-[11px] text-stone-400">
                            Marked paid {formatDate(payment.paidAt)}
                          </p>
                        </div>
                        <span className="font-bold text-amber-700">
                          +{payment.points} pts
                        </span>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Transfer Sub-Modal Overlay */}
      {isTransferOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-stone-900/50 p-4 font-sans backdrop-blur-xs animate-in fade-in duration-150"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-x-2">
                <ArrowRightLeft className="text-orange-500" size={18} />
                <h4 className="text-sm font-bold text-stone-900">
                  Transfer Community Games
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs leading-relaxed text-stone-600">
              Transfer{" "}
              <span className="font-bold text-stone-900">
                {selectedMatchIds.length === 0
                  ? "ALL"
                  : selectedMatchIds.length}
              </span>{" "}
              matches from{" "}
              <span className="font-bold text-orange-600">{username}</span> to
              another accepted player:
            </p>

            {transferError && (
              <div className="flex items-start gap-x-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span>{transferError}</span>
              </div>
            )}

            <div className="relative space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Target Player
              </label>

              {loadingPlayers ? (
                <div className="flex items-center gap-x-2 py-2 text-xs text-stone-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                  Loading players...
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search accepted player..."
                      value={searchQuery}
                      onFocus={() => setIsDropdownOpen(true)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setTargetCommunityPlayerId("");
                        setIsDropdownOpen(true);
                      }}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/50 pl-8 pr-8 py-2 text-xs font-medium text-stone-800 placeholder-stone-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all"
                    />
                    <Search
                      size={14}
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setTargetCommunityPlayerId("");
                          setIsDropdownOpen(true);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-stone-400 hover:bg-stone-200/60 hover:text-stone-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {isDropdownOpen && (
                    <div
                      className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-stone-200/80 bg-white p-1 shadow-xl space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {filteredCommunityPlayers.length === 0 ? (
                        <div className="py-3 text-center text-xs italic text-stone-400">
                          No accepted players found
                        </div>
                      ) : (
                        filteredCommunityPlayers.map((cp) => {
                          const pName =
                            cp.communityPlayer?.username ||
                            cp.username ||
                            "Unknown";
                          const isSelected = targetCommunityPlayerId === cp.id;

                          return (
                            <button
                              key={cp.id}
                              type="button"
                              onClick={() => {
                                setTargetCommunityPlayerId(cp.id);
                                setSearchQuery(pName);
                                setIsDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-orange-500 font-bold text-white"
                                  : "text-stone-700 hover:bg-stone-100"
                              }`}
                            >
                              <span className="truncate">{pName}</span>
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

            <div className="flex items-center gap-x-2 border-t border-stone-100 pt-2">
              <button
                type="button"
                onClick={() => setIsTransferOpen(false)}
                className="w-full rounded-xl bg-stone-100 py-2 text-xs font-bold text-stone-600 hover:bg-stone-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isTransferring || !targetCommunityPlayerId}
                onClick={handleExecuteTransfer}
                className="flex w-full items-center justify-center gap-x-1.5 rounded-xl bg-orange-500 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/10 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                {isTransferring ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
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

export default CommunityPlayerHistory;
