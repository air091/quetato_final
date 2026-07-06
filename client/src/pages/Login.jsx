import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth"; // Adjust path based on your folder structure
import { NavLink, useNavigate } from "react-router-dom"; // Assuming you are using react-router
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

const Login = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  // Component state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false); // Added show/hide state

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    try {
      // Calls the logic we mapped out in AuthContext
      await login(email, password);

      // If login is successful, redirect to dashboard or home
      navigate("/");
    } catch (err) {
      // Captures the AppError messages sent by your Express backend
      setError(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center bg-gray-50/50 px-4 py-12 sm:px-6 lg:px-8 font-sans selection:bg-blue-500 selection:text-white">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl shadow-gray-100/40 border border-gray-200/60">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Please sign in to your account
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-x-2.5 rounded-xl bg-red-50 border border-red-100 p-3.5 text-sm text-red-800 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="Enter your email address"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200 bg-gray-50/30 focus:bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-300 pl-3.5 pr-11 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200 bg-gray-50/30 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full relative flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/10 hover:bg-blue-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-200 mt-6 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
        <div className="text-center pt-4 border-t border-gray-100 mt-6">
          <p className="text-sm text-gray-500">
            Don't have an account?{" "}
            <NavLink
              to="/register"
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-all"
            >
              Sign Up
            </NavLink>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
