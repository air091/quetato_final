import React, { useState } from "react";
import { useCommunity } from "../../../hooks/useCommunity";
import PlayerAvatar from "../../../components/PlayerAvatar";

const CommunityFind = () => {
  const { communities } = useCommunity();
  console.log(communities);
  return (
    <div>
      {communities?.map((community) => (
        // community card
        <div key={community?.id}>
          <div>
            <PlayerAvatar username={community?.name} />
            <div>
              <span>{community?.name}</span>
              <span>
                {community?._count?.players} * {community?._count?.sessions}
              </span>
            </div>
          </div>
          <div></div>
        </div>
      ))}
    </div>
  );
};

export default CommunityFind;
