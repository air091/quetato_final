import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// 1. Protects private pages (e.g., Dashboard, Profile)
// If NOT logged in -> goes to /login
export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  // CRITICAL: Wait for the refreshSession/profile API check to complete on page reload
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 font-sans">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// 2. Protects auth pages (e.g., Login, Register)
// If ALREADY logged in -> goes to /
export const RedirectIfAuthenticated = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // Keep it clean while checking status
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
};
