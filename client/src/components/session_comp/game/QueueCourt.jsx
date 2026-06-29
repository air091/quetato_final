import React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { EllipsisVertical } from "lucide-react";

const DraggableSlotPlayer = ({
  matchedPoolPlayer,
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
    width: isDragging ? "132px" : "100%",
    height: isDragging ? "41px" : "100%",
    pointerEvents: isDragging ? "none" : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`w-full cursor-grab active:cursor-grabbing touch-none flex items-center justify-between p-2 bg-white rounded-md border text-sm font-medium select-none text-gray-800 shadow-xs ${
        isDragging ? "h-[41px] border-blue-500 shadow-md" : "h-full"
      }`}
    >
      <span className="truncate flex-1 text-black font-semibold">
        {username}
      </span>
      <button className="text-gray-400 p-0.5 cursor-pointer hover:text-gray-600">
        <EllipsisVertical size={14} />
      </button>
    </div>
  );
};

const QueueSlot = ({
  position,
  username,
  hasPlayer,
  matchedPoolPlayer,
  courtId,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${courtId}-${position}`,
  });

  // Call hook here to monitor internal active dragging state and attach handlers
  const draggableProps = useDraggable({
    id: `draggable-${matchedPoolPlayer?.sessionPlayer?.id || matchedPoolPlayer?.id}`,
    data: { player: matchedPoolPlayer },
  });

  return (
    <div
      ref={setNodeRef}
      className={`border-2 border-dashed rounded h-[49px] flex items-center justify-center transition-all p-1 overflow-hidden relative ${
        isOver
          ? "border-green-400 bg-green-500/20 scale-[1.02]"
          : "border-white/30 bg-transparent"
      }`}
    >
      {/* Background Matrix Text Position Indicator */}
      <span className="absolute text-[10px] text-white/40 tracking-wider font-mono pointer-events-none z-0">
        Player {position <= 1 ? "A" : "B"}-{position % 2 === 0 ? "1" : "2"}
      </span>

      {hasPlayer && username && (
        <>
          {/* 1. Free-floating functional draggable target object */}
          <DraggableSlotPlayer
            matchedPoolPlayer={matchedPoolPlayer}
            username={username}
            isDragging={draggableProps.isDragging}
            attributes={draggableProps.attributes}
            listeners={draggableProps.listeners}
            setNodeRef={draggableProps.setNodeRef}
            transform={draggableProps.transform}
          />

          {/* 2. PLACEHOLDER CARD: Retains structural placeholder presence in slot upon active execution */}
          {draggableProps.isDragging && (
            <div className="absolute inset-1 flex items-center justify-between p-2 bg-white/80 rounded-md border text-sm font-medium select-none text-gray-800 pointer-events-none z-10">
              <span className="truncate flex-1 text-black font-semibold">
                {username}
              </span>
              <button className="text-gray-400 p-0.5">
                <EllipsisVertical size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const QueueCourt = ({ queueCourts, players = [] }) => {
  const courtsList = queueCourts?.courts;
  const countDisplay = queueCourts?.counts?.queue;

  return (
    <div>
      <h4 className="font-semibold text-gray-700 mb-2">
        Queues ({countDisplay})
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {courtsList.map((queueCourt) => {
          const stableKey = queueCourt?.id;

          return (
            <div
              key={stableKey}
              className="relative p-2 rounded-md bg-white shadow-sm overflow-hidden"
            >
              {/* BACKGROUND COURT SVG CANVAS */}
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

              {/* FOREGROUND HEADER CONTENT */}
              <header className="relative z-20 flex items-center justify-between text-white mb-2">
                <span className="text-[14px] font-semibold">
                  {queueCourt?.name}
                </span>
                <div className="flex items-center gap-x-1">
                  <button className="cursor-pointer bg-stone-800 hover:text-stone-50 px-2 py-1 rounded-full transition-colors text-stone-300 text-[12px]">
                    Transfer to court
                  </button>
                  <button className="cursor-pointer hover:bg-white/10 p-1 rounded-full transition-colors text-white">
                    <EllipsisVertical size={16} />
                  </button>
                </div>
              </header>

              {/* SLOTS TARGET ROW MATRIX */}
              <main className="relative z-20 grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((position) => {
                  const matchedSlot = queueCourt?.slots?.find(
                    (s) => s.position === position,
                  );

                  const player = matchedSlot
                    ? matchedSlot.sessionPlayer ||
                      players.find(
                        (p) =>
                          matchedSlot.sessionPlayerId &&
                          p.id === matchedSlot.sessionPlayerId,
                      )
                    : null;

                  const resolvedName =
                    player?.sessionPlayer?.communityPlayer?.username ||
                    "Unknown player";

                  return (
                    <QueueSlot
                      key={position}
                      position={position}
                      username={resolvedName}
                      hasPlayer={!!(matchedSlot && player && resolvedName)}
                      matchedPoolPlayer={player}
                      courtId={queueCourt.id}
                    />
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
