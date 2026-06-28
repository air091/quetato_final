import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, EllipsisVertical } from "lucide-react";

const PlayersContainer = ({ players }) => {
  return (
    <div className="border w-full md:w-[320px] p-2 bg-white rounded-lg shadow-sm flex flex-col">
      <header className="flex-shrink-0">
        <h4 className="font-semibold text-gray-800">Players</h4>
        {/* Filter buttons... */}
      </header>

      {/* 🟢 FIXED: This single outer div controls the scroll for the entire list section */}
      <div className="overflow-y-auto flex-1 mt-1">
        <Droppable droppableId="player-pool">
          {(provided) => (
            // 🟢 FIXED: The element with droppableProps must NOT have overflow-y-auto or height restraints
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid grid-cols-2 gap-2"
            >
              {players?.map((player, index) => (
                <Draggable
                  key={player.id}
                  draggableId={player.id}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`flex items-center justify-between w-full p-2 border rounded-md select-none bg-white ${
                        snapshot.isDragging
                          ? "shadow-lg border-blue-500 z-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-1 truncate">
                        <span className="text-[13px] font-medium text-gray-800 truncate">
                          {player?.sessionPlayer?.communityPlayer?.username ||
                            player?.username}
                        </span>
                      </div>
                      <button className="text-gray-400 p-1">
                        <EllipsisVertical size={14} />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
};

export default PlayersContainer;
