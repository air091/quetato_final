import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth"; // Adjust path if necessary
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  // Component States
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Reset error states

    try {
      await register(username, email, password);
      // Automatically navigate to home once successful
      navigate("/");
    } catch (err) {
      // Captures backend error messages sent by registerController
      setError(err.message || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-md border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Create Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Get started with your new account
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
            <span className="font-semibold">⚠️ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="choose a username"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="enter your email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors mt-2"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <div className="text-center text-sm mt-4">
          <span className="text-gray-600">Already have an account? </span>
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
