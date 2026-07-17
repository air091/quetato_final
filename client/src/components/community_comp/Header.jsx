import { EllipsisVertical } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import PlayerAvatar from "../PlayerAvatar";
import { API_URL } from "../../contexts/AuthContext";
import { useAuth } from "../../hooks/useAuth";

const Header = ({ communityId, communityPlayer, accessToken }) => {
  const { fetchWithAuth, user } = useAuth();
  const [community, setCommunity] = useState();

  const getCommunityById = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}`,
        {
          method: "GET",
        },
      );
      if (!response) return;

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data?.message || "Internal server error");
      }

      return setCommunity(data.community);
    } catch (error) {
      console.error("Get community by ID failed", error);
    }
  }, [accessToken, communityId, fetchWithAuth]);

  useEffect(() => {
    getCommunityById();
  }, [getCommunityById]);

  const joinCommunity = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/request`,
        { method: "POST" },
      );
      if (!response) return;

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Get community by ID failed", error);
    }
  }, [accessToken, communityId, fetchWithAuth]);

  const handleOnJoinCommunity = async () => {
    await joinCommunity();
  };

  const isManagement =
    communityPlayer?.role === "owner" || communityPlayer?.role === "admin";
  const isRequested = communityPlayer?.status === "requested";
  const isGuest = !communityPlayer;

  return (
    <header className="flex flex-col items-center justify-center px-6 py-5 border-b border-stone-200/60 bg-white selection:bg-orange-500/10 selection:text-orange-950">
      <div className="flex flex-col items-center gap-y-2 text-center max-w-[720px] w-full">
        {/* 1. Community Title & Avatar Banner */}
        <div className="flex items-center gap-x-2.5 justify-center">
          <PlayerAvatar username={community?.name} size="md" />
          <h3 className="text-xl font-extrabold tracking-tight text-stone-900 leading-none">
            {community?.name}
          </h3>
        </div>

        {/* 2. Context Metadata Row */}
        <div className="flex items-center flex-wrap justify-center gap-x-2 text-xs font-bold text-stone-400">
          <span className="font-bold text-stone-600">
            by {community?.owner?.username}
          </span>
          <span className="text-stone-300 mx-0.5" aria-hidden="true">
            ·
          </span>
          <span>
            {community?._count?.players ?? 0}{" "}
            {community?._count?.players === 1 ? "player" : "players"}
          </span>
          <span className="text-stone-300 mx-0.5" aria-hidden="true">
            ·
          </span>
          <span>
            {community?._count?.sessions ?? 0}{" "}
            {community?._count?.sessions === 1 ? "session" : "sessions"}
          </span>
        </div>

        {/* 3. Dynamic Roster Membership Controls */}
        <div className="mt-3 w-full max-w-[180px] flex flex-col gap-y-2">
          {isRequested && (
            <div className="w-full text-center border border-orange-100 bg-orange-50/60 font-bold text-orange-600 py-1.5 rounded-full text-xs select-none">
              Requested
            </div>
          )}

          {isGuest && (
            <button
              onClick={handleOnJoinCommunity}
              className="w-full border border-orange-500 bg-orange-500 font-bold text-white cursor-pointer py-1.5 rounded-full text-xs transition-all duration-150 hover:bg-orange-600 active:scale-[0.98] shadow-sm shadow-orange-500/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/10"
            >
              Join Community
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
