import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import {
  ProtectedRoute,
  RedirectIfAuthenticated,
} from "./components/RouteGuards";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import HomeLayout from "./layouts/HomeLayout";
import Home from "./pages/client/Home";
import CommunityLayout from "./layouts/CommunityLayout";
import CommunityFind from "./pages/client/community/CommunityFind";
import CommunityActivity from "./pages/client/community/CommunityActivity";

const router = createBrowserRouter([
  {
    element: <RedirectIfAuthenticated />,
    children: [
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <HomeLayout />,
        children: [
          {
            index: true,
            element: <Home />,
          },
        ],
      },
      {
        path: "/community",
        element: <CommunityLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/community/feed" replace />,
          },
          {
            path: "activities",
            element: <CommunityActivity />,
          },
          {
            path: "find",
            element: <CommunityFind />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
