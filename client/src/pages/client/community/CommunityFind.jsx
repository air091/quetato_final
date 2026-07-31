import React, { useState } from "react";
import { useCommunity } from "../../../hooks/useCommunity";
import PlayerAvatar from "../../../components/PlayerAvatar";
import { Dot, Users, Calendar, SearchX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

const CommunityFind = () => {
  const { user } = useAuth();
  const { communities } = useCommunity();
  const navigate = useNavigate();

  const handleJoinClick = (e, communityId) => {
    e.stopPropagation();
    console.log(`Joining community: ${communityId}`);
  };

  return (
    // Scaled container max-width and fluid padding for larger screens
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 selection:bg-orange-500/10 selection:text-orange-950">
      {/* Header */}
      <header className="mb-6 sm:mb-8 px-1 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Explore Communities
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 font-medium mt-2 leading-relaxed max-w-2xl">
          Find and join active sports communities and sessions around your area.
        </p>
      </header>

      {/* Empty State Fallback */}
      {!communities || communities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-stone-50/50 border border-stone-200/60 rounded-2xl">
          <SearchX className="h-10 w-10 text-stone-300 mb-4" />
          <h3 className="text-sm font-bold text-stone-700">
            No communities found
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Check back later for new sports communities in your area.
          </p>
        </div>
      ) : (
        /* 
          Responsive Grid:
          - Mobile (375/425px): 1 column (default)
          - Tablet (768px): 2 columns (sm/md)
          - Laptop (1024px): 3 columns (lg)
          - Desktop (1440px+): 4 columns (xl)
        */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {communities?.map((community) => {
            // 1. Is the user the creator/owner?
            const isOwner = community.ownerId === user?.id;

            // Find if this specific user has a relation entry in this community card
            const userRelation = community?.players?.find(
              (p) => p.communityPlayer?.id === user?.id,
            );

            // 2. Is the user an accepted member?
            const isAccepted = userRelation?.status === "accepted";

            // 3. Is the user's join request pending?
            const isRequested = userRelation?.status === "requested";

            return (
              <div
                key={community?.id}
                onClick={() => navigate(`/community/${community.id}/players`)}
                className="flex flex-col justify-between border border-stone-200/80 bg-white p-5 rounded-2xl cursor-pointer transition-all duration-250 hover:-translate-y-1 hover:shadow-lg hover:shadow-stone-200/30 hover:border-orange-500/20 active:scale-[0.99] group"
              >
                <div className="flex flex-col items-center text-center gap-y-4">
                  <div className="relative shrink-0 transition-transform duration-300 group-hover:scale-105">
                    <PlayerAvatar username={community?.name} size="xl" />
                  </div>

                  <div className="flex flex-col gap-y-1.5 w-full">
                    <span
                      className="block font-extrabold text-stone-900 text-sm sm:text-base tracking-tight truncate px-1"
                      title={community?.name}
                    >
                      {community?.name}
                    </span>

                    <div className="flex items-center justify-center text-[11px] font-bold text-stone-400">
                      <span className="flex items-center">
                        {community?._count?.players || 0} players
                      </span>
                      <Dot className="text-stone-300 mx-0.5" />
                      <span className="flex items-center">
                        {community?._count?.sessions || 0} sessions
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Conditional Action UI Layout Engine */}
                <div className="mt-6 w-full">
                  {isOwner || isAccepted ? (
                    /* User is already safely inside this community */
                    <div className="w-full text-center border border-stone-200/60 bg-stone-50 font-bold text-stone-500 px-4 py-2.5 rounded-xl text-xs select-none">
                      {isOwner ? "Owner" : "Member"}
                    </div>
                  ) : isRequested ? (
                    /* Request is logged but awaiting confirmation */
                    <div className="w-full text-center border border-orange-100 bg-orange-50/60 font-bold text-orange-600 px-4 py-2.5 rounded-xl text-xs select-none">
                      Requested
                    </div>
                  ) : (
                    /* Active state hook for pristine users */
                    <button
                      onClick={(e) => handleJoinClick(e, community?.id)}
                      className="w-full border border-orange-500 bg-orange-500 font-bold text-white cursor-pointer px-4 py-2.5 rounded-xl text-xs transition-all duration-150 hover:bg-orange-600 active:scale-[0.98] shadow-sm shadow-orange-500/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/10"
                    >
                      Join Community
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommunityFind;
