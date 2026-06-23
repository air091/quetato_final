import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";

const getAllCommunities = async () => {
  const communities = await prisma.community.findMany({});
  return communities;
};

const getCommunity = async (communityId) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  const community = await prisma.community.findUnique({
    where: { id: communityId },
  });

  if (!community) throw new AppError("Community not found", 404);
  return community;
};

const createCommunity = async (name, description, ownerId) => {
  const community = await prisma.community.create({
    data: {
      name,
      description,
      ownerId,
    },
  });

  return community;
};

const updateCommunityByOwner = async (
  communityId,
  name,
  description,
  ownerId,
) => {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true, ownerId },
  });

  if (!community) throw new AppError("Community not found", 404);

  if (community.ownerId !== ownerId) throw new AppError("Forbidden", 403);

  const updatedCommunity = await prisma.community.update({
    where: { id: communityId },
    data: {
      name,
      description,
    },
  });

  return updatedCommunity;
};

const deleteCommunity = async (communityId, ownerId) => {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true, ownerId: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  if (community.ownerId !== ownerId) throw new AppError("Forbidden", 403);

  await prisma.community.delete({ where: { id: communityId } });
};
