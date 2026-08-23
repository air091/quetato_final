import { Sports } from "../../generated/prisma/enums.ts";
import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";
import {
  getCommunitySessionsCacheVersion,
  getCachedJson,
  getPublicSessionsCacheVersion,
  getSessionCacheVersion,
  invalidateCommunitySessionsCache,
  invalidatePublicSessionsCache,
  invalidateSessionCache,
  setCachedJson,
} from "../libs/redis.js";

const configuredPublicSessionsTtl = Number(
  process.env.PUBLIC_SESSIONS_CACHE_TTL_SECONDS || 60,
);
const PUBLIC_SESSIONS_CACHE_TTL_SECONDS =
  Number.isFinite(configuredPublicSessionsTtl) && configuredPublicSessionsTtl > 0
    ? Math.floor(configuredPublicSessionsTtl)
    : 60;

const normalizeSport = (sport) => {
  if (typeof sport !== "string") {
    throw new AppError("Sport is required", 400);
  }

  const normalizedSport = sport.trim().toLowerCase();
  if (!Object.values(Sports).includes(normalizedSport)) {
    throw new AppError(
      `Sport must be one of: ${Object.values(Sports).join(", ")}`,
      400,
    );
  }

  return normalizedSport;
};

const assertSessionManager = async (communityId, sessionId, userId) => {
  const manager = await prisma.sessionPlayer.findFirst({
    where: {
      sessionId,
      sessionPlayer: { communityId, userId },
    },
    select: { isHost: true, sessionPlayer: { select: { role: true } } },
  });

  if (
    !manager ||
    (!manager.isHost && !["owner", "admin"].includes(manager.sessionPlayer.role))
  ) {
    throw new AppError("Forbidden", 403);
  }
};

