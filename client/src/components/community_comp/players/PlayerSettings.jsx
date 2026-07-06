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
}) => {
  const containerRef = useRef(null);
  const { fetchWithAuth } = useAuth();
  const { communityId } = useParams();
  const [isUpdating, setIsUpdating] = useState(false);

  // Fallbacks depending on your payload structure (adjusting to fit community level data shape)
  const initialUsername =
    player?.username || player?.communityPlayer?.username || "";
  const initialSkillLevel =
    player?.skillLevel || player?.communityPlayer?.skillLevel || "BEG";
  const playerId = player?.id || player?.communityPlayer?.id;

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
    if (!username.trim() || isUpdating || !communityId || !playerId) return;

    try {
      setIsUpdating(true);
      const res = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players/${playerId}/static`,
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
    if (!communityId || !playerId || isUpdating) return;

    // Determine explicit endpoint action tag or method depending on if they are static or user
    const isStatic = type === "static";
    const endpoint = isStatic
      ? `${API_URL}/api/communities/${communityId}/players/${player?.communityPlayer?.id}/static`
      : `${API_URL}/api/communities/${communityId}/players/${player?.communityPlayer?.id}/kick`;
    // Or DELETE depending on your Kick implementation backend rules

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
    playerId,
    type,
    isUpdating,
    fetchWithAuth,
    onUpdatePlayerStatus,
    onClose,
  ]);

  if (!isReady) return null;

  return (
    <>
      {createPortal(
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
              Community Settings
            </h5>
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-x-2">
                <PlayerAvatar username={username} size="sm" />
                <span className="text-[12px] font-semibold text-stone-100 truncate max-w-[100px]">
                  {username}
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold text-stone-300 bg-stone-900 px-1.5 py-0.5 rounded">
                {type}
              </span>
            </div>
          </header>

          {type === "static" ? (
            /* STATIC / GUEST PLAYER: Can edit name, skill level and delete profile */
            <form onSubmit={handleSubmit} className="space-y-2 p-2">
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
            </form>
          ) : (
            /* REGISTERED USER PLAYER: Read-only data layout */
            <div className="p-2.5 space-y-3">
              <div className="flex flex-col gap-y-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                  Skill Level
                </span>
                <span className="text-xs font-semibold text-stone-700">
                  {SKILL_LEVEL_LABELS[skillLevel] || skillLevel}
                </span>
              </div>

              {/* Only show kick option if the member target isn't the primary owner */}
              {player?.role !== "owner" ? (
                <div className="flex gap-x-1.5 pt-1">
                  <button
                    type="button"
                    onClick={handleRemovePlayer}
                    disabled={isUpdating}
                    className="w-full cursor-pointer bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-[11px] py-1.5 rounded transition-colors font-semibold text-center shadow-sm"
                  >
                    {isUpdating ? "Processing..." : "Kick Player"}
                  </button>
                </div>
              ) : (
                <div className="text-[11px] italic text-stone-400 text-center pt-1 border-t border-stone-100">
                  Creator role cannot be kicked
                </div>
              )}
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
};

export default PlayerSettings;
