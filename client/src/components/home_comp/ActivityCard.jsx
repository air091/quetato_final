import React from "react";
import { useAuth } from "../../hooks/useAuth";
import PlayerAvatar from "../PlayerAvatar";
import {
  formatCommunityDate,
  formatElapsedTime,
} from "../../utils/dateFormatter";

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
      <header className="flex items-end gap-x-2">
        <div className="relative">
          <PlayerAvatar
            username={session?.community.name}
            size="lg"
            rounded="md"
          />
          <div className="absolute bottom-0 right-0 w-fit">
            <PlayerAvatar
              username={session?.creator.username}
              size="sm"
              rounded="full"
            />
          </div>
        </div>
        <div>
          <span className="block leading-4 font-bold text-[18px]">
            {session?.community.name}
          </span>
          <div className="flex items-center gap-x-2">
            <span className="block font-medium text-stone-500 text-[14px]">
              {session?.creator.username}
            </span>
            <span className="block font-medium text-stone-500 text-[14px]">
              {formatCommunityDate(session?.createdAt)}
            </span>
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
