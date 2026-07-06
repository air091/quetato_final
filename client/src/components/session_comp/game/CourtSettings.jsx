import React, { useLayoutEffect, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { API_URL } from "../../../contexts/AuthContext";

const CourtSettings = ({
  court,
  onClose,
  toggleButtonRef,
  onUpdateCourtName,
  onDeleteCourt,
  courtType,
}) => {
  const containerRef = useRef(null);
  const { fetchWithAuth } = useAuth();
  const [courtName, setCourtName] = useState(court?.name || "");
  const { communityId, sessionId } = useParams();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Coordinates and ready state to mirror PlayerSettings behavior
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [isReady, setIsReady] = useState(false);

  // Dynamic endpoint suffixes for API endpoints
  const updateCourtEndpoint =
    courtType === "queue" ? "queue-name" : "match-name";
  const deleteCourtEndpoint = courtType === "queue" ? "queue" : "match";

  // 🌟 FIX: Refactored positioning logic into a reusable function
  const updatePosition = () => {
    if (toggleButtonRef?.current) {
      const rect = toggleButtonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 210, // Matches min-w of court settings menu (210px)
      });
      setIsReady(true);
    }
  };

  // Calculate position initially BEFORE browser paint to eliminate shifting/flickering
  useLayoutEffect(() => {
    updatePosition();
  }, [toggleButtonRef]);

  // 🌟 FIX: Listen to all scrolling containers on the document to dynamically pin coordinates
  useEffect(() => {
    // True activates capture phase to intercept nested div scroll containers
    document.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      document.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [toggleButtonRef]);

  // Handle click outside to close
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!courtName.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/courts/${court.id}/${updateCourtEndpoint}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: courtName }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update court name");
      }

      if (onUpdateCourtName) {
        onUpdateCourtName(court.id, courtName.trim());
      }

      onClose();
    } catch (error) {
      console.error("Error updating court name:", error);
      alert("Failed to save court name. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${court?.name || "this court"}?`,
      )
    ) {
      return;
    }

    setIsDeleting(true);
    console.log(court.id);
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/courts/${court.id}/${deleteCourtEndpoint}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) throw new Error("Failed to delete court");

      if (onDeleteCourt) {
        onDeleteCourt(court.id);
      }
      onClose();
    } catch (error) {
      console.error("Error deleting court:", error);
      alert("Failed to delete court. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Render into document.body portal
  return createPortal(
    <div
      ref={containerRef}
      data-no-dnd="true" /* 🌟 FIX: Stops dnd-kit from tracking drag events here */
      style={{
        position: "absolute",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
      className={`border bg-white rounded-lg text-black z-[9999] p-2 shadow-lg min-w-[210px] transition-opacity duration-70 ${
        isReady ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      /* 🌟 FIX: Stop mouse and pointer drag actions from breaking or bubbling into dnd-kit cards */
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <h6 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
        Court settings
      </h6>
      <form onSubmit={handleSave}>
        <div className="mb-2">
          <label
            htmlFor="name"
            className="text-[14px] text-gray-600 block mb-1"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            name="name"
            value={courtName}
            onChange={(e) => setCourtName(e.target.value)}
            className="block w-full text-[14px] p-1 border rounded"
            disabled={isSaving}
          />
        </div>
        <div className="flex flex-col gap-y-1">
          <button
            type="submit"
            disabled={isSaving || isDeleting}
            className="cursor-pointer bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-[14px] py-1 rounded w-full transition-colors"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
            className="cursor-pointer bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-[14px] py-1 rounded w-full transition-colors"
          >
            {isDeleting ? "Deleting..." : "Delete Court"}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isDeleting}
            className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-[14px] py-1 rounded w-full transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
};

export default CourtSettings;
