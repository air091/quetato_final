import React, { useState, useEffect } from "react";
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
  // 1. Initialize local state for the form inputs
  const [sessionData, setSessionData] = useState({
    name: "",
    sport: "badminton",
    location: "",
    startAt: "",
    endAt: "",
    description: "",
  });

  // 2. Sync local state whenever the "session" prop changes or opens
  useEffect(() => {
    if (session) {
      setSessionData({
        name: session.name || "",
        sport: session.sport || "badminton",
        location: session.location || "",
        // Format dates to YYYY-MM-DDTHH:MM if they exist for datetime-local compatibility
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

  // 3. Define the actual update API call function
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

      // Refresh the main table data and close modal
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

  return (
    <Modal isOpen={isEditSessionModalOpen}>
      <div
        onClick={() => setIsEditSessionModalOpen(false)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white p-6 rounded-md shadow-lg max-w-[520px] w-full z-999"
        >
          <header className="flex items-center justify-between py-2">
            <h3 className="font-medium">Edit session</h3>
            <button
              type="button"
              onClick={() => setIsEditSessionModalOpen(false)}
              className="cursor-pointer text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full p-1"
            >
              <X size={20} />
            </button>
          </header>

          {/* Connected the submit handler here */}
          <form onSubmit={handleOnSubmit}>
            {/* NAME AND SPORT */}
            <div className="flex items-center gap-x-2">
              <div className="w-full">
                <label htmlFor="name" className="text-[14px]">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={sessionData.name}
                  onChange={handleOnChange}
                  placeholder="Smash today"
                  className="block px-2 py-1 border w-full rounded-sm mt-0.5"
                  required
                />
              </div>
              <div>
                <label htmlFor="sport" className="text-[14px]">
                  Sport
                </label>
                <select
                  name="sport"
                  id="sport"
                  value={sessionData.sport}
                  onChange={handleOnChange}
                  className="block px-2 py-1 min-w-[140px] border cursor-pointer rounded-sm mt-0.5"
                >
                  <option value="badminton">Badminton</option>
                </select>
              </div>
            </div>

            {/* LOCATION */}
            <div className="mt-2">
              <label htmlFor="location" className="text-[14px]">
                Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={sessionData.location}
                onChange={handleOnChange}
                className="block px-2 py-1 border w-full rounded-sm mt-0.5"
              />
            </div>

            {/* START AND END SCHEDULE */}
            <div className="flex items-center gap-x-2 mt-2">
              <div className="w-full">
                <label htmlFor="startAt" className="text-[14px]">
                  Starts at
                </label>
                <input
                  id="startAt"
                  type="datetime-local"
                  name="startAt"
                  value={sessionData.startAt}
                  onChange={handleOnChange}
                  className="block px-2 py-1 border w-full rounded-sm mt-0.5"
                />
              </div>
              <div className="w-full">
                <label htmlFor="endAt" className="text-[14px]">
                  Ends at
                </label>
                <input
                  id="endAt"
                  type="datetime-local"
                  name="endAt"
                  value={sessionData.endAt}
                  onChange={handleOnChange}
                  className="block px-2 py-1 border w-full rounded-sm mt-0.5"
                />
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="mt-2">
              <label htmlFor="description" className="text-[14px]">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                value={sessionData.description}
                onChange={handleOnChange}
                placeholder="Join the queue and start playing with nearby players."
                className="block px-2 py-1 border w-full rounded-sm mt-0.5"
              ></textarea>
            </div>

            {/* ACTIONS */}
            <div className="flex items-center justify-end gap-x-3 mt-4">
              <button
                type="button"
                onClick={() => setIsEditSessionModalOpen(false)}
                className="px-4 py-1 bg-gray-200 hover:bg-gray-300 cursor-pointer rounded-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-blue-400 hover:bg-blue-500 hover:text-white cursor-pointer rounded-sm"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default EditSessionModal;
