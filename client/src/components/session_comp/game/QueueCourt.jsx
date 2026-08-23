import { useEffect, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CornerDownLeft, EllipsisVertical, Gamepad2, Plus } from "lucide-react";
import CourtSettings from "./CourtSettings";
import PlayerAvatar from "../../PlayerAvatar";
import PlayerSettings from "./PlayerSettings"; // 🌟 Imported
import { PlayerTimer } from "./PlayersContainer";
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
}) => {
  const [isPlayerSettingsOpen, setIsPlayerSettingsOpen] = useState(false); // 🌟 Settings toggle state
  const playerButtonRef = useRef(null); // 🌟 Structural tracking anchor ref

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 9999 : isPlayerSettingsOpen ? 40 : 20, // 🌟 Elevate zIndex layer when portal is open
    width: "100%",
    height: "100%",
    opacity: isDragging ? 0.4 : 1,
  };

  // 🌟 Dynamic background mapping based on required gameStatuses rules
  const statusBgClasses = {
    waiting: "bg-white border-gray-500 text-gray-800",
    queued: "bg-amber-200 border-amber-500 text-amber-900",
    playingQueued: "bg-orange-200 border-orange-500 text-orange-950",
    playing: "bg-emerald-200 border-emerald-500 text-emerald-950",
    paid: "bg-rose-200 border-rose-500 text-rose-950",
  };

  // Queue membership is independent from the player's active match status.
  const currentStatus =
    player?.gameStatus === "playing" ? "playingQueued" : "queued";
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
      {/* 🌟 Injected scoped keyframes to isolate the pulse strictly to border-color */}
      {isOverdue && !isDragging && (
        <style>{`
          @keyframes borderPulse {
            0% { border-color: rgba(239, 68, 68, 1); box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.4); }
            50% { border-color: rgba(220, 38, 38, 0.2); box-shadow: 0 0 0 1px rgba(220, 38, 38, 0); }
            100% { border-color: rgba(239, 68, 68, 1); box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.4); }
          }
        `}</style>
      )}

      <div className="flex items-center gap-x-2">
        <PlayerAvatar
          username={username}
          customImageUrl={player?.avatarUrl}
          size="sm"
        />
        <div>
          <span className="truncate text-black font-semibold max-[1320px]:max-w-[46px] max-w-[90px] block max-[1320px]:text-[10px] text-[12px]">
            {username}
          </span>
          <div className="flex items-center gap-x-1">
            <span title="Games" className="flex items-center gap-x-1">
              <Gamepad2 size={12} />
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
        <button
          title={`Remove ${username} from slot`}
          onClick={(e) => {
            e.stopPropagation(); // Prevents dnd-kit from intercepting click actions
            onRemovePlayer();
          }}
          className="text-gray-400 p-0.5 cursor-pointer hover:bg-gray-200 rounded-full z-30"
        >
          <CornerDownLeft size={14} />
        </button>
        <button
          title="Settings"
          ref={playerButtonRef} // 🌟 Attach positioning ref to options anchor element
          onClick={(e) => {
            e.stopPropagation(); // 🌟 Intercept dnd-kit drag layer loops
            setIsPlayerSettingsOpen((prev) => !prev);
          }}
          className="text-gray-400 p-0.5 cursor-pointer hover:bg-gray-200 rounded-full"
        >
          <EllipsisVertical size={14} />
        </button>

        {/* 🌟 PlayerSettings Modal Trigger Portal */}
        {isPlayerSettingsOpen && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <PlayerSettings
              player={player}
              toggleButtonRef={playerButtonRef}
              onClose={() => setIsPlayerSettingsOpen(false)}
              onUpdatePlayerStatus={onRefreshData}
            />
          </div>
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
  isVolleyball,
}) => {
  const { fetchWithAuth } = useAuth();
  const [totalGames, setTotalGames] = useState(
    Number(matchedPoolPlayer?.totalGames) || 0,
  );
  const [isOverdue, setIsOverdue] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${courtId}-${position}`,
    data: {
      courtId,
      courtType,
      position,
    },
  });

  // 🌟 Dynamic background mapping based on required gameStatuses rules
  const statusBgClasses = {
    waiting: "bg-stone-100 border-gray-500 text-gray-800",
    queued: "bg-amber-100 border-amber-500 text-amber-900",
    playingQueued: "bg-orange-100 border-orange-500 text-orange-950",
    playing: "bg-emerald-100 border-emerald-500 text-emerald-950",
    paid: "bg-rose-100 border-rose-500 text-rose-950",
  };

  const currentStatus =
    matchedPoolPlayer?.gameStatus === "playing" ? "playingQueued" : "queued";
  const bgTheme = statusBgClasses[currentStatus] || statusBgClasses.waiting;

  const stablePlayerId =
    matchedPoolPlayer?.id ||
    matchedPoolPlayer?.sessionPlayer?.id ||
    slotData?.sessionPlayerId;
  const displayedTotalGames = Math.max(
    totalGames,
    Number(matchedPoolPlayer?.totalGames) || 0,
  );

  // 🌟 Active threshold check effect monitoring the 20-minute marker
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

  const draggableProps = useDraggable({
    id: `draggable-${matchedPoolPlayer?.sessionPlayer?.id || matchedPoolPlayer?.id || stablePlayerId}`,
    data: {
      player: {
        ...matchedPoolPlayer,
        totalGames: displayedTotalGames,
        isQueuedForNextMatch: true,
      },
    },
    disabled: matchedPoolPlayer?.gameStatus === "paid",
  });

  const hasPlayer = slotData && matchedPoolPlayer && username;
  const LiveTimerNode = hasPlayer ? (
    <PlayerTimer timestamp={timestamp} />
  ) : null;

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
      <span
        className={`absolute text-[10px] tracking-wider font-mono pointer-events-none ${
          isVolleyball ? "text-stone-500/60" : "text-white/40"
        }`}
      >
        Player {position % 2 === 0 ? "A" : "B"}-{Math.floor(position / 2) + 1}
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
          />

          {draggableProps.isDragging && (
            <div
              style={overduePlaceholderStyle}
              className={`absolute inset-1 flex items-center justify-between p-1 rounded-md border text-sm font-medium select-none text-gray-800 pointer-events-none z-10 ${bgTheme}`}
            >
              <div className="flex items-center gap-x-2">
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

const QueueCourtCard = ({
  queueCourt,
  players,
  onRemovePlayer,
  onUpdateCourtName,
  onDeleteCourt,
  onTransferQueue,
  onRefreshData,
  communityId,
  sessionId,
  positions,
  isVolleyball,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const buttonRef = useRef(null);
  const hasPlayingPlayer = (queueCourt?.slots || []).some((slot) => {
    const player =
      slot.sessionPlayer ||
      players.find(
        (candidatePlayer) => candidatePlayer.id === slot.sessionPlayerId,
      );

    return player?.gameStatus === "playing";
  });

  return (
    <div
      className={`relative p-2 rounded-md ${isVolleyball ? "bg-slate-200" : "bg-stone-800/95"} shadow-sm transition-all ${
        isSettingsOpen ? "z-40" : "z-10"
      }`}
    >
      <header
        className={`relative z-30 flex flex-col items-center justify-between mb-2 ${
          isVolleyball ? "text-stone-700" : "text-white"
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[14px] font-semibold">{queueCourt?.name}</span>
          <div className="flex items-center gap-x-1 relative">
            {queueCourt.slots?.length > 0 && !hasPlayingPlayer && (
              <button
                onClick={() => onTransferQueue(queueCourt.id)}
                title="Transfer players to first open Match Court"
                className="cursor-pointer bg-stone-800 hover:text-stone-50 text-stone-300 text-[12px] py-0.5 px-2 rounded-full"
              >
                Transfer to Court
              </button>
            )}
            <button
              ref={buttonRef}
              title="Settings"
              onClick={(event) => {
                event.stopPropagation();
                setIsSettingsOpen((prev) => !prev);
              }}
              className="cursor-pointer hover:bg-white/10 rounded-full p-1"
            >
              <EllipsisVertical size={16} />
            </button>

            {isSettingsOpen && (
              <CourtSettings
                court={queueCourt}
                toggleButtonRef={buttonRef}
                onClose={() => setIsSettingsOpen(false)}
                onUpdateCourtName={onUpdateCourtName}
                onDeleteCourt={onDeleteCourt}
                courtType="queue"
              />
            )}
          </div>
        </div>
      </header>

      <main
        className={`relative z-20 grid gap-2 ${
          isVolleyball ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"
        }`}
      >
        {positions.map((position) => {
          const slotData = queueCourt?.slots?.find(
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
              courtId={queueCourt.id}
              courtType="queue"
              onRemovePlayer={onRemovePlayer}
              onRefreshData={onRefreshData}
              communityId={communityId}
              sessionId={sessionId}
              isVolleyball={isVolleyball}
            />
          );
        })}
      </main>
    </div>
  );
};

