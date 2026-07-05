import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth"; // Adjust path as needed
import ActivityCard from "./ActivityCard";
import { CalendarX, Loader2 } from "lucide-react";

const HomeActivities = () => {
  const { accessToken, loading, fetchWithAuth } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (loading || !accessToken) return;

    const fetchData = async () => {
      setIsFetching(true);
      try {
        const response = await fetchWithAuth(
          "http://localhost:8000/api/communities/sessions/public",
        );

        if (response && response.ok) {
          const data = await response.json();

          if (Array.isArray(data)) {
            setSessions(data);
          } else if (data && Array.isArray(data.sessions)) {
            setSessions(data.sessions);
          } else {
            console.error("Backend did not return an array:", data);
            setSessions([]);
          }
        }
      } catch (error) {
        console.error("Error fetching activities:", error);
        setSessions([]);
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [loading, accessToken, fetchWithAuth]);

  const showLoading = loading || isFetching;

  return (
    <div className="w-full max-w-[720px] mx-auto mt-8 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm text-stone-800 uppercase tracking-wider">
          Recent Public Sessions
        </h3>
        {showLoading && (
          <span className="flex items-center gap-x-1.5 text-xs text-stone-400 font-medium">
            <Loader2 size={12} className="animate-spin" /> Updating...
          </span>
        )}
      </div>

      {/* Loading Skeleton Row State */}
      {showLoading && sessions.length === 0 && (
        <div className="flex flex-col gap-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="w-full h-32 bg-stone-100/70 border border-stone-200/60 rounded-xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Clean Empty State Display */}
      {!showLoading && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-stone-200 rounded-xl bg-white text-center shadow-sm">
          <div className="p-3 bg-stone-50 text-stone-400 rounded-full mb-3">
            <CalendarX size={24} />
          </div>
          <h4 className="font-semibold text-sm text-stone-800">
            No active sessions
          </h4>
          <p className="text-xs text-stone-400 mt-1 max-w-[280px]">
            There are no public community sessions hosted right now. Check back
            later!
          </p>
        </div>
      )}

      {/* Active Session Feeds */}
      {sessions.length > 0 && (
        <div className="flex flex-col gap-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="transition-transform duration-150 hover:-translate-y-[1px]"
            >
              <ActivityCard session={session} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeActivities;
