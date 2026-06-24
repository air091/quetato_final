import React from "react";
import { createBrowserRouter } from "react-router-dom";
import {
  ProtectedRoute,
  RedirectIfAuthenticated,
} from "./components/RouteGuards";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import HomeLayout from "./layouts/HomeLayout";
import Home from "./pages/client/Home";

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
        element: <HomeLayout />,
        children: [
          {
            path: "/",
            element: <Home />,
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
