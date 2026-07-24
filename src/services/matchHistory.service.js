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
      manualPoints: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          points: true,
          description: true,
          createdAt: true,
        },
      },
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

  const manualPoints = communityPlayer.manualPoints || [];
  const totalManualPoints = manualPoints.reduce(
    (sum, entry) => sum + entry.points,
    0,
  );

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
      manualPoints: totalManualPoints,
      totalPoints: totalWins + payments.length * 3 + totalManualPoints,
    },
    history,
    payments,
    manualPoints,
  };
};

export const getPlayerTotalCommunityGames = async (
  communityId,
  queryFilters = {},
) => {
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

  // 1. Fetch all active community players
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

  // 2. Map query parameters
  const { month, day, dayOfWeek } = queryFilters;

  const weekdayMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  // 3. Construct dynamic SQL filter conditions for dates
  const matchDateFilters = [];
  const paymentDateFilters = [];
  const manualDateFilters = []; // 🌟 Added manual point date filter tracking

  if (month) {
    const parsedMonth = parseInt(month, 10);
    matchDateFilters.push(
      `EXTRACT(MONTH FROM mh."startedAt") = ${parsedMonth}`,
    );
    paymentDateFilters.push(
      `EXTRACT(MONTH FROM sp."updateStatus") = ${parsedMonth}`,
    );
    manualDateFilters.push(
      `EXTRACT(MONTH FROM mp."createdAt") = ${parsedMonth}`,
    ); // 🌟 Filter manual points by month if specified
  }

  if (day) {
    const parsedDay = parseInt(day, 10);
    matchDateFilters.push(`EXTRACT(DAY FROM mh."startedAt") = ${parsedDay}`);
    paymentDateFilters.push(
      `EXTRACT(DAY FROM sp."updateStatus") = ${parsedDay}`,
    );
    manualDateFilters.push(`EXTRACT(DAY FROM mp."createdAt") = ${parsedDay}`); // 🌟 Filter manual points by day if specified
  }

  if (dayOfWeek && weekdayMap[dayOfWeek.toLowerCase()] !== undefined) {
    const dow = weekdayMap[dayOfWeek.toLowerCase()];
    matchDateFilters.push(`EXTRACT(DOW FROM mh."startedAt") = ${dow}`);
    paymentDateFilters.push(`EXTRACT(DOW FROM sp."updateStatus") = ${dow}`);
    manualDateFilters.push(`EXTRACT(DOW FROM mp."createdAt") = ${dow}`); // 🌟 Filter manual points by weekday if specified
  }

  const matchDateWhere =
    matchDateFilters.length > 0 ? `AND ${matchDateFilters.join(" AND ")}` : "";

  const paymentDateWhere =
    paymentDateFilters.length > 0
      ? `AND ${paymentDateFilters.join(" AND ")}`
      : "";

  const manualDateWhere =
    manualDateFilters.length > 0
      ? `AND ${manualDateFilters.join(" AND ")}`
      : "";

  // 4. Query Match History Stats grouped by community player
  const matchStatsQuery = `
    SELECT 
      cp.id AS "communityPlayerId",
      COALESCE(COUNT(mhp.id), 0)::INT AS "totalCommunityGames",
      COALESCE(SUM(CASE WHEN mhp.iswin = true THEN 1 ELSE 0 END), 0)::INT AS "totalCommunityWins",
      COALESCE(SUM(CASE WHEN mhp.iswin = false THEN 1 ELSE 0 END), 0)::INT AS "totalCommunityLosses"
    FROM "CommunityPlayer" cp
    JOIN "SessionPlayer" sp ON sp."playerId" = cp.id
    JOIN "MatchHistoryPlayer" mhp ON mhp."sessionPlayerId" = sp.id
    JOIN "MatchHistory" mh ON mh.id = mhp."matchHistoryId"
    WHERE cp."communityId" = $1
    ${matchDateWhere}
    GROUP BY cp.id;
  `;

  // 5. Query Paid Sessions Stats grouped by community player
  const paymentStatsQuery = `
    SELECT 
      cp.id AS "communityPlayerId",
      COALESCE(COUNT(sp.id), 0)::INT AS "paidSessionCount"
    FROM "CommunityPlayer" cp
    JOIN "SessionPlayer" sp ON sp."playerId" = cp.id
    WHERE cp."communityId" = $1
      AND sp."gameStatus" = 'paid'
      ${paymentDateWhere}
    GROUP BY cp.id;
  `;

  // 🌟 6. Query Manual Points Stats grouped by community player
  const manualStatsQuery = `
    SELECT 
      cp.id AS "communityPlayerId",
      COALESCE(SUM(mp.points), 0)::INT AS "totalManualPoints"
    FROM "CommunityPlayer" cp
    JOIN "ManualPoint" mp ON mp."communityPlayerId" = cp.id
    WHERE cp."communityId" = $1
      ${manualDateWhere}
    GROUP BY cp.id;
  `;

  // Execute queries in parallel
  const [matchStatsResults, paymentStatsResults, manualStatsResults] =
    await Promise.all([
      prisma.$queryRawUnsafe(matchStatsQuery, communityId),
      prisma.$queryRawUnsafe(paymentStatsQuery, communityId),
      prisma.$queryRawUnsafe(manualStatsQuery, communityId), // 🌟 Execute manual points query
    ]);

  // Convert results into lookup maps
  const statsMap = new Map(
    matchStatsResults.map((stat) => [stat.communityPlayerId, stat]),
  );
  const paidMap = new Map(
    paymentStatsResults.map((p) => [p.communityPlayerId, p.paidSessionCount]),
  );
  const manualMap = new Map(
    manualStatsResults.map((m) => [m.communityPlayerId, m.totalManualPoints]),
  ); // 🌟 Manual points lookup map

  // 7. Merge filtered aggregated stats back onto the roster list
  return players.map((player) => {
    const matchStat = statsMap.get(player.id);
    const paidCount = paidMap.get(player.id) || 0;
    const manualPoints = manualMap.get(player.id) || 0; // 🌟 Fetch player manual points sum

    const totalWins = matchStat?.totalCommunityWins || 0;
    const totalLosses = matchStat?.totalCommunityLosses || 0;
    const totalGames = matchStat?.totalCommunityGames || 0;

    // 🌟 Aggregate total points (Wins + Payments (3 pts each) + Manual Points)
    const totalPoints = totalWins + paidCount * 3 + manualPoints;

    return {
      ...player,
      totalCommunityWins: totalWins,
      totalCommunityLosses: totalLosses,
      totalCommunityGames: totalGames,
      totalCommunityPoints: totalPoints,
      paidSessionCount: paidCount,
      totalManualPoints: manualPoints, // Optional: exposes individual manual points tally if needed
    };
  });
};

