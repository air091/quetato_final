import React from "react";

const Game = () => {
  return (
    <div>
      {/* PLAYERS */}
      <div className="border w-full max-w-[320px]">
        <header>
          <h4>Players</h4>
          <div className="flex items-center my-2">
            <button className="text-[14px] cursor-pointer hover:bg-gray-200 px-2 py-0.5 rounded w-full">
              All
            </button>
            <button className="text-[14px] cursor-pointer hover:bg-gray-200 px-2 py-0.5 rounded w-full">
              Waiting
            </button>
            <button className="text-[14px] cursor-pointer hover:bg-gray-200 px-2 py-0.5 rounded w-full">
              Queued
            </button>
            <button className="text-[14px] cursor-pointer hover:bg-gray-200 px-2 py-0.5 rounded w-full">
              Court
            </button>
            <button className="text-[14px] cursor-pointer hover:bg-gray-200 px-2 py-0.5 rounded w-full">
              Paid
            </button>
          </div>
        </header>
      </div>
      {/* COURTS */}
      <div></div>
    </div>
  );
};

export default Game;