export const getAllPublicSessions = async (page = 1, limit = 10) => {
  page = Math.max(1, Number.parseInt(page, 10) || 1);
  limit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 10));
  const skip = (page - 1) * limit;
  const version = await getPublicSessionsCacheVersion();
  const cacheKey = `public-sessions:v${version}:page:${page}:limit:${limit}`;
  const cached = await getCachedJson(cacheKey);

  if (cached) return cached;

  const [sessions, totalCount] = await Promise.all([
    prisma.session.findMany({
      where: {
        isAvailable: true,
      },
      skip: skip,
      take: limit,
      select: {
        id: true,
        name: true,
        sport: true,
        description: true,
        location: true,
        startAt: true,
        endAt: true,
        isAvailable: true,
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
        // Specify exact counts instead of fetching all default counts
        _count: {
          select: {
            players: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.session.count({
      where: {
        isAvailable: true,
      },
    }),
  ]);

  const result = {
    sessions,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  };

  await setCachedJson(cacheKey, result, PUBLIC_SESSIONS_CACHE_TTL_SECONDS);
  return result;
};

export const getAllSessions = async (communityId, filters = {}) => {
  if (!communityId) throw new AppError("Community ID is required", 400);

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  const {
    status,
    sortBy,
    order = "asc",
    search,
    page = 1,
    limit = 5,
  } = filters;
  const sortOrder = order.toLowerCase() === "desc" ? "desc" : "asc";

  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 5));
  const skip = (pageNumber - 1) * pageSize;
  const normalizedSearch = search?.trim() || "";
  const version = await getCommunitySessionsCacheVersion(communityId);
  const cacheKey = [
    "community-sessions",
    `community:${encodeURIComponent(communityId)}`,
    `v:${version}`,
    `status:${status || "all"}`,
    `sort:${sortBy || "name"}`,
    `order:${sortOrder}`,
    `search:${encodeURIComponent(normalizedSearch)}`,
    `page:${pageNumber}`,
    `limit:${pageSize}`,
  ].join(":");
  const cached = await getCachedJson(cacheKey);

  if (cached) return cached;

  // 1. Build the dynamic WHERE clause
  const whereClause = {
    communityId: communityId,
  };

  if (status) {
    whereClause.isAvailable = status === "available";
  }

  if (normalizedSearch) {
    whereClause.name = {
      contains: normalizedSearch,
      mode: "insensitive",
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
      orderByClause.push({ name: "asc" });
      break;
  }

  // 3. Fetch data and total count concurrently using transaction
  const [sessions, totalCount] = await prisma.$transaction([
    prisma.session.findMany({
      where: whereClause,
      orderBy: orderByClause,
      skip: skip,
      take: pageSize,
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
            isHost: true,
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
    }),
    prisma.session.count({ where: whereClause }),
  ]);

  const result = {
    sessions,
    pagination: {
      totalItems: totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      currentPage: pageNumber,
      limit: pageSize,
    },
  };
  await setCachedJson(cacheKey, result, PUBLIC_SESSIONS_CACHE_TTL_SECONDS);
  return result;
};

export const getSessionById = async (communityId, sessionId) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!sessionId) throw new AppError("Session ID is required");

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  const version = await getSessionCacheVersion(sessionId);
  const cacheKey = `session:community:${encodeURIComponent(communityId)}:id:${encodeURIComponent(sessionId)}:v:${version}`;
  const cached = await getCachedJson(cacheKey);

  if (cached) return cached;

  const session = await prisma.session.findFirst({
    where: { id: sessionId, communityId },
  });
  if (!session) throw new AppError("Session not found");
  await setCachedJson(cacheKey, session, PUBLIC_SESSIONS_CACHE_TTL_SECONDS);
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
  const normalizedSport = normalizeSport(sport);

  // Fallback defaults for description and location
  const cleanDescription =
    description?.trim() ||
    "Join the queue and start playing with nearby players.";
  const cleanLocation = location?.trim() || "TBA";

  const session = await prisma.$transaction(async (tx) => {
    // 1. Run the member fetch and a count query concurrently within the transaction
    const [communityMembers, sessionCount] = await Promise.all([
      tx.communityPlayer.findMany({
        where: { communityId: communityId },
        select: { id: true, userId: true, role: true },
      }),
      tx.session.count({
        where: { communityId: communityId },
      }),
    ]);

    // 2. Validate Community Existence
    if (communityMembers.length === 0) {
      throw new AppError("Community not found", 404);
    }

    // 3. Verify Authorization
    const authorizedPlayer = communityMembers.find(
      (m) => m.userId === authorizedId,
    );
    if (!authorizedPlayer) {
      throw new AppError("Forbidden: Not a member of this community", 403);
    }

    const allowedRoles = ["admin", "owner"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError("Forbidden: Insufficient permissions", 403);
    }

    // 4. Determine Dynamic Session Name
    // If name is missing or blank, count + 1 gives us the upcoming session number
    const cleanName = name?.trim() || `Session ${sessionCount + 1}`;

    const adminsToAutoAdd = communityMembers.filter((m) =>
      allowedRoles.includes(m.role),
    );

    // 5. Create the session
    const createdSession = await tx.session.create({
      data: {
        communityId,
        name: cleanName,
        sport: normalizedSport,
        description: cleanDescription,
        location: cleanLocation,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        createdBy: authorizedId,
      },
    });

    // 6. Bulk add admins to the session roster
    if (adminsToAutoAdd.length > 0) {
      await tx.sessionPlayer.createMany({
        data: adminsToAutoAdd.map((admin) => ({
          sessionId: createdSession.id,
          playerId: admin.id,
          status: "accepted",
          acceptedAt: new Date(),
        })),
      });
    }

    return createdSession;
  });
  await Promise.all([
    invalidatePublicSessionsCache(),
    invalidateCommunitySessionsCache(communityId),
  ]);
  return session;
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

  const session = await prisma.$transaction(async (tx) => {
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
  await Promise.all([
    invalidatePublicSessionsCache(),
    invalidateCommunitySessionsCache(communityId),
    invalidateSessionCache(sessionId),
  ]);
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

  await assertSessionManager(communityId, sessionId, userId);

  const session = await prisma.session.update({
    where: { id: sessionId },
    data: { isAvailable: true },
  });
  await Promise.all([
    invalidatePublicSessionsCache(),
    invalidateCommunitySessionsCache(communityId),
    invalidateSessionCache(sessionId),
  ]);
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

  await assertSessionManager(communityId, sessionId, userId);

  const session = await prisma.session.update({
    where: { id: sessionId },
    data: { isAvailable: false },
  });
  await Promise.all([
    invalidatePublicSessionsCache(),
    invalidateCommunitySessionsCache(communityId),
    invalidateSessionCache(sessionId),
  ]);
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

  await prisma.$transaction(async (tx) => {
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
  await Promise.all([
    invalidatePublicSessionsCache(),
    invalidateCommunitySessionsCache(communityId),
    invalidateSessionCache(sessionId),
  ]);
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
        where: {
          isHide: false,
        },
        select: {
          id: true,
          status: true,
          isHost: true,
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
