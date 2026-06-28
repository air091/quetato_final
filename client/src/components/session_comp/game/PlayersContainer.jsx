import React, { useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { EllipsisVertical } from "lucide-react";

const PlayersContainer = ({ players = [] }) => {
  const [activeTab, setActiveTab] = useState("all");

  // 1. Filter the list based on your actual backend JSON structure
  const filteredPlayers = players.filter((player) => {
    if (activeTab === "all") return true;

    // Safely pull gameStatus and convert to lowercase just in case
    const status = (player?.gameStatus || "").toLowerCase();

    if (activeTab === "waiting") return status === "waiting";
    if (activeTab === "queued") return status === "queued";
    if (activeTab === "paid") return status === "paid";

    return true;
  });

  return (
    <div className="w-full md:w-[320px] bg-white rounded-lg flex flex-col border border-gray-200 shadow-xs h-[600px]">
      <header className="flex-shrink-0 p-2 border-b border-gray-100">
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

      {/* DROPPABLE CONTAINER FOR THE LOBBY */}
      <Droppable droppableId="player-pool">
        {(provided, snapshot) => (
          <main
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2 overflow-y-auto space-y-1.5 transition-colors min-h-[150px] ${
              snapshot.isDraggingOver ? "bg-blue-50/40" : ""
            }`}
          >
            {filteredPlayers.length === 0 ? (
              <div className="text-center text-xs text-gray-400 mt-8 font-medium">
                No players found in this category.
              </div>
            ) : (
              filteredPlayers.map((player, index) => {
                const stableId = String(player?.id);

                // 2. Exact match for your JSON depth: player.sessionPlayer.communityPlayer.username
                const username =
                  player?.sessionPlayer?.communityPlayer?.username ||
                  player?.username ||
                  "Unknown Player";

                return (
                  <Draggable
                    key={stableId}
                    draggableId={stableId}
                    index={index}
                  >
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className={`flex items-center justify-between p-2 rounded-md bg-stone-50 border border-gray-200 shadow-xs text-sm font-medium ${
                          dragSnapshot.isDragging
                            ? "shadow-md border-blue-400 bg-white ring-2 ring-blue-50"
                            : ""
                        }`}
                      >
                        <span className="truncate text-gray-800">
                          {username}
                        </span>
                        <button className="text-gray-400 hover:text-gray-600 p-0.5 transition-colors">
                          <EllipsisVertical size={14} />
                        </button>
                      </div>
                    )}
                  </Draggable>
                );
              })
            )}
            {provided.placeholder}
          </main>
        )}
      </Droppable>
    </div>
  );
};

export default PlayersContainer;
