import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../../../hooks/useAuth";

const Dashboard = () => {
  const { fetchWithAuth } = useAuth();
  const [players, setPlayers] = useState([]);
  const { communityId } = useParams();

  const getPlayers = useCallback(async () => {
    if (!communityId) return;
    try {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/players/total-community-games`,
        { method: "GET" },
      );
      if (!response.ok) throw new Error("Http error", response.status);
      const data = await response.json();
      if (!data.success) throw new Error(data?.message);

      setPlayers(data?.results ?? []);
    } catch (error) {
      console.error(error);
    }
  }, [communityId, fetchWithAuth]);

  useEffect(() => {
    getPlayers();
  }, [getPlayers]);

  return (
    <div className="w-full max-w-[720px] mx-auto select-none border">
      <table className="w-full">
        <thead>
          <tr className="text-left bg-stone-50">
            <th className="p-2 text-sm font-semibold text-stone-700">Player</th>
            <th className="p-2 text-sm font-semibold text-stone-700">Wins</th>
            <th className="p-2 text-sm font-semibold text-stone-700">Losses</th>
            <th className="p-2 text-sm font-semibold text-stone-700">Games</th>
          </tr>
        </thead>
        <tbody>
          {players?.map((player) => {
            const totalWins = player?.totalCommunityWins ?? 0;
            const totalLosses = player?.totalCommunityLosses ?? 0;
            const totalGames = player?.totalCommunityGames ?? 0;

            return (
              <tr key={player?.id} className="border-b hover:bg-stone-50">
                <td className="p-2 text-stone-900">
                  {player?.communityPlayer?.username}
                </td>
                <td className="p-2 font-medium text-stone-600">{totalWins}</td>
                <td className="p-2 font-medium text-stone-600">
                  {totalLosses}
                </td>
                <td className="p-2 font-medium text-stone-600">{totalGames}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
