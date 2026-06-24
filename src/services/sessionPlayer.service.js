import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";

export const acceptPlayer = async (
  communityId,
  sessionId,
  playerId,
  userId,
) => {
  if (!communityId || !playerId)
    throw new AppError(
      "Community ID, session ID and player ID is required",
      400,
    );

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true, ownerId: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  if (community.ownerId !== userId) throw new AppError("Forbidden", 403);

  const result = await prisma.$transaction(async (tx) => {
    // check player is in community
    const validPlayer = await tx.communityPlayer.findUnique({
      where: { communityId_userId: { communityId: community.id, userId } },
      select: { id: true, playerId: true },
    });

    if (!validPlayer) throw new AppError("Player not found", 404);

    const session = await tx.session.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });

    if (!session) throw new AppError("Player not found", 404);

    return await tx.sessionPlayer.create({
      data: {
        sessionId: session.id,
        playerId,
        acceptedBy: userId,
      },
    });
  });
};
