import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  CornerDownLeft,
  EllipsisVertical,
  Gamepad2,
  Plus,
  Pause,
  Play,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import CourtSettings from "./CourtSettings";
import PlayerSettings from "./PlayerSettings";
import { PlayerTimer } from "./PlayersContainer";
import PlayerAvatar from "../../PlayerAvatar";
import { useAuth } from "../../../hooks/useAuth";
import { API_URL } from "../../../contexts/AuthContext";

const DraggableSlotPlayer = ({
  username,
  timer,
  onRemovePlayer,
  isDragging,
  attributes,
  listeners,
  setNodeRef,
  transform,
  player,
  onRefreshData,
  totalGames,
  isOverdue,
  canRemovePlayer = true,
}) => {
  const [isPlayerSettingsOpen, setIsPlayerSettingsOpen] = useState(false);
  const playerButtonRef = useRef(null);

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 9999 : isPlayerSettingsOpen ? 40 : 20,
    width: "100%",
    height: "100%",
    opacity: isDragging ? 0.4 : 1,
  };

  const statusBgClasses = {
    waiting: "bg-white border-gray-500 text-gray-800",
    queued: "bg-amber-200 border-amber-500 text-amber-900",
    playing: "bg-emerald-200 border-emerald-500 text-emerald-950",
    paid: "bg-rose-200 border-rose-500 text-rose-950",
  };

  const currentStatus = player?.gameStatus || "waiting";
  const bgTheme = statusBgClasses[currentStatus] || statusBgClasses.waiting;

  const overdueStyle =
    isOverdue && !isDragging
      ? {
          animation: "borderPulse 1.5s infinite ease-in-out",
          borderWidth: "1.5px",
        }
      : {};

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...overdueStyle }}
      {...listeners}
      {...attributes}
      className={`player w-full cursor-grab active:cursor-grabbing touch-pan-y flex items-center justify-between p-1 rounded-md border text-sm font-medium select-none text-gray-800 shadow-xs h-full ${bgTheme} ${
        isDragging ? "border-blue-500 shadow-md" : ""
      }`}
    >
      {isOverdue && !isDragging && (
        <style>{`
          @keyframes borderPulse {
            0% { border-color: rgba(239, 68, 68, 1); box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.4); }
            50% { border-color: rgba(220, 38, 38, 0.2); box-shadow: 0 0 0 1px rgba(220, 38, 38, 0); }
            100% { border-color: rgba(239, 68, 68, 1); box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.4); }
          }
        `}</style>
      )}

      <div className="flex items-center gap-x-1">
        <PlayerAvatar
          username={username}
          customImageUrl={player?.avatarUrl || player?.sessionPlayer?.avatarUrl}
          size="sm"
        />
        <div>
          <span className="truncate text-black font-semibold max-[1320px]:max-w-[46px] max-w-[90px] block max-[1320px]:text-[10px] text-[12px]">
            {username}
          </span>
          <div className="flex items-center gap-x-1">
            <span title="Games" className="flex items-center gap-x-1">
              <Gamepad2 size={12} />{" "}
              <span className="text-[10px]">{totalGames}</span>
            </span>
            <span
              title="Skill Level"
              className="text-[9px] bg-white px-0.5 rounded-full"
            >
              {player?.sessionPlayer?.communityPlayer?.skillLevel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-x-1 relative">
        {timer}
        {canRemovePlayer && (
          <button
            title={`Remove ${username} from slot`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemovePlayer();
            }}
            className="text-gray-400 p-0.5 cursor-pointer hover:bg-gray-200 rounded-full z-30"
          >
            <CornerDownLeft size={14} />
          </button>
        )}
        <button
          title="Settings"
          ref={playerButtonRef}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setIsPlayerSettingsOpen((prev) => !prev);
          }}
          className="text-gray-400 p-0.5 cursor-pointer hover:bg-gray-200 rounded-full"
        >
          <EllipsisVertical size={14} />
        </button>

        {isPlayerSettingsOpen && (
          <PlayerSettings
            player={player}
            toggleButtonRef={playerButtonRef}
            onClose={() => setIsPlayerSettingsOpen(false)}
            onUpdatePlayerStatus={onRefreshData}
          />
        )}
      </div>
    </div>
  );
};

