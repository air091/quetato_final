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

export const getCommunityPlayerHistory = async (
  communityId,
  communityPlayerId,
) => {
  if (!communityId || !communityPlayerId) {
    throw new AppError("Community and player IDs are required", 400);
  }

  const communityPlayer = await prisma.communityPlayer.findFirst({
    where: { id: communityPlayerId, communityId },
    select: {
      id: true,
      communityPlayer: { select: { username: true } },
      sessionPlayers: {
        where: { session: { communityId } },
        select: {
          id: true,
          gameStatus: true,
          updateStatus: true,
          session: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!communityPlayer) {
    throw new AppError("Community player not found", 404);
  }

  const sessionPlayerIds = communityPlayer.sessionPlayers.map(
    (player) => player.id,
  );
  const matchRecords =
    sessionPlayerIds.length > 0
      ? await prisma.matchHistoryPlayer.findMany({
          where: { sessionPlayerId: { in: sessionPlayerIds } },
          include: {
            matchHistory: {
              include: {
                session: { select: { id: true, name: true } },
                matchHistoryPlayer: {
                  include: {
                    sessionPlayer: {
                      select: {
                        sessionPlayer: {
                          select: {
                            communityPlayer: { select: { username: true } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { matchHistory: { endedAt: "desc" } },
        })
      : [];

  const history = matchRecords.map((record) => {
    const match = record.matchHistory;
    const teamA = [];
    const teamB = [];

    match.matchHistoryPlayer.forEach((matchPlayer) => {
      const playerInfo = {
        sessionPlayerId: matchPlayer.sessionPlayerId,
        username:
          matchPlayer.sessionPlayer?.sessionPlayer?.communityPlayer?.username ||
          "Unknown Player",
      };

      if (matchPlayer.team === "a") teamA.push(playerInfo);
      if (matchPlayer.team === "b") teamB.push(playerInfo);
    });

    return {
      matchHistoryId: match.id,
      sessionName: match.session?.name || "Unknown session",
      courtName: match.courtName || "Unknown court",
      winningTeam: match.winningTeam,
      startedAt: match.startedAt,
      endedAt: match.endedAt,
      result: record.iswin ? "win" : "loss",
      points: record.iswin ? 1 : 0,
      teamA,
      teamB,
    };
  });

  const payments = communityPlayer.sessionPlayers
    .filter((player) => player.gameStatus === "paid")
    .map((player) => ({
      sessionId: player.session.id,
      sessionName: player.session.name,
      paidAt: player.updateStatus,
      points: 3,
    }))
    .sort((left, right) => new Date(right.paidAt) - new Date(left.paidAt));

  const totalWins = history.filter((match) => match.result === "win").length;

  return {
    player: {
      id: communityPlayer.id,
      username: communityPlayer.communityPlayer.username,
    },
    summary: {
      totalGames: history.length,
      totalWins,
      totalLosses: history.length - totalWins,
      winPoints: totalWins,
      paymentPoints: payments.length * 3,
      totalPoints: totalWins + payments.length * 3,
    },
    history,
    payments,
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
      gameStatus: true,
    },
  });

  if (sessionPlayers.length === 0) {
    return players.map((player) => ({
      ...player,
      totalCommunityWins: 0,
      totalCommunityLosses: 0,
      totalCommunityGames: 0,
      totalCommunityPoints: 0,
    }));
  }

  const sessionPlayerOwnerById = new Map(
    sessionPlayers.map((sessionPlayer) => [
      sessionPlayer.id,
      sessionPlayer.playerId,
    ]),
  );
  const paidSessionCountsByPlayerId = new Map();

  sessionPlayers.forEach((sessionPlayer) => {
    if (sessionPlayer.gameStatus !== "paid") return;

    paidSessionCountsByPlayerId.set(
      sessionPlayer.playerId,
      (paidSessionCountsByPlayerId.get(sessionPlayer.playerId) || 0) + 1,
    );
  });

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
      totalCommunityPoints: 0,
    };

    if (gameCount.iswin) {
      currentStats.totalCommunityWins += gameCount._count._all;
      currentStats.totalCommunityPoints += gameCount._count._all;
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
    totalCommunityGames:
      statsByPlayerId.get(player.id)?.totalCommunityGames || 0,
    totalCommunityPoints:
      (statsByPlayerId.get(player.id)?.totalCommunityPoints || 0) +
      (paidSessionCountsByPlayerId.get(player.id) || 0) * 3,
    paidSessionCount: paidSessionCountsByPlayerId.get(player.id) || 0,
  }));
};

export const deleteMatchHistory = async (matchHistoryId, authorizedUserId) => {
  if (!matchHistoryId) {
    throw new AppError("Match History ID is required", 400);
  }
  if (!authorizedUserId) {
    throw new AppError("Authorization User ID is required", 400);
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch the match history record along with session/community info for auth check
    const existingMatch = await tx.matchHistory.findUnique({
      where: { id: matchHistoryId },
      select: {
        id: true,
        session: {
          select: {
            communityId: true,
          },
        },
      },
    });

    if (!existingMatch) {
      throw new AppError("Match history record not found", 404);
    }

    if (!existingMatch.session?.communityId) {
      throw new AppError(
        "Unable to authorize deletion: Match is not associated with a community",
        400,
      );
    }

    const communityId = existingMatch.session.communityId;

    // 2. Fetch the operator's CommunityPlayer record to verify role
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId: communityId,
          userId: authorizedUserId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!authorizedPlayer) {
      throw new AppError(
        "Forbidden: You are not a member of this community",
        403,
      );
    }

    // 3. Enforce role authorization (owner, admin, host only)
    const allowedRoles = ["owner", "admin", "host"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError(
        "Unauthorized: Only community owners, admins, or hosts can delete match histories",
        403,
      );
    }

    // 4. Delete the match history record
    const deletedMatch = await tx.matchHistory.delete({
      where: { id: matchHistoryId },
    });

    return {
      message: "Match history deleted successfully",
      deletedMatch,
    };
  });
};
