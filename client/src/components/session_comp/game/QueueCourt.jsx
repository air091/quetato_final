import { EllipsisVertical } from "lucide-react";
import React from "react";

const QueueCourt = ({ queueCourts }) => {
  return (
    <div className="space-y-2 p-2">
      <h4 className="font-semibold text-gray-700">
        Queues ({queueCourts?.counts?.queue || 0})
      </h4>

      <div className="grid grid-cols-3 gap-1">
        {queueCourts?.courts?.map((queueCourt) => {
          const stableKey = queueCourt?.id;
          return (
            <div
              key={stableKey}
              className="relative p-2 rounded-md bg-white hover:bg-gray-50 shadow-sm overflow-hidden"
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
                // Changed z-0 to z-10 for the background layer
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
                ></rect>
                <line
                  x1="150"
                  y1="25"
                  x2="150"
                  y2="125"
                  stroke="rgba(200, 200, 200, 0.8)"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                ></line>
                <line
                  x1="25"
                  y1="50"
                  x2="275"
                  y2="50"
                  stroke="rgba(200, 200, 200, 0.8)"
                  strokeWidth="1.5"
                ></line>
                <line
                  x1="25"
                  y1="100"
                  x2="275"
                  y2="100"
                  stroke="rgba(200, 200, 200, 0.8)"
                  strokeWidth="1.5"
                ></line>
                <line
                  x1="50"
                  y1="25"
                  x2="50"
                  y2="125"
                  stroke="rgba(200, 200, 200, 0.8)"
                  strokeWidth="1.5"
                ></line>
                <line
                  x1="250"
                  y1="25"
                  x2="250"
                  y2="125"
                  stroke="rgba(200, 200, 200, 0.8)"
                  strokeWidth="1.5"
                ></line>
              </svg>

              {/* FOREGROUND CONTENT */}
              {/* Added relative and z-20 to pull the header above the SVG */}
              <header className="relative z-20 flex items-center justify-between text-white mb-2">
                <span className="text-[14px] font-semibold">
                  {queueCourt?.name}
                </span>
                <button className="cursor-pointer hover:bg-gray-700/50 p-1 rounded-full transitions-colors text-white">
                  <EllipsisVertical size={14} />
                </button>
              </header>

              {/* SLOTS */}
              {/* Added relative and z-20 to pull the main grid above the SVG */}
              <main className="relative z-20 grid grid-cols-2 gap-2">
                <span className="border border-white/30 rounded h-[49px] bg-transparent backdrop-blur-xs"></span>
                <span className="border border-white/30 rounded h-[49px] bg-transparent backdrop-blur-xs"></span>
                <span className="border border-white/30 rounded h-[49px] bg-transparent backdrop-blur-xs"></span>
                <span className="border border-white/30 rounded h-[49px] bg-transparent backdrop-blur-xs"></span>
              </main>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QueueCourt;
