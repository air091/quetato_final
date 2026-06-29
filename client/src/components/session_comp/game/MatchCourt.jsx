import { EllipsisVertical } from "lucide-react";
import React from "react";

const CourtSlot = ({ position, username, slotData, matchedPoolPlayer }) => {
  return (
    <div className="border-2 border-dashed rounded h-[49px] flex items-center justify-center transition-colors p-1 overflow-hidden relative border-white/30 bg-transparent">
      <span className="absolute text-[10px] text-white/40 tracking-wider font-mono pointer-events-none z-0">
        Player {position <= 1 ? "A" : "B"}-{position % 2 === 0 ? "1" : "2"}
      </span>

      {slotData && matchedPoolPlayer && username && (
        <div className="absolute inset-1 flex items-center gap-1 px-2 rounded text-xs font-semibold text-gray-800 bg-white border shadow-xs z-20">
          <span className="truncate flex-1 text-black font-semibold">
            {username}
          </span>
          <button className="text-gray-400 p-1">
            <EllipsisVertical size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

const MatchCourt = ({ matchCourts, allPlayers = [] }) => {
  const courtsList =
    matchCourts?.courts || (Array.isArray(matchCourts) ? matchCourts : []);
  const countDisplay = matchCourts?.counts?.match || courtsList.length;

  return (
    <div>
      <h4 className="font-semibold text-gray-700 mb-2">
        Match ({countDisplay})
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {courtsList.map((matchCourt) => {
          const stableKey = matchCourt?.id;

          return (
            <div
              key={stableKey}
              className="relative p-2 rounded-md bg-white shadow-sm overflow-hidden"
            >
              {/* COURT GRAPHICS CANVAS BACKGROUND */}
              <div className="bg-blue-900/80 absolute inset-0 z-10 pointer-events-none rounded-md" />

              <header className="relative z-20 flex flex-col items-center justify-between text-white mb-2">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[14px] font-semibold">
                    {matchCourt?.name}
                  </span>
                  <button className="cursor-pointer bg-stone-800 text-stone-400 hover:text-stone-200 text-[14px] py-0.5 px-2 rounded-full">
                    Start game
                  </button>
                </div>
              </header>

              <main className="relative z-20 grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((position) => {
                  const slotData = matchCourt?.slots?.find(
                    (s) => s.position === position,
                  );
                  const matchedPoolPlayer = slotData?.sessionPlayerId
                    ? allPlayers.find(
                        (p) =>
                          String(p.id) === String(slotData.sessionPlayerId) ||
                          String(p.sessionPlayerId) ===
                            String(slotData.sessionPlayerId),
                      )
                    : null;

                  const username =
                    matchedPoolPlayer?.sessionPlayer?.communityPlayer
                      ?.username || matchedPoolPlayer?.username;

                  return (
                    <CourtSlot
                      key={position}
                      position={position}
                      username={username}
                      slotData={slotData}
                      matchedPoolPlayer={matchedPoolPlayer}
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

export default MatchCourt;
