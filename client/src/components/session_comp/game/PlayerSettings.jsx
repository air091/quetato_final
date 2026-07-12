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
import { useSession } from "../../../hooks/useSession";
import { API_URL } from "../../../contexts/AuthContext";

// Map to look up readable labels for read-only user views
const SKILL_LEVEL_LABELS = {
  LB: "Low Beginner",
  BEG: "Beginner",
  HB: "High Beginner",
  LI: "Low Intermediate",
  INT: "Intermediate",
  UI: "Upper Intermediate",
  ADV: "Advanced",
  EXP: "Experience",
};

const PROTECTED_SESSION_ROLES = ["owner", "admin", "host"];

const PlayerSettings = ({
  player,
  type,
  onClose,
  toggleButtonRef,
  onUpdatePlayerStatus,
  isRequest = false,
}) => {
  const containerRef = useRef(null);
  const { fetchWithAuth } = useAuth();
  const { canManagePlayers, hidePlayer, unhidePlayer } = useSession();
  const { communityId, sessionId } = useParams();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGameHistoryOpen, setIsGameHistoryOpen] = useState(false);

  const initialUsername = player?.sessionPlayer?.communityPlayer?.username;
  const initialSkillLevel =
    player?.sessionPlayer?.communityPlayer?.skillLevel || "BEG";
  const sessionRole = player?.sessionPlayer?.role;
  const sessionPlayerId = player?.id || player?.sessionPlayerId;
  const canRemovePlayer =
    canManagePlayers &&
    Boolean(sessionPlayerId) &&
    !PROTECTED_SESSION_ROLES.includes(sessionRole);
  const visibilityAction = player?.isHide ? "unhide" : "hide";

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
        `${API_URL}/api/communities/${communityId}/players/${targetId}/static`,
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
  const handleRemovePlayer = useCallback(async () => {
    if (!communityId || !sessionId || !sessionPlayerId || isUpdating) return;
    try {
      setIsUpdating(true);
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/players/${sessionPlayerId}/remove`,
        { method: "DELETE" },
      );

      if (!response || !response.ok) {
        const errorData = await response?.json().catch(() => ({}));
        throw new Error(
          errorData?.message ||
            `HTTP error! Status: ${response?.status || "Unknown"}`,
        );
      }

      const resData = await response.json().catch(() => ({}));
      if (!resData?.success) throw new Error(resData?.message);

      if (typeof onUpdatePlayerStatus === "function") {
        onUpdatePlayerStatus();
      }
      onClose();
    } catch (error) {
      console.error("Remove player failed:", error.message);
    } finally {
      setIsUpdating(false);
    }
  }, [
    communityId,
    sessionId,
    isUpdating,
    fetchWithAuth,
    onUpdatePlayerStatus,
    onClose,
    sessionPlayerId,
  ]);

  const handleToggleVisibility = useCallback(async () => {
    const sessionPlayerId = player?.id;
    if (!sessionPlayerId || !canManagePlayers || isUpdating) return;

    try {
      setIsUpdating(true);

      if (player?.isHide) {
        await unhidePlayer(sessionPlayerId);
      } else {
        await hidePlayer(sessionPlayerId);
      }

      if (typeof onUpdatePlayerStatus === "function") {
        onUpdatePlayerStatus();
      }
      onClose();
    } catch (error) {
      console.error("Update player visibility failed:", error.message);
    } finally {
      setIsUpdating(false);
    }
  }, [
    player?.id,
    player?.isHide,
    canManagePlayers,
    isUpdating,
    hidePlayer,
    unhidePlayer,
    onUpdatePlayerStatus,
    onClose,
  ]);

  // 🌟 Action Handler: Accept Request
  const handleAcceptRequest = async () => {
    if (isUpdating || !communityId || !player?.communityPlayer?.id) return;
    try {
      setIsUpdating(true);
      const targetUserId = player?.communityPlayer?.id;
      const res = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players/${targetUserId}/accept`,
        { method: "PATCH" },
      );
      const resData = await res.json();
      if (!res.ok || !resData.success)
        throw new Error(resData?.message || "Failed to accept");

      if (typeof onUpdatePlayerStatus === "function") onUpdatePlayerStatus();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectRequest = async () => {
    if (isUpdating || !communityId || !player?.communityPlayer?.id) return;
    if (
      !window.confirm(`Are you sure you want to decline ${username}'s request?`)
    )
      return;

    try {
      setIsUpdating(true);
      const targetUserId = player?.communityPlayer?.id;
      // Rejects by removing the temporary guest record
      const res = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players/${targetUserId}/static`,
        { method: "DELETE" },
      );
      const resData = await res.json();
      if (!res.ok || !resData.success)
        throw new Error(resData?.message || "Failed to reject");

      if (typeof onUpdatePlayerStatus === "function") onUpdatePlayerStatus();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

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
          className="w-48 bg-white border rounded-md shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-100"
        >
          <header className="bg-stone-800 p-2">
            <h5 className="font-bold text-[12px] text-stone-100 mb-2">
              {isRequest ? "Join Request Settings" : "Player Settings"}
            </h5>
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-x-2">
                <PlayerAvatar username={username} size="sm" />
                <span className="text-[12px] font-medium text-stone-100 truncate max-w-[90px]">
                  {username}
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold text-amber-400 bg-stone-700/50 px-1.5 py-0.5 rounded">
                {sessionRole}
              </span>
            </div>
          </header>

          <div className="p-2 space-y-3">
            {/* Context Info Fields rendered as text labels instead of editable forms */}
            <div className="text-[11px] space-y-1 text-stone-600 bg-stone-50 p-1.5 rounded border border-stone-100">
              <div>
                <span className="font-semibold text-stone-400 uppercase text-[9px] block">
                  Skill Level
                </span>
                {SKILL_LEVEL_LABELS[skillLevel] || skillLevel}
              </div>
            </div>

            {/* Conditionally swap the action footer layouts */}
            {isRequest ? (
              <div className="flex gap-x-1.5 pt-1">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleAcceptRequest}
                  className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-[11px] py-1 rounded w-full transition-colors font-semibold text-center shadow-sm"
                >
                  {isUpdating ? "Processing..." : "Accept"}
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleRejectRequest}
                  className="cursor-pointer bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[11px] py-1 rounded w-full transition-colors font-medium text-center"
                >
                  Reject
                </button>
              </div>
            ) : (
              /* Original Non-Request settings inputs and buttons can go here if sharing file */
              <div className="text-[11px] text-stone-400 text-center py-2">
                Regular config disabled
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default PlayerSettings;
