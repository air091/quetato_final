import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CornerDownLeft, EllipsisVertical, Plus } from "lucide-react";
import { useState } from "react";
import CourtSettings from "./CourtSettings";

const DraggableSlotPlayer = ({
  username,
  onRemovePlayer,
  isDragging,
  attributes,
  listeners,
  setNodeRef,
  transform,
}) => {
  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 9999 : 20,
    width: "100%",
    height: "100%",
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`player w-full cursor-grab active:cursor-grabbing touch-none flex items-center justify-between p-2 bg-white rounded-md border text-sm font-medium select-none text-gray-800 shadow-xs h-full ${
        isDragging ? "border-blue-500 shadow-md" : ""
      }`}
    >
      <span className="truncate flex-1 text-black font-semibold">
        {username}
      </span>
      <div className="flex items-center gap-x-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemovePlayer();
          }}
          className="text-gray-400 p-0.5 cursor-pointer hover:bg-gray-200 rounded-full z-30"
        >
          <CornerDownLeft size={14} />
        </button>
        <button className="text-gray-400 p-0.5 cursor-pointer hover:bg-gray-200 rounded-full">
          <EllipsisVertical size={14} />
        </button>
      </div>
    </div>
  );
};

const CourtSlot = ({
  position,
  username,
  slotData,
  matchedPoolPlayer,
  courtId,
  courtType,
  onRemovePlayer,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${courtId}-${position}`,
    data: {
      courtId,
      courtType,
      position,
    },
  });

  const handleRemoveClick = () => {
    if (onRemovePlayer && slotData) {
      const targetIdentifier =
        slotData.id || slotData.sessionPlayerId || `opt-${position}`;
      onRemovePlayer(courtId, targetIdentifier);
    }
  };

  const draggableProps = useDraggable({
    id: `draggable-${matchedPoolPlayer?.sessionPlayer?.id || matchedPoolPlayer?.id}`,
    data: { player: matchedPoolPlayer },
  });

  const hasPlayer = slotData && matchedPoolPlayer && username;

  return (
    <div
      ref={setNodeRef}
      className={`border-2 border-dashed rounded h-[49px] flex items-center justify-center transition-all p-1 overflow-hidden relative ${
        isOver
          ? "border-green-400 bg-green-500/20 scale-[1.02]"
          : "border-white/30 bg-transparent"
      }`}
    >
      <span className="absolute text-[10px] text-white/40 tracking-wider font-mono pointer-events-none">
        Player {position % 2 === 0 ? "A" : "B"}-{position <= 1 ? "1" : "2"}
      </span>

      {hasPlayer && (
        <>
          <DraggableSlotPlayer
            username={username}
            onRemovePlayer={handleRemoveClick}
            isDragging={draggableProps.isDragging}
            attributes={draggableProps.attributes}
            listeners={draggableProps.listeners}
            setNodeRef={draggableProps.setNodeRef}
            transform={draggableProps.transform}
          />

          {draggableProps.isDragging && (
            <div className="absolute inset-1 flex items-center justify-between p-2 bg-white/80 rounded-md border text-sm font-medium select-none text-gray-800 pointer-events-none z-10">
              <span className="truncate flex-1 text-black font-semibold">
                {username}
              </span>
              <div className="flex items-center gap-x-1">
                <button className="text-gray-400 p-0.5">
                  <CornerDownLeft size={14} />
                </button>
                <button className="text-gray-400 p-0.5">
                  <EllipsisVertical size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const MatchCourt = ({
  matchCourts,
  players = [],
  onRemovePlayer,
  onAddCourt,
  onUpdateCourtName,
  onDeleteCourt,
}) => {
  const courtsList = matchCourts?.courts || [];
  const countDisplay = matchCourts?.counts?.match || 0;
  const [activeCourtSettingsId, setActiveCourtSettingsId] = useState(null);
  const [settingsAnchor, setSettingsAnchor] = useState(null);

  return (
    <div>
      <h4 className="font-semibold text-gray-700 mb-2">
        Match ({countDisplay})
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {courtsList.map((matchCourt) => {
          const stableKey = matchCourt?.id;
          const isSettingsOpen = activeCourtSettingsId === matchCourt.id;

          const occupiedSlots =
            matchCourt.slots?.filter((slot) => slot.sessionPlayerId) || [];
          const hasTeamAPlayer = occupiedSlots.some(
            (slot) => slot.position % 2 === 0,
          );
          const hasTeamBPlayer = occupiedSlots.some(
            (slot) => slot.position % 2 === 1,
          );
          const canStartGame = hasTeamAPlayer && hasTeamBPlayer;

          return (
            <div
              key={stableKey}
              /* FIX: If this court's settings panel is open, we dynamically force 
                its container to z-40 so it stays above all neighboring court panels.
              */
              className={`relative p-2 rounded-md bg-white shadow-sm transition-all ${
                isSettingsOpen ? "z-40" : "z-10"
              }`}
            >
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 300 150"
                fill="none"
                stroke="rgba(200, 200, 200, 0.8)"
                strokeWidth="2"
                preserveAspectRatio="none"
                className="bg-blue-900/90 absolute top-0 left-0 z-10 rounded-md pointer-events-none"
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

              <header className="relative z-30 flex flex-col items-center justify-between text-white mb-2">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[14px] font-semibold">
                    {matchCourt?.name}
                  </span>
                  <div className="flex items-center gap-x-1 relative">
                    {canStartGame && (
                      <button className="cursor-pointer bg-stone-800 hover:text-stone-50 text-stone-300 text-[12px] py-0.5 px-2 rounded-full transition-colors">
                        Start game
                      </button>
                    )}
                    <button
                      onClick={(event) => {
                        setSettingsAnchor(event.currentTarget);
                        setActiveCourtSettingsId((prev) =>
                          prev === matchCourt.id ? null : matchCourt.id,
                        );
                      }}
                      className="cursor-pointer hover:bg-white/10 rounded-full p-1"
                    >
                      <EllipsisVertical size={16} />
                    </button>

                    {isSettingsOpen && (
                      <CourtSettings
                        court={matchCourt}
                        toggleButtonRef={settingsAnchor}
                        onClose={() => setActiveCourtSettingsId(null)}
                        onUpdateCourtName={onUpdateCourtName}
                        onDeleteCourt={onDeleteCourt}
                        courtType="match"
                      />
                    )}
                  </div>
                </div>
                <div className="flex w-full gap-x-2 mt-1">
                  <button className="cursor-pointer bg-orange-600 hover:bg-orange-700 w-full rounded-full text-[14px] text-stone-300 hover:text-stone-50">
                    Team A
                  </button>
                  <button className="cursor-pointer bg-stone-600 hover:bg-stone-700 w-full rounded-full text-[14px] text-stone-300 hover:text-stone-50">
                    Team B
                  </button>
                </div>
              </header>

              <main className="relative z-20 grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((position) => {
                  const slotData = matchCourt?.slots?.find(
                    (s) => s.position === position,
                  );
                  const matchedPoolPlayer = slotData
                    ? slotData.sessionPlayer ||
                      players.find((p) => p.id === slotData.sessionPlayerId)
                    : null;

                  const username =
                    matchedPoolPlayer?.sessionPlayer?.communityPlayer
                      ?.username ||
                    matchedPoolPlayer?.communityPlayer?.username ||
                    matchedPoolPlayer?.username;

                  return (
                    <CourtSlot
                      key={position}
                      position={position}
                      username={username || "Unknown player"}
                      slotData={slotData}
                      matchedPoolPlayer={matchedPoolPlayer}
                      courtId={matchCourt.id}
                      courtType="match"
                      onRemovePlayer={onRemovePlayer}
                    />
                  );
                })}
              </main>
            </div>
          );
        })}

        <button
          onClick={onAddCourt}
          className="relative rounded-md flex items-center justify-center cursor-pointer border-2 border-blue-900 border-dashed gap-x-2 min-h-[179px]"
        >
          <div className="absolute backdrop-blur-xs rounded-md z-11 h-full w-full bg-white opacity-70 hover:opacity-40"></div>
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 300 150"
            fill="none"
            stroke="rgba(200, 200, 200, 0.8)"
            strokeWidth="2"
            preserveAspectRatio="none"
            className="bg-blue-900/90 absolute top-0 left-0 z-10 rounded-md pointer-events-none"
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
          <span className="block text-blue-900 z-12">
            <Plus size={20} />
          </span>
          <span className="block font-medium text-blue-900 z-12">
            Add Court
          </span>
        </button>
      </div>
    </div>
  );
};

export default MatchCourt;
