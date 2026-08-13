import { Prisma } from "../../generated/prisma/client.ts";
import { GameStatus } from "../../generated/prisma/enums.ts";
import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";
import {
  invalidateCommunitySessionsCache,
  invalidatePublicSessionsCache,
} from "../libs/redis.js";

const hasSessionManagementAccess = async (communityId, sessionId, userId) => {
  const member = await prisma.sessionPlayer.findFirst({
    where: {
      sessionId,
      sessionPlayer: { communityId, userId },
    },
    select: { isHost: true, sessionPlayer: { select: { role: true } } },
  });
  return Boolean(
    member &&
      (member.isHost || ["owner", "admin"].includes(member.sessionPlayer.role)),
  );
};

export const getAllSessionPlayers = async (
  communityId,
  sessionId,
  authorizedId,
  queryFilters = {},
) => {
  if (!communityId || !sessionId)
    throw new AppError("Community ID and session ID are required", 400);

  // 1. Verify session belongs to this community
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, communityId: true },
  });

  if (!session || session.communityId !== communityId) {
    throw new AppError("Session not found in this community", 404);
  }

  // 2. Check authorization for hidden players
  const authorizedPlayer = authorizedId
    ? await prisma.communityPlayer.findUnique({
        where: {
          communityId_userId: { communityId, userId: authorizedId },
        },
        select: { role: true },
      })
    : null;
  const includeHidden = authorizedId
    ? await hasSessionManagementAccess(communityId, sessionId, authorizedId)
    : false;

  // 3. Parse parameters
  const page = parseInt(queryFilters.page, 10) || 1;
  const limit = Math.min(
    Math.max(parseInt(queryFilters.limit, 10) || 12, 1),
    50,
  );
  const offset = (page - 1) * limit;
  const search = (queryFilters.search || "").trim();
  const sortKey = queryFilters.sortKey || "";
  const directionSql =
    queryFilters.direction === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;

  // 4. Build safe dynamic SQL sort clause using Prisma.sql fragments
  let orderByClause = Prisma.sql`
    CASE "gameStatus" 
      WHEN 'waiting' THEN 1 
      WHEN 'queued' THEN 2 
      WHEN 'playing' THEN 3 
      WHEN 'paid' THEN 4 
      ELSE 99 
    END ASC, 
    COALESCE("updateStatus", "acceptedAt", '1970-01-01'::timestamp) ASC
  `;

  if (sortKey === "games") {
    orderByClause = Prisma.sql`COALESCE(total_games, 0) ${directionSql}, ${orderByClause}`;
  } else if (sortKey === "wins") {
    orderByClause = Prisma.sql`COALESCE(total_wins, 0) ${directionSql}, ${orderByClause}`;
  }

  // 5. Execute single optimized SQL query safely matching your schema relations
  const rows = await prisma.$queryRaw`
    WITH match_stats AS (
      SELECT 
        m."sessionPlayerId",
        COUNT(*)::int as total_games,
        SUM(CASE WHEN m.iswin THEN 1 ELSE 0 END)::int as total_wins
      FROM "MatchHistoryPlayer" m
      GROUP BY m."sessionPlayerId"
    ),
    filtered AS (
      SELECT 
        sp.id,
        sp.status,
        sp."isHost",
        sp."isHide",
        sp."requestedAt",
        sp."acceptedAt",
        sp."gameStatus",
        sp."updateStatus",
        sp."playerId" as community_player_id,
        cp.role,
        u.id as user_id,
        u.username,
        u.type,
        u."skillLevel",
        COALESCE(stats.total_games, 0) as total_games,
        COALESCE(stats.total_wins, 0) as total_wins,
        CASE 
          WHEN COALESCE(stats.total_games, 0) > 0 
          THEN ROUND((COALESCE(stats.total_wins, 0)::numeric / stats.total_games) * 100)
          ELSE 0 
        END as win_rate,
        COUNT(*) OVER() as total_count
      FROM "SessionPlayer" sp
      JOIN "CommunityPlayer" cp ON sp."playerId" = cp.id
      JOIN "User" u ON cp."userId" = u.id
      LEFT JOIN match_stats stats ON stats."sessionPlayerId" = sp.id
      WHERE sp."sessionId" = ${sessionId}
        AND sp.status = 'accepted'
        ${includeHidden ? Prisma.sql`` : Prisma.sql`AND sp."isHide" = false`}
        ${search ? Prisma.sql`AND u.username ILIKE ${`%${search}%`}` : Prisma.sql``}
    )
    SELECT * FROM filtered
    ORDER BY ${orderByClause}
    LIMIT ${limit} OFFSET ${offset};
  `;

  const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
  const hasMore = offset + rows.length < total;

  // Format response structure to match controller and frontend expectations
  const results = rows.map((row) => ({
    id: row.id,
    status: row.status,
    isHost: row.isHost,
    isHide: row.isHide,
    requestedAt: row.requestedAt,
    acceptedAt: row.acceptedAt,
    gameStatus: row.gameStatus,
    updateStatus: row.updateStatus,
    totalGames: row.total_games,
    totalWins: row.total_wins,
    totalLosses: row.total_games - row.total_wins,
    winRate: Number(row.win_rate),
    stats: {
      totalGames: row.total_games,
      totalWins: row.total_wins,
      totalLosses: row.total_games - row.total_wins,
      winRate: Number(row.win_rate),
    },
    sessionPlayer: {
      id: row.community_player_id,
      role: row.role,
      communityPlayer: {
        id: row.user_id,
        username: row.username,
        type: row.type,
        skillLevel: row.skillLevel,
      },
    },
  }));

  return {
    results,
    pagination: {
      total,
      hasMore,
      page,
      limit,
    },
  };
};

