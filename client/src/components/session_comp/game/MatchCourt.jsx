import { EllipsisVertical, GripVertical, Plus } from "lucide-react";
import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";

const MatchCourt = ({ matchCourts, allPlayers = [] }) => {
  const courtsList =
    matchCourts?.courts || (Array.isArray(matchCourts) ? matchCourts : []);
  const countDisplay = matchCourts?.counts?.match || courtsList.length;

  return (
    <div className="">
      <h4 className="font-semibold text-gray-700">Match ({countDisplay})</h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {courtsList.map((matchCourt) => {
          const stableKey = matchCourt?.id;

          return (
            <div
              key={stableKey}
              className="relative p-2 rounded-md bg-white shadow-sm overflow-hidden"
            >
              {/* BACKGROUND COURT SVG */}
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 300 150"
                fill="none"
                stroke="rgba(200, 200, 200, 0.8)"
                strokeWidth="2"
                preserveAspectRatio="none"
                className="bg-blue-900/80 absolute top-0 left-0 z-10 rounded-md pointer-events-none"
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

              {/* FOREGROUND HEADER */}
              <header className="relative z-20 flex flex-col text-white mb-1">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[14px] font-semibold">
                    {matchCourt?.name}
                  </span>
                  <div className="flex items-center gap-x-1">
                    <button className="cursor-pointer bg-stone-800 hover:text-stone-50 px-2 py-1 rounded-full transition-colors text-stone-300 text-[12px]">
                      Start game
                    </button>
                    <button className="cursor-pointer hover:bg-white/10 p-1 rounded-full transition-colors text-white">
                      <EllipsisVertical size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-x-2 mt-1">
                  <button className="w-full text-[14px] py-0.5 bg-orange-700 hover:bg-orange-800 cursor-pointer rounded-full">
                    Team A
                  </button>
                  <button className="w-full text-[14px] py-0.5 bg-gray-700 hover:bg-gray-800 cursor-pointer rounded-full">
                    Team B
                  </button>
                </div>
              </header>

              {/* SLOTS MATRIX */}
              <main className="relative z-20 grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((position) => {
                  const slotData = matchCourt?.slots?.find(
                    (s) => s.position === position,
                  );

                  const matchedPoolPlayer = slotData?.sessionPlayerId
                    ? allPlayers.find((p) => p.id === slotData.sessionPlayerId)
                    : null;

                  const username =
                    matchedPoolPlayer?.sessionPlayer?.communityPlayer
                      ?.username ||
                    matchedPoolPlayer?.communityPlayer?.username ||
                    matchedPoolPlayer?.username;

                  const droppableId = `match-court-${stableKey}-pos-${position}`;

                  return (
                    <Droppable key={position} droppableId={droppableId}>
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
                          {slotData && matchedPoolPlayer ? (
                            <Draggable
                              key={matchedPoolPlayer.id}
                              draggableId={matchedPoolPlayer.id}
                              index={position}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={`flex items-center gap-1 w-full h-full px-2 rounded text-xs font-medium select-none text-gray-800 bg-white border shadow-xs ${
                                    dragSnapshot.isDragging
                                      ? "shadow-md border-blue-500 ring-2 ring-blue-100"
                                      : ""
                                  }`}
                                >
                                  <span className="truncate flex-1 text-black font-semibold">
                                    {username || "Unknown Player"}
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
        <button className="relative border border-blue-900/80 bg-blue-500/20 min-h-[156px] rounded-md flex items-center justify-center gap-x-2 cursor-pointer">
          {/* BACKGROUND COURT SVG */}
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 300 150"
            fill="none"
            stroke="rgba(200, 200, 200, 0.8)"
            strokeWidth="2"
            preserveAspectRatio="none"
            className="bg-blue-900/80 absolute top-0 left-0 z-10 rounded-md pointer-events-none"
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
          <span className="z-20 backdrop-blur-xs rounded-md h-full w-full flex items-center justify-center gap-x-2 text-blue-200 font-medium">
            <span>
              <Plus size={20} />
            </span>
            Add Court
          </span>
        </button>
      </div>
    </div>
  );
};

export default MatchCourt;
