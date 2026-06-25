import { Sports } from "../../generated/prisma/enums.ts";
import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";

export const getAllPublicSessions = async () => {
  const sessions = await prisma.session.findMany({
    select: {
      id: true,
      community: {
        select: {
          id: true,
          name: true,
        },
      },
      name: true,
      sport: true,
      description: true,
      location: true,
      startAt: true,
      endAt: true,
      creator: { select: { id: true, username: true } },
    },
  });
  return sessions;
};

export const getAllSessions = async (communityId) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  const sessions = await prisma.session.findMany({
    include: {
      _count: true,
    },
  });
  return sessions;
};

export const getSessionById = async (communityId, sessionId) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!sessionId) throw new AppError("Session ID is required");

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new AppError("Session not found");
  return session;
};

export const createSession = async (
  communityId,
  name,
  sport,
  location,
  authorizedId,
) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!name || name.trim().length === 0)
    throw new AppError("Name is required", 400);

  // 1. Check if community exists first
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  return await prisma.$transaction(async (tx) => {
    // 2. Fetch and verify the authorized actor
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

    // Adjust "host" vs "owner" depending on your finalized enum
    const allowedRoles = ["admin", "owner"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError("Forbidden", 403);
    }

    // 3. Create the session
    const session = await tx.session.create({
      data: {
        communityId: community.id,
        name: name.trim(),
        sport: sport,
        location: location?.trim() || null,
        createdBy: authorizedId, // References User ID
      },
    });

    // 4. Fetch all admins/hosts in this specific community to auto-add them
    const adminsToAutoAdd = await tx.communityPlayer.findMany({
      where: {
        communityId: community.id,
        role: { in: ["admin", "owner"] }, // Correct Prisma multi-value syntax
      },
    });

    // 5. Bulk create session player entries using map + Promise.all
    await Promise.all(
      adminsToAutoAdd.map((admin) =>
        tx.sessionPlayer.create({
          data: {
            sessionId: session.id,
            playerId: admin.id, // CommunityPlayer ID
            acceptedAt: new Date(),
          },
        }),
      ),
    );

    return session;
  });
};

export const updateSession = async (
  communityId,
  sessionId,
  name,
  description,
  location,
  userId,
) => {
  if (!communityId) throw new AppError("Community ID is required");
  if (!communityId) throw new AppError("Session ID is required");
  if (name !== undefined) {
    name = name.trim();
    if (!name) throw new AppError("Name is required", 400);
  }
  if (description !== undefined) description = description.trim();
  if (location !== undefined) location = location.trim();

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true, ownerId: true },
  });

  if (!community) throw new AppError("Community not found");
  if (community.ownerId !== userId) throw new AppError("Forbidden", 403);

  const session = await prisma.session.update({
    where: { id: sessionId },
    data: {
      name,
      description,
      location,
      updatedBy: userId,
    },
  });

  return session;
};

export const startSession = async (communityId, sessionId, userId) => {
  if (!communityId) throw new AppError("Community ID is required");
  if (!communityId) throw new AppError("Session ID is required");

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true, ownerId: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  if (community.ownerId !== userId) throw new AppError("Forbidden", 403);

  const session = await prisma.session.update({
    where: { id: sessionId },
    data: { isAvailable: true },
  });

  return session;
};

export const endSession = async (communityId, sessionId, userId) => {
  if (!communityId) throw new AppError("Community ID is required");
  if (!communityId) throw new AppError("Session ID is required");

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true, ownerId: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  if (community.ownerId !== userId) throw new AppError("Forbidden", 403);

  const session = await prisma.session.update({
    where: { id: sessionId },
    data: { isAvailable: false },
  });

  return session;
};

export const deleteSession = async (communityId, sessionId, userId) => {
  if (!communityId) throw new AppError("Community ID is required");
  if (!communityId) throw new AppError("Session ID is required");

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true, ownerId: true },
  });

  if (!community) throw new AppError("Community not found", 404);
  if (community.ownerId !== userId) throw new AppError("Forbidden", 403);

  await prisma.session.delete({ where: { id: sessionId } });
};
