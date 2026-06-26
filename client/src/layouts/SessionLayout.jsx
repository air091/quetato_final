import React from "react";
import { Outlet } from "react-router-dom";

const SessionLayout = () => {
  return (
    <div>
      <header></header>
      <Outlet />
    </div>
  );
};

export default SessionLayout;
