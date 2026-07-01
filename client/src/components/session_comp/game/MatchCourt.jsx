import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CornerDownLeft, EllipsisVertical, Gamepad2, Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import CourtSettings from "./CourtSettings";
import PlayerSettings from "./PlayerSettings"; // 🌟 Import PlayerSettings component
import { formatElapsedTime, PlayerTimer } from "./PlayersContainer";
import PlayerAvatar from "../../PlayerAvatar";
import { useAuth } from "../../../hooks/useAuth";

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

  // 🌟 Dynamic background mapping based on required gameStatuses rules
  const statusBgClasses = {
    waiting: "bg-white border-gray-500 text-gray-800",
    queued: "bg-amber-200 border-amber-500 text-amber-900",
    playing: "bg-emerald-200 border-emerald-500 text-emerald-950",
    paid: "bg-rose-200 border-rose-500 text-rose-950",
  };

  const currentStatus = player?.gameStatus || "waiting";
  const bgTheme = statusBgClasses[currentStatus] || statusBgClasses.waiting;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`player w-full cursor-grab active:cursor-grabbing touch-none flex items-center justify-between p-1 rounded-md border text-sm font-medium select-none text-gray-800 shadow-xs h-full ${bgTheme} ${
        isDragging ? "border-blue-500 shadow-md" : ""
      }`}
    >
      <div className="flex items-center gap-x-1">
        <PlayerAvatar
          username={username}
          customImageUrl={player?.avatarUrl || player?.sessionPlayer?.avatarUrl}
          size="sm"
        />
        <div>
          <span className="truncate text-black font-semibold max-w-[60px] block text-[12px]">
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
              BEG
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-x-1 relative">
        {timer}
        <button
          title={`Remove ${username} from slot`}
          onClick={(e) => {
            e.stopPropagation();
            onRemovePlayer();
          }}
          className="text-gray-400 p-0.5 cursor-pointer hover:bg-gray-200 rounded-full z-30"
        >
          <CornerDownLeft size={14} />
        </button>
        <button
          title="Settings"
          ref={playerButtonRef}
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
}) => {
  const { fetchWithAuth } = useAuth();
  const [totalGames, setTotalGames] = useState(0);

  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${courtId}-${position}`,
    data: {
      courtId,
      courtType,
      position,
    },
  });

  // 🌟 FIX: Robust lookup fallback for nested target primary IDs
  const stablePlayerId =
    matchedPoolPlayer?.id ||
    matchedPoolPlayer?.sessionPlayer?.id ||
    slotData?.sessionPlayerId;

  useEffect(() => {
    const fetchPlayerGamesCount = async () => {
      if (!communityId || !sessionId || !stablePlayerId) return;
      try {
        const response = await fetchWithAuth(
          `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/players/${stablePlayerId}/history`,
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

  const draggableProps = useDraggable({
    id: `draggable-${matchedPoolPlayer?.sessionPlayer?.id || matchedPoolPlayer?.id || stablePlayerId}`,
    data: { player: { ...matchedPoolPlayer, totalGames } },
  });

  const hasPlayer = slotData && matchedPoolPlayer && username;

  const LiveTimerNode = hasPlayer ? (
    <PlayerTimer
      timestamp={
        matchedPoolPlayer?.updateStatus || matchedPoolPlayer?.updatedAt
      }
    />
  ) : null;

  // 🌟 Dynamic background mapping based on required gameStatuses rules
  const statusBgClasses = {
    waiting: "bg-stone-100 border-gray-500 text-gray-800",
    queued: "bg-amber-100 border-amber-500 text-amber-900",
    playing: "bg-emerald-100 border-emerald-500 text-emerald-950",
    paid: "bg-rose-100 border-rose-500 text-rose-950",
  };

  const currentStatus = matchedPoolPlayer?.gameStatus || "waiting";
  const bgTheme = statusBgClasses[currentStatus] || statusBgClasses.waiting;

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
        Player {position % 2 === 0 ? "A" : "B"}-{position <= 1 ? "1" : "2"}
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
            totalGames={totalGames}
          />

          {draggableProps.isDragging && (
            <div
              className={`absolute inset-1 flex items-center justify-between p-1 ${bgTheme} rounded-md border text-sm font-medium select-none text-gray-800 pointer-events-none z-10`}
            >
              <div className="flex items-center gap-x-1">
                <PlayerAvatar
                  username={username}
                  customImageUrl={matchedPoolPlayer?.avatarUrl}
                  size="sm"
                />
                <div>
                  <span className="truncate text-black font-semibold max-w-[60px] block text-[12px]">
                    {username}
                  </span>
                  <div className="flex items-center gap-x-1">
                    <span className="flex items-center gap-x-1">
                      <Gamepad2 size={12} />{" "}
                      <span className="text-[10px]">{totalGames}</span>
                    </span>
                    <span className="text-[9px] bg-white px-0.5 rounded-full">
                      BEG
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-x-1">
                {LiveTimerNode}
                <button className="text-gray-400 p-0.5">
                  <CornerDownLeft size={14} />
                </button>
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
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const buttonRef = useRef(null);

  const occupiedSlots =
    matchCourt.slots?.filter((slot) => slot.sessionPlayerId) || [];
  const hasTeamAPlayer = occupiedSlots.some((slot) => slot.position % 2 === 0);
  const hasTeamBPlayer = occupiedSlots.some((slot) => slot.position % 2 === 1);
  const canStartGame =
    hasTeamAPlayer && hasTeamBPlayer && matchCourt.startedAt === null;
  const isMatchLive =
    matchCourt.status === "started" || matchCourt.startedAt !== null;

  return (
    <div
      className={`relative p-2 rounded-md bg-white shadow-sm transition-all ${
        isSettingsOpen ? "z-40" : "z-10"
      }`}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 300 150"
        fill="none"
        stroke="rgba(200, 200, 200, 0.8)"
        strokeWidth="2"
        preserveAspectRatio="none"
        className="bg-blue-900/90 absolute top-0 left-0 z-10 rounded-md pointer-events-none"
      >
        <rect
          x="25"
          y="25"
          width="250"
          height="100"
          fill="none"
          stroke="rgba(200, 200, 200, 0.8)"
          strokeWidth="2"
        />
        <line
          x1="150"
          y1="25"
          x2="150"
          y2="125"
          stroke="rgba(200, 200, 200, 0.8)"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
        <line
          x1="25"
          y1="50"
          x2="275"
          y2="50"
          stroke="rgba(200, 200, 200, 0.8)"
          strokeWidth="1.5"
        />
        <line
          x1="25"
          y1="100"
          x2="275"
          y2="100"
          stroke="rgba(200, 200, 200, 0.8)"
          strokeWidth="1.5"
        />
        <line
          x1="50"
          y1="25"
          x2="50"
          y2="125"
          stroke="rgba(200, 200, 200, 0.8)"
          strokeWidth="1.5"
        />
        <line
          x1="250"
          y1="25"
          x2="250"
          y2="125"
          stroke="rgba(200, 200, 200, 0.8)"
          strokeWidth="1.5"
        />
      </svg>

      <header className="relative z-30 flex flex-col items-center justify-between text-white mb-2">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-x-2">
            <span className="text-[14px] font-semibold">
              {matchCourt?.name}
            </span>
          </div>
          <div className="flex items-center gap-x-1 relative">
            {canStartGame && (
              <button
                onClick={() => onStartMatchCourt?.(matchCourt.id)}
                className="cursor-pointer bg-stone-800 hover:text-stone-50 text-stone-300 text-[12px] py-0.5 px-2 rounded-full transition-colors"
              >
                Start game
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
      </header>

      <main className="relative z-20 grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((position) => {
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
}) => {
  const courtsList = matchCourts?.courts || [];
  const countDisplay = matchCourts?.counts?.match || 0;

  return (
    <div>
      <h4 className="font-semibold text-gray-700 mb-2">
        Match ({countDisplay})
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          />
        ))}

        <button
          onClick={onAddCourt}
          className="relative rounded-md flex items-center justify-center cursor-pointer border-2 border-blue-900 border-dashed gap-x-2 min-h-[179px]"
        >
          <div className="absolute backdrop-blur-xs rounded-md z-11 h-full w-full bg-white opacity-70 hover:opacity-40"></div>
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 300 150"
            fill="none"
            stroke="rgba(200, 200, 200, 0.8)"
            strokeWidth="2"
            preserveAspectRatio="none"
            className="bg-blue-900/90 absolute top-0 left-0 z-10 rounded-md pointer-events-none"
          >
            <rect
              x="25"
              y="25"
              width="250"
              height="100"
              fill="none"
              stroke="rgba(200, 200, 200, 0.8)"
              strokeWidth="2"
            />
            <line
              x1="150"
              y1="25"
              x2="150"
              y2="125"
              stroke="rgba(200, 200, 200, 0.8)"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <line
              x1="25"
              y1="50"
              x2="275"
              y2="50"
              stroke="rgba(200, 200, 200, 0.8)"
              strokeWidth="1.5"
            />
            <line
              x1="25"
              y1="100"
              x2="275"
              y2="100"
              stroke="rgba(200, 200, 200, 0.8)"
              strokeWidth="1.5"
            />
            <line
              x1="50"
              y1="25"
              x2="50"
              y2="125"
              stroke="rgba(200, 200, 200, 0.8)"
              strokeWidth="1.5"
            />
            <line
              x1="250"
              y1="25"
              x2="250"
              y2="125"
              stroke="rgba(200, 200, 200, 0.8)"
              strokeWidth="1.5"
            />
          </svg>
          <span className="block text-blue-900 z-12">
            <Plus size={20} />
          </span>
          <span className="block font-medium text-blue-900 z-12">
            Add Court
          </span>
        </button>
      </div>
    </div>
  );
};

export default MatchCourt;
