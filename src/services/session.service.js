import { AppError } from "../libs/errorHandle";
import { prisma } from "../libs/prisma";

export const getAllSessions = async (communityId) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  const sessions = await prisma.session.findMany({});
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

export const createSession = async (communityId, name, location, creatorId) => {
  if (!communityId) throw new AppError("Community ID is required");
  if (name.trim().length === 0) throw new AppError("Name is required", 400);

  const community = await prisma.community.findUnique({
    where: { communityId },
    select: { id: true, ownerId: true },
  });

  if (community.ownerId !== creatorId) throw new AppError("Forbidden", 403);

  const session = await prisma.session.create({
    data: {
      communityId: community.id,
      name: name.trim(),
      description: description?.trim() || null,
      creator: creatorId,
    },
  });

  return session;
};

export const updateSession = async (
  communityId,
  sessionId,
  name,
  location,
  userId,
) => {
  if (!communityId) throw new AppError("Community ID is required");
  if (!communityId) throw new AppError("Session ID is required");
  if (name !== undefined) {
    name = name.trim();
    if (!name) throw new AppError("Name is required", 400);
  }
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
      location,
      updatedBy: userId,
    },
  });
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
