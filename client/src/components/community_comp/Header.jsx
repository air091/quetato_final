import { EllipsisVertical } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

const Header = ({ communityId, accessToken }) => {
  const [community, setCommunity] = useState();

  const getCommunityById = useCallback(async () => {
    if (!accessToken) return;
    try {
      const response = await fetch(
        `http://localhost:8000/api/communities/${communityId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
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
  }, [accessToken]);

  useEffect(() => {
    getCommunityById();
  }, []);

  return (
    <header className="flex items-center justify-between border px-4 py-2">
      <div>
        <h3 className="font-medium text-[20px] leading-5">{community?.name}</h3>
        <div>
          <span className="text-[16px] mr-2 font-medium">
            {community?.owner.username}
          </span>
          <span className="text-[14px] mr-2">
            Players: {community?._count.players}
          </span>
          <span className="text-[14px] mr-2">
            Sessions: {community?._count.sessions}
          </span>
        </div>
      </div>
      <div>
        <button className="hover:bg-gray-200 cursor-pointer rounded-full p-1">
          <EllipsisVertical size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
