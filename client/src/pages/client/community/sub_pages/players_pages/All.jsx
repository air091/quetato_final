import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../../../hooks/useAuth";
import { useOutletContext, useParams } from "react-router-dom";
import { ChevronDown, EllipsisVertical, Search, X } from "lucide-react";
import PlayerAvatar from "../../../../../components/PlayerAvatar";
import PlayerSettings from "../../../../../components/community_comp/players/PlayerSettings";
import AddStaticPlayer from "../../../../../components/community_comp/players/AddStaticPlayer";
import { API_URL } from "../../../../../contexts/AuthContext";

const MANAGEMENT_ROLES = ["owner", "admin", "host"];

const All = () => {
  const { fetchWithAuth, user } = useAuth();

  const context = useOutletContext();
  const communityPlayer = context?.communityPlayer;

  const { communityId } = useParams();
  const [players, setPlayers] = useState([]);

  // Search & Sort State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("a-z"); // 'a-z' or 'z-a'

  const [isStaticMinimized, setIsStaticMinimized] = useState(true);
  const [isUserMinimized, setIsUserMinimized] = useState(true);
  const [isRequestMinimized, setIsRequestMinimized] = useState(true);
  const [isAddStaticPlayerModalOpen, setIsAddStaticPlayerModalOpen] =
    useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  // swhatt
  const getAllSession = useCallback(async () => {
    if (!communityId) return;

    try {
      const response = await fetchWithAuth(
        `${API_URL}/api/communities/${communityId}/players?t=${Date.now()}`,
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

  const handleOptimisticTransfer = (sourcePlayerId, targetPlayerId) => {
    setPlayers((prevPlayers) => {
      const sourcePlayer = prevPlayers.find((p) => p.id === sourcePlayerId);
      if (!sourcePlayer) return prevPlayers;

      const transferredPaidCount = sourcePlayer.paidSessionCount || 0;
      const transferredPaidPoints = transferredPaidCount * 3;

      return prevPlayers.map((p) => {
        if (p.id === sourcePlayerId) {
          return {
            ...p,
            paidSessionCount: 0,
            totalCommunityPoints: Math.max(
              0,
              (p.totalCommunityPoints || 0) - transferredPaidPoints,
            ),
          };
        }

        if (p.id === targetPlayerId) {
          return {
            ...p,
            paidSessionCount: (p.paidSessionCount || 0) + transferredPaidCount,
            totalCommunityPoints:
              (p.totalCommunityPoints || 0) + transferredPaidPoints,
          };
        }

        return p;
      });
    });
  };

  const handleToggleMenu = (e, player) => {
    e.stopPropagation();
    if (activeMenu?.playerId === player.id) {
      setActiveMenu(null);
    } else {
      setActiveMenu({
        playerId: player.id,
        current: e.currentTarget,
      });
    }
  };

  // Helper function to search and sort list of players
  const getFilteredAndSortedPlayers = (playerList) => {
    return playerList
      .filter((p) => {
        const username = p?.communityPlayer?.username || "";
        return username.toLowerCase().includes(searchTerm.toLowerCase().trim());
      })
      .sort((a, b) => {
        const nameA = (a?.communityPlayer?.username || "").toLowerCase();
        const nameB = (b?.communityPlayer?.username || "").toLowerCase();

        if (sortOrder === "a-z") {
          return nameA.localeCompare(nameB);
        } else {
          return nameB.localeCompare(nameA);
        }
      });
  };

  const isManagement =
    communityPlayer?.role === "owner" || communityPlayer?.role === "admin";

  const managementPlayers = getFilteredAndSortedPlayers(
    players.filter((p) => MANAGEMENT_ROLES.includes(p.role)),
  );
  const regularPlayers = getFilteredAndSortedPlayers(
    players.filter((p) => p.role === "player"),
  );
  const requestedPlayers = getFilteredAndSortedPlayers(
    players.filter((p) => p.role === "guest"),
  );

  return (
    <div className="w-full max-w-[720px] mx-auto select-none bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden my-4">
      {/* Clean Top Action Header bar */}
      <div className="p-4 border-b border-stone-100 flex flex-col gap-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-3">
          <div>
            <h3 className="font-bold text-lg text-stone-900">
              Community Members
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {isManagement
                ? "Manage community rosters, roles, and static players."
                : "View community rosters and verified players."}
            </p>
          </div>

          <div className="flex items-center gap-x-2 self-end sm:self-auto">
            {isManagement && (
              <>
                <button
                  onClick={() => setIsAddStaticPlayerModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  Add Static Player
                </button>

                <AddStaticPlayer
                  fetchWithAuth={fetchWithAuth}
                  communityId={communityId}
                  getAllSession={getAllSession}
                  isOpen={isAddStaticPlayerModalOpen}
                  setIsOpen={setIsAddStaticPlayerModalOpen}
                  existingPlayers={players}
                />
              </>
            )}

            <select
              name="sort"
              id="sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-stone-50 border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 cursor-pointer rounded-lg outline-none focus:border-stone-400 transition-colors"
            >
              <option value="a-z">Sort: A-Z</option>
              <option value="z-a">Sort: Z-A</option>
            </select>
          </div>
        </div>

        {/* Search Input Bar with Clear (X) Button */}
        <div className="relative w-full flex items-center">
          <Search
            size={16}
            className="absolute left-3 text-stone-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search players by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-7 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 placeholder:text-stone-400 outline-none focus:border-stone-400 focus:bg-white transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Creator, Admin and Host Section */}
      <div className="p-2 flex flex-col">
        <header
          title={isUserMinimized ? "Expand container" : "Minimize container"}
          onClick={() => setIsUserMinimized((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer hover:bg-stone-50 py-2 px-3 rounded-xl group transition-colors"
        >
          <div className="flex items-center gap-x-2">
            <h4 className="font-semibold text-sm text-stone-800">
              Creator, Admins & Hosts
            </h4>
            <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 font-medium rounded-full">
              {managementPlayers.length}
            </span>
          </div>
          <span
            className={`text-stone-400 group-hover:text-stone-600 transition-transform duration-200 flex items-center justify-center ${
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
          <div className="overflow-hidden flex flex-col gap-y-1 px-1">
            {managementPlayers.map((player) => {
              const isCurrentUser =
                user && player?.communityPlayer?.id === user?.id;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-colors border ${
                    isCurrentUser
                      ? "bg-amber-50/60 border-amber-100/70 hover:bg-amber-50"
                      : "border-transparent hover:border-stone-100 hover:bg-stone-50/70"
                  }`}
                >
                  <div className="flex items-center gap-x-3">
                    <PlayerAvatar
                      username={player?.communityPlayer?.username}
                      size="xl"
                    />
                    <div>
                      <div className="flex items-center gap-x-2">
                        <h5 className="font-semibold text-sm text-stone-900 leading-tight">
                          {player?.communityPlayer?.username}
                        </h5>
                        {isCurrentUser && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-x-1.5 text-[11px] font-semibold mt-1">
                        <span
                          className={`px-2 py-0.5 rounded-md capitalize ${
                            player.role === "owner"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : player.role === "host"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-blue-50 text-blue-700 border border-blue-100"
                          }`}
                        >
                          {player.role}
                        </span>
                        <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md uppercase">
                          {player?.communityPlayer?.skillLevel || "UNRANKED"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-x-2">
                    {!isCurrentUser && (
                      <button className="border border-stone-200 px-3 py-1.5 font-semibold text-xs text-stone-700 cursor-pointer rounded-lg hover:bg-stone-50 bg-white shadow-sm transition-colors">
                        Add Friend
                      </button>
                    )}

                    {isManagement && (
                      <div className="relative">
                        <button
                          onClick={(e) => handleToggleMenu(e, player)}
                          className="block rounded-lg p-1.5 hover:bg-stone-100 cursor-pointer text-stone-500 hover:text-stone-800 transition-colors outline-none"
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
                            onGamesTransferred={getAllSession}
                            onOptimisticTransfer={handleOptimisticTransfer}
                            isManagement={isManagement}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Players & Statics Section */}
      <div className="p-2 flex flex-col border-t border-stone-100 bg-stone-50/30">
        <header
          title={isStaticMinimized ? "Expand container" : "Minimize container"}
          onClick={() => setIsStaticMinimized((prev) => !prev)}
          className="flex items-center justify-between cursor-pointer hover:bg-stone-50 py-2 px-3 rounded-xl group transition-colors"
        >
          <div className="flex items-center gap-x-2">
            <h4 className="font-semibold text-sm text-stone-800">
              All Regular & Static Players
            </h4>
            <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 font-medium rounded-full">
              {regularPlayers.length}
            </span>
          </div>
          <span
            className={`text-stone-400 group-hover:text-stone-600 transition-transform duration-200 flex items-center justify-center ${
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
          <div className="overflow-hidden flex flex-col gap-y-1 px-1">
            {regularPlayers.map((player) => {
              const isCurrentUser =
                user && player?.communityPlayer?.id === user?.id;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                    isCurrentUser
                      ? "bg-amber-50/60 border-amber-100/70 hover:bg-amber-50"
                      : "bg-white border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-x-3">
                    <PlayerAvatar
                      username={player?.communityPlayer?.username}
                      size="xl"
                    />
                    <div>
                      <div className="flex items-center gap-x-2">
                        <h5 className="font-semibold text-sm text-stone-900 leading-tight">
                          {player?.communityPlayer?.username}
                        </h5>
                        {isCurrentUser && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-x-1.5 text-[11px] font-semibold mt-1">
                        <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md uppercase">
                          {player?.communityPlayer?.skillLevel || "UNRANKED"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md capitalize border ${
                            player?.communityPlayer?.type === "static"
                              ? "bg-purple-50 text-purple-700 border-purple-100"
                              : "bg-stone-50 text-stone-600 border-stone-200"
                          }`}
                        >
                          {player?.communityPlayer?.type || "Regular"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-x-2">
                    {!isCurrentUser &&
                      player?.communityPlayer?.type !== "static" && (
                        <button className="border border-stone-200 px-3 py-1.5 font-semibold text-xs text-stone-700 cursor-pointer rounded-lg hover:bg-stone-50 bg-white shadow-sm transition-colors">
                          Add Friend
                        </button>
                      )}

                    <div className="relative">
                      {(isManagement || isCurrentUser) && (
                        <div className="relative">
                          <button
                            onClick={(e) => handleToggleMenu(e, player)}
                            className="block rounded-lg p-1.5 hover:bg-stone-100 cursor-pointer text-stone-500 hover:text-stone-800 transition-colors outline-none"
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
                              onGamesTransferred={getAllSession}
                              onOptimisticTransfer={handleOptimisticTransfer}
                              isManagement={isManagement}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Request players */}
      {isManagement && (
        <div className="p-2 flex flex-col border-t border-stone-100 bg-stone-50/30">
          <header
            title={
              isRequestMinimized ? "Expand container" : "Minimize container"
            }
            onClick={() => setIsRequestMinimized((prev) => !prev)}
            className="flex items-center justify-between cursor-pointer hover:bg-stone-50 py-2 px-3 rounded-xl group transition-colors"
          >
            <div className="flex items-center gap-x-2">
              <h4 className="font-semibold text-sm text-stone-800">
                All Requested Players
              </h4>
              <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 font-medium rounded-full">
                {requestedPlayers.length}
              </span>
            </div>
            <span
              className={`text-stone-400 group-hover:text-stone-600 transition-transform duration-200 flex items-center justify-center ${
                isRequestMinimized ? "rotate-180" : "rotate-0"
              }`}
            >
              <ChevronDown size={16} />
            </span>
          </header>

          <div
            className={`grid transition-[grid-template-rows] duration-200 ease-out ${
              isRequestMinimized ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
            }`}
          >
            <div className="overflow-hidden flex flex-col gap-y-1 px-1">
              {requestedPlayers.map((player) => {
                const isCurrentUser =
                  user && player?.communityPlayer?.id === user?.id;

                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                      isCurrentUser
                        ? "bg-amber-50/60 border-amber-100/70 hover:bg-amber-50"
                        : "bg-white border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-x-3">
                      <PlayerAvatar
                        username={player?.communityPlayer?.username}
                        size="xl"
                      />
                      <div>
                        <div className="flex items-center gap-x-2">
                          <h5 className="font-semibold text-sm text-stone-900 leading-tight">
                            {player?.communityPlayer?.username}
                          </h5>
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-x-1.5 text-[11px] font-semibold mt-1">
                          <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md uppercase">
                            {player?.communityPlayer?.skillLevel || "UNRANKED"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md capitalize border ${
                              player?.communityPlayer?.type === "static"
                                ? "bg-purple-50 text-purple-700 border-purple-100"
                                : "bg-stone-50 text-stone-600 border-stone-200"
                            }`}
                          >
                            {player?.communityPlayer?.type || "Regular"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-x-2">
                      {!isCurrentUser &&
                        player?.communityPlayer?.type !== "static" && (
                          <button className="border border-stone-200 px-3 py-1.5 font-semibold text-xs text-stone-700 cursor-pointer rounded-lg hover:bg-stone-50 bg-white shadow-sm transition-colors">
                            Add Friend
                          </button>
                        )}

                      <div className="relative">
                        {isManagement && (
                          <div className="relative">
                            <button
                              onClick={(e) => handleToggleMenu(e, player)}
                              className="block rounded-lg p-1.5 hover:bg-stone-100 cursor-pointer text-stone-500 hover:text-stone-800 transition-colors outline-none"
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
                                onGamesTransferred={getAllSession}
                                onOptimisticTransfer={handleOptimisticTransfer}
                                isRequest={player.role === "guest"}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default All;
