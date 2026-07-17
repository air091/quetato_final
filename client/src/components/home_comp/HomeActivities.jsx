import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth"; // Adjust path as needed
import ActivityCard from "./ActivityCard";
import { CalendarX, Loader2 } from "lucide-react";
import { API_URL } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const HomeActivities = () => {
  const { accessToken, loading, fetchWithAuth } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (loading || !accessToken) return;

    const fetchData = async () => {
      setIsFetching(true);
      try {
        const response = await fetchWithAuth(
          `${API_URL}/api/communities/sessions/public`,
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
    <div className="w-full max-w-[720px] mx-auto mt-8 mb-4 selection:bg-orange-500/10 selection:text-orange-950">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-extrabold text-[11px] text-stone-400 uppercase tracking-wider">
          Public Sessions
        </h3>
        {showLoading && (
          <span className="flex items-center gap-x-1.5 text-xs text-orange-500 font-bold animate-pulse">
            <Loader2 size={12} className="animate-spin" /> Updating Roster...
          </span>
        )}
      </div>

      {/* 🌀 Loading Skeleton Row State */}
      {showLoading && sessions.length === 0 && (
        <div className="flex flex-col gap-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="w-full h-32 bg-stone-100/50 border border-stone-200/60 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* 🥔 Clean Empty State Display */}
      {!showLoading && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-stone-200/80 rounded-2xl bg-white text-center shadow-sm shadow-stone-100/50">
          <div className="p-3 bg-orange-50 text-orange-500 rounded-full mb-3 border border-orange-100/50">
            <CalendarX size={24} />
          </div>
          <h4 className="font-bold text-sm text-stone-900">
            No Active Matchups
          </h4>
          <p className="text-xs text-stone-400 mt-1.5 max-w-[280px] font-medium leading-relaxed">
            There are no public community sessions hosted right now. Gather your
            crew and create one!
          </p>
        </div>
      )}

      {/* 🏆 Active Session Feeds */}
      {sessions.length > 0 && (
        <div className="flex flex-col gap-y-3.5">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() =>
                navigate(`/community/${session.community.id}/sessions`)
              }
              className="cursor-pointer transition-all duration-250 hover:-translate-y-0.5 hover:shadow-md hover:shadow-stone-200/40 rounded-2xl active:scale-[0.99]"
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
