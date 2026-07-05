import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { EllipsisVertical, EyeOff, Trophy } from "lucide-react";
import PlayerAvater from "../../PlayerAvatar";
import { useAuth } from "../../../hooks/useAuth";
import PlayerSettings from "../game/PlayerSettings";

const PlayerCard = ({ player, onRefreshData }) => {
  const { communityId, sessionId } = useParams();
  const { fetchWithAuth } = useAuth();
  const providedTotalGames =
    player?.stats?.totalGames ?? player?.totalGames ?? null;
  const providedTotalWins =
    player?.stats?.totalWins ?? player?.totalWins ?? null;
  const [fallbackStats, setFallbackStats] = useState({
    totalGames: 0,
    totalWins: 0,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const toggleButtonRef = useRef(null);

  const stablePlayerId = player?.id;
  const username =
    player?.sessionPlayer?.communityPlayer?.username || "Unknown player";
  const playerType = player?.sessionPlayer?.communityPlayer?.type;
  const playerRole = player?.sessionPlayer?.role;
  const skillLevel = player?.sessionPlayer?.communityPlayer?.skillLevel;
  const totalGames = providedTotalGames ?? fallbackStats.totalGames;
  const winGames = providedTotalWins ?? fallbackStats.totalWins;

  useEffect(() => {
    const fetchPlayerGamesCount = async () => {
      if (
        (providedTotalGames !== null && providedTotalWins !== null) ||
        !communityId ||
        !sessionId ||
        !stablePlayerId
      ) {
        return;
      }

      try {
        const response = await fetchWithAuth(
          `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/players/${stablePlayerId}/history`,
        );

        // Handle standard JSend structure checking response status/success flags
        if (response && response.ok) {
          const resJson = await response.json();
          if (resJson.success && resJson.results?.summary) {
            setFallbackStats({
              totalGames: resJson.results.summary.totalGames || 0,
              totalWins: resJson.results.summary.totalWins || 0,
            });
          }
        } else if (response && response.success && response.results?.summary) {
          // Fallback if fetchWithAuth already un-wraps response json natively
          setFallbackStats({
            totalGames: response.results.summary.totalGames || 0,
            totalWins: response.results.summary.totalWins || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching match history count for card:", error);
      }
    };

    fetchPlayerGamesCount();
  }, [
    communityId,
    sessionId,
    stablePlayerId,
    fetchWithAuth,
    providedTotalGames,
    providedTotalWins,
  ]);

  return (
    <>
      <div className="w-full flex items-center justify-between gap-x-4">
        {/* LEFT: Player Info & Badges */}
        <div className="flex min-w-0 items-center gap-x-3">
          <PlayerAvater username={username} size="md" />
          <div className="min-w-0 flex flex-col sm:items-start sm:gap-x-3">
            <span className="block truncate text-sm font-semibold text-stone-900">
              {username}
            </span>

            <div className="mt-0.5 sm:mt-0 flex flex-wrap items-center gap-1 text-[9px] font-bold uppercase tracking-wide">
              {playerType === "static" && (
                <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-stone-600">
                  {playerType}
                </span>
              )}

              {["owner", "admin", "host"].includes(playerRole) && (
                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-blue-700">
                  {playerRole}
                </span>
              )}

              {skillLevel && (
                <span
                  title="Skill Level"
                  className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-700"
                >
                  {skillLevel}
                </span>
              )}

              {player?.isHide && (
                <span className="inline-flex items-center gap-x-1 rounded-md bg-red-50 px-1.5 py-0.5 text-red-700">
                  <EyeOff size={10} />
                  Hidden
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Combined Record Metric & Actions */}
        <div className="flex items-center gap-x-3 shrink-0">
          {/* Unified Record Badge (Wins / Total Games) */}
          <div
            title="Wins / Total Games"
            className="flex items-center gap-x-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-600 shadow-sm"
          >
            <Trophy size={13} className="text-amber-500 shrink-0" />
            <span className="font-bold text-stone-900">
              {winGames}
              <span className="text-stone-400 font-normal mx-0.5">/</span>
              {totalGames}
            </span>
          </div>

          {/* Action Trigger */}
          <button
            ref={toggleButtonRef}
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900"
            aria-label={`Open settings for ${username}`}
          >
            <EllipsisVertical size={15} />
          </button>
        </div>

        {isSettingsOpen && (
          <PlayerSettings
            player={player}
            toggleButtonRef={toggleButtonRef}
            onClose={() => setIsSettingsOpen(false)}
            onUpdatePlayerStatus={onRefreshData}
          />
        )}
      </div>
    </>
  );
};

export default PlayerCard;
