import React, { useState } from "react";
import { EllipsisVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

// Presentation-only card component (Unmodified)
export const PlayerCard = ({ username, isDragging, isPlaceholder }) => {
  return (
    <div
      className={`w-full cursor-grab flex items-center justify-between p-2 bg-white rounded-md border text-sm font-medium select-none text-gray-800 shadow-xs ${
        isDragging ? "h-[41px] border-blue-500 shadow-md" : "h-full"
      }`}
    >
      <span className="truncate text-black font-semibold">{username}</span>{" "}
      <button className="text-gray-400 p-0.5 cursor-pointer">
        <EllipsisVertical size={14} />
      </button>
    </div>
  );
};

// Internal Draggable Component mirroring MatchCourt's structure
const DraggableSlotPlayer = ({
  username,
  isDragging,
  attributes,
  listeners,
  setNodeRef,
  transform,
}) => {
  const style = {
    transform: CSS.Translate.toString(transform),
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
      <PlayerCard username={username} isDragging={isDragging} />
    </div>
  );
};

const DraggablePlayer = ({ player, username }) => {
  const draggableProps = useDraggable({
    id: `draggable-player-container-${player.id}`,
    data: { player },
  });

  return (
    // FIXED: The outer grid slot item now has structural layout boundaries (w-[132px] h-[41px])
    // to preserve positions within 'flex flex-wrap' layout pools.
    <div className="w-[164px] h-[41px] relative shrink-0">
      {/* 1. THE ACTUALLY DRAGGABLE ITEM */}
      <div className="absolute inset-0 z-100">
        <DraggableSlotPlayer
          username={username}
          isDragging={draggableProps.isDragging}
          attributes={draggableProps.attributes}
          listeners={draggableProps.listeners}
          setNodeRef={draggableProps.setNodeRef}
          transform={draggableProps.transform}
        />
      </div>

      {/* 2. THE BACKGROUND PLACEHOLDER */}
      {draggableProps.isDragging && (
        <div className="absolute inset-0 flex items-center justify-between p-2 bg-white/80 rounded-md border text-sm font-medium select-none text-gray-800 pointer-events-none z-0">
          <span className="truncate flex-1 text-black font-semibold opacity-40">
            {username}
          </span>
          <div className="opacity-30">
            <EllipsisVertical size={14} />
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
          {["all", "waiting", "queued", "paid"].map((tab) => (
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

      {/* FIXED: Added 'justify-start' so row alignments remain uniform as elements wrap */}
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
