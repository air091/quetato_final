import React, { useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Gamepad2,
  Loader2,
  MapPin,
  Medal,
  RefreshCcw,
  Trophy,
  UsersRound,
  Wallet,
} from "lucide-react";
import PlayerAvatar from "../../../components/PlayerAvatar";
import { useSession } from "../../../hooks/useSession";

const currencySymbols = {
  PHP: "PHP",
  USD: "USD",
  EUR: "EUR",
};

const formatDateTime = (value) => {
  if (!value) return "Not scheduled";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatMoney = (amount, currency = "PHP") =>
  `${Number(amount || 0).toFixed(2)} ${currencySymbols[currency] || currency}`;

const getUsername = (player) =>
  player?.sessionPlayer?.communityPlayer?.username ||
  player?.communityPlayer?.username ||
  "Unknown player";

const getPlayerMetric = (player, key) =>
  Number(player?.stats?.[key] ?? player?.[key] ?? 0) || 0;

const StatCard = ({ label, value, detail, icon: Icon, tone = "orange" }) => {
  const toneClasses = {
    stone: "bg-stone-100 text-stone-700 border-stone-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    amber: "bg-amber-50 text-amber-700 border-amber-200/80",
    orange: "bg-orange-50 text-orange-600 border-orange-200/80",
  };

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-4.5 shadow-sm shadow-stone-200/40 transition-all duration-200 hover:shadow-md hover:border-stone-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            {label}
          </p>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">
            {value}
          </h3>
          {detail && (
            <p className="mt-1 truncate text-xs font-medium text-stone-500">
              {detail}
            </p>
          )}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
            toneClasses[tone] || toneClasses.orange
          }`}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
};

const ProgressBar = ({ value, total, tone = "bg-orange-500" }) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
      <div
        className={`h-full rounded-full transition-all duration-300 ${tone}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
};

