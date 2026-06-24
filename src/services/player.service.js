import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";
import { randomUUID } from "crypto";

export const getAllPlayers = async (communityId) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  const players = await prisma.communityPlayer.findMany({});
  return players;
};

export const getPlayerById = async (communityId, playerId) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!playerId) throw new AppError("Player ID is required", 400);

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  const player = await prisma.communityPlayer.findUnique({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId: playerId,
      },
    },
  });

  if (!player) throw new AppError("Community player not found");
  return player;
};

export const createStaticPlayers = async (communityId, usernames) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!Array.isArray(usernames) || usernames.length === 0)
    throw new AppError("Usernames array required", 400);

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });
  if (!community) throw new AppError("Community not found", 404);

  // Map each username into an isolated create promise
  const promises = usernames.map((username) => {
    const trimmedName = username.trim();

    return prisma.user.create({
      data: {
        username: trimmedName,
        email: `${trimmedName}-${randomUUID()}@quetato.com`,
        password: `${trimmedName}-${randomUUID()}@static-quetato.com`,
        // Nested relation write: Creates the community player automatically!
        communityPlayers: {
          create: {
            communityId: community.id,
          },
        },
      },
    });
  });

  // Fires them off in parallel (or wrapped in a transaction if using prisma.$transaction(promises))
  return await prisma.$transaction(promises);
};

export const updateStaticPlayer = async (userId, newUsername) => {
  if (!userId) throw new AppError("User ID is required", 400);
  if (!newUsername || newUsername.trim().length === 0) {
    throw new AppError("New username is required", 400);
  }

  // 1. Fetch the user first to verify if they are a static account
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) throw new AppError("Player not found", 404);

  // 2. Enforce the "Static Only" guard rail.
  // If your schema has an 'isStatic' boolean, use that. Otherwise, check the custom email domain:
  const isStatic = user.email.endsWith("@static-quetato.com");
  if (!isStatic) {
    throw new AppError(
      "Forbidden: Cannot modify non-static player profiles through this endpoint",
      403,
    );
  }

  // 3. Perform the update restricted ONLY to the username field
  const updatedPlayer = await prisma.user.update({
    where: { id: userId },
    data: {
      username: newUsername.trim(),
      // Explicitly omit updating email, password, or roles here
    },
  });

  return updatedPlayer;
};

export const deleteStaticPlayer = async (communityId, userId) => {
  if (!communityId || !userId) {
    throw new AppError("Community ID and User ID are required", 400);
  }

  // 1. Verify the user exists and check if they are actually a static player
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) throw new AppError("Player not found", 404);

  // Guardrail: Safety check to prevent deleting non-static accounts
  const isStatic = user.email.endsWith("@static-quetato.com");
  if (!isStatic) {
    throw new AppError(
      "Forbidden: Cannot delete non-static players through this endpoint",
      403,
    );
  }

  // 2. Perform the deletions inside a transaction
  await prisma.$transaction(async (tx) => {
    // Delete the relation record first (to avoid foreign key constraint errors)
    await tx.communityPlayer.deleteMany({
      where: {
        communityId: communityId,
        userId: userId,
      },
    });

    // Delete the actual static user record
    await tx.user.delete({
      where: { id: userId },
    });
  });

  return { success: true, message: "Static player deleted successfully" };
};
