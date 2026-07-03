import React, { useCallback, useEffect, useState, useRef } from "react";
import { useAuth } from "../../../../../hooks/useAuth";
import { useParams } from "react-router-dom";
import { ChevronDown, EllipsisVertical } from "lucide-react";
import PlayerAvatar from "../../../../../components/PlayerAvatar";
import PlayerSettings from "../../../../../components/community_comp/players/PlayerSettings";

const All = () => {
  const { fetchWithAuth, user } = useAuth();
  const { communityId } = useParams();
  const [players, setPlayers] = useState([]);
  const [isStaticMinimized, setIsStaticMinimized] = useState(false);
  const [isUserMinimized, setIsUserMinimized] = useState(false);

  // 🌟 State to track which settings dropdown is open and its button anchor ref
  const [activeMenu, setActiveMenu] = useState(null); // Structure: { playerId: string, ref: ReactRef }

  const getAllSession = useCallback(async () => {
    if (!communityId) return;

    try {
      const response = await fetchWithAuth(
        `http://localhost:8000/api/communities/${communityId}/players`,
        { method: "GET" },
      );

      if (!response.ok) {
        throw new Error(`HTTP request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data?.message || "An unknown error occurred");
      }

      setPlayers(data.player);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  }, [fetchWithAuth, communityId]);

  useEffect(() => {
    getAllSession();
  }, [getAllSession]);

  // Dynamic assignment handler to pass down specific element triggers
  const handleToggleMenu = (e, player) => {
    e.stopPropagation();
    if (activeMenu?.playerId === player.id) {
      setActiveMenu(null);
    } else {
      setActiveMenu({
        playerId: player.id,
        // Mock a standard React element ref container for the absolute layout setup
        current: e.currentTarget,
      });
    }
  };

  return (
    <div className="w-full max-w-[720px] mx-auto select-none">
      <h3 className="p-2 font-medium">All players</h3>
      <div className="p-2">
        <h4 className="font-medium text-[18px] text-stone-800">Players</h4>
        <div className="flex items-center gap-x-1">
          <button className="block border px-2 py-0.5 text-[14px] font-medium cursor-pointer rounded-md mt-1 bg-stone-800 text-stone-100 hover:bg-stone-600">
            Add static player
          </button>
          <select
            name="sort"
            id="sort"
            className="block border px-1 py-0.5 text-[14px] font-medium cursor-pointer rounded-md mt-1"
          >
            <option value="a-z" className="font-medium">
              A-Z
            </option>
            <option value="asc" className="font-medium">
              Ascend
            </option>
            <option value="desc" className="font-medium">
              Descend
            </option>
          </select>
        </div>
      </div>

      {/* Creator and Admin Section */}
      <div className="flex flex-col gap-y-2 p-2">
        <header
          title={
            isUserMinimized
              ? "Expand user container"
              : "Minimize user container"
          }
          onClick={() => setIsUserMinimized((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer hover:bg-stone-200 py-1 px-2 rounded-md"
        >
          <h4 className="font-medium text-[16px] text-stone-800">
            Creator & admins
          </h4>
          <span
            className={`transition-transform duration-200 flex items-center justify-center ${
              isUserMinimized ? "rotate-180" : "rotate-0"
            }`}
          >
            <ChevronDown size={16} />
          </span>
        </header>

        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${
            isUserMinimized ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
          }`}
        >
          <div className="overflow-hidden flex flex-col gap-y-2 py-1">
            {players
              .filter(
                (player) => player.role === "owner" || player.role === "admin",
              )
              .map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center gap-x-3">
                    <PlayerAvatar
                      username={player?.communityPlayer?.username}
                      size="xl"
                    />
                    <div>
                      <h5 className="font-semibold text-stone-900">
                        {player?.communityPlayer?.username}
                      </h5>
                      <div className="flex items-center gap-x-2 text-[12px] text-gray-500 font-medium">
                        <span className="bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded-full uppercase">
                          {player?.communityPlayer?.skillLevel}
                        </span>
                        <span className="capitalize bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {player.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Added Settings Menu Action for Admin lists too if applicable */}
                  <div className="flex items-center gap-x-2">
                    {user.id !== player?.communityPlayer?.id && (
                      <button className="border px-2 font-medium text-[14px] cursor-pointer rounded py-1">
                        Add friend
                      </button>
                    )}

                    <div className="relative">
                      <button
                        onClick={(e) => handleToggleMenu(e, player)}
                        className="block rounded-full p-1 hover:bg-gray-200 cursor-pointer text-stone-700"
                      >
                        <EllipsisVertical size={16} />
                      </button>

                      {activeMenu?.playerId === player.id && (
                        <PlayerSettings
                          player={player}
                          type={player?.communityPlayer?.type}
                          toggleButtonRef={activeMenu}
                          onClose={() => setActiveMenu(null)}
                          onUpdatePlayerStatus={getAllSession}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Players & Statics Section */}
      <div className="p-2 flex flex-col gap-y-2 border-t">
        <header
          title={
            isStaticMinimized
              ? "Expand static container"
              : "Minimize static container"
          }
          onClick={() => setIsStaticMinimized((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer hover:bg-stone-200 py-1 px-2 rounded-md"
        >
          <h4 className="font-medium text-[16px] text-stone-800">All static</h4>
          <span
            className={`transition-transform duration-200 flex items-center justify-center ${
              isStaticMinimized ? "rotate-180" : "rotate-0"
            }`}
          >
            <ChevronDown size={16} />
          </span>
        </header>

        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${
            isStaticMinimized ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
          }`}
        >
          <div className="overflow-hidden flex flex-col gap-y-2 py-1">
            {players
              .filter((player) => player.role === "player")
              .map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center gap-x-3">
                    <PlayerAvatar
                      username={player?.communityPlayer?.username}
                      size="xl"
                    />
                    <div>
                      <h5 className="font-semibold text-stone-900">
                        {player?.communityPlayer?.username}
                      </h5>
                      <div className="flex items-center gap-x-2 text-[12px] text-gray-500 font-medium">
                        <span className="bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded-full uppercase">
                          {player?.communityPlayer?.skillLevel}
                        </span>
                        <span className="capitalize bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {player.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-x-2">
                    {player?.communityPlayer?.type !== "static" && (
                      <button className="border px-2 font-medium text-[14px] cursor-pointer rounded py-1">
                        Add friend
                      </button>
                    )}

                    <div className="relative">
                      {/* 🌟 Transformed visual div to interactive button container with anchor event passing */}
                      <button
                        onClick={(e) => handleToggleMenu(e, player)}
                        className="block rounded-full p-1 hover:bg-gray-200 cursor-pointer text-stone-700 outline-none"
                      >
                        <EllipsisVertical size={16} />
                      </button>

                      {/* 🌟 Conditional implementation passing up configuration requirements */}
                      {activeMenu?.playerId === player.id && (
                        <PlayerSettings
                          player={player}
                          type={player?.communityPlayer?.type}
                          toggleButtonRef={activeMenu}
                          onClose={() => setActiveMenu(null)}
                          onUpdatePlayerStatus={getAllSession}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default All;
