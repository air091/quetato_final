import { GameStatus } from "../../generated/prisma/enums.ts";
import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";

export const getAllSessionPlayers = async (communityId, sessionId) => {
  if (!communityId || !sessionId)
    throw new AppError("Community ID and session ID are required", 400);

  // 1. Fetch the specific session and verify it belongs to this community
  const session = await prisma.session.findUnique({
    where: {
      id: sessionId,
    },
    select: {
      id: true,
      communityId: true,
    },
  });

  // 2. Safeguard checks
  if (!session || session.communityId !== communityId) {
    throw new AppError("Session not found in this community", 404);
  }

  // 3. Fetch the players for the correct session
  const sessionPlayers = await prisma.sessionPlayer.findMany({
    where: { sessionId: session.id },
    select: {
      id: true,
      status: true,
      isHide: true,
      requestedAt: true,
      acceptedAt: true,
      gameStatus: true,
      updateStatus: true,

      // The target player's profile information
      sessionPlayer: {
        select: {
          id: true,
          role: true,
          communityPlayer: {
            select: { id: true, username: true, type: true, skillLevel: true },
          },
        },
      },

      // The administrator who accepted the player
      adminAccept: {
        select: {
          id: true,
          role: true,
          communityPlayer: { select: { id: true, username: true, type: true } },
        },
      },

      adminUpdate: {
        select: {
          id: true,
          role: true,
          communityPlayer: { select: { id: true, username: true, type: true } },
        },
      },
    },
  });

  // 🌟 4. Define Custom Priority Weight Matrix for gameStatus
  const statusPriority = {
    waiting: 1,
    queued: 2,
    playing: 3, // Your 3rd and last requirements are both playing, which means playing comes 3rd overall
  };

  // 🌟 5. Sort the array
  sessionPlayers.sort((a, b) => {
    const priorityA = statusPriority[a.gameStatus] || 99;
    const priorityB = statusPriority[b.gameStatus] || 99;

    // First: Sort by gameStatus priority (ascending category value: 1, then 2, then 3)
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Second: Sort by time descending (More time elapsed = earlier timestamp comes first)
    const timeA = new Date(a.updateStatus || a.acceptedAt || 0).getTime();
    const timeB = new Date(b.updateStatus || b.acceptedAt || 0).getTime();

    return timeA - timeB;
  });

  const sessionPlayerIds = sessionPlayers.map((player) => player.id);
  const matchCounts =
    sessionPlayerIds.length > 0
      ? await prisma.matchHistoryPlayer.groupBy({
          by: ["sessionPlayerId", "iswin"],
          where: {
            sessionPlayerId: {
              in: sessionPlayerIds,
            },
          },
          _count: {
            _all: true,
          },
        })
      : [];

  const statsBySessionPlayerId = new Map();

  matchCounts.forEach((count) => {
    const current = statsBySessionPlayerId.get(count.sessionPlayerId) || {
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      winRate: 0,
    };
    const total = count._count?._all || 0;

    current.totalGames += total;
    if (count.iswin) {
      current.totalWins += total;
    } else {
      current.totalLosses += total;
    }

    current.winRate =
      current.totalGames > 0
        ? Math.round((current.totalWins / current.totalGames) * 100)
        : 0;

    statsBySessionPlayerId.set(count.sessionPlayerId, current);
  });

  return sessionPlayers.map((player) => {
    const stats = statsBySessionPlayerId.get(player.id) || {
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      winRate: 0,
    };

    return {
      ...player,
      ...stats,
      stats,
    };
  });
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

  return await prisma.$transaction(async (tx) => {
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
    const allowedRoles = ["admin", "host", "owner"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
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
      },
    });
  });
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
    throw new Error("Session not found within the specified community.");
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

  const validRoles = ["owner", "admin", "host"];
  if (!operatorRole || !validRoles.includes(operatorRole.role)) {
    throw new Error(
      "Unauthorized: Only community owners, admins, or hosts can manage rosters.",
    );
  }

  // 3. Find the target SessionPlayer record by its primary key ID
  const targetSessionPlayer = await prisma.sessionPlayer.findUnique({
    where: {
      id: sessionPlayerId,
    },
  });

  if (!targetSessionPlayer || targetSessionPlayer.sessionId !== sessionId) {
    throw new Error(
      "The target player record is not registered in this session.",
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

export const removePlayerFromSession = async (
  communityId,
  sessionId,
  playerId,
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
    throw new Error("Session not found within the specified community.");
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

  const validRoles = ["owner", "admin", "host"];
  if (!operatorRole || !validRoles.includes(operatorRole.role)) {
    throw new Error(
      "Unauthorized: Only community owners, admins, or hosts can manage rosters.",
    );
  }

  // 3. Find the target SessionPlayer record
  // Checking by record ID or by structural cross-lookup mapping
  const targetSessionPlayer = await prisma.sessionPlayer.findFirst({
    where: {
      playerId,
      sessionId: sessionId,
    },
    include: {
      courtSlot: true, // Pull slot placements to verify court status
    },
  });

  if (!targetSessionPlayer) {
    throw new Error("The player is not registered in this session.");
  }

  // 4. Protection Guard: Prevent removing a player if they are actively playing or queued on a court
  if (targetSessionPlayer.gameStatus === GameStatus.playing) {
    throw new Error(
      "Cannot remove player: They are currently assigned to an active court or queue slot.",
    );
  }

  // 5. Execute deletion in an isolated transaction block
  return await prisma.$transaction(async (tx) => {
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
};
