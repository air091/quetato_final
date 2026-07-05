import React, { useCallback, useState } from "react";
import PlayerAvatar from "../../../components/PlayerAvatar";
import { useAuth } from "../../../hooks/useAuth";
import { Loader2 } from "lucide-react"; // Imported for submittion indicator state

const CommunityCreate = () => {
  const { fetchWithAuth } = useAuth();
  const [community, setCommunity] = useState({ name: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle standard input updates dynamically
  const handleChange = (e) => {
    const { id, name, value } = e.target;
    setCommunity((prev) => ({
      ...prev,
      [id || name]: value,
    }));
  };

  const createCommunity = useCallback(
    async (e) => {
      // Prevent natural browser page reload rules
      e.preventDefault();
      if (isSubmitting) return;

      setIsSubmitting(true);
      try {
        const response = await fetchWithAuth(
          `http://localhost:8000/api/communities`,
          {
            method: "POST",
            body: JSON.stringify({
              name: community.name,
              description: community.description,
            }),
          },
        );

        if (response && response.ok) {
          const data = await response.json();
          console.log("Success:", data);
          // Optional: Redirect the user or clear state here
          // e.g., navigate(`/communities/${data.id}`);
        }
      } catch (error) {
        console.error("Error creating community:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [community, fetchWithAuth, isSubmitting],
  );

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
      <form onSubmit={createCommunity} className="p-6 flex flex-col space-y-5">
        {/* Avatar/Branding Segment */}
        <div className="flex flex-col items-center justify-center py-4 bg-stone-50/50 rounded-xl gap-y-2 border border-stone-100">
          <PlayerAvatar
            username={community.name || "New Community"}
            size="xl"
            rounded="xl"
          />
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
            value={community.name}
            onChange={handleChange}
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
            value={community.description}
            onChange={handleChange}
            placeholder="Tell members what this community is about, rules, or typical meeting locations..."
            className="w-full bg-stone-50/50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 outline-none focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 transition-all resize-none"
          />
        </div>

        {/* Action Button Strip */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-x-2 px-4 py-2.5 text-sm font-semibold bg-stone-900 text-stone-100 hover:bg-stone-800 active:bg-stone-950 rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              "Create Community"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommunityCreate;
