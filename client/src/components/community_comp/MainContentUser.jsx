import React from "react";
import { Outlet } from "react-router-dom";
import SubHeader from "./SubHeader"; // A custom subheader for regular users

const MainContentUser = ({ outletContext, communityPlayer }) => {
  return (
    <div className="px-4 flex flex-col gap-y-2 py-2 overflow-hidden">
      {/* Non-admin customized subheader */}
      <SubHeader communityPlayer={communityPlayer} />

      {/* Main content placeholder */}
      <main className="">
        {/* Pass communityPlayer through context to sub-pages if they need it */}
        <Outlet context={{ ...outletContext, communityPlayer }} />
      </main>
    </div>
  );
};

export default MainContentUser;
