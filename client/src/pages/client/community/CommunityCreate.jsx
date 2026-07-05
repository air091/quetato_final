import React from "react";
import PlayerAvatar from "../../../components/PlayerAvatar";

const CommunityCreate = () => {
  return (
    <div className="w-full max-w-[720px] mx-auto select-none bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden my-4">
      {/* Top Header bar */}
      <div className="p-5 border-b border-stone-100">
        <h3 className="font-bold text-lg text-stone-900">Create Community</h3>
        <p className="text-xs text-stone-500 mt-0.5">
          Establish a new community space to manage players, match tracking, and
          sessions.
        </p>
      </div>

      {/* Main Form Content */}
      <form className="p-6 flex flex-col space-y-5">
        {/* Avatar/Branding Segment */}
        <div className="flex flex-col items-center justify-center py-4 bg-stone-50/50 rounded-xl gap-y-2">
          <PlayerAvatar size="xl" />
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Community Profile
          </span>
        </div>

        {/* Community Name Field */}
        <div className="flex flex-col gap-y-1.5">
          <label
            htmlFor="name"
            className="text-xs font-bold text-stone-700 uppercase tracking-wide"
          >
            Community Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            placeholder="e.g., Downtown Badminton Club"
            className="w-full bg-stone-50/50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 outline-none focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all"
          />
        </div>

        {/* Community Description Field */}
        <div className="flex flex-col gap-y-1.5">
          <label
            htmlFor="description"
            className="text-xs font-bold text-stone-700 uppercase tracking-wide"
          >
            Description
          </label>
          <textarea
            name="description"
            id="description"
            rows={4}
            placeholder="Tell members what this community is about, rules, or typical meeting locations..."
            className="w-full bg-stone-50/50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 outline-none focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all resize-none"
          />
        </div>

        {/* Action Button Strip */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full px-4 py-2.5 text-sm font-semibold bg-stone-900 text-stone-100 hover:bg-stone-800 active:bg-stone-950 rounded-xl transition-colors cursor-pointer shadow-sm text-center"
          >
            Create Community
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommunityCreate;
