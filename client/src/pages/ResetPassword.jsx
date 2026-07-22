import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword, validateResetToken } = useAuth();
  const [token, setToken] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  // Extract token from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get("token");

    if (!tokenParam) {
      setError("No reset token provided");
      setValidating(false);
      return;
    }

    setToken(tokenParam);
    validateToken(tokenParam);
  }, [location, validateResetToken]);

  const validateToken = async (token) => {
    try {
      await validateResetToken(token);
      setTokenValid(true);
    } catch (err) {
      setError(err.message || "This reset link is invalid or has expired");
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate passwords
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, newPassword);
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (validating) {
    return (
      <div className="flex min-h-[85vh] items-center justify-center bg-stone-50/50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl shadow-stone-200/40 border border-stone-200/60 text-center">
          <Loader2 className="h-12 w-12 text-orange-500 animate-spin mx-auto" />
          <p className="text-stone-600 text-sm">
            Validating your reset link...
          </p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (error && !tokenValid) {
    return (
      <div className="flex min-h-[85vh] items-center justify-center bg-stone-50/50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl shadow-stone-200/40 border border-stone-200/60 text-center">
          <div className="flex justify-center">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900">
            Invalid Reset Link
          </h2>
          <p className="text-stone-600 text-sm leading-relaxed">{error}</p>
          <div className="pt-4 border-t border-stone-100">
            <NavLink
              to="/request-password-reset"
              className="inline-flex items-center gap-2 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
            >
              Request New Reset Link
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-[85vh] items-center justify-center bg-stone-50/50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl shadow-stone-200/40 border border-stone-200/60 text-center">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900">
            Password Reset Successful!
          </h2>
          <p className="text-stone-600 text-sm leading-relaxed">
            Your password has been reset successfully. You will be redirected to
            login shortly.
          </p>
          <div className="pt-4 border-t border-stone-100">
            <NavLink
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
            >
              <ArrowLeft size={16} />
              Go to Login
            </NavLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[85vh] items-center justify-center bg-stone-50/50 px-4 py-12 sm:px-6 lg:px-8 font-sans selection:bg-orange-500/20 selection:text-orange-900">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl shadow-stone-200/40 border border-stone-200/60">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center px-4 rounded-full bg-orange-50 mb-3 border border-orange-200">
            <p className="font-extrabold text-lg tracking-tight">
              QUE<span className="text-orange-500">TATO</span> SPORT
            </p>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900">
            Create New Password
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            Enter your new password below.
          </p>
        </div>

        {/* Error State */}
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
              htmlFor="newPassword"
              className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Enter new password (min. 8 characters)"
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

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5"
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Confirm your new password"
                className="w-full rounded-xl border border-stone-200 pl-3.5 pr-11 py-2.5 text-stone-850 placeholder-stone-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10 text-xs font-medium transition-all duration-200 bg-stone-50/50 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full relative flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/10 hover:bg-orange-600 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-orange-500/10 disabled:bg-orange-400 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-200 mt-6 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-3.5 w-3.5" />
                Resetting Password...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>

        {/* Back to Login */}
        <div className="text-center pt-4 border-t border-stone-100 mt-6">
          <NavLink
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Login
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
