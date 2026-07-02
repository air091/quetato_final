import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { EllipsisVertical, Gamepad2 } from "lucide-react";
import PlayerAvater from "../../PlayerAvatar";
import { useAuth } from "../../../hooks/useAuth";
import PlayerSettings from "../game/PlayerSettings";

const PlayerCard = ({ player, onRefreshData }) => {
  const { communityId, sessionId } = useParams();
  const { fetchWithAuth } = useAuth();
  const [totalGames, setTotalGames] = useState(0);
  const [winGames, setWinGames] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const toggleButtonRef = useRef(null);

  const stablePlayerId = player?.id;

  useEffect(() => {
    const fetchPlayerGamesCount = async () => {
      if (!communityId || !sessionId || !stablePlayerId) return;
      try {
        const response = await fetchWithAuth(
          `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/players/${stablePlayerId}/history`,
        );

        // Handle standard JSend structure checking response status/success flags
        if (response && response.ok) {
          const resJson = await response.json();
          if (resJson.success && resJson.results?.summary) {
            setTotalGames(resJson.results.summary.totalGames || 0);
            setWinGames(resJson.results.summary.totalWins || 0);
          }
        } else if (response && response.success && response.results?.summary) {
          // Fallback if fetchWithAuth already un-wraps response json natively
          setTotalGames(response.results.summary.totalGames || 0);
          setWinGames(response.results.summary.totalWins || 0);
        }
      } catch (error) {
        console.error("Error fetching match history count for card:", error);
      }
    };

    fetchPlayerGamesCount();
  }, [communityId, sessionId, stablePlayerId, fetchWithAuth]);

  return (
    <>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-x-2">
          <PlayerAvater
            username={player.sessionPlayer?.communityPlayer?.username}
            size="sm"
          />
          <div>
            <span className="font-semibold leading-0 text-[12px]">
              {player.sessionPlayer?.communityPlayer?.username}
            </span>
            <div className="flex items-center gap-x-2 font-medium">
              <span title="Games" className="flex items-center gap-x-0.5">
                <Gamepad2 size={14} />
                <span className="text-[10px]">
                  <span className="text-[14px] text-amber-500">{winGames}</span>
                  /{totalGames}
                </span>
              </span>

              {player.sessionPlayer?.communityPlayer?.type === "static" && (
                <span className="text-[10px] bg-gray-500/30 text-black rounded-full px-1 w-fit">
                  {player.sessionPlayer?.communityPlayer.type}
                </span>
              )}

              {["owner", "admin", "host"].includes(
                player.sessionPlayer?.role,
              ) && (
                <span className="text-[10px] bg-blue-500/80 text-blue-100 rounded-full px-1 w-fit capitalize">
                  {player.sessionPlayer?.role}
                </span>
              )}
              <span title="Skill Level" className="text-[10px] bg-white">
                {player.sessionPlayer?.communityPlayer.skillLevel}
              </span>
            </div>
          </div>
        </div>
        <div>
          <button
            ref={toggleButtonRef}
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className="cursor-pointer hover:bg-gray-200 rounded-full p-1"
          >
            <EllipsisVertical size={14} />
          </button>

          {isSettingsOpen && (
            <PlayerSettings
              player={player}
              toggleButtonRef={toggleButtonRef}
              onClose={() => setIsSettingsOpen(false)}
              onUpdatePlayerStatus={onRefreshData}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default PlayerCard;