const CourtSlot = ({
  position,
  username,
  slotData,
  matchedPoolPlayer,
  courtId,
  courtType,
  onRemovePlayer,
  onRefreshData,
  communityId,
  sessionId,
  isCourtPaused, // 🌟 Received context parameter
  courtStatus,
  slotLabel,
}) => {
  const { fetchWithAuth } = useAuth();
  const [totalGames, setTotalGames] = useState(
    Number(matchedPoolPlayer?.totalGames) || 0,
  );
  const [isOverdue, setIsOverdue] = useState(false);

  // 🌟 Disable droppable capture if the court is active and NOT explicitly paused
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${courtId}-${position}`,
    data: {
      courtId,
      courtType,
      position,
      courtStatus,
    },
    disabled: !isCourtPaused && !slotData?.sessionPlayerId,
  });

  const stablePlayerId =
    matchedPoolPlayer?.id ||
    matchedPoolPlayer?.sessionPlayer?.id ||
    slotData?.sessionPlayerId;
  const displayedTotalGames = Math.max(
    totalGames,
    Number(matchedPoolPlayer?.totalGames) || 0,
  );

  const timestamp =
    matchedPoolPlayer?.updateStatus || matchedPoolPlayer?.updatedAt;
  useEffect(() => {
    const checkOverdueStatus = () => {
      if (!timestamp) {
        setIsOverdue(false);
        return;
      }
      const startTime = new Date(timestamp).getTime();
      const elapsedMinutes = (Date.now() - startTime) / 1000 / 60;
      setIsOverdue(elapsedMinutes >= 20);
    };

    checkOverdueStatus();
    const intervalId = setInterval(checkOverdueStatus, 1000);
    return () => clearInterval(intervalId);
  }, [timestamp]);

  useEffect(() => {
    const fetchPlayerGamesCount = async () => {
      if (!communityId || !sessionId || !stablePlayerId) return;
      try {
        const response = await fetchWithAuth(
          `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/players/${stablePlayerId}/history`,
        );
        if (response.ok) {
          const resJson = await response.json();
          if (resJson.success && resJson.results?.summary) {
            setTotalGames(resJson.results.summary.totalGames || 0);
          }
        }
      } catch (error) {
        console.error(
          "Error fetching match history summary total counter:",
          error,
        );
      }
    };

    fetchPlayerGamesCount();
  }, [
    communityId,
    sessionId,
    stablePlayerId,
    fetchWithAuth,
    matchedPoolPlayer?.gameStatus,
    matchedPoolPlayer?.updatedAt,
    matchedPoolPlayer?.updateStatus,
  ]);

  const handleRemoveClick = () => {
    if (onRemovePlayer && slotData) {
      const targetIdentifier =
        slotData.id || slotData.sessionPlayerId || `opt-${position}`;
      onRemovePlayer(courtId, targetIdentifier);
    }
  };

  // Live-match players may be queued for their next match. Drop-target rules
  // in Game.jsx still prevent a playing player from being moved to a Match Court.
  const draggableProps = useDraggable({
    id: `draggable-${matchedPoolPlayer?.sessionPlayer?.id || matchedPoolPlayer?.id || stablePlayerId}`,
    data: {
      player: {
        ...matchedPoolPlayer,
        totalGames: displayedTotalGames,
        sourceCourtId: courtId,
        sourceCourtStatus: courtStatus,
        sourceSlotId: slotData?.id,
      },
    },
    disabled: matchedPoolPlayer?.gameStatus === "paid",
  });

  const hasPlayer = slotData && matchedPoolPlayer && username;
  const canRemovePlayer = courtStatus !== "started";

  const LiveTimerNode = hasPlayer ? (
    <PlayerTimer timestamp={timestamp} />
  ) : null;

  const statusBgClasses = {
    waiting: "bg-stone-100 border-gray-500 text-gray-800",
    queued: "bg-amber-100 border-amber-500 text-amber-900",
    playing: "bg-emerald-100 border-emerald-500 text-emerald-950",
    paid: "bg-rose-100 border-rose-500 text-rose-950",
  };

  const currentStatus = matchedPoolPlayer?.gameStatus || "waiting";
  const bgTheme = statusBgClasses[currentStatus] || statusBgClasses.waiting;

  const overduePlaceholderStyle = isOverdue
    ? {
        animation: "borderPulse 1.5s infinite ease-in-out",
        borderWidth: "1.5px",
      }
    : {};

  return (
    <div
      ref={setNodeRef}
      className={`border-2 border-dashed rounded h-[49px] flex items-center justify-center transition-all p-1 overflow-hidden relative ${
        isOver
          ? "border-green-400 bg-green-500/20 scale-[1.02]"
          : "border-white/30 bg-transparent"
      }`}
    >
      <span className="absolute text-[10px] text-white/40 tracking-wider font-mono pointer-events-none">
        {slotLabel || `Player ${position % 2 === 0 ? "A" : "B"}-${Math.floor(position / 2) + 1}`}
      </span>

      {hasPlayer && (
        <>
          <DraggableSlotPlayer
            username={username}
            timer={LiveTimerNode}
            onRemovePlayer={handleRemoveClick}
            isDragging={draggableProps.isDragging}
            attributes={draggableProps.attributes}
            listeners={draggableProps.listeners}
            setNodeRef={draggableProps.setNodeRef}
            transform={draggableProps.transform}
            player={matchedPoolPlayer}
            onRefreshData={onRefreshData}
            totalGames={displayedTotalGames}
            isOverdue={isOverdue}
            canRemovePlayer={canRemovePlayer}
          />

          {draggableProps.isDragging && (
            <div
              style={overduePlaceholderStyle}
              className={`absolute inset-1 flex items-center justify-between p-1 ${bgTheme} rounded-md border text-sm font-medium select-none text-gray-800 pointer-events-none z-10`}
            >
              <div className="flex items-center gap-x-1">
                <PlayerAvatar
                  username={username}
                  customImageUrl={matchedPoolPlayer?.avatarUrl}
                  size="sm"
                />
                <div>
                  <span className="truncate text-black font-semibold max-[1320px]:max-w-[46px] max-w-[90px] block max-[1320px]:text-[10px] text-[12px]">
                    {username}
                  </span>
                  <div className="flex items-center gap-x-1">
                    <span className="flex items-center gap-x-1">
                      <Gamepad2 size={12} />{" "}
                      <span className="text-[10px]">{displayedTotalGames}</span>
                    </span>
                    <span className="text-[9px] bg-white px-0.5 rounded-full">
                      {
                        matchedPoolPlayer?.sessionPlayer?.communityPlayer
                          ?.skillLevel
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-x-1">
                {LiveTimerNode}
                {canRemovePlayer && (
                  <button className="text-gray-400 p-0.5">
                    <CornerDownLeft size={14} />
                  </button>
                )}
                <button className="text-gray-400 p-0.5">
                  <EllipsisVertical size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const MatchCourtCard = ({
  matchCourt,
  players,
  onRemovePlayer,
  onUpdateCourtName,
  onDeleteCourt,
  onStartMatchCourt,
  onEndMatchCourt,
  onRefreshData,
  communityId,
  sessionId,
  positions,
  isVolleyball,
  slotLabels,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [optimisticScores, setOptimisticScores] = useState(null);
  const buttonRef = useRef(null);
  const { fetchWithAuth } = useAuth();

  const occupiedSlots =
    matchCourt.slots?.filter((slot) => slot.sessionPlayerId) || [];
  const hasTeamAPlayer = occupiedSlots.some(
    (slot) => (slot.team || (slot.position % 2 === 0 ? "a" : "b")) === "a",
  );
  const hasTeamBPlayer = occupiedSlots.some(
    (slot) => (slot.team || (slot.position % 2 === 0 ? "a" : "b")) === "b",
  );

  // 🌟 Logic modifications to handle granular sub-states
  const isPaused = matchCourt.status === "paused";
  const isStarted = matchCourt.status === "started";

  const canStartGame =
    hasTeamAPlayer &&
    hasTeamBPlayer &&
    (matchCourt.status === "idle" || isPaused);
  const isMatchLive = isStarted; // 🌟 Only active/started games can select a winner
  const scores = optimisticScores?.startedAt === matchCourt.startedAt
    ? optimisticScores
    : {
    teamAScore: matchCourt.teamAScore || 0,
    teamBScore: matchCourt.teamBScore || 0,
  };

  // 🌟 Dynamic integration loop with your PATCH route handler
  const handlePauseToggle = async () => {
    if (isPausing) return;
    setIsPausing(true);
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/courts/${matchCourt.id}/pause`,
        { method: "PATCH" },
      );
      if (response.ok) {
        onRefreshData?.();
      }
    } catch (err) {
      console.error(
        "Failed executing match optimization mutation lifecycle:",
        err,
      );
    } finally {
      setIsPausing(false);
    }
  };

  const updateScore = (team, delta) => {
    if (!isStarted) return;
    const scoreKey = team === "a" ? "teamAScore" : "teamBScore";
    const nextScores = {
      ...scores,
      startedAt: matchCourt.startedAt,
      [scoreKey]: Math.max(0, scores[scoreKey] + delta),
    };
    if (nextScores[scoreKey] === scores[scoreKey]) return;
    setOptimisticScores(nextScores);
  };

  return (
    <div
      className={`relative p-2 rounded-md ${isVolleyball ? "bg-orange-700/95" : "bg-blue-900/90"} shadow-sm transition-all ${
        isSettingsOpen ? "z-40" : "z-10"
      }`}
    >
      <header className="relative z-30 flex flex-col items-center justify-between text-white mb-2">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-x-2">
            <span className="text-[14px] font-semibold">
              {matchCourt?.name}
            </span>
            {/* 🌟 New Live Label indicator */}
            {isStarted && (
              <span className="text-[10px] bg-emerald-500 text-black px-1.5 rounded-full font-bold uppercase animate-pulse">
                Live
              </span>
            )}
            {isPaused && (
              <span className="text-[10px] bg-amber-500 text-black px-1.5 rounded-full font-bold uppercase animate-pulse">
                Paused
              </span>
            )}
          </div>
          <div className="flex items-center gap-x-1 relative">
            {/* 🌟 Pause Button: Active only when court is explicitly started */}
            {isStarted && (
              <button
                disabled={isPausing}
                onClick={handlePauseToggle}
                className="cursor-pointer flex items-center gap-x-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] py-0.5 px-2 rounded-full transition-colors font-medium"
              >
                <Pause size={10} /> Pause
              </button>
            )}

            {/* 🌟 Resume/Start Game Trigger */}
            {canStartGame && (
              <button
                onClick={() => onStartMatchCourt?.(matchCourt.id)}
                className="cursor-pointer flex items-center gap-x-1 bg-stone-800 hover:text-stone-50 text-stone-300 text-[12px] py-0.5 px-2 rounded-full transition-colors"
              >
                <Play size={10} /> {isPaused ? "Resume game" : "Start game"}
              </button>
            )}

            <button
              title="Settings"
              ref={buttonRef}
              onClick={(e) => {
                e.stopPropagation();
                setIsSettingsOpen((prev) => !prev);
              }}
              className="cursor-pointer hover:bg-white/10 rounded-full p-1"
            >
              <EllipsisVertical size={16} />
            </button>

            {isSettingsOpen && (
              <CourtSettings
                court={matchCourt}
                toggleButtonRef={buttonRef}
                onClose={() => setIsSettingsOpen(false)}
                onUpdateCourtName={onUpdateCourtName}
                onDeleteCourt={onDeleteCourt}
                courtType="match"
              />
            )}
          </div>
        </div>
        {isVolleyball && (isStarted || isPaused) && (
          <div className="mt-2 grid w-full grid-cols-2 gap-3 rounded-lg bg-stone-950/80 p-2">
            {[{ team: "a", label: "Team A", score: scores.teamAScore }, { team: "b", label: "Team B", score: scores.teamBScore }].map(({ team, label, score }) => (
              <div
                key={team}
                className={`grid grid-cols-[32px_1fr_32px] items-center gap-1 text-center ${
                  isStarted ? "" : "pointer-events-none opacity-45"
                }`}
              >
                <button onClick={() => updateScore(team, -1)} className="rounded bg-white/10 py-1 text-lg hover:bg-white/20">−</button>
                <div>
                  <div className="text-3xl font-black leading-none">{score ?? 0}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/70">{label}</div>
                </div>
                <button onClick={() => updateScore(team, 1)} className="rounded bg-white/10 py-1 text-lg hover:bg-white/20">+</button>
              </div>
            ))}
          </div>
        )}
        {isVolleyball ? (
          <button
            disabled={!isMatchLive}
            title="End volleyball game using the live score"
            onClick={() => onEndMatchCourt?.(matchCourt.id, null, scores)}
            className={`mt-2 w-full rounded-full py-1 text-[14px] font-semibold transition-all ${
              isMatchLive
                ? "cursor-pointer bg-stone-950 text-white hover:bg-stone-800"
                : "cursor-not-allowed bg-stone-700/50 text-stone-300"
            }`}
          >
            End Game
          </button>
        ) : (
        <div className="flex w-full gap-x-2 mt-1">
          <button
            disabled={!isMatchLive}
            title="End Game (Team A win)"
            onClick={() => onEndMatchCourt?.(matchCourt.id, "a")}
            className={`w-full rounded-full text-[14px] transition-all duration-200 ${
              isMatchLive
                ? "cursor-pointer bg-orange-600 hover:bg-orange-700 text-stone-300 hover:text-stone-50 shadow-xs font-semibold"
                : "cursor-not-allowed bg-orange-600/40 text-stone-400 opacity-60"
            }`}
          >
            Team A
          </button>
          <button
            disabled={!isMatchLive}
            title="End Game (Team B win)"
            onClick={() => onEndMatchCourt?.(matchCourt.id, "b")}
            className={`w-full rounded-full text-[14px] transition-all duration-200 ${
              isMatchLive
                ? "cursor-pointer bg-stone-600 hover:bg-stone-700 text-stone-300 hover:text-stone-50 shadow-xs font-semibold"
                : "cursor-not-allowed bg-stone-600/40 text-stone-400 opacity-60"
            }`}
          >
            Team B
          </button>
        </div>
        )}
      </header>

      <main
        className={`relative z-20 grid gap-2 ${
          isVolleyball ? "grid-cols-4" : "grid-cols-2"
        }`}
      >
        {isVolleyball && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-1/2 z-30 w-0.5 -translate-x-1/2 rounded-full bg-white/80 shadow-sm"
          />
        )}
        {positions.map((position) => {
          const slotData = matchCourt?.slots?.find(
            (s) => s.position === position,
          );
          const matchedPoolPlayer = slotData
            ? slotData.sessionPlayer ||
              players.find((p) => p.id === slotData.sessionPlayerId)
            : null;

          const username =
            matchedPoolPlayer?.sessionPlayer?.communityPlayer?.username ||
            matchedPoolPlayer?.communityPlayer?.username ||
            matchedPoolPlayer?.username;

          return (
            <CourtSlot
              key={position}
              position={position}
              username={username || "Unknown player"}
              slotData={slotData}
              matchedPoolPlayer={matchedPoolPlayer}
              courtId={matchCourt.id}
              courtType="match"
              onRemovePlayer={onRemovePlayer}
              onRefreshData={onRefreshData}
              communityId={communityId}
              sessionId={sessionId}
              isCourtPaused={isPaused || matchCourt.status === "idle"}
              courtStatus={matchCourt.status}
              slotLabel={slotLabels.find((slot) => slot.position === position)?.label}
            />
          );
        })}
      </main>
    </div>
  );
};

