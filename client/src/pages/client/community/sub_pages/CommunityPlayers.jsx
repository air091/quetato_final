import React from "react";
import Navbar from "../../../../components/community_comp/players/Navbar";
import { Outlet } from "react-router-dom";

const CommunityPlayers = ({ outletContext, communityPlayer }) => {
  console.log(communityPlayer);
  return (
    <div>
      <header>
        <Navbar />
      </header>
      <main>
        <Outlet context={{ ...outletContext, communityPlayer }} />
      </main>
    </div>
  );
};

export default CommunityPlayers;
