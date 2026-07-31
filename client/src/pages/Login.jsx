// Login.jsx
import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { NavLink, useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

const Login = () => {
  // Extract only login from useAuth. We no longer rely on the global 'loading' state here.
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Local state to handle button loading UI safely
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldError(false);
    setIsSubmitting(true); // Trigger local loading state

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Invalid email or password. Please try again.");
      setFieldError(true);
      setPassword("");
    } finally {
      setIsSubmitting(false); // Stop local loading state
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center bg-stone-50/50 px-4 py-12 sm:px-6 lg:px-8 font-sans selection:bg-orange-500/20 selection:text-orange-900">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl shadow-stone-200/40 border border-stone-200/60">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-2xl font-bold tracking-tight text-stone-900 leading-4">
            Welcome Back
          </h3>
          <p className="text-xl font-bold tracking-tight text-stone-900">to</p>
          <div className="inline-flex items-center justify-center px-4 rounded-full bg-orange-50 mb-3 border border-orange-200">
            <p className="font-extrabold text-lg tracking-tight">
              QUE<span className="text-orange-500">TATO</span> SPORT
            </p>
          </div>
        </div>

        {/* Error State Banner */}
        {error && (
          <div className="flex items-start gap-x-2.5 rounded-xl bg-red-50 border border-red-100 p-3.5 text-xs text-red-800 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoComplete="email"
              placeholder="Enter your email address"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-stone-850 placeholder-stone-400 focus:outline-none focus:ring-4 text-xs font-medium transition-all duration-200 bg-stone-50/50 focus:bg-white ${
                fieldError
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                  : "border-stone-200 focus:border-orange-500 focus:ring-orange-500/10"
              }`}
            />
          </div>

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
                autoComplete="current-password"
                placeholder="••••••••"
                className={`w-full rounded-xl border pl-3.5 pr-11 py-2.5 text-stone-850 placeholder-stone-400 focus:outline-none focus:ring-4 text-xs font-medium transition-all duration-200 bg-stone-50/50 focus:bg-white ${
                  fieldError
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                    : "border-stone-200 focus:border-orange-500 focus:ring-orange-500/10"
                }`}
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

          <div className="text-right">
            <NavLink
              to="/request-password-reset"
              className="text-xs font-medium text-orange-500 hover:text-orange-600 hover:underline transition-colors"
            >
              Forgot password?
            </NavLink>
          </div>

          {/* Change `loading` to `isSubmitting` */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full relative flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/10 hover:bg-orange-600 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-orange-500/10 disabled:bg-orange-400 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-200 mt-6 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-3.5 w-3.5" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Sign Up Redirect */}
        <div className="text-center pt-4 border-t border-stone-100 mt-6">
          <p className="text-xs text-stone-400 font-medium">
            Don't have an account?{" "}
            <NavLink
              to="/register"
              className="font-bold text-orange-500 hover:text-orange-600 hover:underline transition-all"
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
