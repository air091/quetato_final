import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { EllipsisVertical } from "lucide-react";

const PlayersContainer = ({ players }) => {
  return (
    <>
      {/* PLAYERS PANEL */}
      <div className="border w-full max-w-[320px] p-2 bg-white rounded-lg shadow-sm">
        <header>
          <h4 className="font-semibold text-gray-800">Players</h4>
          <div className="flex items-center my-2 gap-1 bg-gray-100 p-1 rounded-md">
            <button className="text-[12px] font-medium hover:bg-white py-1 rounded w-full transition-all shadow-sm">
              All
            </button>
            <button className="text-[12px] font-medium hover:bg-white py-1 rounded w-full transition-all">
              Waiting
            </button>
            <button className="text-[12px] font-medium hover:bg-white py-1 rounded w-full transition-all">
              Queued
            </button>
            <button className="text-[12px] font-medium hover:bg-white py-1 rounded w-full transition-all">
              Court
            </button>
            <button className="text-[12px] font-medium hover:bg-white py-1 rounded w-full transition-all">
              Paid
            </button>
          </div>
        </header>

        {/* 🌟 2. Droppable container zone definition */}
        <Droppable droppableId="player-pool">
          {(provided) => (
            <div
              className="grid grid-cols-2 gap-1 overflow-y-auto"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {players?.map((player, index) => (
                // 🌟 3. Individual Draggable wrappers
                <Draggable
                  key={player.id}
                  draggableId={player.id}
                  index={index}
                  // 🟢 Fix: Forces mobile users to long-press for 250ms before dragging activates.
                  // This allows smooth normal scrolling when swiping quickly!
                  sensors={[
                    {
                      sensor: "touch",
                      options: {
                        activationConstraint: {
                          delay: 300, // Time in milliseconds (250ms-300ms is standard for a natural mobile long-press feel)
                          tolerance: 5, // Allows 5px of finger wiggle before canceling the activation hold
                        },
                      },
                    },
                  ]}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`flex items-center justify-between w-full p-1 border rounded-md select-none bg-white transition-shadow ${
                        snapshot.isDragging
                          ? "shadow-lg border-blue-500 scale-105 z-50 ring-2 ring-blue-400"
                          : "hover:bg-gray-50 active:scale-95 touch-none" // 🟢 Clean touch feedback hint
                      }`}
                    >
                      {/* Card content remains exactly the same... */}
                      <div className="flex flex-col">
                        <span className="leading-5 font-medium text-[12px] text-gray-800">
                          {player?.sessionPlayer?.communityPlayer?.username}
                        </span>
                        <div className="flex items-center gap-x-1">
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 rounded-full text-gray-700">
                            Beg
                          </span>

                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 rounded-full text-gray-700">
                            {player?.sessionPlayer?.communityPlayer?.type}
                          </span>
                        </div>
                      </div>
                      <div>
                        <button className="p-1 hover:bg-gray-200 rounded-full text-gray-500 cursor-pointer">
                          <EllipsisVertical size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {/* 🌟 Crucial placeholder keeping layout dimension spacing stable during active drags */}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </>
  );
};

export default PlayersContainer;