const QueueCourt = ({
  queueCourts,
  players = [],
  onRemovePlayer,
  onAddCourt,
  onUpdateCourtName,
  onDeleteCourt,
  onTransferQueue,
  onRefreshData,
  communityId,
  sessionId,
  gameRules,
}) => {
  const courtsList = queueCourts?.courts || [];
  const countDisplay = queueCourts?.counts?.queue || 0;
  const positions = gameRules?.positions || [0, 1, 2, 3];
  const isVolleyball = gameRules?.playersPerTeam === 6;
  const canAddCourt = !isVolleyball || countDisplay < 1;

  return (
    <div>
      <div className="mb-2">
        <h4 className="font-semibold text-gray-700">
          {isVolleyball ? "Queued Court" : "Queues"} ({countDisplay})
        </h4>
        {canAddCourt && (
          <button
            onClick={onAddCourt}
            className="cursor-pointer flex items-center gap-x-1 bg-stone-800 hover:bg-stone-700 text-white text-xs font-medium py-1 px-2.5 rounded-md transition-colors"
          >
            <Plus size={14} />
            <span>{isVolleyball ? "Add Queued Court" : "Add Queue"}</span>
          </button>
        )}
      </div>
      <div className={`grid grid-cols-1 gap-3 ${isVolleyball ? "" : "min-[1200px]:grid-cols-2"}`}>
        {courtsList.map((queueCourt) => (
          <QueueCourtCard
            key={queueCourt.id}
            queueCourt={queueCourt}
            players={players}
            onRemovePlayer={onRemovePlayer}
            onUpdateCourtName={onUpdateCourtName}
            onDeleteCourt={onDeleteCourt}
            onTransferQueue={onTransferQueue}
            onRefreshData={onRefreshData}
            communityId={communityId}
            sessionId={sessionId}
            positions={positions}
            isVolleyball={isVolleyball}
          />
        ))}
      </div>
    </div>
  );
};

export default QueueCourt;
