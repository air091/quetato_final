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
import Community from "./pages/client/community/Community";
import CommunityActivities from "./pages/client/community/sub_pages/CommunityActivities";
import CommunityPlayers from "./pages/client/community/sub_pages/CommunityPlayers";
import CommunityDetails from "./pages/client/community/sub_pages/CommunityDetails";

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
            element: <Navigate to="/community/activities" replace />,
          },
          {
            path: "activities",
            element: <CommunityActivity />,
          },
          {
            path: "find",
            element: <CommunityFind />,
          },
          {
            path: ":communityId",
            element: <Community />,
            children: [
              {
                index: true,
                element: <Navigate to="activities" replace />,
              },
              {
                path: "activities",
                element: <CommunityActivities />,
              },
              {
                path: "players",
                element: <CommunityPlayers />,
              },
              {
                path: "details",
                element: <CommunityDetails />,
              },
            ],
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
