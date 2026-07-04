import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { EllipsisVertical, Gamepad2, Trophy } from "lucide-react";
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
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-x-3">
            <PlayerAvater username={username} size="xl" />
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold text-stone-900">
                {username}
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
                {playerType === "static" && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">
                    {playerType}
                  </span>
                )}

                {["owner", "admin", "host"].includes(playerRole) && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                    {playerRole}
                  </span>
                )}

                {skillLevel && (
                  <span
                    title="Skill Level"
                    className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700"
                  >
                    {skillLevel}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            ref={toggleButtonRef}
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
            aria-label={`Open settings for ${username}`}
          >
            <EllipsisVertical size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-stone-500">
              <Gamepad2 size={13} />
              Games
            </span>
            <strong className="mt-1 block text-lg font-bold text-stone-900">
              {totalGames}
            </strong>
          </div>

          <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
              <Trophy size={13} />
              Wins
            </span>
            <strong className="mt-1 block text-lg font-bold text-amber-700">
              {winGames}
            </strong>
          </div>
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