export const getSessionPlayerAccess = async (communityId, sessionId, authorizedId) => {
  if (!communityId || !sessionId || !authorizedId) {
    return { currentUserRole: null, canManagePlayers: false };
  }

  const authorizedPlayer = await prisma.sessionPlayer.findFirst({
    where: { sessionId, sessionPlayer: { communityId, userId: authorizedId } },
    select: { isHost: true, sessionPlayer: { select: { role: true } } },
  });

  const managerRoles = ["owner", "admin"];
  return {
    currentUserRole: authorizedPlayer?.isHost
      ? "host"
      : authorizedPlayer?.sessionPlayer.role || null,
    canManagePlayers:
      authorizedPlayer?.isHost ||
      managerRoles.includes(authorizedPlayer?.sessionPlayer.role),
  };
};

export const acceptPlayer = async (
  communityId,
  sessionId,
  communityPlayerId, // This is the unique primary key ID of CommunityPlayer
  authorizedId,
) => {
  if (!communityId || !sessionId || !communityPlayerId)
    throw new AppError(
      "Community ID, session ID and player ID are required",
      400,
    );

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  const acceptedPlayer = await prisma.$transaction(async (tx) => {
    // 1. Get the admin's CommunityPlayer record
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId: community.id,
          userId: authorizedId,
        },
      },
    });

    if (!authorizedPlayer) {
      throw new AppError("Forbidden", 403);
    }

    // Adjusting role tracking to match your valid schema choices
    const allowedRoles = ["admin", "owner"];
    if (
      !allowedRoles.includes(authorizedPlayer.role) &&
      !(await hasSessionManagementAccess(communityId, sessionId, authorizedId))
    ) {
      throw new AppError("Forbidden", 403);
    }

    // 2. Fetch the target player using their unique CommunityPlayer ID directly
    const validPlayer = await tx.communityPlayer.findUnique({
      where: {
        id: communityPlayerId, // ✅ FIX: Look up by the primary key passed from params
      },
    });

    // Security check: Make sure this community player profile actually belongs to this community
    if (!validPlayer || validPlayer.communityId !== community.id)
      throw new AppError("Player not found in this community", 404);

    // Fetch session details
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      include: {
        _count: {
          select: { players: true },
        },
      },
    });

    if (!session) throw new AppError("Session not found", 404);

    // A join request already has a SessionPlayer record. Promote it rather
    // than attempting to create a duplicate record for the same player.
    const existingRequest = await tx.sessionPlayer.findUnique({
      where: {
        sessionId_playerId: {
          sessionId: session.id,
          playerId: validPlayer.id,
        },
      },
    });

    if (existingRequest?.status === "accepted") {
      throw new AppError("Player is already accepted into this session", 400);
    }

    if (existingRequest) {
      return tx.sessionPlayer.update({
        where: { id: existingRequest.id },
        data: {
          status: "accepted",
          acceptedBy: authorizedPlayer.id,
          acceptedAt: new Date(),
        },
      });
    }

    // 3. Safety Guard: Check if player is already inside this session
    const alreadyInSession = await tx.sessionPlayer.findFirst({
      where: {
        sessionId: session.id,
        playerId: validPlayer.id, // ✅ FIX: Match using CommunityPlayer ID
      },
      select: { id: true },
    });

    if (alreadyInSession) {
      throw new AppError("Player is already accepted into this session", 400);
    }

    // 4. Create the session player record mapping all Foreign Keys properly
    return await tx.sessionPlayer.create({
      data: {
        sessionId: session.id,
        playerId: validPlayer.id, // ✅ CommunityPlayer ID of target player
        acceptedBy: authorizedPlayer.id, // ✅ CommunityPlayer ID of admin actor
        status: "accepted",
        acceptedAt: new Date(),
      },
    });
  });
  await Promise.all([
    invalidatePublicSessionsCache(),
    invalidateCommunitySessionsCache(communityId),
  ]);
  return acceptedPlayer;
};

