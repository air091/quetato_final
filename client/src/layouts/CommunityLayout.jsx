import React from "react";
import { Outlet } from "react-router-dom";

const CommunityLayout = () => {
  return (
    <div>
      <Outlet />
    </div>
  );
};

export default CommunityLayout;
