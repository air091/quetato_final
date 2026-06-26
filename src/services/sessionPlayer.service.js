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
      sessionPlayer: {
        include: {
          communityPlayer: {
            select: {
              id: true,
              username: true,
              type: true,
            },
          },
        },
      },
      adminAccept: {
        include: {
          communityPlayer: { select: { id: true, username: true, type: true } },
        },
      },
      updatedBy: {
        include: {
          communityPlayer: { select: { id: true, username: true, type: true } },
        },
      },
    },
  });

  return sessionPlayers;
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
