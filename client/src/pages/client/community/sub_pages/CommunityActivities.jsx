import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../../hooks/useAuth";
import { SquarePen, Trash } from "lucide-react";

const CommunityActivities = () => {
  const { accessToken } = useAuth();
  const { communityId } = useParams();
  const [sessions, setSessions] = useState([]);
  const [hosts, setHosts] = useState([]);

  const getAllSessions = useCallback(async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/communities/${communityId}/sessions`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (!response.ok) throw new Error("Http error", response.status);

      const data = await response.json();
      if (!data.success)
        throw new Error(data?.message || "Internal server error");

      console.log(data.sessions);
      setSessions(data.sessions);
      // setHosts(data.sessions.players);
    } catch (error) {
      console.error("Get all sessions failed", error);
    }
  }, [accessToken]);

  useEffect(() => {
    getAllSessions();
  }, []);

  return (
    <div className="border">
      <main>
        <div className="flex items-center gap-x-4 py-1 px-2">
          <button className="cursor-pointer bg-gray-800 text-white px-2 py-1 rounded-md">
            Add session
          </button>
          <div>
            <div>
              <input
                type="search"
                placeholder="Search"
                autoComplete="off"
                className="border px-2 py-1 rounded-md"
              />
            </div>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-start p-2">Name</th>
              <th className="text-start p-2">Hosts</th>
              <th className="text-center p-2 w-[98px]">Sport</th>
              <th className="text-start p-2">Location</th>
              <th className="text-start p-2 w-[240px]">Schedule</th>
              <th className="text-center p-2 w-[98px]">Status</th>
              <th className="text-center p-2 w-[98px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions?.map((session) => {
              // 1. Filter out only the players who are owners or admins
              // 2. Map their nested objects to get their usernames
              const hosts = session?.players
                ?.filter(
                  (p) =>
                    p?.sessionPlayer?.role === "owner" ||
                    p?.sessionPlayer?.role === "admin",
                )
                ?.map((p) => p?.sessionPlayer?.communityPlayer?.username);

              return (
                <tr
                  key={session.id}
                  className="odd:bg-stone-100 cursor-pointer hover:bg-gray-200"
                >
                  {/* Session Name */}
                  <td className="text-start p-2">
                    <span className="block w-full truncate">
                      {session?.name}
                    </span>
                  </td>

                  {/* Display Hosts */}
                  <td className="text-start p-2">
                    {hosts && hosts.length > 0 ? (
                      <span className="block truncate w-full">
                        {hosts.join(", ")}
                      </span>
                    ) : (
                      // Joins multiple hosts like: "test, john"
                      <span className="text-gray-400 italic">No host yet</span>
                    )}
                  </td>

                  {/* Other Columns */}
                  <td className="text-center p-2">
                    <span className="text-[12px] rounded-full bg-gray-200 px-2 py-0.5">
                      {session?.sport}
                    </span>
                  </td>
                  <td className="text-start p-2">
                    {session?.location || "N/A"}
                  </td>
                  <td className="text-start p-2">
                    <div className="flex flex-col justify-center">
                      <span className="block">
                        Starts at:{" "}
                        <span className="font-medium">
                          {session?.startAt ?? "Anytime"}
                        </span>
                      </span>
                      <span className="block text-[12px] text-gray-700">
                        Ends at:{" "}
                        <span className="font-medium">
                          {session?.endAt ?? "Anytime"}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="text-center p-2">
                    <span
                      className={`text-[12px] px-2 py-0.5 rounded-full ${session?.isAvailable ? "text-white bg-green-600" : "text-red-600"}`}
                    >
                      {session?.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </td>
                  <td className="text-start p-2">
                    <div className="flex items-center justify-center gap-x-2">
                      <button className="cursor-pointer text-gray-500 p-1 hover:bg-gray-300 hover:text-blue-500 rounded-md">
                        <SquarePen size={20} />
                      </button>
                      <button className="cursor-pointer text-gray-500 p-1 hover:bg-gray-300 hover:text-red-500 rounded-md">
                        <Trash size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </main>
    </div>
  );
};

export default CommunityActivities;
