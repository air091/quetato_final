import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";

export const getPlayerGameHistory = async (sessionPlayerId) => {
  if (!sessionPlayerId) {
    throw new AppError(
      "Session Player ID is required to fetch game history",
      400,
    );
  }

  // 1. Query the junction table to get all matches this specific player participated in
  const matchRecords = await prisma.matchHistoryPlayer.findMany({
    where: {
      sessionPlayerId: sessionPlayerId,
    },
    include: {
      // Pull the parent match metrics (when it happened, who won, court details)
      matchHistory: {
        include: {
          // Also include all players who were in that specific match to see teammates/opponents
          matchHistoryPlayer: {
            include: {
              sessionPlayer: {
                select: {
                  id: true,
                  sessionPlayer: {
                    select: {
                      communityPlayer: {
                        select: {
                          username: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      matchHistory: {
        endedAt: "desc", // Show the most recent games first
      },
    },
  });

  // 2. Format the response data to make it clean and easy for the frontend to render
  const formattedHistory = matchRecords.map((record) => {
    const match = record.matchHistory;

    // Group players into Team A and Team B arrays with their usernames
    const teamA = [];
    const teamB = [];

    match.matchHistoryPlayer.forEach((p) => {
      const username =
        p.sessionPlayer?.sessionPlayer?.communityPlayer?.username ||
        "Unknown Player";
      const playerInfo = {
        sessionPlayerId: p.sessionPlayerId,
        username,
        iswin: p.iswin,
      };

      if (p.team === "a") teamA.push(playerInfo);
      if (p.team === "b") teamB.push(playerInfo);
    });

    return {
      matchHistoryId: match.id,
      courtName: match.courtName,
      winningTeam: match.winningTeam,
      startedAt: match.startedAt,
      endedAt: match.endedAt,
      playerPersonalTeam: record.team,
      playerPersonalResult: record.iswin ? "win" : "loss", // Helper field for easy layout styling
      teamA,
      teamB,
    };
  });

  // 3. Calculate lifetime overview summary stats dynamically
  const totalGames = formattedHistory.length;
  const totalWins = formattedHistory.filter(
    (g) => g.playerPersonalResult === "win",
  ).length;
  const totalLosses = totalGames - totalWins;
  const winRate =
    totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  return {
    summary: {
      totalGames,
      totalWins,
      totalLosses,
      winRate: `${winRate}%`,
    },
    history: formattedHistory,
  };
};

export const getPlayerTotalCommunityGames = async (communityId) => {
  if (!communityId) {
    throw new AppError("Community ID is required", 400);
  }

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) {
    throw new AppError("Community not found", 404);
  }

  const players = await prisma.communityPlayer.findMany({
    where: { communityId },
    include: {
      communityPlayer: {
        select: {
          id: true,
          username: true,
          type: true,
          skillLevel: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (players.length === 0) {
    return [];
  }

  const sessionPlayers = await prisma.sessionPlayer.findMany({
    where: {
      session: {
        communityId,
      },
      playerId: {
        in: players.map((player) => player.id),
      },
    },
    select: {
      id: true,
      playerId: true,
    },
  });

  if (sessionPlayers.length === 0) {
    return players.map((player) => ({
      ...player,
      totalCommunityWins: 0,
      totalCommunityLosses: 0,
      totalCommunityGames: 0,
    }));
  }

  const sessionPlayerOwnerById = new Map(
    sessionPlayers.map((sessionPlayer) => [
      sessionPlayer.id,
      sessionPlayer.playerId,
    ]),
  );

  const gameCounts = await prisma.matchHistoryPlayer.groupBy({
    by: ["sessionPlayerId", "iswin"],
    where: {
      sessionPlayerId: {
        in: sessionPlayers.map((sessionPlayer) => sessionPlayer.id),
      },
    },
    _count: {
      _all: true,
    },
  });

  const statsByPlayerId = new Map();

  gameCounts.forEach((gameCount) => {
    const playerId = sessionPlayerOwnerById.get(gameCount.sessionPlayerId);
    if (!playerId) return;

    const currentStats = statsByPlayerId.get(playerId) || {
      totalCommunityWins: 0,
      totalCommunityLosses: 0,
      totalCommunityGames: 0,
    };

    if (gameCount.iswin) {
      currentStats.totalCommunityWins += gameCount._count._all;
    } else {
      currentStats.totalCommunityLosses += gameCount._count._all;
    }

    currentStats.totalCommunityGames += gameCount._count._all;
    statsByPlayerId.set(playerId, currentStats);
  });

  return players.map((player) => ({
    ...player,
    totalCommunityWins: statsByPlayerId.get(player.id)?.totalCommunityWins || 0,
    totalCommunityLosses:
      statsByPlayerId.get(player.id)?.totalCommunityLosses || 0,
    totalCommunityGames: statsByPlayerId.get(player.id)?.totalCommunityGames || 0,
  }));
};
