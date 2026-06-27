import React from "react";

const QueueCourt = ({ queueCourts }) => {
  return (
    <div className="space-y-2 p-2">
      <h4 className="font-semibold text-gray-700">
        Queues ({queueCourts?.counts?.queue || 0})
      </h4>

      <div className="flex flex-col gap-2">
        {queueCourts?.courts?.map((queueCourt) => {
          const stableKey = queueCourt?.id;
          return (
            <div
              key={stableKey}
              className="p-2 border rounded-md bg-white hover:bg-gray-50 shadow-sm"
            >
              <span className="text-[14px] font-medium text-gray-800">
                {queueCourt?.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QueueCourt;