export const deleteMatchHistory = async (
  communityId,
  sessionId,
  sessionPlayerId,
  matchHistoryId,
  authorizedUserId,
) => {
  // 1. Parameter Validations
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!sessionId) throw new AppError("Session ID is required", 400);
  if (!matchHistoryId) throw new AppError("Match History ID is required", 400);
  if (!authorizedUserId)
    throw new AppError("Authorization User ID is required", 400);

  // 2. Validate Community Existence (matching pattern in session.service.js)
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  // 3. Execute Transaction with Role Check & Scoped Deletion
  return await prisma.$transaction(async (tx) => {
    // Check user membership and permissions inside the community
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId: community.id,
          userId: authorizedUserId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!authorizedPlayer) {
      throw new AppError("Forbidden: Not a member of this community", 403);
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError("Forbidden: Insufficient permissions", 403);
    }

    // Verify the target match exists and belongs to the given session & community
    const existingMatch = await tx.matchHistory.findFirst({
      where: {
        id: matchHistoryId,
        sessionId: sessionId,
        session: {
          communityId: communityId,
        },
      },
      select: { id: true },
    });

    if (!existingMatch) {
      throw new AppError(
        "Match history record not found for this session",
        404,
      );
    }

    // Delete relation records first to avoid foreign key constraints
    await tx.matchHistoryPlayer.deleteMany({
      where: { matchHistoryId: matchHistoryId },
    });

    // Delete parent match history record
    const deletedMatch = await tx.matchHistory.delete({
      where: { id: matchHistoryId },
    });

    return {
      message: "Match history deleted successfully",
      deletedMatch,
    };
  });
};

