import { AppError } from "../libs/errorHandle";
import { prisma } from "../libs/prisma";

export const getAllSessions = async () => {
  const sessions = await prisma.session.findMany({});
  return sessions;
};

export const getSessionById = async (sessionId) => {
  if (!sessionId) throw new AppError("Session ID is required");
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new AppError("Session not found");
  return session;
};

export const createSession = async (name, location) => {
  if (name.trim().length === 0) throw new AppError("Name is required", 400);

  const session = await prisma.session.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      ownerId,
    },
  });

  return session;
};

export const updateSession = async (communityId, sessionId, name, location) => {
  if (!communityId) throw new AppError("Community ID is required");
  if (name !== undefined) {
    name = name.trim();
    if (!name) throw new AppError("Name is required", 400);
  }
  if (location !== undefined) location = location.trim();

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true, ownerId: true },
  });

  const session = await prisma.session.findFirst({
    where: { id: sessionId },
    select: { id: true, ownerId: true },
  });
};
