import { Check, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

const Payment = () => {
  const { communityId, sessionId } = useParams();
  const { fetchWithAuth } = useAuth();
  const [players, setPlayers] = useState([]);
  const [updatingPlayerId, setUpdatingPlayerId] = useState(null);

  const getPlayers = useCallback(async () => {
    if (!communityId || !sessionId) return;

    try {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/players`,
        { method: "GET" },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data?.message || "Failed to fetch players");
      }

      setPlayers(data.players ?? []);
    } catch (error) {
      console.error("Fetch payment players failed:", error);
    }
  }, [communityId, sessionId, fetchWithAuth]);

  useEffect(() => {
    getPlayers();
  }, [getPlayers]);

  const updatePaidStatus = async (sessionPlayerId, shouldMarkPaid) => {
    setUpdatingPlayerId(sessionPlayerId);

    try {
      const action = shouldMarkPaid ? "paid" : "unpaid";
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/sessions/${sessionId}/players/${sessionPlayerId}/${action}`,
        { method: "PATCH" },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data?.message || "Failed to update payment status");
      }

      setPlayers((currentPlayers) =>
        currentPlayers.map((player) =>
          player.id === sessionPlayerId
            ? {
                ...player,
                gameStatus: shouldMarkPaid ? "paid" : "waiting",
              }
            : player,
        ),
      );
    } catch (error) {
      console.error("Update payment status failed:", error);
    } finally {
      setUpdatingPlayerId(null);
    }
  };

  return (
    <div className="w-full max-w-[760px] mx-auto border border-stone-200 rounded-lg overflow-hidden shadow-sm bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-stone-50 border-b border-stone-200 text-sm">
            <th className="p-3 font-semibold text-stone-700 text-left">
              Player
            </th>
            <th className="p-3 font-semibold text-stone-700 text-center w-[120px]">
              Status
            </th>
            <th className="p-3 font-semibold text-stone-700 text-right w-[150px]">
              Payment
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {players.map((player) => {
            const isPaid = player.gameStatus === "paid";
            const isUpdating = updatingPlayerId === player.id;

            return (
              <tr
                key={player.id}
                className="hover:bg-stone-50/70 transition-colors duration-150"
              >
                <td className="p-3 text-sm font-medium text-stone-900">
                  {player.sessionPlayer?.communityPlayer?.username}
                </td>
                <td className="p-3 text-sm text-center">
                  <span
                    className={`inline-block px-2 py-0.5 font-semibold rounded-md min-w-[64px] ${
                      isPaid
                        ? "text-green-700 bg-green-50"
                        : "text-stone-600 bg-stone-100"
                    }`}
                  >
                    {isPaid ? "Paid" : "Unpaid"}
                  </span>
                </td>
                <td className="p-3 text-sm text-right">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => updatePaidStatus(player.id, !isPaid)}
                    className={`inline-flex items-center justify-center gap-x-1.5 border px-3 py-1.5 rounded-md font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                      isPaid
                        ? "border-stone-300 text-stone-600 hover:bg-stone-50"
                        : "border-green-200 text-green-700 bg-green-50 hover:bg-green-100"
                    }`}
                  >
                    {isPaid ? <RotateCcw size={15} /> : <Check size={15} />}
                    {isPaid ? "Unmark" : "Mark paid"}
                  </button>
                </td>
              </tr>
            );
          })}
          {players.length === 0 && (
            <tr>
              <td
                colSpan={3}
                className="p-8 text-center text-sm text-stone-400 italic"
              >
                No players in this session
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Payment;
