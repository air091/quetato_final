import React, { useState } from "react";
import Modal from "../createPortal";
import { X } from "lucide-react";

const EditSessionModal = ({
  accessToken,
  communityId,
  getAllSessions,
  isEditSessionModalOpen,
  setIsEditSessionModalOpen,
  session,
}) => {
  const handleOnChange = (event) => {
    const { name, value } = event.target;
    setSession((prev) => ({ ...prev, [name]: value }));
  };

  const handleOnSubmit = async (event) => {
    event.preventDefault();
    await createSession();
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
            <h3 className="font-medium">Create new session</h3>
            <button
              onClick={() => setIsEditSessionModalOpen(false)}
              className="cursor-pointer text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full p-1"
            >
              <X size={20} />
            </button>
          </header>

          <form>
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
                  value={session?.name}
                  onChange={handleOnChange}
                  placeholder="Smash today"
                  className="block px-2 py-1 border w-full rounded-sm mt-0.5"
                />
              </div>
              <div>
                <label htmlFor="sport" className="text-[14px]">
                  Sport
                </label>
                <select
                  name="sport"
                  id="sport"
                  value={session?.sport}
                  onChange={handleOnChange}
                  className="block px-2 py-1 min-w-[140px] border cursor-pointer rounded-sm mt-0.5"
                >
                  <option value="badminton">Badminton</option>
                </select>
              </div>
            </div>

            {/* LOCATION */}
            <div>
              <label htmlFor="location" className="text-[14px]">
                Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={session?.location}
                onChange={handleOnChange}
                className="block px-2 py-1 border w-full rounded-sm mt-0.5"
              />
            </div>

            {/* START AND END SCHEDULE */}
            <div className="flex items-center gap-x-2">
              <div className="w-full">
                <label htmlFor="startAt" className="text-[14px]">
                  Starts at
                </label>
                <input
                  id="startAt"
                  type="datetime-local"
                  name="startAt" // ✅ FIX: Added missing name attribute
                  value={session?.startAt}
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
                  name="endAt" // ✅ FIX: Added missing name attribute
                  value={session?.endAt}
                  onChange={handleOnChange}
                  className="block px-2 py-1 border w-full rounded-sm mt-0.5"
                />
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <label htmlFor="description" className="text-[14px]">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                value={session?.description}
                onChange={handleOnChange}
                placeholder="Join the queue and start playing with nearby players."
                className="block px-2 py-1 border w-full rounded-sm mt-0.5"
              ></textarea>
            </div>

            {/* ACTIONS */}
            <div className="flex items-center justify-end gap-x-3 mt-2">
              <button
                type="button" // ✅ FIX: Explicitly mark as type="button" so it doesn't trigger a form submit
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