export const hideAuthorizedPlayerInSession = async (
  communityId,
  sessionId,
  sessionPlayerId, // Using the record ID passed from parameters
  authorizedId,
) => {
  // 1. Verify the targeted session exists and belongs to the community
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      communityId: communityId,
    },
  });

  if (!session) {
    throw new AppError(
      "Session not found within the specified community.",
      404,
    );
  }

  // 2. Authorization check: Ensure the operator is part of the community and holds an administrative role
  const operatorRole = await prisma.communityPlayer.findUnique({
    where: {
      communityId_userId: {
        communityId: communityId,
        userId: authorizedId,
      },
    },
    select: { id: true, role: true },
  });

  const validRoles = ["owner", "admin"];
  if (
    !operatorRole ||
    (!validRoles.includes(operatorRole.role) &&
      !(await hasSessionManagementAccess(communityId, sessionId, authorizedId)))
  ) {
    throw new AppError(
      "Unauthorized: Only community owners, admins, or hosts can manage rosters.",
      403,
    );
  }

  // 3. Find the target SessionPlayer record by its primary key ID
  const targetSessionPlayer = await prisma.sessionPlayer.findUnique({
    where: {
      id: sessionPlayerId,
    },
  });

  if (!targetSessionPlayer || targetSessionPlayer.sessionId !== sessionId) {
    throw new AppError(
      "The target player record is not registered in this session.",
      404,
    );
  }

  if (["queued", "playing"].includes(targetSessionPlayer.gameStatus)) {
    throw new AppError(
      "Cannot hide player while they are queued or playing on a court.",
      400,
    );
  }

  // 4. Guard: Check if the player is already hidden to avoid redundant network updates
  if (targetSessionPlayer.isHide) {
    return {
      success: true,
      message: "Player is already hidden in this session.",
      updatedPlayer: targetSessionPlayer,
    };
  }

  // 5. Execute visibility update in an isolated transaction block
  return await prisma.$transaction(async (tx) => {
    const updatedPlayer = await tx.sessionPlayer.update({
      where: {
        id: sessionPlayerId,
      },
      data: {
        isHide: true,
        updatedBy: operatorRole.id, // Logging the ID of the administrator making the configuration change
      },
    });

    return {
      success: true,
      message: "Player hidden in the session successfully.",
      updatedPlayer,
    };
  });
};

