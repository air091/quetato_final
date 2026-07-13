import React, { useState } from "react";
import { useCommunity } from "../../../hooks/useCommunity";
import PlayerAvatar from "../../../components/PlayerAvatar";
import { Dot, Users, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

const CommunityFind = () => {
  const { user } = useAuth();
  const { communities } = useCommunity();
  const navigate = useNavigate();
  console.log(communities);
  const handleJoinClick = (e, communityId) => {
    e.stopPropagation();
    console.log(`Joining community: ${communityId}`);
  };

  return (
    <div className="w-full max-w-[1024px] mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">
          Explore Communities
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Find and join communities.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {communities?.map((community) => {
          // 1. Check if the current user is the owner
          const isOwner = community.ownerId === user?.id;

          // 2. Check if the current user has a pending request in the array
          // Note: If your backend mapped User data inside 'communityPlayer', use: p.communityPlayer?.id === user?.id
          const isRequested = community?.players?.some(
            (p) => p.id === user?.id,
          );

          console.log(community?.players?.id, "user:", user?.id);
          return (
            <div
              key={community?.id}
              onClick={() => navigate(`/community/${community.id}/players`)}
              className="flex flex-col justify-between border border-stone-200 bg-white p-4 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md hover:border-stone-300"
            >
              <div className="flex flex-col items-center text-center gap-y-3">
                <PlayerAvatar username={community?.name} size="xl" />

                <div className="flex flex-col gap-y-1 w-full">
                  <span
                    className="block font-bold text-stone-800 text-base truncate px-2"
                    title={community?.name}
                  >
                    {community?.name}
                  </span>

                  <div className="flex items-center justify-center text-xs font-medium text-stone-500">
                    <span className="flex items-center">
                      {community?._count?.players || 0} players
                    </span>
                    <Dot className="text-stone-300" />
                    <span className="flex items-center">
                      {community?._count?.sessions || 0} sessions
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Conditional Action UI */}
              {!isOwner && (
                <>
                  {isRequested ? (
                    /* Disabled visual feedback state instead of disappearing completely, which prevents layout shifts */
                    <div className="w-full mt-4 text-center border border-stone-200 bg-stone-50 font-medium text-stone-400 px-4 py-2 rounded-lg text-sm select-none">
                      Requested
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleJoinClick(e, community?.id)}
                      className="w-full mt-4 border border-stone-300 bg-white font-semibold text-stone-700 cursor-pointer px-4 py-2 rounded-lg text-sm transition-colors hover:bg-stone-100 active:bg-stone-100"
                    >
                      Join Community
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CommunityFind;
