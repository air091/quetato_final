import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { API_URL } from "../../../contexts/AuthContext";
import {
  getPlayerNameValidation,
  parsePlayerNames,
} from "../../../utils/playerNameValidation";

// Skill level labels dictionary
export const SKILL_LEVEL_LABELS = {
  LB: "Low Beginner",
  BEG: "Beginner",
  HB: "High Beginner",
  LI: "Low Intermediate",
  INT: "Intermediate",
  UI: "Upper Intermediate",
  ADV: "Advanced",
  EXP: "Experience",
};

const AddStaticPlayer = ({
  fetchWithAuth,
  communityId,
  getAllSession,
  isOpen,
  setIsOpen,
  existingPlayers = [],
}) => {
  const [namesText, setNamesText] = useState("");
  const [skillLevel, setSkillLevel] = useState("LB");
  const [loading, setLoading] = useState(false);

  // Store ALL names from API to bypass the limit=5 pagination issue
  const [allPlayerNames, setAllPlayerNames] = useState([]);

  // Fetch ALL community players for accurate validation when the modal opens
  useEffect(() => {
    const fetchAllNamesForValidation = async () => {
      if (!isOpen || !communityId) return;

      try {
        // Fetch players (with high limit to get all) and management players concurrently
        const [playersRes, mgmtRes] = await Promise.all([
          fetchWithAuth(
            `${API_URL}/api/communities/${communityId}/players?limit=1000`,
            { method: "GET" },
          ),
          fetchWithAuth(
            `${API_URL}/api/communities/${communityId}/managements`,
            { method: "GET" },
          ),
        ]);

        const playersData = await playersRes.json();
        const mgmtData = await mgmtRes.json();

        let combinedNames = [];

        // Extract regular/static player names
        if (playersData.success && playersData.players) {
          const pNames = playersData.players.map(
            (p) => p?.communityPlayer?.username || p?.player?.username,
          );
          combinedNames = [...combinedNames, ...pNames];
        }

        // Extract admin/owner names
        if (mgmtData.success && mgmtData.results) {
          const mNames = mgmtData.results.map(
            (p) => p?.communityPlayer?.username || p?.player?.username,
          );
          combinedNames = [...combinedNames, ...mNames];
        }

        // Filter out undefined/null and update state
        setAllPlayerNames(combinedNames.filter(Boolean));
      } catch (error) {
        console.error(
          "Failed to fetch full player list for validation:",
          error,
        );

        // Fallback to the currently loaded players if the fetch fails
        const fallbackNames = existingPlayers
          .map((p) => p?.communityPlayer?.username || p?.player?.username)
          .filter(Boolean);
        setAllPlayerNames(fallbackNames);
      }
    };

    fetchAllNamesForValidation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, communityId]);

  // Use the newly fetched, comprehensive list for validation
  const nameValidation = getPlayerNameValidation(namesText, allPlayerNames);

  if (!isOpen) return null;

  const handleClose = () => {
    setNamesText("");
    setSkillLevel("LB");
    setIsOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (nameValidation.hasError) return;

    const parsedNames = parsePlayerNames(namesText);

    if (parsedNames.length === 0) return;

    setLoading(true);
    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players/static`,
        {
          method: "POST",
          body: JSON.stringify({
            usernames: parsedNames,
            skillLevel,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.message || "Failed to create static players");
      }

      getAllSession();
      handleClose();
    } catch (error) {
      console.error("Error creating static players:", error);
      alert(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-lg font-semibold text-stone-900">
            Add Static Players
          </h3>
          <button
            onClick={handleClose}
            className="text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Player Names (One per line)
            </label>
            <textarea
              required
              rows={5}
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              placeholder={"john\ndoe\njane"}
              className={`w-full border rounded-md px-3 py-2 text-sm outline-none font-mono resize-none ${
                nameValidation.hasError
                  ? "border-red-300 focus:border-red-400"
                  : "focus:border-stone-500"
              }`}
            />
            <p
              className={`text-[12px] mt-1 ${
                nameValidation.hasError ? "text-red-600" : "text-stone-500"
              }`}
            >
              {nameValidation.hasError
                ? nameValidation.message
                : "Press Enter to add multiple players at once."}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Skill Level (Applies to all)
            </label>
            <select
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white outline-none focus:border-stone-500"
            >
              {Object.entries(SKILL_LEVEL_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-end gap-x-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="border px-4 py-2 text-sm font-medium rounded-md text-stone-700 hover:bg-stone-50 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || nameValidation.hasError}
              className="bg-stone-800 text-white px-4 py-2 text-sm font-medium rounded-md hover:bg-stone-700 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Players"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStaticPlayer;
