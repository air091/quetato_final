import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";

export const getAlSessionPlayers = async () => {}; // DO THIS

export const acceptPlayer = async (
  communityId,
  sessionId,
  userId,
  authorizedId,
) => {
  if (!communityId || !userId)
    throw new AppError(
      "Community ID, session ID and player ID is required",
      400,
    );

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  return await prisma.$transaction(async (tx) => {
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

    if (
      authorizedPlayer.role !== "admin" &&
      authorizedPlayer.role !== "owner"
    ) {
      throw new AppError("Forbidden", 403);
    }

    const validPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: { communityId: community.id, userId },
      },
      include: {
        player: {
          select: {
            id: true,
            username: true,
            type: true, // "static" or "user"
          },
        },
      },
    });

    if (!validPlayer)
      throw new AppError("Player not found in the community", 404);

    // Fetch session details, counting active participants to prevent overbooking
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      include: {
        _count: {
          select: { players: true }, // Assuming the relation in Session model is named 'players'
        },
      },
    });

    if (!session) throw new AppError("Session not found", 404);

    // Optional Safety Guard: Check if player is already inside this session
    const alreadyInSession = await tx.sessionPlayer.findFirst({
      where: {
        sessionId: session.id,
        playerId: validPlayer.userId,
      },
      select: {
        id: true,
      },
    });

    if (alreadyInSession) {
      throw new AppError("Player is already accepted into this session", 400);
    }

    // 3. Insert the player into the active session
    return await tx.sessionPlayer.create({
      data: {
        sessionId: session.id,
        playerId: validPlayer.id,
        acceptedBy: authorizedId,
      },
    });
  });
};