export const unhideAuthorizedPlayerInSession = async (
  communityId,
  sessionId,
  sessionPlayerId,
  authorizedId,
) => {
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      communityId: communityId,
    },
  });

  if (!session) {
    throw new AppError(
      "Session not found within the specified community.",
      404,
    );
  }

  const operatorRole = await prisma.communityPlayer.findUnique({
    where: {
      communityId_userId: {
        communityId: communityId,
        userId: authorizedId,
      },
    },
    select: { id: true, role: true },
  });

  const validRoles = ["owner", "admin"];
  if (
    !operatorRole ||
    (!validRoles.includes(operatorRole.role) &&
      !(await hasSessionManagementAccess(communityId, sessionId, authorizedId)))
  ) {
    throw new AppError(
      "Unauthorized: Only community owners, admins, or hosts can manage rosters.",
      403,
    );
  }

  const targetSessionPlayer = await prisma.sessionPlayer.findUnique({
    where: {
      id: sessionPlayerId,
    },
  });

  if (!targetSessionPlayer || targetSessionPlayer.sessionId !== sessionId) {
    throw new AppError(
      "The target player record is not registered in this session.",
      404,
    );
  }

  if (!targetSessionPlayer.isHide) {
    return {
      success: true,
      message: "Player is already visible in this session.",
      updatedPlayer: targetSessionPlayer,
    };
  }

  return await prisma.$transaction(async (tx) => {
    const updatedPlayer = await tx.sessionPlayer.update({
      where: {
        id: sessionPlayerId,
      },
      data: {
        isHide: false,
        updatedBy: operatorRole.id,
      },
    });

    return {
      success: true,
      message: "Player restored in the session successfully.",
      updatedPlayer,
    };
  });
};

export const removePlayerFromSession = async (
  communityId,
  sessionId,
  sessionPlayerId,
  authorizedId,
) => {
  // 1. Verify the targeted session exists and belongs to the community
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      communityId: communityId,
    },
  });

  if (!session) {
    throw new AppError(
      "Session not found within the specified community.",
      404,
    );
  }

  // 2. Authorization check: Ensure the operator is part of the community and holds an administrative role
  const operatorRole = await prisma.communityPlayer.findUnique({
    where: {
      communityId_userId: {
        communityId: communityId,
        userId: authorizedId,
      },
    },
    select: { role: true },
  });

  const validRoles = ["owner", "admin"];
  if (
    !operatorRole ||
    (!validRoles.includes(operatorRole.role) &&
      !(await hasSessionManagementAccess(communityId, sessionId, authorizedId)))
  ) {
    throw new AppError(
      "Unauthorized: Only community owners, admins, or hosts can manage rosters.",
      403,
    );
  }

  // 3. The route supplies a SessionPlayer ID, not a CommunityPlayer ID.
  const targetSessionPlayer = await prisma.sessionPlayer.findUnique({
    where: {
      id: sessionPlayerId,
    },
  });

  if (!targetSessionPlayer || targetSessionPlayer.sessionId !== sessionId) {
    throw new AppError("The player is not registered in this session.", 404);
  }

  // 4. Protection Guard: A player cannot leave the session during a live match.
  if (targetSessionPlayer.gameStatus === GameStatus.playing) {
    throw new AppError(
      "Cannot remove a player while they are in an active match.",
      409,
    );
  }

  // 5. Execute deletion in an isolated transaction block
  const result = await prisma.$transaction(async (tx) => {
    const deletedPlayer = await tx.sessionPlayer.delete({
      where: {
        id: targetSessionPlayer.id,
      },
    });

    return {
      success: true,
      message: "Player removed from the session successfully.",
      deletedPlayer,
    };
  });
  await Promise.all([
    invalidatePublicSessionsCache(),
    invalidateCommunitySessionsCache(communityId),
  ]);
  return result;
};
