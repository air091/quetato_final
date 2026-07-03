import React, {
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import PlayerGameHistory from "../PlayerGameHistory";
import { useAuth } from "../../../hooks/useAuth";
import PlayerAvatar from "../../PlayerAvatar";

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
}) => {
  const containerRef = useRef(null);
  const { fetchWithAuth } = useAuth();
  const { communityId, sessionId } = useParams();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGameHistoryOpen, setIsGameHistoryOpen] = useState(false);

  const initialUsername = player?.sessionPlayer?.communityPlayer?.username;
  const initialSkillLevel =
    player?.sessionPlayer?.communityPlayer?.skillLevel || "BEG";

  const [username, setUsername] = useState(initialUsername);
  const [skillLevel, setSkillLevel] = useState(initialSkillLevel);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setUsername(initialUsername);
    setSkillLevel(initialSkillLevel);
  }, [initialUsername, initialSkillLevel]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || isUpdating) return;
    try {
      setIsUpdating(true);
      const targetId = player?.sessionPlayer?.communityPlayer?.id;
      const res = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/players/${targetId}/static`,
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

      if (resData.success) {
        if (typeof onUpdatePlayerStatus === "function") {
          onUpdatePlayerStatus();
        }
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  // 🌟 Completed handleRemoveplayer implementation
  const handleRemoveplayer = useCallback(
    async (sessionPlayerId) => {
      if (!communityId || !sessionId || !sessionPlayerId || isUpdating) return;
      try {
        setIsUpdating(true);
        const response = await fetchWithAuth(
          `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/players/${sessionPlayerId}/remove`,
          { method: "DELETE" },
        );

        if (!response || !response.ok) {
          throw new Error(
            `HTTP error! Status: ${response?.status || "Unknown"}`,
          );
        }

        const resData = await response.json();
        if (!resData?.success) throw new Error(resData?.message);

        // Refresh data on parent view layout component
        if (typeof onUpdatePlayerStatus === "function") {
          onUpdatePlayerStatus();
        }
        onClose();
      } catch (error) {
        console.error("Remove player failed:", error.message);
      } finally {
        setIsUpdating(false);
      }
    },
    [
      communityId,
      sessionId,
      isUpdating,
      fetchWithAuth,
      onUpdatePlayerStatus,
      onClose,
    ],
  );

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
          className="w-48 bg-white border rounded-md shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-100"
        >
          <header className="bg-stone-800 p-2">
            <h5 className="font-bold text-[12px] text-stone-100 mb-2">
              Player Settings
            </h5>
            <div className="w-full flex items-center justify-between ">
              <div className="flex items-center gap-x-2">
                <PlayerAvatar username={username} size="sm" />
                <span className="text-[12px] font-medium text-stone-100">
                  {username}
                </span>
              </div>
              <span className="text-[12px] font-medium text-stone-100">
                {player?.sessionPlayer?.role}
              </span>
            </div>
          </header>
          <form onSubmit={handleSubmit} className="space-y-2  p-2">
            <div className="flex flex-col gap-y-0.5">
              <label
                htmlFor="name"
                className="text-[10px] font-medium uppercase tracking-wider text-gray-400"
              >
                Name
              </label>
              {player?.sessionPlayer?.communityPlayer?.type === "user" ? (
                <span className="block w-full text-xs rounded py-1 outline-none focus:border-blue-500 bg-gray-50/50">
                  {username}
                </span>
              ) : (
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isUpdating}
                  className="w-full text-xs border rounded px-2 py-1 outline-none focus:border-blue-500 bg-gray-50/50"
                />
              )}
            </div>

            {/* Skill level */}
            <div className="flex flex-col gap-y-0.5">
              <label
                htmlFor="skill-level"
                className="text-[10px] font-medium uppercase tracking-wider text-gray-400 block"
              >
                Skill level
              </label>
              {player?.sessionPlayer?.communityPlayer?.type === "user" ? (
                <span className="block w-full text-xs rounded py-1 outline-none focus:border-blue-500 bg-gray-50/50">
                  {SKILL_LEVEL_LABELS[skillLevel] || skillLevel}
                </span>
              ) : (
                <select
                  name="skill-level"
                  id="skill-level"
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value)}
                  disabled={isUpdating}
                  className="w-full text-xs border rounded px-2 py-1 outline-none focus:border-blue-500 bg-gray-50/50"
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
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsGameHistoryOpen(true)}
              className="w-full text-[10px] font-medium py-1 rounded cursor-pointer hover:bg-stone-200"
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

              {/* 🌟 Attached functional handler and Tailwind styling to the button */}
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleRemoveplayer(player?.sessionPlayer?.id)}
                className="cursor-pointer bg-red-50 hover:bg-red-100 hover:text-red-700 disabled:bg-stone-50 disabled:text-stone-400 text-red-600 text-[11px] px-2 py-1 rounded transition-colors font-medium text-center border border-red-200 disabled:border-stone-200"
              >
                Remove
              </button>
            </div>
          </form>
        </div>,
        document.body,
      )}

      {isGameHistoryOpen && (
        <PlayerGameHistory
          player={player}
          onClose={() => setIsGameHistoryOpen(false)}
        />
      )}
    </>
  );
};

export default PlayerSettings;
