import React, { useLayoutEffect, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

const PlayerSettings = ({
  player,
  onClose,
  toggleButtonRef,
  onUpdatePlayerStatus,
}) => {
  const containerRef = useRef(null);
  const { fetchWithAuth } = useAuth();
  const { communityId, sessionId } = useParams();
  const [isUpdating, setIsUpdating] = useState(false);

  // 🌟 Start with standard layout null coordinates and ready flag set to false
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [isReady, setIsReady] = useState(false);

  // 🌟 FIX: useLayoutEffect runs BEFORE the browser paints to prevent flickering
  useLayoutEffect(() => {
    if (toggleButtonRef?.current) {
      const rect = toggleButtonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 160, // Matches min-w of menu
      });
      setIsReady(true); // Reveal menu only after position is locked
    }
  }, [toggleButtonRef]);

  // Handle click-away events outside the menu
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

  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);
    const stablePlayerId = player?.sessionPlayer?.id || player?.id;

    try {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/players/${stablePlayerId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ gameStatus: newStatus }),
        },
      );

      if (!response.ok) throw new Error("Failed to update status");

      if (onUpdatePlayerStatus) {
        onUpdatePlayerStatus(stablePlayerId, newStatus);
      }
      onClose();
    } catch (error) {
      console.error("Error updating player status:", error);
      alert("Failed to update player status.");
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
      /* 🌟 Added transition-opacity and conditional opacity to guarantee smooth rendering */
      className={`border bg-white rounded-lg text-black z-[9999] p-2 shadow-lg min-w-[160px] transition-opacity duration-70 *:${
        isReady ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <h6 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
        Player Settings
      </h6>
      <div className="flex flex-col gap-y-0.5">
        {["waiting", "queued", "playing", "paid"].map((status) => (
          <button
            key={status}
            type="button"
            disabled={isUpdating}
            onClick={() => handleStatusChange(status)}
            className={`text-left hover:bg-gray-100 text-[13px] py-1 px-2 rounded capitalize transition-colors cursor-pointer ${
              player?.gameStatus === status
                ? "font-bold text-blue-600 bg-blue-50/50"
                : "text-gray-700"
            }`}
          >
            Move to {status}
          </button>
        ))}
        <hr className="border-gray-100 my-1" />
        <button
          type="button"
          onClick={onClose}
          disabled={isUpdating}
          className="cursor-pointer bg-gray-50 hover:bg-gray-100 text-gray-500 text-[12px] py-1 rounded w-full transition-colors font-medium text-center"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body,
  );
};

export default PlayerSettings;