const SessionDashboard = () => {
  const { sessionData, isSessionLoading, sessionError, refreshSessionContext } =
    useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const dashboard = sessionData.dashboard;
  const players = useMemo(
    () => (sessionData.players || []).filter((player) => !player?.isHide),
    [sessionData.players],
  );
  const matchCourts = useMemo(
    () => sessionData.matchCourts || { courts: [], counts: {} },
    [sessionData.matchCourts],
  );
  const queueCourts = useMemo(
    () => sessionData.queueCourts || { courts: [], counts: {} },
    [sessionData.queueCourts],
  );
  const pricingData = sessionData.pricingData;
  const isLoading = isSessionLoading && !dashboard;
  const errorMessage = sessionError && !dashboard ? sessionError : "";

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSessionContext({ silent: true });
    } catch (error) {
      console.error("Dashboard refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const metrics = useMemo(() => {
    const totalPlayers = players.length;
    const totalGames = players.reduce(
      (sum, player) => sum + getPlayerMetric(player, "totalGames"),
      0,
    );
    const totalWins = players.reduce(
      (sum, player) => sum + getPlayerMetric(player, "totalWins"),
      0,
    );
    const statusCounts = players.reduce(
      (counts, player) => {
        const status = player?.gameStatus || "waiting";
        counts[status] = (counts[status] || 0) + 1;
        return counts;
      },
      { waiting: 0, queued: 0, playing: 0, paid: 0 },
    );
    const roleCounts = players.reduce((counts, player) => {
      const role = player?.sessionPlayer?.role || "player";
      counts[role] = (counts[role] || 0) + 1;
      return counts;
    }, {});

    const validMatchCourts = Array.isArray(matchCourts?.courts)
      ? matchCourts.courts
      : [];
    const validQueueCourts = Array.isArray(queueCourts?.courts)
      ? queueCourts.courts
      : [];
    const allCourts = [...validMatchCourts, ...validQueueCourts];

    const occupiedSlots = allCourts.reduce(
      (sum, court) =>
        sum +
        (court?.slots || []).filter((slot) => Boolean(slot?.sessionPlayerId))
          .length,
      0,
    );
    const activeCourts = allCourts.filter(
      (court) => court?.status === "started" || court?.status === "paused",
    ).length;
    const playerFees = pricingData?.breakdown?.playerFees || [];
    const totalFee = playerFees.reduce(
      (sum, item) => sum + Number(item?.totalFee || 0),
      0,
    );
    const collected = players.reduce((sum, player) => {
      if (player?.gameStatus !== "paid") return sum;
      const fee = playerFees.find((item) => item.sessionPlayerId === player.id);
      return sum + Number(fee?.totalFee || 0);
    }, 0);

    return {
      totalPlayers,
      totalGames,
      totalWins,
      winRate: totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0,
      statusCounts,
      roleCounts,
      matchCourtCount: validMatchCourts.length,
      queueCourtCount: validQueueCourts.length,
      activeCourts,
      occupiedSlots,
      totalFee,
      collected,
      outstanding: Math.max(totalFee - collected, 0),
    };
  }, [players, matchCourts, queueCourts, pricingData]);

  const topPlayers = useMemo(() => {
    return [...players]
      .sort((a, b) => {
        const winsDiff =
          getPlayerMetric(b, "totalWins") - getPlayerMetric(a, "totalWins");
        if (winsDiff !== 0) return winsDiff;
        return (
          getPlayerMetric(b, "totalGames") - getPlayerMetric(a, "totalGames")
        );
      })
      .slice(0, 5);
  }, [players]);

  const recentPlayers = useMemo(() => {
    const source = dashboard?.players?.length ? dashboard.players : players;
    return [...source]
      .sort(
        (a, b) =>
          new Date(b?.acceptedAt || 0).getTime() -
          new Date(a?.acceptedAt || 0).getTime(),
      )
      .slice(0, 5);
  }, [dashboard, players]);

  const currency = pricingData?.pricing?.currency || "PHP";

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center p-6">
        <div className="flex items-center gap-2 rounded-2xl border border-stone-200/80 bg-white px-5 py-4 text-xs font-bold text-stone-600 shadow-sm">
          <Loader2 className="animate-spin text-orange-500" size={16} />
          Loading session dashboard...
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-[980px] rounded-2xl border border-red-200 bg-red-50 p-5 text-xs font-semibold text-red-700">
          {errorMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-5 sm:px-6 selection:bg-orange-500/10 selection:text-orange-950">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5">
        {/* HEADER */}
        <header className="rounded-2xl border border-stone-200/80 bg-white p-5.5 shadow-sm shadow-stone-200/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="truncate text-2xl font-bold tracking-tight text-stone-900">
                  {dashboard?.name || "Session Dashboard"}
                </h1>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                    dashboard?.isAvailable
                      ? "border-emerald-200/80 bg-emerald-50 text-emerald-700"
                      : "border-stone-200 bg-stone-100 text-stone-600"
                  }`}
                >
                  {dashboard?.isAvailable ? "Open" : "Closed"}
                </span>
              </div>
              <p className="mt-1.5 max-w-2xl text-xs font-medium text-stone-500">
                {dashboard?.description || "Live overview for this session."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 text-xs font-bold text-stone-700 shadow-sm transition-all duration-200 hover:bg-white hover:border-stone-300 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-orange-500/10 cursor-pointer disabled:opacity-60"
            >
              <RefreshCcw
                size={14}
                className={
                  isRefreshing
                    ? "animate-spin text-orange-500"
                    : "text-stone-500"
                }
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-stone-100 bg-stone-50/60 px-3.5 py-2.5 text-stone-600">
              <CalendarDays size={16} className="text-stone-400" />
              <span className="font-semibold text-stone-800">
                {formatDateTime(dashboard?.startAt)}
              </span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-stone-100 bg-stone-50/60 px-3.5 py-2.5 text-stone-600">
              <Clock3 size={16} className="text-stone-400" />
              <span className="font-semibold text-stone-800">
                {formatDateTime(dashboard?.endAt)}
              </span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border border-stone-100 bg-stone-50/60 px-3.5 py-2.5 text-stone-600">
              <MapPin size={16} className="text-stone-400" />
              <span className="truncate font-semibold text-stone-800">
                {dashboard?.location || "No location set"}
              </span>
            </div>
          </div>
        </header>

        {/* METRICS METRICS STATS */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Players"
            value={metrics.totalPlayers}
            detail={`${metrics.statusCounts.playing} playing, ${metrics.statusCounts.queued} queued`}
            icon={UsersRound}
            tone="orange"
          />
          <StatCard
            label="Player Games"
            value={metrics.totalGames}
            detail={`${metrics.totalWins} wins logged`}
            icon={Gamepad2}
            tone="stone"
          />
          <StatCard
            label="Win Rate"
            value={metrics.totalPlayers > 0 ? `${metrics.winRate}%` : "0%"}
            detail="Across all player results"
            icon={Trophy}
            tone="amber"
          />
          <StatCard
            label="Collected"
            value={formatMoney(metrics.collected, currency)}
            detail={`${formatMoney(metrics.outstanding, currency)} outstanding`}
            icon={Wallet}
            tone="green"
          />
        </section>

        {/* SESSION FLOW & PAYMENT SNAPSHOT */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm shadow-stone-200/40">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-stone-900">
                  Session Flow
                </h2>
                <p className="text-xs font-medium text-stone-500">
                  Current roster status and court usage
                </p>
              </div>
              <span className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-bold text-stone-600">
                {metrics.matchCourtCount + metrics.queueCourtCount} courts
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                {
                  label: "Waiting",
                  value: metrics.statusCounts.waiting,
                  tone: "bg-stone-800",
                },
                {
                  label: "Queued",
                  value: metrics.statusCounts.queued,
                  tone: "bg-orange-500",
                },
                {
                  label: "Playing",
                  value: metrics.statusCounts.playing,
                  tone: "bg-amber-500",
                },
                {
                  label: "Paid",
                  value: metrics.statusCounts.paid,
                  tone: "bg-emerald-600",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-stone-100 bg-stone-50/60 p-3"
                >
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-700">
                      {item.label}
                    </span>
                    <span className="font-bold text-stone-900">
                      {item.value}
                    </span>
                  </div>
                  <ProgressBar
                    value={item.value}
                    total={Math.max(metrics.totalPlayers, 1)}
                    tone={item.tone}
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-stone-100 bg-stone-50/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Match Courts
                </p>
                <p className="mt-1 text-lg font-bold text-stone-900">
                  {metrics.matchCourtCount}
                </p>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Queue Courts
                </p>
                <p className="mt-1 text-lg font-bold text-stone-900">
                  {metrics.queueCourtCount}
                </p>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Occupied Slots
                </p>
                <p className="mt-1 text-lg font-bold text-stone-900">
                  {metrics.occupiedSlots}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm shadow-stone-200/40">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-stone-900">
                  Payment Snapshot
                </h2>
                <p className="text-xs font-medium text-stone-500">
                  Session fees and collection
                </p>
              </div>
              <CircleDollarSign size={18} className="text-stone-400" />
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-700">Collected</span>
                  <span className="font-bold text-stone-900">
                    {formatMoney(metrics.collected, currency)}
                  </span>
                </div>
                <ProgressBar
                  value={metrics.collected}
                  total={Math.max(metrics.totalFee, 1)}
                  tone="bg-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-stone-100 bg-stone-50/60 p-3">
                  <Banknote size={16} className="mb-2 text-stone-400" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Total Due
                  </p>
                  <p className="mt-1 text-xs font-bold text-stone-900">
                    {formatMoney(metrics.totalFee, currency)}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 p-3">
                  <Wallet size={16} className="mb-2 text-amber-600" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Remaining
                  </p>
                  <p className="mt-1 text-xs font-bold text-amber-800">
                    {formatMoney(metrics.outstanding, currency)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TOP PLAYERS & ROSTER OVERVIEW */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {/* TOP PLAYERS */}
          <div className="rounded-2xl border border-stone-200/80 bg-white shadow-sm shadow-stone-200/40">
            <div className="border-b border-stone-100 p-4">
              <h2 className="text-sm font-bold text-stone-900">Top Players</h2>
              <p className="text-xs font-medium text-stone-500">
                Sorted by wins, then total games
              </p>
            </div>
            <div className="divide-y divide-stone-100">
              {topPlayers.length === 0 ? (
                <p className="p-6 text-center text-xs font-medium italic text-stone-400">
                  No player stats yet.
                </p>
              ) : (
                topPlayers.map((player, index) => {
                  const games = getPlayerMetric(player, "totalGames");
                  const wins = getPlayerMetric(player, "totalWins");
                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-stone-50/50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[11px] font-bold text-stone-600">
                          {index + 1}
                        </div>
                        <PlayerAvatar
                          username={getUsername(player)}
                          size="md"
                        />

                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-xs text-stone-900 truncate">
                            {getUsername(player)}
                          </span>
                          <div className="flex items-center gap-x-1.5 mt-0.5">
                            <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider">
                              {player?.sessionPlayer?.role || "Player"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="rounded-lg bg-amber-50 border border-amber-200/60 px-2 py-0.5 font-bold text-amber-700">
                          {wins}W
                        </span>
                        <span className="rounded-lg bg-stone-100 px-2 py-0.5 font-bold text-stone-600">
                          {games}G
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ROSTER OVERVIEW */}
          <div className="rounded-2xl border border-stone-200/80 bg-white shadow-sm shadow-stone-200/40">
            <div className="border-b border-stone-100 p-4">
              <h2 className="text-sm font-bold text-stone-900">
                Roster Overview
              </h2>
              <p className="text-xs font-medium text-stone-500">
                Roles and latest accepted players
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4">
              {Object.entries(metrics.roleCounts).map(([role, count]) => (
                <div
                  key={role}
                  className="rounded-xl border border-stone-100 bg-stone-50/60 p-3"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    {role}
                  </p>
                  <p className="mt-1 text-lg font-bold text-stone-900">
                    {count}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-100 divide-y divide-stone-100">
              {recentPlayers.length === 0 ? (
                <p className="p-6 text-center text-xs font-medium italic text-stone-400">
                  No accepted players yet.
                </p>
              ) : (
                recentPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-stone-50/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <PlayerAvatar username={getUsername(player)} size="sm" />

                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-stone-900 truncate">
                          {getUsername(player)}
                        </span>
                        <div className="flex items-center gap-x-1.5 mt-0.5">
                          <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider">
                            {player?.sessionPlayer?.role || "Player"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Medal size={16} className="shrink-0 text-stone-300" />
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SessionDashboard;
