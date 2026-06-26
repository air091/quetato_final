import { Sports } from "../../generated/prisma/enums.ts";
import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";

export const getAllPublicSessions = async () => {
  const sessions = await prisma.session.findMany({
    select: {
      id: true,
      name: true,
      sport: true,
      description: true,
      location: true,
      startAt: true,
      endAt: true,
      isAvailable: true,
      createdBy: true,
      createdAt: true,
      // Move your relations inside the select block:
      community: {
        select: {
          id: true,
          name: true,
        },
      },
      creator: {
        select: {
          id: true,
          username: true,
        },
      },
      players: {
        select: {
          id: true,
          sessionPlayer: {
            select: {
              id: true,
              communityPlayer: {
                select: { id: true, username: true },
              },
            },
          },
        },
      },
      _count: true,
    },
  });
  return sessions;
};

export const getAllSessions = async (communityId, filters = {}) => {
  if (!communityId) throw new AppError("Community ID is required", 400);

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  const { status, sortBy, order = "asc", search } = filters;
  const sortOrder = order.toLowerCase() === "desc" ? "desc" : "asc";

  // 1. Build the dynamic WHERE clause
  const whereClause = {
    communityId: communityId,
  };

  // If status is provided, map it to your boolean
  if (status) {
    whereClause.isAvailable = status === "available";
  }

  // CRITICAL ADDITION: If search query is provided, look up names containing the string case-insensitively
  if (search && search.trim() !== "") {
    whereClause.name = {
      contains: search.trim(),
      mode: "insensitive", // Makes 'Tennis', 'tennis', and 'TENNIS' match the same query
    };
  }

  // 2. Build the dynamic ORDER BY array
  const orderByClause = [];

  switch (sortBy) {
    case "createdAt":
      orderByClause.push({ createdAt: sortOrder });
      break;
    case "schedule":
      orderByClause.push({ startAt: sortOrder });
      orderByClause.push({ isAvailable: sortOrder });
      break;
    case "name":
      orderByClause.push({ name: sortOrder });
      orderByClause.push({ isAvailable: sortOrder });
      break;
    default:
      orderByClause.push({ name: "asc" }); // Matches frontend default sorting (A-Z)
      break;
  }

  // 3. Fetch data from Prisma
  const sessions = await prisma.session.findMany({
    where: whereClause,
    orderBy: orderByClause,
    select: {
      id: true,
      name: true,
      sport: true,
      description: true,
      location: true,
      startAt: true,
      endAt: true,
      isAvailable: true,
      players: {
        select: {
          id: true,
          sessionPlayer: {
            select: {
              id: true,
              role: true,
              communityPlayer: {
                select: { id: true, username: true, type: true },
              },
            },
          },
        },
      },
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
  description,
  location,
  startAt,
  endAt,
  authorizedId,
) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!name || name.trim().length === 0)
    throw new AppError("Name is required", 400);

  if (!description || description.trim().length === 0) {
    description = "Join the queue and start playing with nearby players.";
  } else {
    description = description.trim();
  }

  if (!location || location.trim().length === 0) {
    location = "TBA";
  } else {
    location = location.trim();
  }

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
        description,
        location,
        // ✅ FIX: Ensure Prisma gets actual Date objects or null, not raw ISO strings
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        createdBy: authorizedId,
      },
    });

    // 4. Fetch all admins/hosts in this specific community to auto-add them
    const adminsToAutoAdd = await tx.communityPlayer.findMany({
      where: {
        communityId: community.id,
        role: { in: ["admin", "owner"] },
      },
    });

    // 5. Bulk create session player entries
    // Performance Pro-Tip: You can use `createMany` here instead of loop-mapping Promise.all for speed.
    if (adminsToAutoAdd.length > 0) {
      await tx.sessionPlayer.createMany({
        data: adminsToAutoAdd.map((admin) => ({
          sessionId: session.id,
          playerId: admin.id,
          acceptedAt: new Date(),
        })),
      });
    }

    return session;
  });
};

export const updateSession = async (
  communityId,
  sessionId,
  name,
  description,
  location,
  startAt,
  endAt,
  authorizedId,
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

    const allowedRoles = ["admin", "owner"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError("Forbidden", 403);
    }

    const session = await tx.session.update({
      where: { id: sessionId },
      data: {
        name,
        description,
        location,
        updatedBy: authorizedId,
      },
    });

    return session;
  });
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

export const deleteSession = async (communityId, sessionId, authorizedId) => {
  if (!communityId) throw new AppError("Community ID is required");
  if (!communityId) throw new AppError("Session ID is required");

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

    const allowedRoles = ["admin", "owner"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError("Forbidden", 403);
    }

    await tx.session.delete({ where: { id: sessionId } });
  });
};

// DASHBOARD, GAMES, PAYMENTS

export const getSessionDashboard = async (communityId, sessionId) => {
  if (!communityId || !sessionId) {
    throw new AppError("Community ID and session ID are required", 400);
  }

  const sessionDashboardData = await prisma.session.findFirst({
    where: {
      id: sessionId,
      communityId: communityId,
    },
    include: {
      // 1. Get metadata about who created the session
      creator: {
        select: {
          id: true,
          username: true,
        },
      },
      // 2. Fetch the players registered for this specific session
      players: {
        select: {
          id: true,
          status: true,
          acceptedAt: true,
          // Dive into the CommunityPlayer mapping to get the actual User's profile info
          sessionPlayer: {
            select: {
              role: true, // Their role inside this community (e.g., admin, host, player)
              communityPlayer: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      // 3. Add rapid aggregations (great for UI count badges)
      _count: {
        select: {
          players: true, // Total applications/signups
        },
      },
    },
  });

  if (!sessionDashboardData) {
    throw new AppError(
      "Session not found or doesn't belong to this community",
      404,
    );
  }

  // 4. (Optional) Format or clean up the response shape before sending it to the frontend
  return {
    ...sessionDashboardData,
    stats: {
      totalSignUps: sessionDashboardData._count.players,
      totalAccepted: sessionDashboardData.players.filter(
        (p) => p.status === "accepted",
      ).length,
      totalRejected: sessionDashboardData.players.filter(
        (p) => p.status === "rejected",
      ).length,
    },
  };
};
