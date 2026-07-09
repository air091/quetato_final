import React from "react";
import Navbar from "../../../../components/community_comp/players/Navbar";
import { Outlet, useOutletContext } from "react-router-dom";

const CommunityPlayers = () => {
  const context = useOutletContext();
  const communityPlayer = context?.communityPlayer;
  return (
    <div>
      <header>
        <Navbar />
      </header>
      <main>
        <Outlet context={{ communityPlayer }} />
      </main>
    </div>
  );
};

export default CommunityPlayers;
