import React, { useState, useEffect, useCallback } from "react";
import Modal from "../../createPortal";
import { X } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";

const EditSessionModal = ({
  accessToken,
  communityId,
  getAllSessions,
  isEditSessionModalOpen,
  setIsEditSessionModalOpen,
  session,
}) => {
  const { fetchWithAuth } = useAuth();

  const [sessionData, setSessionData] = useState({
    name: "",
    sport: "badminton",
    location: "",
    startAt: "",
    endAt: "",
    description: "",
  });

  useEffect(() => {
    if (session) {
      setSessionData({
        name: session.name || "",
        sport: session.sport || "badminton",
        location: session.location || "",
        startAt: session.startAt
          ? new Date(session.startAt).toISOString().slice(0, 16)
          : "",
        endAt: session.endAt
          ? new Date(session.endAt).toISOString().slice(0, 16)
          : "",
        description: session.description || "",
      });
    }
  }, [session, isEditSessionModalOpen]);

  const handleOnChange = (event) => {
    const { name, value } = event.target;
    setSessionData((prev) => ({ ...prev, [name]: value }));
  };

  const updateSession = async () => {
    try {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/sessions/${session?.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(sessionData),
        },
      );

      if (!response.ok) throw new Error("Failed to update session");

      const data = await response.json();
      if (!data.success)
        throw new Error(data?.message || "Internal server error");

      if (getAllSessions) getAllSessions();
      setIsEditSessionModalOpen(false);
    } catch (error) {
      console.error("Error updating session:", error);
      alert("Could not update session. Please try again.");
    }
  };

  const handleOnSubmit = async (event) => {
    event.preventDefault();
    await updateSession();
  };

  // FIXED: Dynamic route injection, state refreshes, and clear error logs
  const startEndSession = useCallback(
    async (isAvailable) => {
      if (!session?.id) return;

      try {
        const endpoint = isAvailable ? "end" : "start";
        const response = await fetchWithAuth(
          `http://localhost:8000/api/communities/${communityId}/sessions/${session.id}/${endpoint}`,
          { method: "PUT" },
        );

        if (!response.ok) throw new Error(`Failed to ${endpoint} session`);

        const data = await response.json();
        if (!data.success) throw new Error(data?.message || "Action failed");

        // Instantly sync the listing table UI updates
        if (getAllSessions) getAllSessions();
        setIsEditSessionModalOpen(false);
      } catch (error) {
        console.error(`Error toggling session state:`, error);
        alert("Could not modify session status. Please try again.");
      }
    },
    [
      communityId,
      session?.id,
      fetchWithAuth,
      getAllSessions,
      setIsEditSessionModalOpen,
    ],
  );

  return (
    <Modal isOpen={isEditSessionModalOpen}>
      <div
        onClick={() => setIsEditSessionModalOpen(false)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-xl max-w-[520px] w-full z-999 border border-stone-200 overflow-hidden"
        >
          {/* Header Container */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
            <h3 className="text-base font-bold text-stone-900">Edit session</h3>
            <div className="flex items-center gap-x-2">
              {session?.isAvailable ? (
                <button
                  type="button"
                  onClick={() => startEndSession(session?.isAvailable)}
                  className="px-4 py-2 text-xs font-semibold bg-red-900 text-stone-100 hover:bg-red-800 rounded-lg transition-colors cursor-pointer shadow-sm outline-none"
                >
                  End Session
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startEndSession(session?.isAvailable)}
                  className="px-4 py-2 text-xs font-semibold bg-green-900 text-stone-100 hover:bg-green-800 rounded-lg transition-colors cursor-pointer shadow-sm outline-none"
                >
                  Start Session
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsEditSessionModalOpen(false)}
                className="cursor-pointer text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg p-1.5 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          {/* Main Edit Form */}
          <form onSubmit={handleOnSubmit} className="p-6 flex flex-col gap-y-4">
            {/* NAME AND SPORT FIELDS */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full">
                <label
                  htmlFor="name"
                  className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={sessionData.name}
                  onChange={handleOnChange}
                  placeholder="e.g., Friday Night Smash"
                  className="block px-3 py-2 text-sm border border-stone-200 w-full rounded-lg bg-stone-50/50 focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 outline-none transition-all placeholder-stone-400 font-medium text-stone-900"
                  required
                />
              </div>
              <div className="w-full sm:w-auto sm:min-w-[160px]">
                <label
                  htmlFor="sport"
                  className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5"
                >
                  Sport
                </label>
                <select
                  name="sport"
                  id="sport"
                  value={sessionData.sport}
                  onChange={handleOnChange}
                  className="block px-3 py-2 text-sm border border-stone-200 w-full cursor-pointer rounded-lg bg-stone-50/50 focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 outline-none transition-all text-stone-800"
                >
                  <option value="badminton">Badminton</option>
                </select>
              </div>
            </div>

            {/* LOCATION FIELD */}
            <div>
              <label
                htmlFor="location"
                className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5"
              >
                Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                placeholder="e.g., Court 3, Downtown Sports Complex"
                value={sessionData.location}
                onChange={handleOnChange}
                className="block px-3 py-2 text-sm border border-stone-200 w-full rounded-lg bg-stone-50/50 focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 outline-none transition-all placeholder-stone-400"
              />
            </div>

            {/* TIMING CONFIGURATIONS */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full">
                <label
                  htmlFor="startAt"
                  className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5"
                >
                  Starts at
                </label>
                <input
                  id="startAt"
                  type="datetime-local"
                  name="startAt"
                  value={sessionData.startAt}
                  onChange={handleOnChange}
                  className="block px-3 py-2 text-sm border border-stone-200 w-full rounded-lg bg-stone-50/50 focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 outline-none transition-all text-stone-800"
                />
              </div>
              <div className="w-full">
                <label
                  htmlFor="endAt"
                  className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5"
                >
                  Ends at
                </label>
                <input
                  id="endAt"
                  type="datetime-local"
                  name="endAt"
                  value={sessionData.endAt}
                  onChange={handleOnChange}
                  className="block px-3 py-2 text-sm border border-stone-200 w-full rounded-lg bg-stone-50/50 focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 outline-none transition-all text-stone-800"
                />
              </div>
            </div>

            {/* DESCRIPTION FIELD */}
            <div>
              <label
                htmlFor="description"
                className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5"
              >
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                value={sessionData.description}
                onChange={handleOnChange}
                placeholder="Provide guidelines, queue rules, or required gear specs for players..."
                className="block px-3 py-2 text-sm border border-stone-200 w-full rounded-lg bg-stone-50/50 focus:bg-white focus:border-stone-400 focus:ring-1 focus:ring-stone-400 outline-none transition-all placeholder-stone-400 resize-none"
              ></textarea>
            </div>

            {/* FOUL-SAFE MODAL ACTION FOOTER */}
            <div className="flex items-center justify-end gap-x-2 pt-2 border-t border-stone-100 mt-2">
              <button
                type="button"
                onClick={() => setIsEditSessionModalOpen(false)}
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
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default EditSessionModal;
