import { useState, useEffect, useRef } from "react";
import { EllipsisVertical, Gamepad2, Search, X } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import PlayerSettings from "./PlayerSettings";
import PlayerAvatar from "../../PlayerAvatar";
import { useAuth } from "../../../hooks/useAuth";

// NEW helper function to convert an ISO date into hh:mm:ss elapsed time string

export const PlayerTimer = ({ timestamp }) => {
  const [displayTime, setDisplayTime] = useState(() =>
    formatElapsedTime(timestamp),
  );
  const [colorClass, setColorClass] = useState("text-gray-500");

  useEffect(() => {
    const updateTimer = () => {
      setDisplayTime(formatElapsedTime(timestamp));

      if (!timestamp) {
        setColorClass("text-gray-500");
        return;
      }

      const startTime = new Date(timestamp).getTime();
      const now = Date.now();
      const elapsedMinutes = (now - startTime) / 1000 / 60;

      if (elapsedMinutes >= 20) {
        setColorClass("text-red-600 font-bold");
      } else if (elapsedMinutes >= 15) {
        setColorClass("text-yellow-500 font-semibold");
      } else {
        setColorClass("text-gray-500");
      }
    };

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
  onRefreshData,
  totalGames,
  isOverdue,
}) => {
  const statusBgClasses = {
    waiting: "bg-white border-gray-500 text-gray-800",
    queued: "bg-amber-200 border-amber-500 text-amber-900",
    playing: "bg-emerald-200 border-emerald-500 text-emerald-950",
    paid: "bg-rose-200 border-rose-500 text-rose-950",
  };

  const currentStatus = player?.gameStatus || "waiting";
  const bgTheme = statusBgClasses[currentStatus] || statusBgClasses.waiting;

  // 🌟 Inject an explicit keyframe style targeting ONLY border-color
  // so that content, text opacity, and base background variants remain unaffected.
  const overdueStyle =
    isOverdue && !isDragging
      ? {
          animation: "borderPulse 1.5s infinite ease-in-out",
          borderWidth: "1.5px",
        }
      : {};

  return (
    <div
      style={overdueStyle}
      className={`w-full flex items-center justify-between p-1 rounded-md border text-sm font-medium select-none text-gray-800 shadow-xs transition-colors duration-300 ${bgTheme} ${
        isDragging ? "h-[41px] border-blue-500 shadow-md" : "h-full"
      }`}
    >
      {/* CSS Keyframe definition injected directly for localized component handling */}
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
          customImageUrl={player?.avatarUrl}
          size="sm"
        />
        <div>
          <span className="truncate text-black font-semibold max-w-[60px] block text-[10px]">
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
              {player?.sessionPlayer?.communityPlayer.skillLevel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-x-1">
        {timer}
        <button
          title="Settings"
          ref={toggleButtonRef}
          onClick={(e) => {
            e.stopPropagation();
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
            onUpdatePlayerStatus={onRefreshData}
          />
        )}
      </div>
    </div>
  );
};

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
  onRefreshData,
  totalGames,
  isOverdue,
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
      className="player w-full h-full cursor-grab active:cursor-grabbing touch-pan-y select-none"
    >
      <PlayerCard
        username={username}
        timer={timer}
        isDragging={isDragging}
        onToggleSettings={onToggleSettings}
        toggleButtonRef={toggleButtonRef}
        isSettingsOpen={isSettingsOpen}
        player={player}
        onRefreshData={onRefreshData}
        totalGames={totalGames}
        isOverdue={isOverdue}
      />
    </div>
  );
};

const DraggablePlayer = ({
  player,
  username,
  onRefreshData,
  communityId,
  sessionId,
}) => {
  const { fetchWithAuth } = useAuth();
  const [totalGames, setTotalGames] = useState(0);
  const [isOverdue, setIsOverdue] = useState(false);

  const draggableProps = useDraggable({
    id: `draggable-player-container-${player.id}`,
    data: { player: { ...player, totalGames } },
  });

  const stablePlayerId = player?.id;
  const timestamp = player.updateStatus || player.updatedAt;

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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const buttonRef = useRef(null);

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
    player.gameStatus,
    player.updatedAt,
    player.updateStatus,
  ]);

  const LiveTimerNode = <PlayerTimer timestamp={timestamp} />;

  const handleToggleSettings = () => {
    setIsSettingsOpen((prev) => !prev);
  };

  const statusBgClasses = {
    waiting: "bg-stone-100 border-gray-500 text-gray-800",
    queued: "bg-amber-100 border-amber-500 text-amber-900",
    playing: "bg-emerald-100 border-emerald-500 text-emerald-950",
    paid: "bg-rose-100 border-rose-500 text-rose-950",
  };

  const currentStatus = player?.gameStatus || "waiting";
  const bgTheme = statusBgClasses[currentStatus] || statusBgClasses.waiting;

  // 🌟 Same border animation settings applied to the placeholder card layout variation
  const overduePlaceholderStyle = isOverdue
    ? {
        animation: "borderPulse 1.5s infinite ease-in-out",
        borderWidth: "1.5px",
      }
    : {};

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
          onRefreshData={onRefreshData}
          totalGames={totalGames}
          isOverdue={isOverdue}
        />
      </div>

      {draggableProps.isDragging && (
        <div
          style={overduePlaceholderStyle}
          className={`absolute inset-0 flex items-center justify-between p-2 ${bgTheme} rounded-md border text-sm font-medium select-none text-gray-800 pointer-events-none z-0`}
        >
          <div className="flex items-center gap-x-1">
            <PlayerAvatar
              username={username}
              customImageUrl={player?.avatarUrl}
              size="sm"
            />
            <div>
              <span className="truncate text-black font-semibold max-w-[60px] block text-[10px]">
                {username}
              </span>
              <div className="flex items-center gap-x-1">
                <span className="flex items-center gap-x-1">
                  <Gamepad2 size={12} />
                  <span className="text-[10px]">{totalGames}</span>
                </span>
                <span className="text-[9px] bg-white px-0.5 rounded-full">
                  {player?.sessionPlayer?.communityPlayer.skillLevel}
                </span>
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
const PlayersContainer = ({
  players = [],
  onRefreshData,
  communityId,
  sessionId,
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const filteredPlayers = players.filter((player) => {
    if (activeTab !== "all" && player?.gameStatus !== activeTab) {
      return false;
    }

    const username = (
      player?.sessionPlayer?.communityPlayer?.username ||
      player?.communityPlayer?.username ||
      player?.username ||
      ""
    ).toLowerCase();

    return username.includes(debouncedSearch.toLowerCase());
  });

  return (
    <div className="w-full max-w-[400px] max-[1024px]:max-w-[240px] bg-white rounded-lg flex flex-col h-full">
      <header className="flex-shrink-0 border-b border-gray-100 p-2">
        <h4 className="font-semibold text-gray-800">
          Players ({filteredPlayers.length})
        </h4>
        <div className="relative my-1 flex justify-center">
          <div className="relative">
            <input
              type="text"
              placeholder="Search player"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border w-full max-w-[240px] text-xs text-gray-800 rounded-full pl-8 pr-8 py-1 focus:outline-none focus:border-gray-400"
            />
            <span className="absolute top-1.5 left-2.5 text-gray-400">
              <Search size={14} />
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute top-1.5 right-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
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
                onRefreshData={onRefreshData}
                communityId={communityId}
                sessionId={sessionId}
              />
            );
          })
        )}
      </main>
    </div>
  );
};

export default PlayersContainer;
