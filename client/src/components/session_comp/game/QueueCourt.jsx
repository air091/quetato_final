import { EllipsisVertical, GripVertical } from "lucide-react";
import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";

const QueueCourt = ({ queueCourts, allPlayers = [] }) => {
  // Normalize checking whether structure is a direct array or wrapped inside a wrapper layout
  const courtsList =
    queueCourts?.courts || (Array.isArray(queueCourts) ? queueCourts : []);
  const countDisplay = queueCourts?.counts?.queue || courtsList.length;

  return (
    <div className="">
      <h4 className="font-semibold text-gray-700">Queues ({countDisplay})</h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {courtsList.map((queueCourt) => {
          const stableKey = queueCourt?.id;

          return (
            <div
              key={stableKey}
              className="relative p-2 rounded-md bg-white shadow-sm overflow-hidden min-h-[180px]"
            >
              {/* BACKGROUND SVG */}
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 300 150"
                fill="none"
                stroke="rgba(200, 200, 200, 0.8)"
                strokeWidth="2"
                preserveAspectRatio="none"
                className="bg-gray-800/80 absolute top-0 left-0 z-10 rounded-md pointer-events-none"
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

              {/* FOREGROUND CONTENT */}
              <header className="relative z-20 flex items-center justify-between text-white mb-2">
                <span className="text-[14px] font-semibold">
                  {queueCourt?.name}
                </span>
                <button className="cursor-pointer hover:bg-white/10 p-1 rounded-full transition-colors text-white">
                  <EllipsisVertical size={14} />
                </button>
              </header>

              {/* SLOTS AREA */}
              <main className="relative z-20 grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((position) => {
                  const matchedSlot = queueCourt?.slots?.find(
                    (s) => s.position === position,
                  );

                  // Guard the lookup so it only attempts a match if slot data exists
                  const player = matchedSlot
                    ? matchedSlot.sessionPlayer ||
                      allPlayers.find(
                        (p) =>
                          (matchedSlot.sessionPlayerId &&
                            p.id === matchedSlot.sessionPlayerId) ||
                          (matchedSlot.sessionPlayerId &&
                            p.sessionPlayerId === matchedSlot.sessionPlayerId),
                      )
                    : null;

                  const resolvedName =
                    player?.username ||
                    player?.sessionPlayer?.communityPlayer?.username ||
                    player?.communityPlayer?.username ||
                    "";

                  // Unique droppable target string
                  const droppableId = `queue-court-${queueCourt.id}-pos-${position}`;
                  const draggableId =
                    player?.id || matchedSlot?.sessionPlayerId;

                  return (
                    <Droppable droppableId={droppableId} key={droppableId}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`border rounded h-[49px] backdrop-blur-xs flex items-center justify-center transition-colors p-1 overflow-hidden relative ${
                            snapshot.isDraggingOver
                              ? "border-green-400 bg-green-500/20"
                              : "border-white/30 bg-transparent"
                          }`}
                        >
                          {matchedSlot &&
                          player &&
                          draggableId &&
                          resolvedName ? (
                            <Draggable draggableId={draggableId} index={0}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  style={{
                                    ...dragProvided.draggableProps.style,
                                    transform:
                                      dragProvided.draggableProps.style
                                        ?.transform,
                                  }}
                                  {...dragProvided.dragHandleProps}
                                  className={`flex items-center gap-1 w-full h-full px-2 rounded text-xs font-medium select-none text-gray-800 bg-white border shadow-xs ${
                                    dragSnapshot.isDragging
                                      ? "shadow-md border-blue-500 ring-2 ring-blue-100"
                                      : ""
                                  }`}
                                >
                                  <span className="truncate flex-1 text-black font-semibold">
                                    {resolvedName}
                                  </span>
                                  <button className="text-gray-400 p-1">
                                    <EllipsisVertical size={14} />
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          ) : (
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

export default QueueCourt;