export const transferPlayerGames = async ({
  communityId,
  sessionId,
  sourceSessionPlayerId,
  targetCommunityPlayerId,
  matchHistoryIds = [], // Array of match IDs (Empty = transfer ALL)
  authorizedUserId,
}) => {
  // 1. Parameter Validations
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!sessionId) throw new AppError("Session ID is required", 400);
  if (!sourceSessionPlayerId)
    throw new AppError("Source Session Player ID is required", 400);
  if (!targetCommunityPlayerId)
    throw new AppError("Target Community Player ID is required", 400);
  if (!authorizedUserId)
    throw new AppError("Authorization User ID is required", 400);

  return await prisma.$transaction(async (tx) => {
    // 2. Authorization Check (admin, owner, host)
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: authorizedUserId,
        },
      },
      select: { role: true },
    });

    if (!authorizedPlayer) {
      throw new AppError("Forbidden: Not a member of this community", 403);
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError(
        "Forbidden: Insufficient permissions to transfer games",
        403,
      );
    }

    // 3. Verify Source SessionPlayer Existence
    const sourceSessionPlayer = await tx.sessionPlayer.findFirst({
      where: {
        id: sourceSessionPlayerId,
        sessionId,
      },
      include: {
        sessionPlayer: {
          include: {
            communityPlayer: { select: { username: true, type: true } },
          },
        },
      },
    });

    if (!sourceSessionPlayer) {
      throw new AppError("Source player not found in this session", 404);
    }

    // 4. Verify/Ensure Target SessionPlayer Existence
    let targetSessionPlayer = await tx.sessionPlayer.findFirst({
      where: {
        sessionId,
        playerId: targetCommunityPlayerId,
      },
    });

    // If target player is not in the session yet, add them automatically
    if (!targetSessionPlayer) {
      // Ensure target player belongs to community
      const targetCommunityPlayer = await tx.communityPlayer.findUnique({
        where: { id: targetCommunityPlayerId },
      });

      if (
        !targetCommunityPlayer ||
        targetCommunityPlayer.communityId !== communityId
      ) {
        throw new AppError(
          "Target player does not belong to this community",
          404,
        );
      }

      targetSessionPlayer = await tx.sessionPlayer.create({
        data: {
          sessionId,
          playerId: targetCommunityPlayerId,
          status: "accepted",
          gameStatus: "waiting",
          acceptedBy: authorizedPlayer.id,
          acceptedAt: new Date(),
        },
      });
    }

    if (sourceSessionPlayer.id === targetSessionPlayer.id) {
      throw new AppError(
        "Cannot transfer games to the same session player",
        400,
      );
    }

    // 5. Query Source Matches to Transfer
    const matchWhereClause = {
      sessionPlayerId: sourceSessionPlayer.id,
      matchHistory: {
        sessionId,
      },
    };

    // Filter by match IDs if selective mode was requested
    if (Array.isArray(matchHistoryIds) && matchHistoryIds.length > 0) {
      matchWhereClause.matchHistoryId = { in: matchHistoryIds };
    }

    const sourceMatchPlayers = await tx.matchHistoryPlayer.findMany({
      where: matchWhereClause,
      select: {
        id: true,
        matchHistoryId: true,
      },
    });

    if (sourceMatchPlayers.length === 0) {
      throw new AppError(
        "No eligible match history entries found to transfer",
        400,
      );
    }

    const recordsToUpdate = sourceMatchPlayers.map((m) => m.id);

    // 6. Execute Transfer of Matches
    await tx.matchHistoryPlayer.updateMany({
      where: {
        id: { in: recordsToUpdate },
      },
      data: {
        sessionPlayerId: targetSessionPlayer.id,
      },
    });

    // 7. Payment Status Transfer Handling
    // Transfer paid status to target player AND make source player unpaid ("waiting")
    if (sourceSessionPlayer.gameStatus === "paid") {
      if (targetSessionPlayer.gameStatus !== "paid") {
        await tx.sessionPlayer.update({
          where: { id: targetSessionPlayer.id },
          data: {
            gameStatus: "paid",
            updateStatus: new Date(),
            updatedBy: authorizedPlayer.id,
          },
        });
      }

      await tx.sessionPlayer.update({
        where: { id: sourceSessionPlayer.id },
        data: {
          gameStatus: "waiting",
          updateStatus: new Date(),
          updatedBy: authorizedPlayer.id,
        },
      });
    }

    return {
      message: `Successfully transferred ${recordsToUpdate.length} match(es)`,
      transferredCount: recordsToUpdate.length,
      sourceSessionPlayerId: sourceSessionPlayer.id,
      targetSessionPlayerId: targetSessionPlayer.id,
    };
  });
};

