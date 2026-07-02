import React, { useLayoutEffect, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import PlayerGameHistory from "../PlayerGameHistory"; // 🌟 Import history modal
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
  const [isGameHistoryOpen, setIsGameHistoryOpen] = useState(false); // 🌟 Local sub-modal tracker

  const initialUsername = player?.sessionPlayer?.communityPlayer?.username;

  const [username, setUsername] = useState(initialUsername);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setUsername(initialUsername);
  }, [initialUsername]);

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
        `http://localhost:8000/api/players/${targetId}/static`,
        {
          method: "PUT",
          body: JSON.stringify({ username: username.trim() }),
        },
      );
      const resData = await res.json();
      if (!resData.success) throw new Error(resData?.message);

      if (onUpdatePlayerStatus) onUpdatePlayerStatus();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isReady) return null;

  console.log(player);
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
            <h5 className="font-bold text-[12px] text-stone-100">
              Player Settings
            </h5>
            <div className="w-full flex items-center justify-between ">
              <span className="text-[12px] font-medium text-stone-100">
                {username}
              </span>
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
            <div>
              <label
                htmlFor="skill-level"
                className="text-[10px] font-medium uppercase tracking-wider text-gray-400 block"
              >
                Skill level
              </label>
              {player?.sessionPlayer?.communityPlayer?.type === "user" ? (
                <span className="w-full text-xs rounded py-1 outline-none focus:border-blue-500 bg-gray-50/50">
                  {username}
                </span>
              ) : (
                <select
                  name="skill-level"
                  id="skill-level"
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

            {/* 🌟 Hooked click handler to open history modal overlay */}
            <button
              type="button"
              onClick={() => setIsGameHistoryOpen(true)}
              className="w-full text-left text-xs text-blue-600 py-0.5 font-medium cursor-pointer hover:underline"
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
        </div>,
        document.body,
      )}

      {/* 🌟 Nested overlay conditional render for the Game History */}
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
