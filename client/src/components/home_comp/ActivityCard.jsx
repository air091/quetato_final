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
    <div className="bg-white rounded-3xl p-8 shadow-md shadow-stone-200/30 border border-stone-200/60 mx-auto w-full max-w-[720px] cursor-pointer hover:border-orange-500/30 transition-all duration-200 selection:bg-orange-500/10 selection:text-orange-950">
      {/* 1. Header Area: Avatar, Title, Host, Status */}
      <header className="flex items-center gap-x-3">
        <div className="relative shrink-0">
          <PlayerAvatar
            username={session?.community.name}
            size="lg"
            rounded="md"
          />
          <div className="absolute -bottom-1 -right-1 ring-2 ring-white rounded-full">
            <PlayerAvatar
              username={session?.creator.username}
              size="sm"
              rounded="full"
            />
          </div>
        </div>
        <div>
          <span className="block font-extrabold text-[17px] text-stone-900 tracking-tight leading-snug">
            {session?.community.name}
          </span>
          <div className="flex items-center gap-x-2 mt-0.5">
            <span className="block font-bold text-stone-500 text-[12px]">
              {session?.creator.username}
            </span>
            <span
              className="w-1 h-1 rounded-full bg-stone-300"
              aria-hidden="true"
            />
            <span className="block font-semibold text-stone-400 text-[12px]">
              {formatCommunityDate(session?.createdAt)}
            </span>
          </div>
        </div>
      </header>

      {/* 2. Main Area: Session Name, Description, Details */}
      <main className="mt-6">
        <div>
          {/* Main Title formatted to match the Friday Q pattern */}
          <h4 className="font-extrabold text-[15px] tracking-tight text-stone-900 leading-snug">
            {session.name}
          </h4>
          <p className="mt-2 text-stone-500 text-xs font-medium leading-relaxed">
            {session.description ??
              "Join the queue and start playing with nearby players."}
          </p>

          {/* Session badges */}
          <div className="flex items-center gap-2 mt-6 flex-wrap">
            {/* Player count Badge (Highlighted Accent) */}
            <span className="rounded-full px-3 py-1 text-[11px] font-bold bg-orange-50/80 text-orange-600 border border-orange-100/60">
              Players: {session._count.players ?? 0}
            </span>

            {/* Location Badge */}
            <span className="rounded-full px-3 py-1 text-[11px] font-semibold bg-stone-50 text-stone-600 border border-stone-200/60">
              {session.location ?? "TBA"}
            </span>

            {/* Start Date Badge */}
            <span className="rounded-full px-3 py-1 text-[11px] font-semibold bg-stone-50 text-stone-600 border border-stone-200/60">
              {session.startAt
                ? `Starts: ${formatDate(session.startAt)}`
                : "Starts any time"}
            </span>

            {/* End Date Badge */}
            <span className="rounded-full px-3 py-1 text-[11px] font-semibold bg-stone-50 text-stone-600 border border-stone-200/60">
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