export const transferCommunityPlayerGames = async ({
  communityId,
  sourceCommunityPlayerId,
  targetCommunityPlayerId,
  matchHistoryIds = [], // Array of match history IDs (Empty = transfer ALL)
  authorizedUserId,
}) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!sourceCommunityPlayerId)
    throw new AppError("Source Community Player ID is required", 400);
  if (!targetCommunityPlayerId)
    throw new AppError("Target Community Player ID is required", 400);
  if (!authorizedUserId)
    throw new AppError("Authorization User ID is required", 400);

  if (sourceCommunityPlayerId === targetCommunityPlayerId) {
    throw new AppError("Cannot transfer games to the same player", 400);
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Authorization Check (admin, owner, host)
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: authorizedUserId,
        },
      },
      select: { role: true },
    });

    if (!authorizedPlayer) {
      throw new AppError("Forbidden: Not a member of this community", 403);
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError(
        "Forbidden: Insufficient permissions to transfer games",
        403,
      );
    }

    // 2. Validate Source & Target Community Players
    const sourceCommunityPlayer = await tx.communityPlayer.findFirst({
      where: { id: sourceCommunityPlayerId, communityId },
      include: {
        sessionPlayers: {
          where: { session: { communityId } },
          select: { id: true, sessionId: true, gameStatus: true },
        },
      },
    });

    if (!sourceCommunityPlayer) {
      throw new AppError("Source community player not found", 404);
    }

    const targetCommunityPlayer = await tx.communityPlayer.findFirst({
      where: { id: targetCommunityPlayerId, communityId },
      include: {
        sessionPlayers: {
          where: { session: { communityId } },
          select: { id: true, sessionId: true, gameStatus: true },
        },
      },
    });

    if (!targetCommunityPlayer) {
      throw new AppError(
        "Target player does not belong to this community",
        404,
      );
    }

    const sourceSessionPlayerIds = sourceCommunityPlayer.sessionPlayers.map(
      (sp) => sp.id,
    );

    if (sourceSessionPlayerIds.length === 0) {
      throw new AppError(
        "Source player has no session records in this community",
        400,
      );
    }

    // Map existing target session players by sessionId
    const targetSessionPlayerBySessionId = new Map(
      targetCommunityPlayer.sessionPlayers.map((sp) => [sp.sessionId, sp]),
    );

    // Map source session players by id to easily access their sessionId & gameStatus
    const sourceSessionPlayerById = new Map(
      sourceCommunityPlayer.sessionPlayers.map((sp) => [sp.id, sp]),
    );

    // 3. Find source matches to transfer across all sessions of this community
    const matchWhereClause = {
      sessionPlayerId: { in: sourceSessionPlayerIds },
      matchHistory: { session: { communityId } },
    };

    if (Array.isArray(matchHistoryIds) && matchHistoryIds.length > 0) {
      matchWhereClause.matchHistoryId = { in: matchHistoryIds };
    }

    const sourceMatchPlayers = await tx.matchHistoryPlayer.findMany({
      where: matchWhereClause,
      include: {
        matchHistory: {
          select: { id: true, sessionId: true },
        },
      },
    });

    if (sourceMatchPlayers.length === 0) {
      throw new AppError(
        "No eligible match history entries found to transfer",
        400,
      );
    }

    // 4. Perform session-by-session transfer
    let totalTransferredCount = 0;

    for (const matchPlayerRecord of sourceMatchPlayers) {
      const sessionId = matchPlayerRecord.matchHistory.sessionId;
      const sourceSessionPlayer = sourceSessionPlayerById.get(
        matchPlayerRecord.sessionPlayerId,
      );

      let targetSessionPlayer = targetSessionPlayerBySessionId.get(sessionId);

      // Ensure Target SessionPlayer exists for this session
      if (!targetSessionPlayer) {
        targetSessionPlayer = await tx.sessionPlayer.create({
          data: {
            sessionId,
            playerId: targetCommunityPlayer.id,
            status: "accepted",
            gameStatus: "waiting",
            acceptedBy: authorizedPlayer.id,
            acceptedAt: new Date(),
          },
        });
        targetSessionPlayerBySessionId.set(sessionId, targetSessionPlayer);
      }

      // Re-assign match record
      await tx.matchHistoryPlayer.update({
        where: { id: matchPlayerRecord.id },
        data: { sessionPlayerId: targetSessionPlayer.id },
      });

      // Pass paid status to target session player AND revert source player to "waiting"
      if (sourceSessionPlayer?.gameStatus === "paid") {
        if (targetSessionPlayer.gameStatus !== "paid") {
          await tx.sessionPlayer.update({
            where: { id: targetSessionPlayer.id },
            data: {
              gameStatus: "paid",
              updateStatus: new Date(),
              updatedBy: authorizedPlayer.id,
            },
          });
          targetSessionPlayer.gameStatus = "paid";
        }

        await tx.sessionPlayer.update({
          where: { id: sourceSessionPlayer.id },
          data: {
            gameStatus: "waiting",
            updateStatus: new Date(),
            updatedBy: authorizedPlayer.id,
          },
        });
        sourceSessionPlayer.gameStatus = "waiting";
      }

      totalTransferredCount++;
    }

    return {
      message: `Successfully transferred ${totalTransferredCount} match(es) across community sessions`,
      transferredCount: totalTransferredCount,
      sourceCommunityPlayerId,
      targetCommunityPlayerId,
    };
  });
};

