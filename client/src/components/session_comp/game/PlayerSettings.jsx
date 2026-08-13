import React, {
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { Check, RotateCcw, Loader2, X } from "lucide-react";
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

const PROTECTED_SESSION_ROLES = ["owner", "admin"];

const PlayerSettings = ({
  player,
  onClose,
  toggleButtonRef,
  onUpdatePlayerStatus,
}) => {
  const containerRef = useRef(null);
  const { fetchWithAuth } = useAuth();
  const {
    canManagePlayers,
    hidePlayer,
    unhidePlayer,
    setSessionData,
    refreshSessionContext,
  } = useSession();
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
    !PROTECTED_SESSION_ROLES.includes(sessionRole) &&
    !player?.isHost;
  const visibilityAction = player?.isHide ? "unhide" : "hide";

  const isPaid = player?.gameStatus === "paid";

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
        left: rect.left + window.scrollX - 180,
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

  // 1. Add a ref to track whether the settings popup is currently mounted
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 2. Update handleTogglePayment with the guard check
  const handleTogglePayment = useCallback(async () => {
    if (!communityId || !sessionId || !sessionPlayerId || isUpdating) return;

    try {
      setIsUpdating(true);
      const action = isPaid ? "unpaid" : "paid";
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/sessions/${sessionId}/players/${sessionPlayerId}/${action}`,
        { method: "PATCH" },
      );

      if (!response?.ok) throw new Error("Failed to update payment status");

      const data = await response.json();
      if (!data?.success)
        throw new Error(data?.message || "Failed to update payment status");

      const nextGameStatus =
        data?.result?.player?.gameStatus || (isPaid ? "waiting" : "paid");

      // Update local state context
      setSessionData((previous) => ({
        ...previous,
        players: (previous.players || []).map((p) =>
          p.id === sessionPlayerId
            ? {
                ...p,
                gameStatus: nextGameStatus,
                updateStatus:
                  data?.result?.player?.updateStatus || p.updateStatus,
              }
            : p,
        ),
      }));

      await refreshSessionContext({ silent: true });

      if (typeof onUpdatePlayerStatus === "function") {
        onUpdatePlayerStatus();
      }

      // 🌟 ONLY trigger onClose if the component is STILL mounted!
      // If the user already closed it during loading, do NOT call onClose again.
      if (isMountedRef.current) {
        onClose();
      }
    } catch (error) {
      console.error("Payment status update failed:", error.message);
    } finally {
      if (isMountedRef.current) {
        setIsUpdating(false);
      }
    }
  }, [
    communityId,
    sessionId,
    sessionPlayerId,
    isPaid,
    isUpdating,
    fetchWithAuth,
    setSessionData,
    refreshSessionContext,
    onUpdatePlayerStatus,
    onClose,
  ]);

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
          className="w-56 rounded-2xl bg-white p-3.5 shadow-xl shadow-stone-200/50 border border-stone-200/80 z-50 animate-in fade-in slide-in-from-top-1 duration-150 font-sans selection:bg-orange-500/20 selection:text-orange-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 mb-3">
            <div className="flex items-center gap-x-2">
              <PlayerAvatar username={username} size="sm" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-stone-900 truncate max-w-[100px]">
                  {username}
                </span>
                {(sessionRole || player?.isHost) && (
                  <span className="text-[9px] font-semibold tracking-wider text-stone-400 uppercase">
                    {player?.isHost ? "host" : sessionRole}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 transition-colors p-1 rounded-lg hover:bg-stone-100"
            >
              <X size={14} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1"
              >
                Name
              </label>
              {player?.sessionPlayer?.communityPlayer?.type === "user" ? (
                <div className="w-full rounded-xl border border-stone-200/80 px-3 py-1.5 text-stone-800 text-xs font-medium bg-stone-50/50">
                  {username}
                </div>
              ) : (
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isUpdating}
                  className="w-full rounded-xl border border-stone-200 px-3 py-1.5 text-stone-850 placeholder-stone-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10 text-xs font-medium transition-all duration-200 bg-stone-50/50 focus:bg-white"
                />
              )}
            </div>

            {/* Skill Level */}
            <div>
              <label
                htmlFor="skill-level"
                className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1"
              >
                Skill level
              </label>
              {player?.sessionPlayer?.communityPlayer?.type === "user" ? (
                <div className="w-full rounded-xl border border-stone-200/80 px-3 py-1.5 text-stone-800 text-xs font-medium bg-stone-50/50">
                  {SKILL_LEVEL_LABELS[skillLevel] || skillLevel}
                </div>
              ) : (
                <select
                  name="skill-level"
                  id="skill-level"
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value)}
                  disabled={isUpdating}
                  className="w-full rounded-xl border border-stone-200 px-2.5 py-1.5 text-stone-850 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/10 text-xs font-medium transition-all duration-200 bg-stone-50/50 focus:bg-white"
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

            {/* Game History & Visibility Controls */}
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsGameHistoryOpen(true)}
                className="w-full text-center text-xs font-semibold py-1.5 rounded-xl text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
              >
                Game History
              </button>
              {canManagePlayers && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleToggleVisibility}
                  className={`w-full text-center text-xs font-semibold py-1.5 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                    player?.isHide
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60"
                  }`}
                >
                  {visibilityAction === "hide"
                    ? "Hide player"
                    : "Unhide player"}
                </button>
              )}

              {/* Quick Payment Toggle */}
              {sessionId && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleTogglePayment}
                  className={`w-full relative flex items-center justify-center gap-x-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
                    isPaid
                      ? "bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/10"
                  }`}
                >
                  {isUpdating ? (
                    <Loader2 className="animate-spin h-3.5 w-3.5" />
                  ) : isPaid ? (
                    <>
                      <RotateCcw size={13} />
                      Unmark as paid
                    </>
                  ) : (
                    <>
                      <Check size={13} strokeWidth={2.5} />
                      Mark as paid
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Action buttons (Save / Remove) */}
            <div className="flex gap-x-2 pt-2 border-t border-stone-100">
              <button
                type="submit"
                disabled={isUpdating}
                className="w-full flex items-center justify-center rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/10 hover:bg-orange-600 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-orange-500/10 disabled:bg-orange-400 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
              >
                {isUpdating ? (
                  <Loader2 className="animate-spin h-3.5 w-3.5" />
                ) : (
                  "Save"
                )}
              </button>

              {canRemovePlayer && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleRemovePlayer}
                  className="w-full flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 px-3 py-2 text-xs font-bold transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:scale-100 cursor-pointer"
                >
                  Remove
                </button>
              )}
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
