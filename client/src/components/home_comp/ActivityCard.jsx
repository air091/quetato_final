import React from "react";
import { useAuth } from "../../hooks/useAuth";

const UserIconPlaceholder = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-gray-900"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ActivityCard = ({ session }) => {
  const { user } = useAuth();
  // Enhanced date formatter matching "Friday Q June 19, 2026"
  const formatDate = (date) => {
    if (!date) return null;
    const rawDate = new Date(date);
    const year = rawDate.getFullYear();
    const month = String(rawDate.getMonth() + 1).padStart(2, "0");
    const day = String(rawDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mx-auto w-full max-w-[720px] cursor-pointer">
      {/* 1. Header Area: Avatar, Title, Host, Status */}
      <header className="flex items-start justify-between gap-x-4">
        <div className="flex items-start gap-x-4">
          {/* Community Avatar/Logo placeholder */}
          <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-gray-50 flex-shrink-0 mt-1 overflow-hidden">
            {session.community.avatarUrl ? (
              <img
                src={session.community.avatarUrl}
                alt={session.community.name}
                className="w-full h-full object-cover"
              />
            ) : (
              // Basic placeholder if no URL present
              <span className="font-bold text-gray-400 text-2xl">?</span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-x-3 mt-1">
              <h3 className="font-bold text-[18px] tracking-tight text-gray-950 leading-tight">
                {session.community.name}
              </h3>
              {/* Sport Category Badge */}
              <span className="bg-orange-50 text-orange-600 px-3 py-0.5 rounded-full text-[12px] font-semibold capitalize tracking-wide">
                {session.sport}
              </span>
            </div>

            <div className="flex items-center gap-x-2 mt-2 leading-tight">
              {/* Creator/Host Avatar Placeholder */}
              <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center bg-gray-100 flex-shrink-0 overflow-hidden">
                {session.creator.avatarUrl ? (
                  <img
                    src={session.creator.avatarUrl}
                    alt={session.creator.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-gray-300 text-xs">H</span>
                )}
              </div>
              <span className="font-semibold text-[14px] text-gray-900">
                {session.creator.displayName || session.creator.username}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Area: Session Name, Description, Details */}
      <main className="mt-8">
        <div>
          {/* Main Title formatted to match the Friday Q pattern */}
          <h4 className="font-bold text-[16px] tracking-tight text-gray-950 leading-tight">
            {session.name}
          </h4>
          <p className="mt-2 text-gray-600 text-[14px]">
            {session.description ??
              "Join the queue and start playing with nearby players."}
          </p>

          {/* session badges */}
          <div className="flex items-center gap-2 mt-6 flex-wrap">
            {/* Player count Badge */}
            <span className="rounded-full px-3 py-1 text-[12px] font-medium bg-gray-100 text-gray-700">
              Players: {session._count.players ?? 0}
            </span>

            {/* Location Badge */}
            <span className="rounded-full px-3 py-1 text-[12px] font-medium bg-gray-100 text-gray-700">
              {session.location ?? "TBA"}
            </span>

            {/* Start Date Badge */}
            <span className="rounded-full px-3 py-1 text-[12px] font-medium bg-gray-100 text-gray-700">
              {session.startAt
                ? `Starts: ${formatDate(session.startAt)}`
                : "Starts any time"}
            </span>

            {/* End Date Badge */}
            <span className="rounded-full px-3 py-1 text-[12px] font-medium bg-gray-100 text-gray-700">
              {session.endAt
                ? `Ends: ${formatDate(session.endAt)}`
                : "Ends any time"}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ActivityCard;
