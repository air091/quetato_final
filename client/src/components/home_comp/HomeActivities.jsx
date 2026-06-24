import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth"; // Adjust path as needed
import ActivityCard from "./ActivityCard";

const HomeActivities = () => {
  const { accessToken, loading, fetchWithAuth } = useAuth();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    // 2. CRITICAL GUARD: Stop the 401 by waiting until the authentication bootup finishes
    if (loading || !accessToken) return;

    const fetchData = async () => {
      try {
        const response = await fetchWithAuth(
          "http://localhost:8000/api/communities/sessions/public",
        );

        if (response && response.ok) {
          const data = await response.json();

          // 3. BACKEND TYPE SAFETY: Only set state if the backend actually returned an array
          if (Array.isArray(data)) {
            setSessions(data);
          } else if (data && Array.isArray(data.sessions)) {
            // Adjust this if your backend wraps the array in an object like { sessions: [...] }
            setSessions(data.sessions);
          } else {
            console.error("Backend did not return an array:", data);
            setSessions([]); // Fallback to safe empty array
          }
        }
      } catch (error) {
        console.error("Error fetching activities:", error);
        setSessions([]); // Fallback on catch
      }
    };

    fetchData();
  }, [loading, accessToken, fetchWithAuth]);

  // 4. RENDERING SAFETY LAYER
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">HomeActivities</h2>

      {/* Optional: Add a subtle placeholder while Auth is validating in the background */}
      {loading && (
        <p className="text-sm text-gray-500">Checking credentials...</p>
      )}

      {/* Optional: Add an empty state notice */}
      {!loading && sessions.length === 0 && (
        <p className="text-sm text-gray-400">No public sessions found.</p>
      )}

      {/* Optional chaining (?.) ensures that even if sessions somehow shifts to undefined, it won't crash */}
      {sessions?.map((session) => (
        <div key={session.id} className="p-2 border-b">
          <ActivityCard session={session} />
        </div>
      ))}
    </div>
  );
};

export default HomeActivities;
