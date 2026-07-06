import React, { useCallback, useEffect, useState } from "react";
import PlayerAvatar from "../../../../components/PlayerAvatar";
import { useOutletContext, useParams, useNavigate } from "react-router-dom"; // Added useNavigate
import { useAuth } from "../../../../hooks/useAuth";
import { Camera, Edit2, Trash, Loader2 } from "lucide-react"; // Added Loader2 for visual delete feedback
import { API_URL } from "../../../../contexts/AuthContext";

const CommunitySettings = () => {
  const { communityId } = useParams();
  const { fetchWithAuth } = useAuth();
  const navigate = useNavigate(); // Hooked up routing redirects

  // Consume shared data context from parent Layout wrapper
  const { community, setCommunity } = useOutletContext();

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // Submittal loading blocker state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // Sync state when layout container loads or re-fetches its model data
  useEffect(() => {
    if (community) {
      setFormData({
        name: community.name || "",
        description: community.description || "",
      });
    }
  }, [community]);

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    if (community) {
      setFormData({
        name: community.name || "",
        description: community.description || "",
      });
    }
    setIsEditing(false);
  };

  const handleOnSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to update profile settings");

      const data = await response.json();
      if (!data.success)
        throw new Error(data?.message || "Internal server error");

      // Mutates Layout state so Header updates tracking simultaneously
      setCommunity((prevCommunity) => ({
        ...prevCommunity,
        ...data.community,
      }));
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating community metadata:", error);
      alert("Could not update community details. Please try again.");
    }
  };

  const deleteCommunity = useCallback(async () => {
    // 1. Structural confirmation guard to prevent accidents
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${community?.name}"? This action cannot be undone and will permanently remove all data in this community.`,
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}`,
        { method: "DELETE" },
      );

      if (!response.ok) throw new Error("Failed to delete the community");

      // 2. Route the operator safely back out to home layout dashboard view
      navigate("/community/sessions");
    } catch (error) {
      console.error("Error deleting community:", error);
      alert(
        "Could not delete community space. Please verify admin credentials.",
      );
    } finally {
      setIsDeleting(false);
    }
  }, [communityId, fetchWithAuth, navigate, community?.name]);

  return (
    <div className="w-full max-w-[720px] mx-auto p-6 bg-white rounded-xl border border-stone-200 shadow-sm mt-6">
      <form onSubmit={handleOnSubmit} className="flex flex-col gap-y-6">
        {/* PROFILE HEADER BLOCK */}
        <div className="flex items-center gap-x-4 pb-6 border-b border-stone-100">
          <div className="relative group cursor-pointer rounded-full overflow-hidden select-none">
            <PlayerAvatar username={community?.name} size="xl" />
            <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <Camera size={18} className="text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="w-full">
                <label htmlFor="edit-name" className="sr-only">
                  Community Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleOnChange}
                  className="block px-3 py-1.5 text-base font-bold border border-stone-200 w-full rounded-lg bg-stone-50/50 focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 outline-none transition-all text-stone-900"
                  required
                />
              </div>
            ) : (
              <h2 className="text-lg font-bold text-stone-900 truncate">
                {community?.name}
              </h2>
            )}
            <p className="text-sm text-stone-500 mt-0.5">
              Organized by{" "}
              <span className="font-medium text-stone-700">
                @{community?.owner?.username || "unknown"}
              </span>
            </p>
          </div>
        </div>

        {/* DESCRIPTION CORE BLOCK */}
        <div className="flex flex-col gap-y-1.5">
          <label
            htmlFor="edit-desc"
            className="block text-xs font-semibold text-stone-700 uppercase tracking-wider"
          >
            Description
          </label>
          {isEditing ? (
            <textarea
              id="edit-desc"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleOnChange}
              placeholder="Tell players what your community is all about..."
              className="block px-3 py-2 text-sm border border-stone-200 w-full rounded-lg bg-stone-50/50 focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 outline-none transition-all placeholder-stone-400 resize-none text-stone-800 leading-relaxed"
            />
          ) : (
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
              {community?.description || (
                <span className="text-stone-400 italic font-normal">
                  No details provided yet.
                </span>
              )}
            </p>
          )}
        </div>

        {/* MUTABLE ACTION MANAGEMENT STRIP */}
        <div className="flex items-center justify-end pt-4 border-t border-stone-100 mt-2">
          {!isEditing ? (
            <div className="flex items-center gap-x-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-x-1.5 px-4 py-2 text-xs font-semibold bg-stone-900 text-stone-100 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer shadow-sm outline-none"
              >
                <Edit2 size={12} />
                Edit Profile
              </button>
              <button
                type="button"
                onClick={deleteCommunity}
                disabled={isDeleting}
                className="flex items-center gap-x-1.5 px-4 py-2 text-xs font-semibold bg-red-900 text-red-100 hover:bg-red-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer shadow-sm outline-none"
              >
                {isDeleting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash size={12} />
                )}
                Delete Community
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-x-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 rounded-lg transition-colors cursor-pointer outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-stone-900 text-stone-100 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer shadow-sm outline-none"
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default CommunitySettings;
