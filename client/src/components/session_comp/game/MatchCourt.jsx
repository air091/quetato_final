import { EllipsisVertical, GripVertical } from "lucide-react";
import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";

const MatchCourt = ({ matchCourts, allPlayers = [] }) => {
  return (
    <div className="space-y-2 p-2">
      <h4 className="font-semibold text-gray-700">
        Match ({matchCourts?.counts?.match || 0})
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {matchCourts?.courts?.map((matchCourt) => {
          const stableKey = matchCourt?.id;

          return (
            <div
              key={stableKey}
              className="relative p-3 rounded-md bg-white shadow-sm overflow-hidden min-h-[180px]"
            >
              {/* BACKGROUND SVG */}
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 300 150"
                fill="none"
                stroke="rgba(255, 255, 255, 0.25)"
                strokeWidth="2"
                preserveAspectRatio="none"
                className="bg-blue-800/90 absolute top-0 left-0 z-10 rounded-md pointer-events-none"
              >
                <rect x="25" y="15" width="250" height="120" fill="none" />
                <line
                  x1="150"
                  y1="15"
                  x2="150"
                  y2="135"
                  strokeDasharray="5,5"
                />
                <line x1="25" y1="75" x2="275" y2="75" strokeWidth="1" />
              </svg>

              {/* FOREGROUND CONTENT */}
              <header className="relative z-20 flex items-center justify-between text-white mb-3">
                <span className="text-[14px] font-semibold">
                  {matchCourt?.name}
                </span>
                <button className="cursor-pointer hover:bg-white/10 p-1 rounded-full transition-colors text-white">
                  <EllipsisVertical size={14} />
                </button>
              </header>

              {/* SLOTS AREA */}
              <main className="relative z-20 grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((position) => {
                  // Find if there is a slot database row for this position
                  const slotData = matchCourt?.slots?.find(
                    (s) => s.position === position,
                  );

                  // 🟢 Find the full player data from your global state using the slot's ID
                  const matchedPoolPlayer = allPlayers.find(
                    (p) => p.id === slotData?.sessionPlayerId,
                  );

                  // Extract the username regardless of whether your payload structure is flat or nested
                  const username =
                    matchedPoolPlayer?.sessionPlayer?.communityPlayer
                      ?.username ||
                    matchedPoolPlayer?.communityPlayer?.username ||
                    matchedPoolPlayer?.username;

                  const droppableId = `court-${stableKey}-pos-${position}`;

                  return (
                    <Droppable key={position} droppableId={droppableId}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`border rounded min-h-[50px] p-1 flex items-center justify-center transition-all relative ${
                            snapshot.isDraggingOver
                              ? "bg-emerald-500/30 border-emerald-400 scale-[1.02]"
                              : "border-white/20 bg-black/10 backdrop-blur-xs hover:bg-black/20"
                          }`}
                        >
                          {slotData && matchedPoolPlayer ? (
                            // If slot has a sessionPlayerId matched in our state, render them!
                            <Draggable
                              draggableId={matchedPoolPlayer.id}
                              index={0}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={`flex items-center gap-1 w-full bg-white p-1 rounded shadow-sm text-gray-800 text-[12px] select-none z-30 ${
                                    dragSnapshot.isDragging
                                      ? "ring-2 ring-blue-500 shadow-xl"
                                      : ""
                                  }`}
                                >
                                  <div
                                    {...dragProvided.dragHandleProps}
                                    className="text-gray-400 hover:text-gray-600 p-0.5 cursor-grab active:cursor-grabbing"
                                  >
                                    <GripVertical size={12} />
                                  </div>
                                  <span className="font-medium truncate flex-1">
                                    {username || "Unknown Player"}
                                  </span>
                                </div>
                              )}
                            </Draggable>
                          ) : (
                            // Empty slot placeholder hint
                            <span className="absolute text-[10px] text-white/40 tracking-wider font-mono pointer-events-none">
                              Player {position <= 1 ? "A" : "B"}-
                              {position % 2 === 0 ? "1" : "2"}
                            </span>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </main>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MatchCourt;
