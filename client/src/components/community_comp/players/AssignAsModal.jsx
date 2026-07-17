import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { API_URL } from "../../../contexts/AuthContext";
import { X, Shield, Calendar } from "lucide-react";

const AssignAsModal = ({ player, onClose, onUpdatePlayerStatus }) => {
  const { communityId } = useParams();
  const { fetchWithAuth } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null); // null | 'admin' | 'host'
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const username =
    player?.username || player?.communityPlayer?.username || "Player";
  const userId = player?.communityPlayer?.id || player?.id;

  // Fetching sessions specifically for hosting selection assignments
  useEffect(() => {
    if (selectedRole === "host" && communityId) {
      const fetchSessions = async () => {
        try {
          const response = await fetchWithAuth(
            `${API_URL}/api/communities/${communityId}/sessions?status=available`,
            { method: "GET" },
          );
          if (response && response.ok) {
            const data = await response.json();
            if (data.success) setSessions(data.sessions);
          }
        } catch (error) {
          console.error("Failed to load sessions for host assignment", error);
        }
      };
      fetchSessions();
    }
  }, [selectedRole, communityId, fetchWithAuth]);

  // Handle Role Submissions to Backend endpoints
  const handleAssign = async () => {
    if (!selectedRole || isLoading) return;

    let endpoint = `${API_URL}/api/communities/${communityId}/players/${userId}/assign-${selectedRole}`;
    let bodyData = {};

    if (selectedRole === "host") {
      if (!selectedSessionId) {
        alert("Please select a session to host.");
        return;
      }
      // If your host endpoint accepts a specific session payload:
      bodyData = { sessionId: selectedSessionId };
    }

    try {
      setIsLoading(true);
      const res = await fetchWithAuth(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });
      const data = await res.json();

      if (!res.ok || !data.success)
        throw new Error(data?.message || "Assignment failed");

      if (typeof onUpdatePlayerStatus === "function") onUpdatePlayerStatus();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <header className="bg-stone-900 text-white p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-wide uppercase">
              Assign Role Status
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Modifying permissions for {username}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </header>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          {/* Base Selection Buttons */}
          <div className="flex gap-x-3">
            <button
              type="button"
              onClick={() => {
                setSelectedRole("admin");
                setSelectedSessionId(null);
              }}
              className={`flex-1 p-4 rounded-xl border flex flex-col items-center justify-center gap-y-1.5 transition-all cursor-pointer ${
                selectedRole === "admin"
                  ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm font-semibold"
                  : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              <Shield size={20} />
              <span className="text-xs">Community Admin</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole("host")}
              className={`flex-1 p-4 rounded-xl border flex flex-col items-center justify-center gap-y-1.5 transition-all cursor-pointer ${
                selectedRole === "host"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm font-semibold"
                  : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              <Calendar size={20} />
              <span className="text-xs">Session Host</span>
            </button>
          </div>

          {/* Conditional Container 1: Admin Confirmation View */}
          {selectedRole === "admin" && (
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-xs text-stone-600 leading-relaxed">
                Promoting <strong>{username}</strong> to Admin will grant them
                privileges to accept requests, manage static players, and handle
                regular configurations within this community.
              </p>
              <div className="flex justify-end gap-x-2 pt-1">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 border border-stone-200 text-stone-600 bg-white hover:bg-stone-50 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-sm disabled:bg-blue-400"
                >
                  {isLoading ? "Processing..." : "Add Admin"}
                </button>
              </div>
            </div>
          )}

          {/* as host */}
          {selectedRole === "host" && (
            <p className="text-center bg-red-100 p-2 rounded-lg text-[14px]">
              Under development
            </p>
          )}
        </div>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body, // Target matching index.html hook point[cite: 3]
  );
};

/*

{/* Conditional Container 2: Session Table View for Hosts 
          {selectedRole === "host" && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col">
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Select Target Session to Host
                </label>
                <div className="border border-stone-200 rounded-lg overflow-hidden max-h-[180px] overflow-y-auto bg-stone-50/50">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-100 text-[10px] uppercase tracking-wider text-stone-500 border-b border-stone-200">
                        <th className="p-2 font-bold">Session Name</th>
                        <th className="p-2 font-bold">Sport</th>
                        <th className="p-2 font-bold text-center">Select</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 text-xs">
                      {sessions.map((session) => (
                        <tr
                          key={session.id}
                          onClick={() => setSelectedSessionId(session.id)}
                          className={`hover:bg-stone-100/70 cursor-pointer transition-colors ${selectedSessionId === session.id ? "bg-emerald-50/60" : ""}`}
                        >
                          <td className="p-2 font-medium text-stone-800 max-w-[180px] truncate">
                            {session.name}
                          </td>
                          <td className="p-2 text-stone-500">
                            {session.sport}
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="radio"
                              name="sessionHostSelect"
                              checked={selectedSessionId === session.id}
                              onChange={() => setSelectedSessionId(session.id)}
                              className="accent-emerald-600 cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                      {sessions.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="p-6 text-center text-stone-400 italic bg-white"
                          >
                            No active available sessions found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Toolbar for Host selection submission
              <div className="flex justify-end gap-x-2 pt-2 border-t border-stone-100">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 border border-stone-200 text-stone-600 bg-white hover:bg-stone-50 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={isLoading || !selectedSessionId}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-sm disabled:bg-stone-300 disabled:text-stone-500 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Processing..." : "Assign Session Host"}
                </button>
              </div>
            </div>
          )}

*/

export default AssignAsModal;
