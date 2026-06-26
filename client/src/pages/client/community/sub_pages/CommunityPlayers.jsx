import React from "react";
import Navbar from "../../../../components/community_comp/players/Navbar";
import { Outlet } from "react-router-dom";

const CommunityPlayers = () => {
  return (
    <div>
      <header>
        <Navbar />
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default CommunityPlayers;
