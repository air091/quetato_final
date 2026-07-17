import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth"; // Adjust path if necessary
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

const Register = () => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  // Component States
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false); // Added visibility toggle state

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
    <div className="flex min-h-[85vh] items-center justify-center bg-stone-50/50 px-4 py-12 sm:px-6 lg:px-8 font-sans selection:bg-orange-500/20 selection:text-orange-900">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl shadow-stone-200/40 border border-stone-200/60">
        {/* 🥔 BRAND & HEADER */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center px-4 rounded-full bg-orange-50  mb-3 border border-orange-200">
            {/* Elegant sports/queue representation */}
            <p className="font-extrabold text-lg tracking-tight">
              QUE<span className="text-orange-500">TATO</span> SPORT
            </p>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900">
            Create Account
          </h2>
          <p className="mt-1.5 text-xs font-semibold text-stone-400 uppercase tracking-wider">
            Join the Quetato Sports Roster
          </p>
        </div>

        {/* ⚠️ ERROR STATE */}
        {error && (
          <div className="flex items-start gap-x-2.5 rounded-xl bg-red-50 border border-red-100 p-3.5 text-xs text-red-800 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {/* 📝 FORM FIELDS */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* USERNAME */}
          <div>
            <label
              htmlFor="username"
              className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Choose a username"
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-stone-850 placeholder-stone-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10 text-xs font-medium transition-all duration-200 bg-stone-50/50 focus:bg-white"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label
              htmlFor="email"
              className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email address"
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-stone-850 placeholder-stone-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10 text-xs font-medium transition-all duration-200 bg-stone-50/50 focus:bg-white"
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label
              htmlFor="password"
              className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5"
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
                placeholder="••••••••"
                className="w-full rounded-xl border border-stone-200 pl-3.5 pr-11 py-2.5 text-stone-850 placeholder-stone-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10 text-xs font-medium transition-all duration-200 bg-stone-50/50 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* 🚀 SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full relative flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/10 hover:bg-orange-600 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-orange-500/10 disabled:bg-orange-400 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-200 mt-6 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-3.5 w-3.5" />
                Creating Account...
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        {/* 🔗 SIGN IN REDIRECT */}
        <div className="text-center pt-4 border-t border-stone-100 mt-6">
          <p className="text-xs text-stone-400 font-medium">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-bold text-orange-500 hover:text-orange-600 hover:underline transition-all"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
