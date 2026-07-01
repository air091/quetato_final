import { useState, useEffect, useRef } from "react";
import { EllipsisVertical, Gamepad2 } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import PlayerSettings from "./PlayerSettings";
import PlayerAvatar from "../../PlayerAvatar";

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
      className={`text-[12px] tabular-nums font-mono transition-colors duration-300 ${colorClass}`}
    >
      {displayTime}
    </span>
  );
};

// Presentation-only card component
export const PlayerCard = ({
  username,
  timer,
  isDragging,
  onToggleSettings,
  toggleButtonRef,
  isSettingsOpen,
  player,
}) => {
  return (
    <div
      className={`w-full flex items-center justify-between p-1 bg-white rounded-md border text-sm font-medium select-none text-gray-800 shadow-xs ${
        isDragging ? "h-[41px] border-blue-500 shadow-md" : "h-full"
      }`}
    >
      <div className="flex items-center gap-x-2">
        <PlayerAvatar
          username={username}
          customImageUrl={player?.avatarUrl}
          size="sm"
        />
        <div>
          <span className="truncate text-black font-semibold max-w-[90px] block">
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

      <div className="flex items-center gap-x-1">
        {timer}
        <button
          ref={toggleButtonRef}
          onClick={(e) => {
            e.stopPropagation(); // Stop drag hooks from fighting click toggles
            onToggleSettings();
          }}
          className="text-gray-400 p-0.5 cursor-pointer hover:bg-gray-100 rounded-full"
        >
          <EllipsisVertical size={14} />
        </button>

        {isSettingsOpen && (
          <PlayerSettings
            player={player}
            toggleButtonRef={toggleButtonRef}
            onClose={onToggleSettings}
          />
        )}
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
  onToggleSettings,
  toggleButtonRef,
  isSettingsOpen,
  player,
}) => {
  const style = {
    transform:
      isDragging && transform ? CSS.Translate.toString(transform) : undefined,
    position: isDragging ? "fixed" : "relative",
    zIndex: isDragging ? 9999 : 20,
    width: isDragging ? "178px" : "100%",
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
      <PlayerCard
        username={username}
        timer={timer}
        isDragging={isDragging}
        onToggleSettings={onToggleSettings}
        toggleButtonRef={toggleButtonRef}
        isSettingsOpen={isSettingsOpen}
        player={player}
      />
    </div>
  );
};

const DraggablePlayer = ({ player, username }) => {
  const draggableProps = useDraggable({
    id: `draggable-player-container-${player.id}`,
    data: { player },
  });

  // 🌟 FIX: Keep this state local to the card so it doesn't rely on parent props!
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const buttonRef = useRef(null);

  const LiveTimerNode = (
    <PlayerTimer timestamp={player.updateStatus || player.updatedAt} />
  );

  const handleToggleSettings = () => {
    setIsSettingsOpen((prev) => !prev);
  };

  return (
    <div
      className={`w-[178px] h-[41px] relative shrink-0 ${isSettingsOpen ? "z-40" : "z-10"}`}
    >
      <div className="absolute inset-0 z-100">
        <DraggableSlotPlayer
          username={username}
          timer={LiveTimerNode}
          isDragging={draggableProps.isDragging}
          attributes={draggableProps.attributes}
          listeners={draggableProps.listeners}
          setNodeRef={draggableProps.setNodeRef}
          transform={draggableProps.transform}
          onToggleSettings={handleToggleSettings}
          toggleButtonRef={buttonRef}
          isSettingsOpen={isSettingsOpen}
          player={player}
        />
      </div>

      {draggableProps.isDragging && (
        <div className="absolute inset-0 flex items-center justify-between p-2 bg-gray-500/40 rounded-md border text-sm font-medium select-none text-gray-800 pointer-events-none z-0">
          <div className="flex items-center gap-x-2">
            <PlayerAvatar
              username={username}
              customImageUrl={player?.avatarUrl}
              size="sm"
            />
            <div>
              <span className="truncate text-black font-semibold max-w-[90px] block">
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
                // 🌟 REMOVED the top-level parameters that were causing the crash
              />
            );
          })
        )}
      </main>
    </div>
  );
};

export default PlayersContainer;
