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
    <header className="flex items-center justify-center px-6 py-4 border-b border-stone-100 bg-white">
      <div className="flex flex-col gap-y-1">
        <div className="flex items-center gap-x-2 mb-2 justify-center">
          <PlayerAvatar username={community?.name} size="md" />
          {/* Community Title */}
          <h3 className="text-xl font-bold tracking-tight text-stone-900">
            {community?.name}
          </h3>
        </div>
        {/* Context Metadata Row */}
        <div className="flex items-center flex-wrap gap-x-2 text-sm text-stone-500">
          <span className="font-medium text-stone-700">
            by {community?.owner?.username}
          </span>
          <span className="text-stone-300" aria-hidden="true">
            ·
          </span>
          <span className="font-medium">
            {community?._count?.players ?? 0}{" "}
            {community?._count?.players === 1 ? "player" : "players"}
          </span>
          <span className="text-stone-300" aria-hidden="true">
            ·
          </span>
          <span className="font-medium">
            {community?._count?.sessions ?? 0}{" "}
            {community?._count?.sessions === 1 ? "session" : "sessions"}
          </span>
        </div>
        {isRequested && (
          <div className="flex items-center justify-center gap-x-[8px]">
            <span className="bg-gray-300 py-1 rounded-full my-1 text-[14px] text-center px-[16px]">
              Requested
            </span>
          </div>
        )}
        {isGuest && (
          <button
            onClick={handleOnJoinCommunity}
            className="bg-blue-300 py-1 rounded-full my-1 hover:bg-blue-500 hover:text-white cursor-pointer text-[14px]"
          >
            Join Community
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
