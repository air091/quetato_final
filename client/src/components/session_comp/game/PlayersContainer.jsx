import React, { useState } from "react";
import { EllipsisVertical } from "lucide-react";

// Presentation-only card component
export const PlayerCard = ({ username, isAssigned }) => {
  return (
    <div
      className={`flex items-center justify-between p-2 rounded-md border text-sm font-medium select-none w-full`}
    >
      <span className="truncate">{username}</span>{" "}
      <button className="text-gray-400 p-0.5 cursor-pointer">
        <EllipsisVertical size={14} />
      </button>
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

      <main className="flex-1 p-2 overflow-y-auto space-y-1.5 min-h-[150px]">
        {filteredPlayers.length === 0 ? (
          <div className="text-center text-xs text-gray-400 mt-8 font-medium">
            No players found in this category.
          </div>
        ) : (
          filteredPlayers.map((player) => {
            const stableId = player?.sessionPlayer?.id;

            const username =
              player?.sessionPlayer?.communityPlayer?.username ||
              "Unknown Player";

            if (!stableId) return null;

            return (
              <div key={player.id} className="w-full">
                <PlayerCard username={username} />
              </div>
            );
          })
        )}
      </main>
    </div>
  );
};

export default PlayersContainer;
