import {
  Banknote,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Gamepad2,
  MapPin,
  Medal,
  RefreshCcw,
  Trophy,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PlayerAvatar from "../../../components/PlayerAvatar";
import { useAuth } from "../../../hooks/useAuth";
import { API_URL } from "../../../contexts/AuthContext";

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

// Optimized layout extractor with strict array fallback guardrails
const extractCourts = (payload) => {
  if (!payload) return { courts: [], counts: {} };
  if (Array.isArray(payload)) return { courts: payload, counts: {} };

  const courtPayload = payload?.courts ?? payload?.data ?? payload;
  const rawCourts = Array.isArray(courtPayload)
    ? courtPayload
    : (courtPayload?.courts ?? courtPayload?.results ?? payload?.results ?? []);
  const rawCounts =
    courtPayload?.counts ?? payload?.counts ?? payload?.data?.counts ?? {};

  return {
    courts: Array.isArray(rawCourts) ? rawCourts : [],
    counts: rawCounts && typeof rawCounts === "object" ? rawCounts : {},
  };
};

const StatCard = ({ label, value, detail, icon: Icon, tone = "stone" }) => {
  const toneClasses = {
    stone: "bg-stone-50 text-stone-600 border-stone-100",
    green: "bg-green-50 text-green-700 border-green-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
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
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
            toneClasses[tone] || toneClasses.stone
          }`}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
};

const ProgressBar = ({ value, total, tone = "bg-stone-900" }) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
      <div
        className={`h-full rounded-full ${tone}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
};

const SessionDashboard = () => {
  const { communityId, sessionId } = useParams();
  const { fetchWithAuth } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [players, setPlayers] = useState([]);
  const [matchCourts, setMatchCourts] = useState({ courts: [], counts: {} });
  const [queueCourts, setQueueCourts] = useState({ courts: [], counts: {} });
  const [pricingData, setPricingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!communityId || !sessionId) return null;

    const baseUrl = `${API_URL}/api/communities/${communityId}/sessions/${sessionId}`;
    const [dashboardRes, playersRes, matchRes, queueRes, pricingRes] =
      await Promise.all([
        fetchWithAuth(`${baseUrl}/dashboard`, { method: "GET" }),
        fetchWithAuth(`${baseUrl}/players`, { method: "GET" }),
        fetchWithAuth(`${baseUrl}/courts?type=match`, { method: "GET" }),
        fetchWithAuth(`${baseUrl}/courts?type=queue`, { method: "GET" }),
        fetchWithAuth(`${baseUrl}/pricing`, {
          method: "POST",
          body: JSON.stringify({}),
        }),
      ]);

    if (!dashboardRes.ok || !playersRes.ok || !matchRes.ok || !queueRes.ok) {
      throw new Error("One or more session dashboard resources failed to load");
    }

    const [dashboardJson, playersJson, matchJson, queueJson, pricingJson] =
      await Promise.all([
        dashboardRes.json(),
        playersRes.json(),
        matchRes.json(),
        queueRes.json(),
        pricingRes.ok ? pricingRes.json() : Promise.resolve(null),
      ]);

    if (!dashboardJson?.success) {
      throw new Error(dashboardJson?.message || "Failed to load dashboard");
    }

    return {
      dashboard: dashboardJson.dashboard,
      players: (playersJson?.players || []).filter((player) => !player?.isHide),
      matchCourts: extractCourts(matchJson),
      queueCourts: extractCourts(queueJson),
      pricingData:
        pricingJson?.result?.result || pricingJson?.result || pricingJson,
    };
  }, [communityId, sessionId, fetchWithAuth]);

  useEffect(() => {
    let isCurrent = true;

    loadDashboard()
      .then((nextData) => {
        if (!isCurrent || !nextData) return;
        setErrorMessage("");
        setDashboard(nextData.dashboard);
        setPlayers(nextData.players.filter((player) => !player?.isHide));
        setMatchCourts(nextData.matchCourts);
        setQueueCourts(nextData.queueCourts);
        setPricingData(nextData.pricingData);
      })
      .catch((error) => {
        if (isCurrent) {
          setErrorMessage(error.message || "Dashboard failed to load");
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [loadDashboard]);

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

    // Guard against undefined elements inside our arrays using safe fallbacks
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
        <div className="rounded-xl border border-stone-200 bg-white px-5 py-4 text-sm font-medium text-stone-500 shadow-sm">
          Loading session dashboard...
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-[980px] rounded-xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5">
        <header className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold tracking-tight text-stone-900">
                  {dashboard?.name || "Session Dashboard"}
                </h1>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                    dashboard?.isAvailable
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-stone-200 bg-stone-100 text-stone-600"
                  }`}
                >
                  {dashboard?.isAvailable ? "Open" : "Closed"}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm font-medium text-stone-500">
                {dashboard?.description || "Live overview for this session."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                loadDashboard()
                  .then((nextData) => {
                    if (!nextData) return;
                    setDashboard(nextData.dashboard);
                    setPlayers(
                      nextData.players.filter((player) => !player?.isHide),
                    );
                    setMatchCourts(nextData.matchCourts);
                    setQueueCourts(nextData.queueCourts);
                    setPricingData(nextData.pricingData);
                    setErrorMessage("");
                  })
                  .catch((error) =>
                    setErrorMessage(
                      error.message || "Dashboard failed to refresh",
                    ),
                  )
                  .finally(() => setIsLoading(false));
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-xs font-bold text-stone-600 shadow-sm transition-colors hover:bg-stone-50 hover:text-stone-900 cursor-pointer"
            >
              <RefreshCcw size={14} />
              Refresh
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-stone-600">
              <CalendarDays size={16} />
              <span className="font-medium">
                {formatDateTime(dashboard?.startAt)}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-stone-600">
              <Clock3 size={16} />
              <span className="font-medium">
                {formatDateTime(dashboard?.endAt)}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-stone-600">
              <MapPin size={16} />
              <span className="truncate font-medium">
                {dashboard?.location || "No location set"}
              </span>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Players"
            value={metrics.totalPlayers}
            detail={`${metrics.statusCounts.playing} playing, ${metrics.statusCounts.queued} queued`}
            icon={UsersRound}
            tone="blue"
          />
          <StatCard
            label="Player Games"
            value={metrics.totalGames}
            detail={`${metrics.totalWins} wins logged`}
            icon={Gamepad2}
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

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  Session Flow
                </h2>
                <p className="text-xs font-medium text-stone-500">
                  Current roster status and court usage
                </p>
              </div>
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600">
                {metrics.matchCourtCount + metrics.queueCourtCount} courts
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                {
                  label: "Waiting",
                  value: metrics.statusCounts.waiting,
                  tone: "bg-stone-900",
                },
                {
                  label: "Queued",
                  value: metrics.statusCounts.queued,
                  tone: "bg-blue-600",
                },
                {
                  label: "Playing",
                  value: metrics.statusCounts.playing,
                  tone: "bg-amber-500",
                },
                {
                  label: "Paid",
                  value: metrics.statusCounts.paid,
                  tone: "bg-green-600",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-stone-100 bg-stone-50/60 p-3"
                >
                  <div className="mb-2 flex items-center justify-between text-sm">
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
                  />{" "}
                  {/* <-- The missing closing bracket tag is now restored here */}
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-stone-100 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Match Courts
                </p>
                <p className="mt-1 text-xl font-bold text-stone-900">
                  {metrics.matchCourtCount}
                </p>
              </div>
              <div className="rounded-lg border border-stone-100 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Queue Courts
                </p>
                <p className="mt-1 text-xl font-bold text-stone-900">
                  {metrics.queueCourtCount}
                </p>
              </div>
              <div className="rounded-lg border border-stone-100 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Occupied Slots
                </p>
                <p className="mt-1 text-xl font-bold text-stone-900">
                  {metrics.occupiedSlots}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-stone-900">
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
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-bold text-stone-700">Collected</span>
                  <span className="font-bold text-stone-900">
                    {formatMoney(metrics.collected, currency)}
                  </span>
                </div>
                <ProgressBar
                  value={metrics.collected}
                  total={Math.max(metrics.totalFee, 1)}
                  tone="bg-green-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-stone-50 p-3">
                  <Banknote size={16} className="mb-2 text-stone-500" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    Total Due
                  </p>
                  <p className="mt-1 text-sm font-bold text-stone-900">
                    {formatMoney(metrics.totalFee, currency)}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <Wallet size={16} className="mb-2 text-amber-700" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                    Remaining
                  </p>
                  <p className="mt-1 text-sm font-bold text-amber-700">
                    {formatMoney(metrics.outstanding, currency)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {/* TOP PLAYERS SECTION */}
          <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 p-4">
              <h2 className="text-base font-bold text-stone-900">
                Top Players
              </h2>
              <p className="text-xs font-medium text-stone-500">
                Sorted by wins, then total games
              </p>
            </div>
            <div className="divide-y divide-stone-100">
              {topPlayers.length === 0 ? (
                <p className="p-6 text-center text-sm font-medium italic text-stone-400">
                  No player stats yet.
                </p>
              ) : (
                topPlayers.map((player, index) => {
                  const games = getPlayerMetric(player, "totalGames");
                  const wins = getPlayerMetric(player, "totalWins");
                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between gap-3 p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-bold text-stone-600">
                          {index + 1}
                        </div>
                        <PlayerAvatar
                          username={getUsername(player)}
                          size="md"
                        />

                        {/* ENHANCED UX FOR TOP PLAYERS TEXT */}
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-sm text-stone-900 truncate">
                            {getUsername(player)}
                          </span>
                          <div className="flex items-center gap-x-1.5 mt-0.5">
                            <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider">
                              {player?.sessionPlayer?.role || "Player"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <span className="rounded-md bg-amber-50 px-2 py-1 font-bold text-amber-700">
                          {wins}W
                        </span>
                        <span className="rounded-md bg-stone-50 px-2 py-1 font-bold text-stone-600">
                          {games}G
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ROSTER OVERVIEW SECTION */}
          <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 p-4">
              <h2 className="text-base font-bold text-stone-900">
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
                  className="rounded-lg border border-stone-100 bg-stone-50/60 p-3"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    {role}
                  </p>
                  <p className="mt-1 text-xl font-bold text-stone-900">
                    {count}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-100">
              {recentPlayers.length === 0 ? (
                <p className="p-6 text-center text-sm font-medium italic text-stone-400">
                  No accepted players yet.
                </p>
              ) : (
                recentPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <PlayerAvatar username={getUsername(player)} size="sm" />

                      {/* ENHANCED UX FOR ROSTER OVERVIEW TEXT */}
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-sm text-stone-900 truncate">
                          {getUsername(player)}
                        </span>
                        <div className="flex items-center gap-x-1.5 mt-0.5">
                          <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider">
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
