import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";

export const getAllCommunities = async () => {
  const communities = await prisma.community.findMany({
    select: {
      id: true,
      ownerId: true,
      name: true,
      _count: {
        select: {
          players: true,
          sessions: true,
        },
      },
      // 👇 Fetches players that match EITHER status in a single query block
      players: {
        where: {
          status: {
            in: ["requested", "accepted"], // 👈 Pulls both groups together
          },
        },
        select: {
          status: true, // 👈 CRITICAL: Return the status so your frontend can tell who is accepted vs requested!
          communityPlayer: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  return communities;
};

export const getMyCommunities = async (userId) => {
  if (!userId) throw new AppError("User ID is required", 400);

  // Run queries concurrently to optimize performance
  const [ownedCommunities, joinedCommunities] = await Promise.all([
    // 1. Communities you own
    prisma.community.findMany({
      where: {
        ownerId: userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            players: true,
            sessions: true,
          },
        },
      },
    }),

    // 2. Communities where you are an accepted member (and not the owner)
    prisma.community.findMany({
      where: {
        players: {
          some: {
            userId: userId,
            status: "accepted", // Only verified members
            role: {
              not: "owner", // Excludes owned communities to avoid duplicates
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            username: true,
          },
        },
        _count: {
          select: {
            players: true,
            sessions: true,
          },
        },
      },
    }),
  ]);

  return {
    owned: ownedCommunities,
    joined: joinedCommunities,
  };
};

export const getCommunityById = async (communityId) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: {
      id: true,
      name: true,
      description: true,
      owner: { select: { id: true, username: true } },
      _count: true,
    },
  });

  if (!community) throw new AppError("Community not found", 404);
  return community;
};

export const createCommunity = async (name, description, ownerId) => {
  if (name.trim().length === 0) throw new AppError("Name is required", 400);

  return await prisma.$transaction(async (tx) => {
    const community = await tx.community.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ownerId,
      },
    });

    await tx.communityPlayer.create({
      data: {
        communityId: community.id,
        userId: ownerId,
        role: "owner",
        status: "accepted",
      },
    });

    return community;
  });
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
  // 1. Fetch the community to verify ownership permissions
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true, ownerId: true },
  });

  if (!community) throw new AppError("Community not found", 404);
  if (community.ownerId !== ownerId) throw new AppError("Forbidden", 403);

  // 2. Identify all 'static' users linked uniquely to this specific community
  const staticPlayers = await prisma.communityPlayer.findMany({
    where: {
      communityId: communityId,
      communityPlayer: {
        type: "static", // Target only system-generated static accounts
      },
    },
    select: {
      userId: true,
    },
  });

  const staticUserIds = staticPlayers.map((p) => p.userId);

  // 3. Execute deletions inside a batch transaction isolation window
  await prisma.$transaction(async (tx) => {
    // First: Delete the core community.
    // Cascade settings handling onDelete: Cascade will drop all related sessions,
    // courts, slots, and community player join records automatically.
    await tx.community.delete({
      where: { id: communityId },
    });

    // Second: Scrub out the lingering static user profiles from the system
    if (staticUserIds.length > 0) {
      await tx.user.deleteMany({
        where: {
          id: {
            in: staticUserIds,
          },
          type: "static", // Bulletproof runtime validation check
        },
      });
    }
  });
};