const MatchCourt = ({
  matchCourts,
  players = [],
  onRemovePlayer,
  onAddCourt,
  onUpdateCourtName,
  onDeleteCourt,
  onStartMatchCourt,
  onEndMatchCourt,
  onRefreshData,
  communityId,
  sessionId,
  gameRules,
}) => {
  const courtsList = matchCourts?.courts || [];
  const countDisplay = matchCourts?.counts?.match || 0;
  const positions = gameRules?.positions || [0, 1, 2, 3];
  const slotLabels = gameRules?.slotLabels || [];
  const isVolleyball = gameRules?.playersPerTeam === 6;
  const canAddCourt = true;

  return (
    <div>
      <div className=" mb-2">
        <h4 className="font-semibold text-gray-700">
          {isVolleyball ? "Playing Court" : "Match"} ({countDisplay})
        </h4>
        {canAddCourt && (
          <button
            onClick={onAddCourt}
            className="cursor-pointer flex items-center gap-x-1 bg-blue-900 hover:bg-blue-800 text-white text-xs font-medium py-1 px-2.5 rounded-md transition-colors"
          >
            <Plus size={14} />
            <span>{isVolleyball ? "Add Playing Court" : "Add Court"}</span>
          </button>
        )}
      </div>
      {/* 🌟 Updated responsive classes to stack at 1120px and below */}
      <div className={`grid grid-cols-1 gap-3 ${isVolleyball ? "" : "min-[1200px]:grid-cols-2"}`}>
        {courtsList.map((matchCourt) => (
          <MatchCourtCard
            key={matchCourt.id}
            matchCourt={matchCourt}
            players={players}
            onRemovePlayer={onRemovePlayer}
            onUpdateCourtName={onUpdateCourtName}
            onDeleteCourt={onDeleteCourt}
            onStartMatchCourt={onStartMatchCourt}
            onEndMatchCourt={onEndMatchCourt}
            onRefreshData={onRefreshData}
            communityId={communityId}
            sessionId={sessionId}
            positions={positions}
            isVolleyball={isVolleyball}
            slotLabels={slotLabels}
          />
        ))}
      </div>
    </div>
  );
};

export default MatchCourt;
