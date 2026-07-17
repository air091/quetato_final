import React, { useCallback, useState } from "react";
import PlayerAvatar from "../../../components/PlayerAvatar";
import { useAuth } from "../../../hooks/useAuth";
import { Loader2 } from "lucide-react"; // Imported for submittion indicator state
import { API_URL } from "../../../contexts/AuthContext";
import { useCommunity } from "../../../hooks/useCommunity";
import { useNavigate } from "react-router-dom";

const CommunityCreate = () => {
  const { fetchWithAuth } = useAuth();
  const [community, setCommunity] = useState({ name: "", description: "" });
  const { getMyCommunities } = useCommunity();
  const navigate = useNavigate();
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
        const response = await fetchWithAuth(`${API_URL}/api/communities`, {
          method: "POST",
          body: JSON.stringify({
            name: community.name,
            description: community.description,
          }),
        });

        if (response && response.ok) {
          const data = await response.json();
          await getMyCommunities();

          if (data?.community.id) {
            navigate(`/community/${data.community.id}/sessions`);
          }
        }
      } catch (error) {
        console.error("Error creating community:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [community, fetchWithAuth, isSubmitting, getMyCommunities, navigate],
  );

  return (
    <div className="w-full max-w-[720px] mx-auto bg-white border border-stone-200/80 rounded-2xl shadow-sm shadow-stone-100/50 overflow-hidden my-6 selection:bg-orange-500/10 selection:text-orange-950">
      {/* Top Header bar */}
      <div className="p-6 border-b border-stone-100">
        <h3 className="font-extrabold text-lg text-stone-900 tracking-tight">
          Create Community
        </h3>
        <p className="text-xs text-stone-500 font-medium mt-1 leading-relaxed">
          Establish a new community space to manage players, match tracking, and
          public sessions.
        </p>
      </div>

      {/* Main Form Content */}
      <form onSubmit={createCommunity} className="p-6 flex flex-col space-y-5">
        {/* Avatar/Branding Segment */}
        <div className="flex flex-col items-center justify-center py-5 bg-stone-50/40 rounded-2xl gap-y-2 border border-stone-200/50">
          <PlayerAvatar
            username={community.name || "New Community"}
            size="xl"
            rounded="xl"
          />
          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded border border-orange-100/40 mt-1">
            Community Profile Preview
          </span>
        </div>

        {/* Community Name Field */}
        <div className="flex flex-col gap-y-1.5">
          <label
            htmlFor="name"
            className="text-[11px] font-bold text-stone-600 uppercase tracking-wider"
          >
            Community Name{" "}
            <span className="text-orange-500 font-extrabold">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            value={community.name}
            onChange={handleChange}
            placeholder="e.g., Downtown Badminton Club"
            className="w-full bg-stone-50/40 border border-stone-200/80 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium"
          />
        </div>

        {/* Community Description Field */}
        <div className="flex flex-col gap-y-1.5">
          <label
            htmlFor="description"
            className="text-[11px] font-bold text-stone-600 uppercase tracking-wider"
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
            className="w-full bg-stone-50/40 border border-stone-200/80 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all resize-none font-medium leading-relaxed"
          />
        </div>

        {/* Action Button Strip */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-x-2 px-4 py-3 text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98] rounded-xl transition-all cursor-pointer shadow-md shadow-orange-500/10 disabled:opacity-75 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating Community...
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
