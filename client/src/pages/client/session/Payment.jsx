import {
  Check,
  RotateCcw,
  DollarSign,
  Settings,
  ArrowUp,
  ArrowDown,
  Banknote,
  Wallet,
  Hourglass,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { useCallback, useState, useMemo, useEffect } from "react";
import { useAuth } from "../../../hooks/useAuth";
import PlayerAvatar from "../../../components/PlayerAvatar";
import { API_URL } from "../../../contexts/AuthContext";
import { useSession } from "../../../hooks/useSession";

const Payment = () => {
  const { fetchWithAuth } = useAuth();
  const { communityId, sessionId, sessionData, refreshSessionContext } =
    useSession();
  const [updatingPlayerId, setUpdatingPlayerId] = useState(null);
  const [optimisticPaymentStatuses, setOptimisticPaymentStatuses] = useState(
    {},
  );

  // Server-side Search & Sorting States
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Pagination State
  const [players, setPlayers] = useState([]);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Pricing Configuration States
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [pricingFormData, setPricingFormData] = useState({
    entranceFee: "",
    perGameFee: "",
    currency: "PHP",
  });
  const [isSubmittingPrice, setIsSubmittingPrice] = useState(false);

  const pricingDetails = useMemo(() => {
    const res = sessionData.pricingData?.result || sessionData.pricingData;
    return res || {};
  }, [sessionData.pricingData]);

  const pricing = pricingDetails?.pricing || null;

  const breakdownMap = useMemo(
    () =>
      new Map(
        (pricingDetails?.breakdown?.playerFees || []).map((item) => [
          item.sessionPlayerId,
          item,
        ]),
      ),
    [pricingDetails],
  );

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch paginated session players from server
  const getSessionPlayers = useCallback(
    async (currentPage = 1, isAppending = false) => {
      if (!communityId || !sessionId) return;
      try {
        if (!isAppending) setIsSessionLoading(true);

        const queryParams = new URLSearchParams({
          page: currentPage,
          limit: 12,
        });

        if (debouncedSearch.trim()) {
          queryParams.append("search", debouncedSearch.trim());
        }
        if (sortConfig.key) {
          queryParams.append("sortKey", sortConfig.key);
          queryParams.append("direction", sortConfig.direction);
        }

        const response = await fetchWithAuth(
          `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/players?${queryParams.toString()}`,
          { method: "GET" },
        );

        if (!response || !response.ok) {
          throw new Error(
            `HTTP error! Status: ${response?.status || "Unknown"}`,
          );
        }

        const data = await response.json();
        if (!data?.success) throw new Error(data?.message);

        const fetched = data?.results || [];
        setPlayers((prev) => (isAppending ? [...prev, ...fetched] : fetched));
        setHasMore(data?.pagination?.hasMore || false);
        setTotalCount(data?.pagination?.total || fetched.length);
      } catch (error) {
        console.error("Fetch session players failed:", error.message);
      } finally {
        if (!isAppending) setIsSessionLoading(false);
      }
    },
    [communityId, sessionId, fetchWithAuth, debouncedSearch, sortConfig],
  );

  // Trigger fetch on search or sort change
  useEffect(() => {
    setPage(1);
    getSessionPlayers(1, false);
  }, [getSessionPlayers, debouncedSearch, sortConfig]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    getSessionPlayers(nextPage, true);
  };

  // Refresh the shared session workspace without blanking this page.
  const getPaymentDetails = useCallback(async () => {
    if (!communityId || !sessionId) return;

    try {
      await refreshSessionContext({ silent: true });
      await getSessionPlayers(1, false);
    } catch (error) {
      console.error("Fetch payment workspace details failed:", error);
    }
  }, [communityId, sessionId, refreshSessionContext, getSessionPlayers]);

  // Handle Base Pricing Submission
  const handlePricingSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingPrice(true);

    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/pricing`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entranceFee:
              pricingFormData.entranceFee === ""
                ? 0
                : Number(pricingFormData.entranceFee),
            perGameFee:
              pricingFormData.perGameFee === ""
                ? 0
                : Number(pricingFormData.perGameFee),
            currency: pricingFormData.currency,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to configure session prices.");

      const data = await response.json();
      if (!data.success) throw new Error(data?.message);

      await getPaymentDetails();
      setIsConfiguring(false);
    } catch (error) {
      console.error("Pricing submission failed:", error);
      alert(error.message || "Could not update pricing configuration.");
    } finally {
      setIsSubmittingPrice(false);
    }
  };

  // Handles marking/unmarking payments dynamically
  const updatePaidStatus = async (sessionPlayerId, shouldMarkPaid) => {
    setUpdatingPlayerId(sessionPlayerId);

    try {
      const action = shouldMarkPaid ? "paid" : "unpaid";
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/players/${sessionPlayerId}/${action}`,
        { method: "PATCH" },
      );

      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();
      if (!data.success)
        throw new Error(data?.message || "Failed to update payment status");

      const nextGameStatus =
        data?.result?.player?.gameStatus ||
        (shouldMarkPaid ? "paid" : "waiting");

      setOptimisticPaymentStatuses((currentStatuses) => ({
        ...currentStatuses,
        [sessionPlayerId]: nextGameStatus,
      }));

      await refreshSessionContext({ silent: true });
      await getSessionPlayers(page, false);

      setOptimisticPaymentStatuses((currentStatuses) => {
        const remainingStatuses = { ...currentStatuses };
        delete remainingStatuses[sessionPlayerId];
        return remainingStatuses;
      });
    } catch (error) {
      console.error("Update payment status failed:", error);
    } finally {
      setUpdatingPlayerId(null);
    }
  };

  // Sorting Handler Logic
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Processed players with optimistic statuses applied
  const processedPlayers = useMemo(() => {
    return players
      .filter((player) => !player?.isHide)
      .map((player) =>
        optimisticPaymentStatuses[player.id]
          ? { ...player, gameStatus: optimisticPaymentStatuses[player.id] }
          : player,
      );
  }, [players, optimisticPaymentStatuses]);

  // Financial Metrics Calculations
  const metrics = useMemo(() => {
    let totalValue = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    const allFees = Array.from(breakdownMap.values());
    totalValue = allFees.reduce((sum, item) => sum + (item.totalFee || 0), 0);

    allFees.forEach((item) => {
      const fee = item.totalFee || 0;
      const playerObj = players.find((p) => p.id === item.sessionPlayerId);
      const status =
        optimisticPaymentStatuses[item.sessionPlayerId] ||
        playerObj?.gameStatus ||
        item.gameStatus;
      if (status === "paid") {
        totalCollected += fee;
      } else {
        totalOutstanding += fee;
      }
    });

    return { totalValue, totalCollected, totalOutstanding };
  }, [breakdownMap, players, optimisticPaymentStatuses]);

  if (isSessionLoading && players.length === 0) {
    return (
      <div className="w-full max-w-[1024px] mx-auto flex min-h-[320px] items-center justify-center p-6">
        <div className="flex items-center gap-2 rounded-2xl border border-stone-200/80 bg-white px-5 py-4 text-xs font-bold text-stone-600 shadow-sm">
          <Loader2 className="animate-spin text-stone-900" size={16} />
          Loading payment workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1024px] mx-auto flex flex-col gap-y-5 sm:gap-y-6 my-4 sm:my-6 px-3 sm:px-0 select-none">
      {/* PRICING SETTINGS SUMMARY BANNER */}
      <div className="border border-stone-200/80 rounded-2xl p-4 sm:p-5 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-x-3.5">
          <div className="p-2.5 bg-stone-50 rounded-xl text-stone-600 border border-stone-100 hidden sm:block">
            <DollarSign size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-x-2">
              <span className="sm:hidden text-stone-500">
                <DollarSign size={16} />
              </span>
              Payment Management
            </h3>
            {pricing ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1.5 text-xs text-stone-500">
                <span className="bg-stone-50 border border-stone-100 px-2.5 py-1 rounded-lg text-stone-700">
                  Entrance:{" "}
                  <strong className="font-bold text-stone-900">
                    {pricing.entranceFee} {pricing.currency}
                  </strong>
                </span>
                <span className="text-stone-300 hidden sm:inline">•</span>
                <span className="bg-stone-50 border border-stone-100 px-2.5 py-1 rounded-lg text-stone-700">
                  Per Match:{" "}
                  <strong className="font-bold text-stone-900">
                    {pricing.perGameFee} {pricing.currency}
                  </strong>
                </span>
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic mt-1">
                No custom pricing configured yet. Global defaults applied.
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const nextIsConfiguring = !isConfiguring;
            if (nextIsConfiguring && pricing) {
              setPricingFormData({
                entranceFee: pricing.entranceFee ?? "",
                perGameFee: pricing.perGameFee ?? "",
                currency: pricing.currency || "PHP",
              });
            }
            setIsConfiguring(nextIsConfiguring);
          }}
          className={`flex items-center justify-center gap-x-1.5 px-4 py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer outline-none active:scale-[0.98] ${
            isConfiguring
              ? "border-stone-900 bg-stone-900 text-white shadow-sm"
              : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900"
          }`}
        >
          <Settings
            size={14}
            className={isConfiguring ? "animate-spin-slow" : ""}
          />
          {isConfiguring ? "Close Setup" : "Setup Pricing"}
        </button>
      </div>

      {/* EXPANDABLE PRICING FORM PANEL */}
      {isConfiguring && (
        <form
          onSubmit={handlePricingSubmit}
          className="border border-stone-200/80 rounded-2xl p-4 sm:p-5 bg-stone-50/60 flex flex-col sm:flex-row gap-3 sm:gap-4 items-end transition-all shadow-inner"
        >
          <div className="flex-1 w-full">
            <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              Entrance Fee
            </label>
            <input
              type="number"
              min="0"
              placeholder="0.00"
              value={pricingFormData.entranceFee}
              onChange={(e) =>
                setPricingFormData({
                  ...pricingFormData,
                  entranceFee: e.target.value,
                })
              }
              className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl p-2.5 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all text-stone-800 font-medium"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              Fee Per Match Played
            </label>
            <input
              type="number"
              min="0"
              placeholder="0.00"
              value={pricingFormData.perGameFee}
              onChange={(e) =>
                setPricingFormData({
                  ...pricingFormData,
                  perGameFee: e.target.value,
                })
              }
              className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl p-2.5 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all text-stone-800 font-medium"
            />
          </div>
          <div className="w-full sm:w-[120px]">
            <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-1.5">
              Currency
            </label>
            <select
              value={pricingFormData.currency}
              onChange={(e) =>
                setPricingFormData({
                  ...pricingFormData,
                  currency: e.target.value,
                })
              }
              className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-xl p-2.5 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all text-stone-800 font-semibold h-[42px] cursor-pointer"
            >
              <option value="PHP">PHP (₱)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isSubmittingPrice}
            className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 text-stone-100 hover:bg-stone-800 disabled:opacity-60 text-xs font-bold rounded-xl h-[42px] transition-colors cursor-pointer whitespace-nowrap shadow-sm outline-none active:scale-[0.98]"
          >
            {isSubmittingPrice ? "Saving..." : "Apply Pricing"}
          </button>
        </form>
      )}

      {/* FINANCIAL OVERVIEW SUMMARY TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="border border-stone-200/80 bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Total Session Fee
            </p>
            <h3 className="text-xl font-bold text-stone-900 mt-1 tracking-tight">
              {metrics.totalValue.toFixed(2)}{" "}
              <span className="text-xs font-semibold text-stone-400">
                {pricing?.currency || "PHP"}
              </span>
            </h3>
          </div>
          <div className="p-2.5 bg-stone-50 rounded-xl text-stone-500 border border-stone-100">
            <Banknote size={18} />
          </div>
        </div>

        <div className="border border-stone-200/80 bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Total Collected
            </p>
            <h3 className="text-xl font-bold text-green-700 mt-1 tracking-tight">
              {metrics.totalCollected.toFixed(2)}{" "}
              <span className="text-xs font-semibold text-green-600/60">
                {pricing?.currency || "PHP"}
              </span>
            </h3>
          </div>
          <div className="p-2.5 bg-green-50 rounded-xl text-green-700 border border-green-100/60">
            <Wallet size={18} />
          </div>
        </div>

        <div className="border border-stone-200/80 bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Remaining Balance
            </p>
            <h3
              className={`text-xl font-bold mt-1 tracking-tight ${metrics.totalOutstanding > 0 ? "text-amber-600" : "text-stone-400"}`}
            >
              {metrics.totalOutstanding.toFixed(2)}{" "}
              <span className="text-xs font-semibold text-stone-400">
                {pricing?.currency || "PHP"}
              </span>
            </h3>
          </div>
          <div
            className={`p-2.5 rounded-xl border ${metrics.totalOutstanding > 0 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-stone-50 text-stone-400 border-stone-100"}`}
          >
            <Hourglass
              size={18}
              className={metrics.totalOutstanding > 0 ? "animate-pulse" : ""}
            />
          </div>
        </div>
      </div>

      {/* LIVE SEARCH & SORT TOOLBAR */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-[340px]">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search player..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-stone-200/80 rounded-xl text-xs sm:text-sm placeholder-stone-400 text-stone-800 font-medium outline-none shadow-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Sort Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1 shrink-0">
            Sort:
          </span>
          {[
            { key: "player", label: "Player" },
            { key: "matches", label: "Matches" },
            { key: "totalDue", label: "Total Due" },
            { key: "status", label: "Status" },
          ].map((item) => {
            const isActive = sortConfig.key === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSort(item.key)}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-stone-900 text-white shadow-sm"
                    : "bg-white text-stone-600 hover:bg-stone-50 border border-stone-200/80"
                }`}
              >
                {item.label}
                {isActive &&
                  (sortConfig.direction === "asc" ? (
                    <ArrowUp size={12} />
                  ) : (
                    <ArrowDown size={12} />
                  ))}
              </button>
            );
          })}
        </div>
      </div>

      {/* CARD-BASED PLAYER LIST */}
      <div className="flex flex-col gap-3">
        {processedPlayers.map((player) => {
          const isPaid = player.gameStatus === "paid";
          const isUpdating = updatingPlayerId === player.id;

          const performanceBreakdown = breakdownMap.get(player.id);
          const totalGames = performanceBreakdown?.totalGames ?? 0;
          const totalFeeCalculated = performanceBreakdown?.totalFee ?? 0;

          return (
            <div
              key={player.id}
              className="border border-stone-200/80 rounded-2xl p-4 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-stone-300"
            >
              {/* Player Identity */}
              <div className="flex items-center gap-x-3 min-w-0">
                <PlayerAvatar
                  username={player.sessionPlayer?.communityPlayer?.username}
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-stone-900 truncate">
                    {player.sessionPlayer?.communityPlayer?.username ||
                      "Unknown"}
                  </span>
                  <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider w-fit mt-0.5">
                    {player.sessionPlayer?.role || "Guest"}
                  </span>
                </div>
              </div>

              {/* Match Stats & Financial Breakdown */}
              <div className="flex items-center justify-between sm:justify-end gap-x-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-100">
                <div className="flex flex-col sm:items-end">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    Matches
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-stone-700 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-100 mt-0.5">
                    {totalGames} {totalGames === 1 ? "game" : "games"}
                  </span>
                </div>

                <div className="flex flex-col sm:items-end">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    Total Due
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-stone-900 mt-0.5">
                    {totalFeeCalculated.toFixed(2)}{" "}
                    <span className="text-[10px] sm:text-xs font-semibold text-stone-400">
                      {pricing?.currency || "PHP"}
                    </span>
                  </span>
                </div>
              </div>

              {/* Status & Action Button */}
              <div className="flex items-center justify-between sm:justify-end gap-x-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-100">
                <span
                  className={`inline-flex items-center justify-center px-2.5 py-1 text-[11px] font-bold rounded-full min-w-[68px] border ${
                    isPaid
                      ? "text-green-700 bg-green-50 border-green-200"
                      : "text-stone-600 bg-stone-100 border-stone-200/60"
                  }`}
                >
                  {isPaid ? "Paid" : "Unpaid"}
                </span>

                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => updatePaidStatus(player.id, !isPaid)}
                  className={`inline-flex items-center justify-center gap-x-1.5 border px-3.5 py-2 rounded-xl font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-all outline-none active:scale-[0.98] ${
                    isPaid
                      ? "border-stone-200 text-stone-600 bg-white hover:bg-stone-50 hover:text-stone-900"
                      : "border-green-600 text-white bg-green-600 hover:bg-green-700 shadow-sm"
                  }`}
                >
                  {isPaid ? (
                    <RotateCcw size={13} className="opacity-80" />
                  ) : (
                    <Check size={13} strokeWidth={3} />
                  )}
                  {isPaid ? "Unmark" : "Mark paid"}
                </button>
              </div>
            </div>
          );
        })}

        {/* Fallback for completely empty sessions or unmatched queries */}
        {processedPlayers.length === 0 && !isSessionLoading && (
          <div className="border border-stone-200/80 rounded-2xl p-10 text-center text-xs sm:text-sm text-stone-400 italic bg-white shadow-sm">
            {searchQuery.trim()
              ? `No players match your search "${searchQuery}"`
              : "No players registered in this session."}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleLoadMore}
              className="px-5 py-2.5 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200/80 rounded-xl transition-colors cursor-pointer shadow-sm active:scale-[0.98]"
            >
              Load More ({totalCount - players.length} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payment;
