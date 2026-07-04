import {
  Check,
  RotateCcw,
  DollarSign,
  Settings,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Banknote,
  Wallet,
  Hourglass,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

const Payment = () => {
  const { communityId, sessionId } = useParams();
  const { fetchWithAuth } = useAuth();
  const [players, setPlayers] = useState([]);
  const [updatingPlayerId, setUpdatingPlayerId] = useState(null);

  // Pricing Configuration States
  const [pricing, setPricing] = useState(null);
  const [breakdownMap, setBreakdownMap] = useState(new Map());
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [pricingFormData, setPricingFormData] = useState({
    entranceFee: "",
    perGameFee: "",
    currency: "PHP",
  });
  const [isSubmittingPrice, setIsSubmittingPrice] = useState(false);

  // NEW: Search & Sorting States
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Combined fetcher to grab both player listing & pricing matrix calculations
  const getPaymentDetails = useCallback(async () => {
    if (!communityId || !sessionId) return;

    try {
      const playerResponse = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/players`,
        { method: "GET" },
      );

      if (!playerResponse.ok) throw new Error("Failed to fetch players");

      const playerData = await playerResponse.json();
      if (!playerData.success) throw new Error(playerData?.message);

      const pricingResponse = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/pricing`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      if (pricingResponse.ok) {
        const pricingData = await pricingResponse.json();
        if (pricingData.success && pricingData.result) {
          const res = pricingData.result.result || pricingData.result;
          setPricing(res.pricing);

          if (res.pricing) {
            setPricingFormData({
              entranceFee: res.pricing.entranceFee ?? "",
              perGameFee: res.pricing.perGameFee ?? "",
              currency: res.pricing.currency || "PHP",
            });
          }

          if (res.breakdown?.playerFees) {
            const feesMap = new Map(
              res.breakdown.playerFees.map((item) => [
                item.sessionPlayerId,
                item,
              ]),
            );
            setBreakdownMap(feesMap);
          }
        }
      }

      setPlayers(playerData.players ?? []);
    } catch (error) {
      console.error("Fetch payment workspace details failed:", error);
    }
  }, [communityId, sessionId, fetchWithAuth]);

  useEffect(() => {
    getPaymentDetails();
  }, [getPaymentDetails]);

  // Handle Base Pricing Submission
  const handlePricingSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingPrice(true);

    try {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/pricing`,
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
        `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/players/${sessionPlayerId}/${action}`,
        { method: "PATCH" },
      );

      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();
      if (!data.success)
        throw new Error(data?.message || "Failed to update payment status");

      setPlayers((currentPlayers) =>
        currentPlayers.map((player) =>
          player.id === sessionPlayerId
            ? { ...player, gameStatus: shouldMarkPaid ? "paid" : "waiting" }
            : player,
        ),
      );
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

  // NEW: Filter & Sort Computation Pipeline
  const processedPlayers = useMemo(() => {
    // 1. Filter by search query first
    let result = players.filter((player) => {
      const username =
        player.sessionPlayer?.communityPlayer?.username || "Unknown";
      return username.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // 2. Apply sorting configurations
    if (sortConfig.key !== null) {
      result.sort((a, b) => {
        let valueA, valueB;

        switch (sortConfig.key) {
          case "player":
            valueA = (
              a.sessionPlayer?.communityPlayer?.username || ""
            ).toLowerCase();
            valueB = (
              b.sessionPlayer?.communityPlayer?.username || ""
            ).toLowerCase();
            break;
          case "matches":
            valueA = breakdownMap.get(a.id)?.totalGames ?? 0;
            valueB = breakdownMap.get(b.id)?.totalGames ?? 0;
            break;
          case "totalDue":
            valueA = breakdownMap.get(a.id)?.totalFee ?? 0;
            valueB = breakdownMap.get(b.id)?.totalFee ?? 0;
            break;
          case "status":
            valueA = a.gameStatus === "paid" ? 1 : 0;
            valueB = b.gameStatus === "paid" ? 1 : 0;
            break;
          default:
            return 0;
        }

        if (valueA < valueB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valueA > valueB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [players, searchQuery, sortConfig, breakdownMap]);

  // Financial Metrics Calculations (always reflects the un-filtered pool for strict macro accuracy)
  const metrics = useMemo(() => {
    let totalValue = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    players.forEach((player) => {
      const fee = breakdownMap.get(player.id)?.totalFee ?? 0;
      totalValue += fee;
      if (player.gameStatus === "paid") {
        totalCollected += fee;
      } else {
        totalOutstanding += fee;
      }
    });

    return { totalValue, totalCollected, totalOutstanding };
  }, [players, breakdownMap]);

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return (
        <ArrowUpDown
          size={13}
          className="text-stone-300 group-hover:text-stone-400 transition-colors ml-1.5 flex-shrink-0"
        />
      );
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUp
        size={13}
        className="text-stone-900 ml-1.5 flex-shrink-0 font-bold"
      />
    ) : (
      <ArrowDown
        size={13}
        className="text-stone-900 ml-1.5 flex-shrink-0 font-bold"
      />
    );
  };

  return (
    <div className="w-full max-w-[760px] mx-auto flex flex-col gap-y-6 mt-6 px-4 sm:px-0">
      {/* PRICING SETTINGS SUMMARY BANNER */}
      <div className="border border-stone-200 rounded-xl p-5 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-x-3.5">
          <div className="p-2.5 bg-stone-50 rounded-lg text-stone-600 border border-stone-100 hidden sm:block">
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
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-stone-500">
                <span className="bg-stone-50 border border-stone-100 px-2 py-0.5 rounded text-stone-700">
                  Entrance:{" "}
                  <strong className="font-bold text-stone-900">
                    {pricing.entranceFee} {pricing.currency}
                  </strong>
                </span>
                <span className="text-stone-300 hidden sm:inline">•</span>
                <span className="bg-stone-50 border border-stone-100 px-2 py-0.5 rounded text-stone-700">
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
          onClick={() => setIsConfiguring(!isConfiguring)}
          className={`flex items-center justify-center gap-x-1.5 px-3.5 py-2 border rounded-lg text-xs font-bold transition-all cursor-pointer outline-none ${
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
          className="border border-stone-200 rounded-xl p-5 bg-stone-50/60 flex flex-col sm:flex-row gap-4 items-end transition-all shadow-inner"
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
              className="w-full text-sm bg-white border border-stone-200 rounded-lg p-2.5 outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all text-stone-800 font-medium"
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
              className="w-full text-sm bg-white border border-stone-200 rounded-lg p-2.5 outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all text-stone-800 font-medium"
            />
          </div>
          <div className="w-full sm:w-[110px]">
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
              className="w-full text-sm bg-white border border-stone-200 rounded-lg p-2.5 outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all text-stone-800 font-semibold h-[42px] cursor-pointer"
            >
              <option value="PHP">PHP (₱)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isSubmittingPrice}
            className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 text-stone-100 hover:bg-stone-800 disabled:opacity-60 text-xs font-bold rounded-lg h-[42px] transition-colors cursor-pointer whitespace-nowrap shadow-sm outline-none"
          >
            {isSubmittingPrice ? "Saving..." : "Apply Pricing"}
          </button>
        </form>
      )}

      {/* FINANCIAL OVERVIEW SUMMARY TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-stone-200 bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
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
          <div className="p-2.5 bg-stone-50 rounded-lg text-stone-500 border border-stone-100">
            <Banknote size={18} />
          </div>
        </div>

        <div className="border border-stone-200 bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
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
          <div className="p-2.5 bg-green-50 rounded-lg text-green-700 border border-green-100/60">
            <Wallet size={18} />
          </div>
        </div>

        <div className="border border-stone-200 bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
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
            className={`p-2.5 rounded-lg border ${metrics.totalOutstanding > 0 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-stone-50 text-stone-400 border-stone-100"}`}
          >
            <Hourglass
              size={18}
              className={metrics.totalOutstanding > 0 ? "animate-pulse" : ""}
            />
          </div>
        </div>
      </div>

      {/* NEW: LIVE PLAYER SEARCH FIELD */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
          <Search size={16} />
        </div>
        <input
          type="text"
          placeholder="Search player by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 bg-white border border-stone-200 rounded-xl text-sm placeholder-stone-400 text-stone-800 font-medium outline-none shadow-sm focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* CORE PAYMENT SETTLEMENT TABLE */}
      <div className="border border-stone-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-[11px] uppercase tracking-wider text-stone-500 select-none">
                <th
                  onClick={() => handleSort("player")}
                  title="Click to sort by Player"
                  className="py-3 px-4 font-bold text-left cursor-pointer group hover:bg-stone-100/80 hover:text-stone-900 transition-all duration-150"
                >
                  <div className="flex items-center gap-x-0.5">
                    Player {getSortIcon("player")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("matches")}
                  title="Click to sort by Matches"
                  className="py-3 px-4 font-bold text-center w-[125px] cursor-pointer group hover:bg-stone-100/80 hover:text-stone-900 transition-all duration-150"
                >
                  <div className="flex items-center justify-center gap-x-0.5">
                    Matches {getSortIcon("matches")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("totalDue")}
                  title="Click to sort by Total Due"
                  className="py-3 px-4 font-bold text-right w-[135px] cursor-pointer group hover:bg-stone-100/80 hover:text-stone-900 transition-all duration-150"
                >
                  <div className="flex items-center justify-end gap-x-0.5">
                    Total Due {getSortIcon("totalDue")}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("status")}
                  title="Click to sort by Payment Status"
                  className="py-3 px-4 font-bold text-center w-[125px] cursor-pointer group hover:bg-stone-100/80 hover:text-stone-900 transition-all duration-150"
                >
                  <div className="flex items-center justify-center gap-x-0.5">
                    Status {getSortIcon("status")}
                  </div>
                </th>
                <th className="py-3 px-4 font-bold text-right w-[140px] text-stone-400">
                  Payment
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {processedPlayers.map((player) => {
                const isPaid = player.gameStatus === "paid";
                const isUpdating = updatingPlayerId === player.id;

                const performanceBreakdown = breakdownMap.get(player.id);
                const totalGames = performanceBreakdown?.totalGames ?? 0;
                const totalFeeCalculated = performanceBreakdown?.totalFee ?? 0;

                return (
                  <tr
                    key={player.id}
                    className="hover:bg-stone-50/40 transition-colors duration-150 group"
                  >
                    <td className="py-3.5 px-4 text-sm font-semibold text-stone-900">
                      {player.sessionPlayer?.communityPlayer?.username ||
                        "Unknown"}
                    </td>
                    <td className="py-3.5 px-4 text-sm text-stone-600 text-center font-medium">
                      <span className="bg-stone-50 px-2 py-1 rounded text-stone-700 border border-stone-100 group-hover:bg-white transition-colors">
                        {totalGames} {totalGames === 1 ? "game" : "games"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-sm text-right font-bold text-stone-900 tracking-tight">
                      {totalFeeCalculated.toFixed(2)}{" "}
                      <span className="text-xs font-semibold text-stone-400">
                        {pricing?.currency || "PHP"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-sm text-center">
                      <span
                        className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold rounded-full min-w-[68px] border ${
                          isPaid
                            ? "text-green-700 bg-green-50 border-green-200"
                            : "text-stone-600 bg-stone-100 border-stone-200/60"
                        }`}
                      >
                        {isPaid ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-sm text-right">
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => updatePaidStatus(player.id, !isPaid)}
                        className={`inline-flex items-center justify-center gap-x-1.5 border px-3 py-1.5 rounded-lg font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-all outline-none ${
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
                    </td>
                  </tr>
                );
              })}

              {/* Fallback for completely empty sessions */}
              {players.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center text-sm text-stone-400 italic bg-stone-50/20"
                  >
                    No players registered in this session.
                  </td>
                </tr>
              )}

              {/* NEW: Fallback for unmatched query results */}
              {players.length > 0 && processedPlayers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center text-sm text-stone-400 italic bg-stone-50/10"
                  >
                    No players match your search "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Payment;
