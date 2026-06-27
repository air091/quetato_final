import React from "react";

const QueueCourt = ({ matchCourts }) => {
  return (
    <div className="space-y-2 p-2">
      <h4 className="font-semibold text-gray-700">
        Match ({matchCourts?.counts?.match || 0})
      </h4>

      <div className="flex flex-col gap-2">
        {matchCourts?.courts?.map((matchCourt) => {
          const stableKey = matchCourt?.id;
          return (
            <div
              key={stableKey}
              className="p-2 border rounded-md bg-white hover:bg-gray-50 shadow-sm"
            >
              <span className="text-[14px] font-medium text-gray-800">
                {matchCourt?.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QueueCourt;
