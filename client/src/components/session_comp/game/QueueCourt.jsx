import { useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CornerDownLeft, EllipsisVertical, Gamepad2, Plus } from "lucide-react";
import CourtSettings from "./CourtSettings";
import PlayerAvatar from "../../PlayerAvatar";
import PlayerSettings from "./PlayerSettings"; // 🌟 Imported
import { PlayerTimer } from "./PlayersContainer";

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`player w-full cursor-grab active:cursor-grabbing touch-none flex items-center justify-between p-2 bg-white rounded-md border text-sm font-medium select-none text-gray-800 shadow-xs h-full ${
        isDragging ? "border-blue-500 shadow-md" : ""
      }`}
    >
      <div className="flex items-center gap-x-2">
        <PlayerAvatar
          username={username}
          customImageUrl={player?.avatarUrl}
          size="sm"
        />
        <div>
          <span className="truncate text-black font-semibold max-w-[60px] block">
            {username}
          </span>
          <div className="flex items-center gap-x-1">
            <span className="flex items-center gap-x-1">
              <Gamepad2 size={12} /> <span className="text-[10px]">0</span>
            </span>
            <span className="text-[11px]">BEG</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-x-1 relative">
        {timer}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevents dnd-kit from intercepting click actions
            onRemovePlayer();
          }}
          className="text-gray-400 p-0.5 cursor-pointer hover:bg-gray-200 rounded-full z-30"
        >
          <CornerDownLeft size={14} />
        </button>
        <button
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
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${courtId}-${position}`,
    data: {
      courtId,
      courtType,
      position,
    },
  });

  const handleRemoveClick = () => {
    if (onRemovePlayer && slotData) {
      const targetIdentifier =
        slotData.id || slotData.sessionPlayerId || `opt-${position}`;
      onRemovePlayer(courtId, targetIdentifier);
    }
  };

  const draggableProps = useDraggable({
    id: `draggable-${matchedPoolPlayer?.sessionPlayer?.id || matchedPoolPlayer?.id}`,
    data: { player: matchedPoolPlayer },
  });

  const hasPlayer = slotData && matchedPoolPlayer && username;
  const LiveTimerNode = hasPlayer ? (
    <PlayerTimer
      timestamp={
        matchedPoolPlayer?.updateStatus || matchedPoolPlayer?.updatedAt
      }
    />
  ) : null;

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
          />

          {draggableProps.isDragging && (
            <div className="absolute inset-1 flex items-center justify-between p-2 bg-white/80 rounded-md border text-sm font-medium select-none text-gray-800 pointer-events-none z-10">
              <div className="flex items-center gap-x-2">
                <PlayerAvatar
                  username={username}
                  customImageUrl={matchedPoolPlayer?.avatarUrl}
                  size="sm"
                />
                <div>
                  <span className="truncate text-black font-semibold max-w-[60px] block">
                    {username}
                  </span>
                  <div className="flex items-center gap-x-1">
                    <span className="flex items-center gap-x-1">
                      <Gamepad2 size={12} />{" "}
                      <span className="text-[10px]">0</span>
                    </span>
                    <span className="text-[11px]">BEG</span>
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
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const buttonRef = useRef(null);

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
        className="bg-stone-800/95 absolute top-0 left-0 z-10 rounded-md pointer-events-none"
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
          <span className="text-[14px] font-semibold">{queueCourt?.name}</span>
          <div className="flex items-center gap-x-1 relative">
            {queueCourt.slots.length > 0 && (
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

      <main className="relative z-20 grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((position) => {
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
}) => {
  const courtsList = queueCourts?.courts || [];
  const countDisplay = queueCourts?.counts?.queue || 0;

  return (
    <div>
      <h4 className="font-semibold text-gray-700 mb-2">
        Queues ({countDisplay})
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          />
        ))}

        <button
          onClick={onAddCourt}
          className="relative rounded-md flex items-center justify-center cursor-pointer border-2 border-stone-800 border-dashed gap-x-2 min-h-[142px]"
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
            className="bg-stone-800/95 absolute top-0 left-0 z-10 rounded-md pointer-events-none"
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
          <span className="block text-stone-800 z-12">
            <Plus size={20} />
          </span>
          <span className="block font-medium text-stone-800 z-12">
            Add Queue
          </span>
        </button>
      </div>
    </div>
  );
};

export default QueueCourt;
