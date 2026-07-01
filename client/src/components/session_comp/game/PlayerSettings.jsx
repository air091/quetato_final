import React, { useLayoutEffect, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

const PlayerSettings = ({
  player,
  onClose,
  toggleButtonRef,
  onUpdatePlayerStatus, // Pass an updated state list function here if needed
}) => {
  const containerRef = useRef(null);
  const { fetchWithAuth } = useAuth();
  const { communityId, sessionId } = useParams();
  const [isUpdating, setIsUpdating] = useState(false);

  // 🌟 Safely resolve username from multiple possible nested locations
  const initialUsername =
    player?.sessionPlayer?.communityPlayer?.username ||
    player?.communityPlayer?.username ||
    player?.username ||
    "";

  // 🌟 Extract the primary player ID needed for the endpoint parameter routing
  const playerId = player?.sessionPlayer.communityPlayer.id;

  // Local form state control management
  const [username, setUsername] = useState(initialUsername);

  // Layout positioning state flags
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [isReady, setIsReady] = useState(false);

  // Track state syncing if the prop updates while the menu is open
  useEffect(() => {
    setUsername(initialUsername);
  }, [initialUsername]);

  // Handle setting layout dynamic positioning bounds prior to component mount repaint
  useLayoutEffect(() => {
    if (toggleButtonRef?.current) {
      const rect = toggleButtonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 160, // Matches min-w of menu
      });
      setIsReady(true);
    }
  }, [toggleButtonRef]);

  // Handle click-away viewport boundaries cleanups
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        toggleButtonRef?.current &&
        !toggleButtonRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [onClose, toggleButtonRef]);

  // Handle API PUT data submission action hooks
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!playerId)
      return alert("Missing structural player identifier context.");
    if (!username.trim()) return alert("Username field cannot be left empty.");

    setIsUpdating(true);
    try {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/players/${playerId}/static`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update static player configuration profile");
      }

      // 🌟 If you have an upper layout context handler function, call it to trigger update states
      if (onUpdatePlayerStatus) {
        onUpdatePlayerStatus();
      }

      onClose(); // Shut the dropdown menu container overlay seamlessly
    } catch (error) {
      console.error("Profile Edit Error:", error);
      alert(error.message || "Something went wrong updating user attributes.");
    } finally {
      setIsUpdating(false);
    }
  };

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
      className={`border bg-white rounded-lg text-black z-[9999] p-3 shadow-lg min-w-[180px] transition-opacity duration-70 ${
        isReady ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div>
        <header className="mb-2 pb-1.5 border-b">
          <h6 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">
            Player Settings
          </h6>
          <span className="text-sm font-semibold truncate block text-gray-700">
            {initialUsername || "Unknown"}
          </span>
        </header>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div>
            <label
              htmlFor="name"
              className="block text-[11px] font-medium text-gray-500 mb-0.5"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isUpdating}
              className="w-full text-xs border rounded px-2 py-1 outline-none focus:border-blue-500 bg-gray-50/50"
            />
          </div>

          <button
            type="button"
            className="w-full text-left text-xs text-blue-600 hover:underline py-0.5 font-medium"
          >
            Game History
          </button>

          <div className="flex gap-x-1.5 pt-1">
            <button
              type="submit"
              disabled={isUpdating}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-[11px] py-1 rounded flex-1 transition-colors font-semibold text-center"
            >
              {isUpdating ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isUpdating}
              className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] py-1 rounded flex-1 transition-colors font-medium text-center"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default PlayerSettings;
