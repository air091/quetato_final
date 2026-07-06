import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import { AuthProvider } from "./contexts/AuthContext";
import { CommunityProvider } from "./contexts/CommunityContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <CommunityProvider>
        <RouterProvider router={router} />
      </CommunityProvider>
    </AuthProvider>
  </StrictMode>,
);
