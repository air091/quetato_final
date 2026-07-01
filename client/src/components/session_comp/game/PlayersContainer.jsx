import { useState, useEffect } from "react";
import { EllipsisVertical, Gamepad2 } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

// NEW helper function to convert an ISO date into hh:mm:ss elapsed time string
export const formatElapsedTime = (pastIsoString) => {
  if (!pastIsoString) return "00:00:00";

  const past = new Date(pastIsoString).getTime();
  const now = Date.now();
  const diffInSeconds = Math.max(0, Math.floor((now - past) / 1000));

  const hours = Math.floor(diffInSeconds / 3600);
  const minutes = Math.floor((diffInSeconds % 3600) / 60);
  const seconds = diffInSeconds % 60;

  return [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
};

export const PlayerTimer = ({ timestamp }) => {
  const [displayTime, setDisplayTime] = useState(() =>
    formatElapsedTime(timestamp),
  );
  const [colorClass, setColorClass] = useState("text-gray-500");

  useEffect(() => {
    const updateTimer = () => {
      // 1. Update the display text
      setDisplayTime(formatElapsedTime(timestamp));

      // 2. Calculate raw minutes elapsed to determine color thresholds
      if (!timestamp) {
        setColorClass("text-gray-500");
        return;
      }

      const startTime = new Date(timestamp).getTime();
      const now = Date.now();
      const elapsedMinutes = (now - startTime) / 1000 / 60;

      // 3. Set the appropriate threshold color
      if (elapsedMinutes >= 20) {
        setColorClass("text-red-500 font-semibold animate-pulse"); // Optional: added pulse for high urgency
      } else if (elapsedMinutes >= 15) {
        setColorClass("text-yellow-500 font-semibold");
      } else {
        setColorClass("text-gray-500");
      }
    };

    // Run immediately on mount/timestamp change
    updateTimer();

    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [timestamp]);

  return (
    <span
      className={`text-[10px] tabular-nums font-mono transition-colors duration-300 ${colorClass}`}
    >
      {displayTime}
    </span>
  );
};

// Presentation-only card component
export const PlayerCard = ({ username, timer, isDragging }) => {
  return (
    <div
      className={`w-full cursor-grab flex items-center justify-between p-2 bg-white rounded-md border text-sm font-medium select-none text-gray-800 shadow-xs ${
        isDragging ? "h-[41px] border-blue-500 shadow-md" : "h-full"
      }`}
    >
      <div>
        <span className="truncate text-black font-semibold max-w-[90px]">
          {username}
        </span>
        <div className="flex items-center gap-x-2">
          <span className="flex items-center gap-x-1">
            <Gamepad2 size={12} /> <span className="text-[10px]">0</span>
          </span>
          <span className="text-[11px]">BEG</span>
        </div>
      </div>

      <div className="flex items-center gap-x-1">
        {timer}
        <button className="text-gray-400 p-0.5 cursor-pointer">
          <EllipsisVertical size={14} />
        </button>
      </div>
    </div>
  );
};

// Internal Draggable Component mirroring MatchCourt's structure
const DraggableSlotPlayer = ({
  username,
  timer,
  isDragging,
  attributes,
  listeners,
  setNodeRef,
  transform,
}) => {
  // 🌟 FIXED CRITICAL FIX HERE:
  // If we are not actively dragging, do not apply any transform matrix calculations at all.
  // This locks the dropped component cleanly back to 0,0 relative flow space inside your UI container pools.
  const style = {
    transform:
      isDragging && transform ? CSS.Translate.toString(transform) : undefined,
    position: isDragging ? "fixed" : "relative",
    zIndex: isDragging ? 9999 : 20,
    width: isDragging ? "150px" : "100%",
    height: isDragging ? "41px" : "100%",
    pointerEvents: isDragging ? "none" : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="player w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
    >
      <PlayerCard username={username} timer={timer} isDragging={isDragging} />
    </div>
  );
};

const DraggablePlayer = ({ player, username }) => {
  const draggableProps = useDraggable({
    id: `draggable-player-container-${player.id}`,
    data: { player },
  });

  const LiveTimerNode = (
    <PlayerTimer timestamp={player.updateStatus || player.updatedAt} />
  );

  return (
    <div className="w-[164px] h-[41px] relative shrink-0">
      {/* 1. THE ACTUALLY DRAGGABLE ITEM */}
      <div className="absolute inset-0 z-100">
        <DraggableSlotPlayer
          username={username}
          timer={LiveTimerNode}
          isDragging={draggableProps.isDragging}
          attributes={draggableProps.attributes}
          listeners={draggableProps.listeners}
          setNodeRef={draggableProps.setNodeRef}
          transform={draggableProps.transform}
        />
      </div>

      {/* 2. THE BACKGROUND PLACEHOLDER */}
      {draggableProps.isDragging && (
        <div className="absolute inset-0 flex items-center justify-between p-2 bg-gray-500/40 rounded-md border border-blue-500 text-sm font-medium select-none text-gray-800 pointer-events-none z-0">
          <div>
            <span className="truncate text-black font-semibold max-w-[90px]">
              {username}
            </span>
            <div className="flex items-center gap-x-2">
              <span className="flex items-center gap-x-1">
                <Gamepad2 size={12} /> <span className="text-[10px]">0</span>{" "}
                {/* TOTAL GAMES OF PLAYER */}
              </span>
              <span className="text-[11px]">BEG</span>{" "}
              {/* USER SKILL DO NOT TOUCH */}
            </div>
          </div>
          <div className="flex items-center gap-x-1 opacity-30">
            {LiveTimerNode}
            <button>
              <EllipsisVertical size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Container List Component
const PlayersContainer = ({ players = [] }) => {
  const [activeTab, setActiveTab] = useState("all");

  const filteredPlayers = players.filter((player) => {
    if (activeTab === "all") return true;
    const status = player?.gameStatus;
    return status === activeTab;
  });

  return (
    <div className="w-full md:w-[400px] bg-white rounded-lg flex flex-col h-full">
      <header className="flex-shrink-0 border-b border-gray-100 p-2">
        <h4 className="font-semibold text-gray-800 mb-2">
          Players ({filteredPlayers.length})
        </h4>
        <div className="flex items-center bg-gray-100 p-0.5 rounded-md">
          {["all", "waiting", "queued", "playing", "paid"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-[12px] font-medium py-1 px-1 rounded-sm cursor-pointer capitalize transition-colors ${
                activeTab === tab
                  ? "bg-white text-gray-900 shadow-xs font-semibold"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="flex flex-wrap gap-2 p-2 justify-center overflow-y-auto border mx-2 rounded-md border-dashed">
        {filteredPlayers.length === 0 ? (
          <div className="text-center text-xs text-gray-400 font-medium w-full py-4">
            No players found in this category.
          </div>
        ) : (
          filteredPlayers.map((player) => {
            const stableId = player?.sessionPlayer?.id || player?.id;
            const username =
              player?.sessionPlayer?.communityPlayer?.username ||
              player?.communityPlayer?.username ||
              player?.username ||
              "Unknown Player";

            if (!stableId) return null;

            return (
              <DraggablePlayer
                key={stableId}
                player={player}
                username={username}
              />
            );
          })
        )}
      </main>
    </div>
  );
};

export default PlayersContainer;