export const addManualPoints = async ({
  communityId,
  communityPlayerId,
  points,
  description,
  authorizedUserId,
}) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!communityPlayerId)
    throw new AppError("Community Player ID is required", 400);
  if (points === undefined || typeof points !== "number") {
    throw new AppError("Valid points value is required", 400);
  }
  if (!description) throw new AppError("Description is required", 400);

  return await prisma.$transaction(async (tx) => {
    // 1. Authorization check
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: { communityId, userId: authorizedUserId },
      },
      select: { role: true },
    });

    if (!authorizedPlayer) {
      throw new AppError("Forbidden: Not a member of this community", 403);
    }

    const allowedRoles = ["admin", "owner"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError(
        "Forbidden: Insufficient permissions to add points",
        403,
      );
    }

    // 2. Validate target community player
    const targetPlayer = await tx.communityPlayer.findFirst({
      where: { id: communityPlayerId, communityId },
    });

    if (!targetPlayer) {
      throw new AppError("Target community player not found", 404);
    }

    // 3. Create point entry linked to communityPlayerId
    return await tx.manualPoint.create({
      data: {
        communityPlayerId,
        points,
        description,
        createdBy: authorizedUserId,
      },
    });
  });
};

export const getAllManualPoints = async (communityId, communityPlayerId) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!communityPlayerId)
    throw new AppError("Community Player ID is required", 400);

  const targetPlayer = await prisma.communityPlayer.findFirst({
    where: { id: communityPlayerId, communityId },
  });

  if (!targetPlayer) {
    throw new AppError("Target community player not found", 404);
  }

  return await prisma.manualPoint.findMany({
    where: { communityPlayerId },
    orderBy: { createdAt: "desc" },
  });
};

export const updateManualPoint = async ({
  communityId,
  communityPlayerId,
  manualPointId,
  points,
  description,
  authorizedUserId,
}) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!communityPlayerId)
    throw new AppError("Community Player ID is required", 400);
  if (!manualPointId) throw new AppError("Manual Point ID is required", 400);

  return await prisma.$transaction(async (tx) => {
    // Authorization check
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: { communityId, userId: authorizedUserId },
      },
      select: { role: true },
    });

    if (!authorizedPlayer) {
      throw new AppError("Forbidden: Not a member of this community", 403);
    }

    const allowedRoles = ["admin", "owner"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError(
        "Forbidden: Insufficient permissions to update points",
        403,
      );
    }

    const existingPoint = await tx.manualPoint.findFirst({
      where: { id: manualPointId, communityPlayerId },
    });

    if (!existingPoint) {
      throw new AppError("Manual point entry not found", 404);
    }

    return await tx.manualPoint.update({
      where: { id: manualPointId },
      data: {
        ...(points !== undefined && typeof points === "number"
          ? { points }
          : {}),
        ...(description ? { description } : {}),
      },
    });
  });
};

export const deleteManualPoint = async ({
  communityId,
  communityPlayerId,
  manualPointId,
  authorizedUserId,
}) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!communityPlayerId)
    throw new AppError("Community Player ID is required", 400);
  if (!manualPointId) throw new AppError("Manual Point ID is required", 400);

  return await prisma.$transaction(async (tx) => {
    // Authorization check
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: { communityId, userId: authorizedUserId },
      },
      select: { role: true },
    });

    if (!authorizedPlayer) {
      throw new AppError("Forbidden: Not a member of this community", 403);
    }

    const allowedRoles = ["admin", "owner"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError(
        "Forbidden: Insufficient permissions to delete points",
        403,
      );
    }

    const existingPoint = await tx.manualPoint.findFirst({
      where: { id: manualPointId, communityPlayerId },
    });

    if (!existingPoint) {
      throw new AppError("Manual point entry not found", 404);
    }

    return await tx.manualPoint.delete({
      where: { id: manualPointId },
    });
  });
};

export const deleteAllManualPoints = async ({
  communityId,
  communityPlayerId,
  authorizedUserId,
}) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!communityPlayerId)
    throw new AppError("Community Player ID is required", 400);

  return await prisma.$transaction(async (tx) => {
    // Authorization check
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: { communityId, userId: authorizedUserId },
      },
      select: { role: true },
    });

    if (!authorizedPlayer) {
      throw new AppError("Forbidden: Not a member of this community", 403);
    }

    const allowedRoles = ["admin", "owner"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError(
        "Forbidden: Insufficient permissions to delete all points",
        403,
      );
    }

    return await tx.manualPoint.deleteMany({
      where: { communityPlayerId },
    });
  });
};
