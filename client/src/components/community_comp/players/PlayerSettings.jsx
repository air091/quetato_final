import React, {
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import PlayerAvatar from "../../PlayerAvatar";
import { API_URL } from "../../../contexts/AuthContext";
import CommunityPlayerHistory from "./CommunityPlayerHistory";
import AssignAsModal from "./AssignAsModal";

// Map to look up readable labels for read-only user views
const SKILL_LEVEL_LABELS = {
  LB: "Low Beginner",
  BEG: "Beginner",
  HG: "High Beginner",
  LI: "Low Intermediate",
  INT: "Intermediate",
  UI: "Upper Intermediate",
  ADV: "Advanced",
  EXP: "Experience",
};

const PlayerSettings = ({
  player,
  onClose,
  toggleButtonRef,
  onUpdatePlayerStatus,
  type, // "static" (guest) or "user" (registered user)
  isRequest = false, // 🌟 Flag passed when mapping through requested players
  onOptimisticTransfer,
  onGamesTransferred,
  isManagement = false,
}) => {
  const containerRef = useRef(null);
  const { fetchWithAuth } = useAuth();
  const { communityId } = useParams();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCommunityHistoryOpen, setIsCommunityHistoryOpen] = useState(false);

  // 🌟 Manual Points Modal State
  const [isAddPointsOpen, setIsAddPointsOpen] = useState(false);
  const [pointsValue, setPointsValue] = useState("");
  const [pointsDescription, setPointsDescription] = useState("");
  const [isSubmittingPoints, setIsSubmittingPoints] = useState(false);

  // Fallbacks depending on your payload structure
  const initialUsername =
    player?.username || player?.communityPlayer?.username || "";
  const initialSkillLevel =
    player?.skillLevel || player?.communityPlayer?.skillLevel || "BEG";

  const userId = player?.communityPlayer?.id || player?.id;
  const communityPlayerId = player?.id;

  const [username, setUsername] = useState(initialUsername);
  const [skillLevel, setSkillLevel] = useState(initialSkillLevel);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [isReady, setIsReady] = useState(false);

  // Sync initial state if player updates externally
  useEffect(() => {
    setUsername(initialUsername);
    setSkillLevel(initialSkillLevel);
  }, [initialUsername, initialSkillLevel]);

  // Track anchor element positioning
  const updatePosition = () => {
    if (toggleButtonRef?.current) {
      const rect = toggleButtonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX - 160,
      });
      setIsReady(true);
    }
  };

  useLayoutEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, { passive: true });
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [toggleButtonRef]);

  // Click outside handling to auto-close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        !toggleButtonRef?.current?.contains(event.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, toggleButtonRef]);

  // Handle Editing Static (Guest) Player Metadata
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || isUpdating || !communityId || !userId) return;

    try {
      setIsUpdating(true);
      const res = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players/${userId}/static`,
        {
          method: "PUT",
          body: JSON.stringify({
            username: username.trim(),
            skillLevel: skillLevel,
          }),
        },
      );
      const resData = await res.json();
      if (!resData.success) throw new Error(resData?.message);

      if (typeof onUpdatePlayerStatus === "function") {
        onUpdatePlayerStatus();
      }
      onClose();
    } catch (err) {
      console.error("Update community player failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Deleting/Kicking Player from entire community
  const handleRemovePlayer = useCallback(async () => {
    if (!communityId || !userId || isUpdating) return;

    const isStatic = type === "static";
    const endpoint = isStatic
      ? `${API_URL}/api/communities/${communityId}/players/${userId}/static`
      : `${API_URL}/api/communities/${communityId}/players/${userId}/kick`;

    try {
      setIsUpdating(true);
      const response = await fetchWithAuth(endpoint, { method: "DELETE" });

      if (!response || !response.ok) {
        throw new Error(`HTTP error! Status: ${response?.status || "Unknown"}`);
      }

      const resData = await response.json();
      if (!resData?.success) throw new Error(resData?.message);

      if (typeof onUpdatePlayerStatus === "function") {
        onUpdatePlayerStatus();
      }
      onClose();
    } catch (error) {
      console.error(
        `${isStatic ? "Delete" : "Kick"} player failed:`,
        error.message,
      );
    } finally {
      setIsUpdating(false);
    }
  }, [
    communityId,
    userId,
    type,
    isUpdating,
    fetchWithAuth,
    onUpdatePlayerStatus,
    onClose,
  ]);

  // 🛡️ Action Handler: Demote Admin to Player
  const handleRemoveAsAdmin = async () => {
    if (isUpdating || !communityId || !userId) return;
    if (
      !window.confirm(
        `Are you sure you want to remove admin privileges from ${username}?`,
      )
    )
      return;

    try {
      setIsUpdating(true);
      const res = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players/${userId}/demote-admin`,
        { method: "PATCH" },
      );
      const resData = await res.json();
      if (!res.ok || !resData.success)
        throw new Error(resData?.message || "Failed to demote admin");

      if (typeof onUpdatePlayerStatus === "function") onUpdatePlayerStatus();
      onClose();
    } catch (err) {
      console.error("Demote admin request failed:", err);
      alert(err.message || "Failed to demote admin.");
    } finally {
      setIsUpdating(false);
    }
  };

  // 🌟 Action Handler: Accept Join Request
  const handleAcceptRequest = async () => {
    if (isUpdating || !communityId || !userId) return;
    try {
      setIsUpdating(true);
      const res = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players/${userId}/accept`,
        { method: "PATCH" },
      );
      const resData = await res.json();
      if (!res.ok || !resData.success)
        throw new Error(resData?.message || "Failed to accept");

      if (typeof onUpdatePlayerStatus === "function") onUpdatePlayerStatus();
      onClose();
    } catch (err) {
      console.error("Accept applicant request failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // 🌟 Action Handler: Reject Join Request
  const handleRejectRequest = async () => {
    if (isUpdating || !communityId || !userId) return;
    if (
      !window.confirm(`Are you sure you want to decline ${username}'s request?`)
    )
      return;

    try {
      setIsUpdating(true);
      const res = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players/${userId}/static`,
        { method: "DELETE" },
      );
      const resData = await res.json();
      if (!res.ok || !resData.success)
        throw new Error(resData?.message || "Failed to reject");

      if (typeof onUpdatePlayerStatus === "function") onUpdatePlayerStatus();
      onClose();
    } catch (err) {
      console.error("Reject applicant request failed:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // 🌟 Action Handler: Add Manual Points
  const handleAddManualPoints = async (e) => {
    e.preventDefault();
    const numPoints = parseInt(pointsValue, 10);
    if (isNaN(numPoints) || isSubmittingPoints) return;

    try {
      setIsSubmittingPoints(true);
      const res = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players/${communityPlayerId}/manual-points`,
        {
          method: "POST",
          body: JSON.stringify({
            points: numPoints,
            description: pointsDescription.trim(),
          }),
        },
      );
      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData?.message || "Failed to add manual points");
      }

      setPointsValue("");
      setPointsDescription("");
      setIsAddPointsOpen(false);

      if (typeof onUpdatePlayerStatus === "function") {
        onUpdatePlayerStatus();
      }
      onClose();
    } catch (err) {
      console.error("Add manual points error:", err);
      alert(err.message || "Failed to add points.");
    } finally {
      setIsSubmittingPoints(false);
    }
  };

  if (!isReady) return null;

  return (
    <>
      {!isAssignModalOpen &&
        !isAddPointsOpen &&
        createPortal(
          <div
            ref={containerRef}
            style={{
              position: "absolute",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => e.preventDefault()}
            className="w-48 bg-white border border-stone-200 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-100 overflow-hidden"
          >
            <header className="bg-stone-800 p-2.5">
              <h5 className="font-bold text-[11px] uppercase tracking-wider text-stone-400 mb-2">
                {isRequest ? "Join Request Settings" : "Community Settings"}
              </h5>
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                  <PlayerAvatar username={username} size="sm" />
                  <span className="text-[12px] font-semibold text-stone-100 truncate max-w-[100px]">
                    {username}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold text-stone-300 bg-stone-900 px-1.5 py-0.5 rounded">
                  {isRequest ? "requested" : type}
                </span>
              </div>
            </header>

            <div className="p-2">
              {isRequest ? (
                /* 🎯 JOIN REQUESTED PLAYERS SETTINGS LAYOUT */
                <div className="space-y-3 p-0.5">
                  <div className="flex flex-col gap-y-0.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                      Skill Level
                    </span>
                    <span className="text-xs font-semibold text-stone-700">
                      {SKILL_LEVEL_LABELS[skillLevel] || skillLevel}
                    </span>
                  </div>

                  <div className="flex gap-x-1.5 pt-1">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={handleAcceptRequest}
                      className="w-full cursor-pointer bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-[11px] py-1.5 rounded transition-colors font-semibold text-center shadow-sm"
                    >
                      {isUpdating ? "Processing..." : "Accept Player"}
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={handleRejectRequest}
                      className="w-full cursor-pointer bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[11px] py-1.5 rounded transition-colors font-semibold text-center"
                    >
                      Reject Player
                    </button>
                  </div>
                </div>
              ) : type === "static" ? (
                /* STATIC / GUEST PLAYER: Can edit name, skill level and delete profile */
                <form onSubmit={handleSubmit} className="space-y-2">
                  <div className="flex flex-col gap-y-0.5">
                    <label
                      htmlFor="name"
                      className="text-[10px] font-medium uppercase tracking-wider text-gray-400"
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
                      className="w-full text-xs border border-stone-200 rounded px-2 py-1 outline-none focus:border-stone-400 bg-gray-50/50"
                    />
                  </div>

                  <div className="flex flex-col gap-y-0.5">
                    <label
                      htmlFor="skill-level"
                      className="text-[10px] font-medium uppercase tracking-wider text-gray-400 block"
                    >
                      Skill level
                    </label>
                    <select
                      name="skill-level"
                      id="skill-level"
                      value={skillLevel}
                      onChange={(e) => setSkillLevel(e.target.value)}
                      disabled={isUpdating}
                      className="w-full text-xs border border-stone-200 rounded px-2 py-1 outline-none focus:border-stone-400 bg-gray-50/50 cursor-pointer"
                    >
                      <option value="LB">Low Beginner</option>
                      <option value="BEG">Beginner</option>
                      <option value="HG">High Beginner</option>
                      <option value="LI">Low Intermediate</option>
                      <option value="INT">Intermediate</option>
                      <option value="UI">Upper Intermediate</option>
                      <option value="ADV">Advanced</option>
                      <option value="EXP">Experience</option>
                    </select>
                  </div>

                  <div className="flex gap-x-1.5 pt-1">
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="cursor-pointer bg-stone-950 hover:bg-stone-850 disabled:bg-stone-400 text-white text-[11px] py-1 rounded w-full transition-colors font-semibold text-center"
                    >
                      {isUpdating ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePlayer}
                      disabled={isUpdating}
                      className="cursor-pointer bg-red-50 hover:bg-red-100 hover:text-red-700 disabled:bg-stone-50 disabled:text-stone-400 text-red-600 text-[11px] px-2 py-1 rounded transition-colors font-medium text-center border border-red-200 w-full"
                    >
                      Delete
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCommunityHistoryOpen(true)}
                    className="w-full rounded bg-blue-50 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer"
                  >
                    Points & session history
                  </button>

                  {isManagement && (
                    <button
                      type="button"
                      onClick={() => setIsAddPointsOpen(true)}
                      className="w-full rounded bg-amber-50 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 cursor-pointer"
                    >
                      + Add Manual Points
                    </button>
                  )}
                </form>
              ) : (
                /* REGISTERED USER PLAYER: Read-only data layout */
                <div className="space-y-2 p-0.5">
                  <div className="flex flex-col gap-y-0.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                      Skill Level
                    </span>
                    <span className="text-xs font-semibold text-stone-700">
                      {SKILL_LEVEL_LABELS[skillLevel] || skillLevel}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCommunityHistoryOpen(true)}
                    className="w-full rounded bg-blue-50 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer"
                  >
                    Points & session history
                  </button>

                  {isManagement && (
                    <button
                      type="button"
                      onClick={() => setIsAddPointsOpen(true)}
                      className="w-full rounded bg-amber-50 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 cursor-pointer"
                    >
                      + Add Manual Points
                    </button>
                  )}

                  {isManagement && player?.role !== "owner" && (
                    <div className="flex flex-col gap-y-2 pt-1 border-t border-stone-100">
                      {player?.role === "admin" ? (
                        <button
                          type="button"
                          onClick={handleRemoveAsAdmin}
                          disabled={isUpdating}
                          className="w-full cursor-pointer bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-[11px] py-1.5 rounded transition-colors font-semibold text-center shadow-sm"
                        >
                          {isUpdating ? "Processing..." : "Remove as Admin"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsAssignModalOpen(true)}
                          disabled={isUpdating}
                          className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-[11px] py-1.5 rounded transition-colors font-semibold text-center shadow-sm"
                        >
                          {isUpdating ? "Processing..." : "Assign as"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleRemovePlayer}
                        disabled={isUpdating}
                        className="w-full cursor-pointer bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-[11px] py-1.5 rounded transition-colors font-semibold text-center shadow-sm"
                      >
                        {isUpdating ? "Processing..." : "Kick Player"}
                      </button>
                    </div>
                  )}

                  {player?.role === "owner" && (
                    <div className="text-[11px] italic text-stone-400 text-center pt-1 border-t border-stone-100">
                      Creator role cannot be kicked
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* 🌟 ADD MANUAL POINTS MODAL */}
      {isAddPointsOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-xs bg-white rounded-lg shadow-xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <header className="bg-stone-800 p-3 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-stone-100">
                    Add Points to {username}
                  </h4>
                  <p className="text-[10px] text-stone-400">
                    Manual adjustment for community total
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddPointsOpen(false)}
                  className="text-stone-400 hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </header>

              <form onSubmit={handleAddManualPoints} className="p-3 space-y-3">
                <div className="flex flex-col gap-y-1">
                  <label className="text-[10px] font-semibold uppercase text-stone-500">
                    Points
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5 or -2"
                    value={pointsValue}
                    onChange={(e) => setPointsValue(e.target.value)}
                    className="w-full text-xs border border-stone-200 rounded px-2.5 py-1.5 outline-none focus:border-amber-500 bg-stone-50/50"
                  />
                </div>

                <div className="flex flex-col gap-y-1">
                  <label className="text-[10px] font-semibold uppercase text-stone-500">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Reason (e.g. Tournament winner bonus)"
                    value={pointsDescription}
                    onChange={(e) => setPointsDescription(e.target.value)}
                    className="w-full text-xs border border-stone-200 rounded px-2.5 py-1.5 outline-none focus:border-amber-500 bg-stone-50/50 resize-none"
                  />
                </div>

                <div className="flex gap-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddPointsOpen(false)}
                    className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs py-1.5 rounded font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPoints}
                    className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-xs py-1.5 rounded font-semibold shadow-sm cursor-pointer"
                  >
                    {isSubmittingPoints ? "Adding..." : "Add Points"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {isAssignModalOpen && (
        <AssignAsModal
          player={player}
          onClose={() => {
            setIsAssignModalOpen(false);
            onClose();
          }}
          onUpdatePlayerStatus={onUpdatePlayerStatus}
        />
      )}

      {isCommunityHistoryOpen && communityPlayerId && (
        <CommunityPlayerHistory
          communityId={communityId}
          communityPlayerId={communityPlayerId}
          username={initialUsername || "Player"}
          onClose={() => setIsCommunityHistoryOpen(false)}
          onOptimisticTransfer={onOptimisticTransfer}
          onGamesTransferred={onGamesTransferred || onUpdatePlayerStatus}
        />
      )}
    </>
  );
};

export default PlayerSettings;
