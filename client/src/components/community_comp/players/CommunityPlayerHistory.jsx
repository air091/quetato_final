import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { API_URL } from "../../../contexts/AuthContext";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown date";

const CommunityPlayerHistory = ({
  communityId,
  communityPlayerId,
  username,
  onClose,
}) => {
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const dialogRef = useRef(null);

  useEffect(() => {
    const loadHistory = async () => {
      if (!communityPlayerId) return;

      try {
        setIsLoading(true);
        setError("");
        const response = await fetchWithAuth(
          `${API_URL}/api/communities/${communityId}/players/${communityPlayerId}/history`,
        );
        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Could not load player history");
        }

        setData(result.results);
      } catch (loadError) {
        setError(loadError.message || "Could not load player history");
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [communityId, communityPlayerId, fetchWithAuth]);

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <section
        ref={dialogRef}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border bg-white shadow-xl"
      >
        <header className="flex items-start justify-between border-b bg-stone-50 p-4">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Community points history
            </h3>
            <p className="text-xs text-stone-500">
              All sessions for <span className="font-semibold">{username}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
            aria-label="Close history"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {isLoading && (
            <p className="py-10 text-center text-sm text-stone-400">
              Loading point history…
            </p>
          )}

          {error && (
            <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {!isLoading && !error && data && (
            <>
              <div className="grid grid-cols-3 gap-2 rounded border bg-stone-50 p-3 text-center">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-stone-400">
                    Matches
                  </p>
                  <p className="text-lg font-bold text-stone-800">
                    {data.summary.totalGames}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-stone-400">
                    Wins · points
                  </p>
                  <p className="text-lg font-bold text-emerald-700">
                    {data.summary.totalWins} · +{data.summary.winPoints}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-stone-400">
                    Total points
                  </p>
                  <p className="text-lg font-bold text-blue-700">
                    {data.summary.totalPoints}
                  </p>
                </div>
              </div>

              <div className="rounded border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                <span className="font-bold">Points breakdown:</span> +
                {data.summary.winPoints} from wins and +
                {data.summary.paymentPoints} from {data.payments.length} paid
                {data.payments.length === 1 ? " session" : " sessions"} (3
                points each).
              </div>

              <section>
                <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-stone-400">
                  Match history
                </h4>
                <div className="space-y-2">
                  {data.history.length === 0 ? (
                    <p className="rounded border border-dashed p-4 text-center text-xs text-stone-400">
                      No completed matches across this community yet.
                    </p>
                  ) : (
                    data.history.map((match) => (
                      <article
                        key={match.matchHistoryId}
                        className="rounded border p-3 text-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-stone-800">
                              {match.sessionName} · {match.courtName}
                            </p>
                            <p className="mt-0.5 text-stone-400">
                              {formatDate(match.endedAt)}
                            </p>
                          </div>
                          <span
                            className={`rounded px-2 py-0.5 font-bold uppercase ${
                              match.result === "win"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {match.result} · +{match.points}
                          </span>
                        </div>
                        <p className="mt-2 text-stone-600">
                          Team A: {match.teamA.map((player) => player.username).join(", ")}
                          <br />
                          Team B: {match.teamB.map((player) => player.username).join(", ")}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-stone-400">
                  Paid sessions
                </h4>
                <div className="space-y-2">
                  {data.payments.length === 0 ? (
                    <p className="rounded border border-dashed p-4 text-center text-xs text-stone-400">
                      No paid sessions recorded.
                    </p>
                  ) : (
                    data.payments.map((payment) => (
                      <article
                        key={payment.sessionId}
                        className="flex items-center justify-between rounded border border-amber-100 bg-amber-50 p-3 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-stone-800">
                            {payment.sessionName}
                          </p>
                          <p className="text-stone-400">
                            Marked paid {formatDate(payment.paidAt)}
                          </p>
                        </div>
                        <span className="font-bold text-amber-700">+{payment.points}</span>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
};

export default CommunityPlayerHistory;
