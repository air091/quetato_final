import React, { useEffect, useState } from "react";
import PlayerAvatar from "../../../../components/PlayerAvatar"; //[cite: 2]
import { useOutletContext, useParams } from "react-router-dom"; //[cite: 2]
import { useAuth } from "../../../../hooks/useAuth"; //[cite: 2]
import { Camera, Edit2 } from "lucide-react"; //[cite: 2]

const CommunitySettings = () => {
  const { communityId } = useParams(); //[cite: 2]
  const { fetchWithAuth } = useAuth(); //[cite: 2]

  // FIXED: Consume shared data context from parent Layout wrapper
  const { community, setCommunity } = useOutletContext();

  const [isEditing, setIsEditing] = useState(false); //[cite: 2]
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  }); //[cite: 2]

  // Sync state when layout container loads or re-fetches its model data
  useEffect(() => {
    if (community) {
      setFormData({
        name: community.name || "",
        description: community.description || "",
      });
    }
  }, [community]); //[cite: 2]

  const handleOnChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }; //[cite: 2]

  const handleCancel = () => {
    if (community) {
      setFormData({
        name: community.name || "",
        description: community.description || "",
      });
    }
    setIsEditing(false);
  }; //[cite: 2]

  const handleOnSubmit = async (e) => {
    e.preventDefault(); //[cite: 2]

    try {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
          }),
        },
      ); //[cite: 2]

      if (!response.ok) throw new Error("Failed to update profile settings"); //[cite: 2]

      const data = await response.json(); //[cite: 2]
      if (!data.success)
        throw new Error(data?.message || "Internal server error"); //[cite: 2]

      // FIXED: Mutates Layout state so Header updates tracking simultaneously
      setCommunity((prevCommunity) => ({
        ...prevCommunity,
        ...data.community,
      }));
      setIsEditing(false); //[cite: 2]
    } catch (error) {
      console.error("Error updating community metadata:", error); //[cite: 2]
      alert("Could not update community details. Please try again."); //[cite: 2]
    }
  };

  return (
    <div className="w-full max-w-[720px] mx-auto p-6 bg-white rounded-xl border border-stone-200 shadow-sm mt-6">
      <form onSubmit={handleOnSubmit} className="flex flex-col gap-y-6">
        {" "}
        {/*[cite: 2] */}
        {/* PROFILE HEADER BLOCK */}
        <div className="flex items-center gap-x-4 pb-6 border-b border-stone-100">
          {" "}
          {/*[cite: 2] */}
          <div className="relative group cursor-pointer rounded-full overflow-hidden select-none">
            {" "}
            {/*[cite: 2] */}
            <PlayerAvatar username={community?.name} size="xl" />{" "}
            {/*[cite: 2] */}
            <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {" "}
              {/*[cite: 2] */}
              <Camera size={18} className="text-white" /> {/*[cite: 2] */}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            {" "}
            {/*[cite: 2] */}
            {isEditing ? ( //[cite: 2]
              <div className="w-full">
                {" "}
                {/*[cite: 2] */}
                <label htmlFor="edit-name" className="sr-only">
                  {" "}
                  {/*[cite: 2] */}
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
                />{" "}
                {/*[cite: 2] */}
              </div>
            ) : (
              <h2 className="text-lg font-bold text-stone-900 truncate">
                {" "}
                {/*[cite: 2] */}
                {community?.name} {/*[cite: 2] */}
              </h2>
            )}
            <p className="text-sm text-stone-500 mt-0.5">
              {" "}
              {/*[cite: 2] */}
              Organized by {/*[cite: 2] */}
              <span className="font-medium text-stone-700">
                {" "}
                {/*[cite: 2] */}@{community?.owner?.username} {/*[cite: 2] */}
              </span>
            </p>
          </div>
        </div>
        {/* DESCRIPTION CORE BLOCK */}
        <div className="flex flex-col gap-y-1.5">
          {" "}
          {/*[cite: 2] */}
          <label
            htmlFor="edit-desc"
            className="block text-xs font-semibold text-stone-700 uppercase tracking-wider"
          >
            {" "}
            {/*[cite: 2] */}
            Description
          </label>
          {isEditing ? ( //[cite: 2]
            <textarea
              id="edit-desc"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleOnChange}
              placeholder="Tell players what your community is all about..."
              className="block px-3 py-2 text-sm border border-stone-200 w-full rounded-lg bg-stone-50/50 focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 outline-none transition-all placeholder-stone-400 resize-none text-stone-800 leading-relaxed"
            /> //[cite: 2]
          ) : (
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
              {" "}
              {/*[cite: 2] */}
              {community?.description || ( //[cite: 2]
                <span className="text-stone-400 italic font-normal">
                  {" "}
                  {/*[cite: 2] */}
                  No details provided yet.
                </span>
              )}
            </p>
          )}
        </div>
        {/* MUTABLE ACTION MANAGEMENT STRIP */}
        <div className="flex items-center justify-end pt-4 border-t border-stone-100 mt-2">
          {" "}
          {/*[cite: 2] */}
          {!isEditing ? ( //[cite: 2]
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-x-1.5 px-4 py-2 text-xs font-semibold bg-stone-900 text-stone-100 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer shadow-sm outline-none"
            >
              {" "}
              {/*[cite: 2] */}
              <Edit2 size={12} /> {/*[cite: 2] */}
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-x-2">
              {" "}
              {/*[cite: 2] */}
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 rounded-lg transition-colors cursor-pointer outline-none"
              >
                {" "}
                {/*[cite: 2] */}
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-stone-900 text-stone-100 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer shadow-sm outline-none"
              >
                {" "}
                {/*[cite: 2] */}
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
