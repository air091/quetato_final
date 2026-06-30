import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

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

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        toggleButtonRef &&
        !toggleButtonRef.contains(event.target)
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
    console.log(
      `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/courts/${court.id}/${endpointSuffix}`,
    );
    try {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/courts/${court.id}/${endpointSuffix}`,
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

      // Call the parent update function to instantly sync the UI state
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
    // Dynamic endpoint suffixes for delete: 'queue' or 'match'
    const endpointSuffix = courtType === "queue" ? "queue" : "match";

    try {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/courts/${court.id}/${endpointSuffix}`,
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

  return (
    <div
      ref={containerRef}
      className="absolute top-8 right-0 border bg-white rounded-lg text-black z-[60] p-2 shadow-lg min-w-[210px]"
      onClick={(e) => e.stopPropagation()}
    >
      <h6 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-2">
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
        <div>
          <button
            type="submit"
            disabled={isSaving || isDeleting}
            className="cursor-pointer bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-[14px] py-1 rounded w-full mt-1 transition-colors"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
            className="cursor-pointer bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-[14px] py-1 rounded w-full mt-1 transition-colors"
          >
            {isDeleting ? "Deleting..." : "Delete Court"}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isDeleting}
            className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 text-[14px] py-1 rounded w-full mt-1 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CourtSettings;
