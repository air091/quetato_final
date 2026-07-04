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
import All from "./pages/client/community/sub_pages/players_pages/All";
import Dashboard from "./pages/client/community/sub_pages/players_pages/Dashboard";
import SessionLayout from "./layouts/SessionLayout";
import Players from "./pages/client/session/Players";
import Game from "./pages/client/session/Game";
import Payment from "./pages/client/session/Payment";
import AllPlayers from "./pages/client/session/sub_pages/AllPlayers";
import RequestPlayers from "./pages/client/session/sub_pages/RequestPlayers";
import SessionDashboard from "./pages/client/session/Dashboard";

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
            element: <Navigate to="/community/sessions" replace />,
          },
          {
            path: "sessions",
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
                element: <Navigate to="sessions" replace />,
              },
              {
                path: "sessions",
                element: <CommunityActivities />,
              },
              {
                path: "players",
                element: <CommunityPlayers />,
                children: [
                  {
                    index: true,
                    element: <Navigate to="all" replace />,
                  },
                  {
                    path: "all",
                    element: <All />,
                  },
                  {
                    path: "dashboard",
                    element: <Dashboard />,
                  },
                ],
              },
              {
                path: "details",
                element: <CommunityDetails />,
              },
            ],
          },
        ],
      },

      // SESSION
      {
        path: "/community/:communityId/sessions/:sessionId",
        element: <SessionLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: "dashboard",
            element: <SessionDashboard />,
          },
          {
            path: "players",
            element: <Players />,
            children: [
              {
                index: true,
                element: <Navigate to="all" replace />,
              },
              {
                path: "all",
                element: <AllPlayers />,
              },
              {
                path: "requests",
                element: <RequestPlayers />,
              },
            ],
          },
          {
            path: "game",
            element: <Game />,
          },
          {
            path: "payment",
            element: <Payment />,
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
