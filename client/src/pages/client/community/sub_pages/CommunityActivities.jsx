import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../../hooks/useAuth";

const CommunityActivities = () => {
  const { accessToken } = useAuth();
  const { communityId } = useParams();
  const [sessions, setSessions] = useState([]);

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

      setSessions(data.sessions);
    } catch (error) {
      console.error("Get all sessions failed", error);
    }
  }, [accessToken]);

  useEffect(() => {
    getAllSessions();
  }, []);

  return (
    <div className="border">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Host</th>
            <th>Sport</th>
            <th>Location</th>
            <th>Schedule</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions?.map((session) => (
            <tr>
              <td>{session?.name}</td>
              <td>{session?.hosts || "No host yet"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CommunityActivities;
