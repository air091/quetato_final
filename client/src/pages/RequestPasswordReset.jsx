import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { AlertCircle, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const RequestPasswordReset = () => {
  const { requestPasswordReset } = useAuth(); // Get from context
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await requestPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[85vh] items-center justify-center bg-stone-50/50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
        <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl shadow-stone-200/40 border border-stone-200/60 text-center">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900">
            Check Your Email
          </h2>
          <p className="text-stone-600 text-sm leading-relaxed">
            We've sent a password reset link to <strong>{email}</strong>. The
            link will expire in 1 hour.
          </p>
          <div className="pt-4 border-t border-stone-100">
            <NavLink
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Login
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
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            Enter your email address and we'll send you a link to reset your
            password.
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
              className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-stone-850 placeholder-stone-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10 text-xs font-medium transition-all duration-200 bg-stone-50/50 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full relative flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/10 hover:bg-orange-600 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-orange-500/10 disabled:bg-orange-400 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-200 mt-6 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-3.5 w-3.5" />
                Sending...
              </>
            ) : (
              "Send Reset Link"
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

export default RequestPasswordReset;
