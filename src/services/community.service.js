import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";

export const getAllCommunities = async () => {
  const communities = await prisma.community.findMany({});
  return communities;
};

export const getMyCommunities = async (userId) => {
  if (!userId) throw new AppError("User ID is required");
  const communities = await prisma.community.findMany({
    where: { ownerId: userId },
  });

  return communities;
};

export const getCommunityById = async (communityId) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  const community = await prisma.community.findUnique({
    where: { id: communityId },
  });

  if (!community) throw new AppError("Community not found", 404);
  return community;
};

export const createCommunity = async (name, description, ownerId) => {
  if (name.trim().length === 0) throw new AppError("Name is required", 400);

  const community = await prisma.community.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      ownerId,
    },
  });

  return community;
};

export const updateCommunityByOwner = async (
  communityId,
  name,
  description,
  ownerId,
) => {
  if (name !== undefined) {
    name = name.trim();
    if (!name) throw new AppError("Name is required", 400);
  }
  if (description !== undefined) description = description.trim();

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true, ownerId: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  if (community.ownerId !== ownerId) throw new AppError("Forbidden", 403);

  const updatedCommunity = await prisma.community.update({
    where: { id: community.id },
    data: {
      name,
      description,
    },
  });

  return updatedCommunity;
};

export const deleteCommunity = async (communityId, ownerId) => {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true, ownerId: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  if (community.ownerId !== ownerId) throw new AppError("Forbidden", 403);

  await prisma.community.delete({ where: { id: communityId } });
};
