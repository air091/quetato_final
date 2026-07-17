import { X } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import Modal from "../../createPortal";
import { API_URL } from "../../../contexts/AuthContext";
import { useAuth } from "../../../hooks/useAuth";

const AddSessionModal = ({
  accessToken,
  communityId,
  getAllSessions,
  isCreateSessionModalOpen,
  setIsCreateSessionModalOpen,
}) => {
  const { fetchWithAuth } = useAuth();
  const [session, setSession] = useState({
    name: "",
    sport: "badminton",
    location: "",
    startAt: "",
    endAt: "",
    description: "",
  });

  const createSession = useCallback(async () => {
    if (!accessToken) return;

    const formattedPayload = {
      ...session,
      startAt: session.startAt ? new Date(session.startAt).toISOString() : null,
      endAt: session.endAt ? new Date(session.endAt).toISOString() : null,
    };

    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/sessions`,
        {
          method: "POST",
          body: JSON.stringify(formattedPayload), // Cleaned up: sends the entire object directly
        },
      );

      if (!response) return;

      if (!response.ok) throw new Error("HTTP failed: " + response.status);

      const data = await response.json();
      if (!data.success)
        throw new Error(data?.message || "Internal server error");

      await getAllSessions();
      // Reset the form state back to default values
      setSession({
        name: "",
        sport: "badminton",
        location: "",
        startAt: "",
        endAt: "",
        description: "",
      });
      setIsCreateSessionModalOpen(false);
    } catch (error) {
      console.error("Error creating session:", error);
    }
    // ✅ FIX: Added necessary dependencies
  }, [
    accessToken,
    communityId,
    fetchWithAuth,
    getAllSessions,
    session,
    setIsCreateSessionModalOpen,
  ]);

  const handleOnChange = (event) => {
    const { name, value } = event.target;
    setSession((prev) => ({ ...prev, [name]: value }));
  };

  const handleOnSubmit = async (event) => {
    event.preventDefault();
    await createSession();
  };

  useEffect(() => {
    if (communityId && accessToken) {
      getAllSessions();
    }
  }, [getAllSessions, communityId, accessToken]);

  return (
    <Modal isOpen={isCreateSessionModalOpen}>
      <div
        onClick={() => setIsCreateSessionModalOpen(false)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4 selection:bg-orange-500/10 selection:text-orange-950"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-xl max-w-[520px] w-full z-999 border border-stone-200/80 overflow-hidden"
        >
          {/* Header Container */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-stone-150">
            <h3 className="text-base font-extrabold text-stone-900 tracking-tight">
              Create New Session
            </h3>
            <button
              type="button"
              onClick={() => setIsCreateSessionModalOpen(false)}
              className="cursor-pointer text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg p-1.5 transition-all outline-none"
            >
              <X size={16} />
            </button>
          </header>

          {/* Main Form Box */}
          <form onSubmit={handleOnSubmit} className="p-6 flex flex-col gap-y-4">
            {/* NAME AND SPORT FIELDS */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full">
                <label
                  htmlFor="name"
                  className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={session.name}
                  onChange={handleOnChange}
                  placeholder="e.g., Friday Night Smash"
                  className="block px-3 py-2 text-sm border border-stone-200 w-full rounded-xl bg-stone-50/50 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder-stone-400 font-medium"
                />
              </div>
              <div className="w-full sm:w-auto sm:min-w-[160px]">
                <label
                  htmlFor="sport"
                  className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5"
                >
                  Sport
                </label>
                <select
                  name="sport"
                  id="sport"
                  value={session.sport}
                  onChange={handleOnChange}
                  className="block px-3 py-2 text-sm border border-stone-200 w-full cursor-pointer rounded-xl bg-stone-50/50 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all text-stone-800 font-bold"
                >
                  <option value="badminton">Badminton</option>
                </select>
              </div>
            </div>

            {/* LOCATION FIELD */}
            <div>
              <label
                htmlFor="location"
                className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5"
              >
                Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                placeholder="e.g., Court 3, Downtown Sports Complex"
                value={session.location}
                onChange={handleOnChange}
                className="block px-3 py-2 text-sm border border-stone-200 w-full rounded-xl bg-stone-50/50 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder-stone-400 font-medium"
              />
            </div>

            {/* TIMING CONFIGURATIONS */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full">
                <label
                  htmlFor="startAt"
                  className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5"
                >
                  Starts at
                </label>
                <input
                  id="startAt"
                  type="datetime-local"
                  name="startAt"
                  value={session.startAt}
                  onChange={handleOnChange}
                  className="block px-3 py-2 text-sm border border-stone-200 w-full rounded-xl bg-stone-50/50 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all text-stone-800 font-semibold"
                />
              </div>
              <div className="w-full">
                <label
                  htmlFor="endAt"
                  className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5"
                >
                  Ends at
                </label>
                <input
                  id="endAt"
                  type="datetime-local"
                  name="endAt"
                  value={session.endAt}
                  onChange={handleOnChange}
                  className="block px-3 py-2 text-sm border border-stone-200 w-full rounded-xl bg-stone-50/50 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all text-stone-800 font-semibold"
                />
              </div>
            </div>

            {/* DESCRIPTION CONTAINER */}
            <div>
              <label
                htmlFor="description"
                className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1.5"
              >
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                value={session.description}
                onChange={handleOnChange}
                placeholder="Provide guidelines, queue rules, or required gear specs for players..."
                className="block px-3 py-2 text-sm border border-stone-200 w-full rounded-xl bg-stone-50/50 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder-stone-400 resize-none font-medium"
              ></textarea>
            </div>

            {/* ACTION FOOTER */}
            <div className="flex items-center justify-end gap-x-2 pt-4 border-t border-stone-150 mt-2">
              <button
                type="button"
                onClick={() => setIsCreateSessionModalOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-800 bg-stone-100 hover:bg-stone-200/70 rounded-xl transition-all cursor-pointer outline-none active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98] rounded-xl transition-all cursor-pointer shadow-md shadow-orange-500/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-500/10"
              >
                Create Session
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default AddSessionModal;
