import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth"; // Adjust path as needed
import ActivityCard from "./ActivityCard";
import { CalendarX, Loader2 } from "lucide-react";
import { API_URL } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const HomeActivities = () => {
  const { accessToken, loading, fetchWithAuth } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();
  const topRef = useRef(null);

  useEffect(() => {
    if (loading || !accessToken) return;

    const fetchData = async () => {
      setIsFetching(true);
      try {
        const response = await fetchWithAuth(
          `${API_URL}/api/communities/sessions/public?page=${currentPage}&limit=${itemsPerPage}`,
        );

        if (response && response.ok) {
          const data = await response.json();

          if (data && Array.isArray(data.sessions)) {
            setSessions(data.sessions);
            setTotalPages(data.totalPages || 1);
          } else if (Array.isArray(data)) {
            // Fallback if backend structure differs
            setSessions(data);
          } else {
            console.error("Backend did not return expected structure:", data);
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
  }, [loading, accessToken, fetchWithAuth, currentPage]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showLoading = loading || isFetching;

  return (
    <div
      ref={topRef}
      className="w-full max-w-[720px] mx-auto mt-8 mb-4 selection:bg-orange-500/10 selection:text-orange-950 scroll-mt-6"
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-extrabold text-[11px] text-stone-400 uppercase tracking-wider">
          Public Sessions
        </h3>
        {showLoading && (
          <span className="flex items-center gap-x-1.5 text-xs text-orange-500 font-bold animate-pulse">
            <Loader2 size={12} className="animate-spin" /> Loading sessions...
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
        <>
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

          {/* 📄 Pagination Controls (Matching Design) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-x-1.5 pt-6 pb-2">
              {/* Render dynamic page number boxes */}
              {Array.from({ length: totalPages }, (_, index) => {
                const pageNumber = index + 1;
                const isActive = pageNumber === currentPage;

                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`min-w-[32px] h-[32px] flex items-center justify-center px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                        : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              {/* Next Button */}
              <button
                onClick={() =>
                  handlePageChange(Math.min(currentPage + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="h-[32px] px-3 flex items-center justify-center text-xs font-bold rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer ml-1"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HomeActivities;
