import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";

export const getAllCourts = async (sessionId, type) => {
  if (!sessionId) {
    throw new AppError("Session ID is required", 400);
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Setup the row query filter
    const whereClause = { sessionId };
    if (type) {
      whereClause.type = type;
    }

    // 2. Fetch the records and aggregate the type counts simultaneously
    const [courts, countAggregations] = await Promise.all([
      tx.court.findMany({
        where: whereClause,
        include: {
          creator: {
            select: {
              id: true,
              sessionPlayer: {
                select: {
                  communityPlayer: { select: { username: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      tx.court.groupBy({
        by: ["type"],
        where: { sessionId },
        _count: { _all: true },
      }),
    ]);

    // 3. Map database aggregation array into a clean key-value stats object
    const counts = {
      all: 0,
      queue: 0,
      match: 0,
    };

    countAggregations.forEach((group) => {
      if (group.type === "queue") counts.queue = group._count._all;
      if (group.type === "match") counts.match = group._count._all;
      counts.all += group._count._all;
    });

    // 4. Return both the core data payload and the system stats metadata
    return {
      courts,
      counts,
    };
  });
};

export const createMatchCourt = async (
  communityId,
  sessionId,
  name,
  authorizedId,
) => {
  if (!communityId || !sessionId) {
    throw new AppError("Community ID and Session ID are required", 400);
  }

  // Base fallback name if none is explicitly provided by the user
  const cleanName = name?.trim() || "Match";

  return await prisma.$transaction(async (tx) => {
    // 1. Concurrent Check: Verify player credentials and get count of ONLY 'match' type courts
    const [authorizingAttendee, matchCourtCount] = await Promise.all([
      tx.sessionPlayer.findFirst({
        where: {
          sessionId: sessionId,
          sessionPlayer: {
            communityId: communityId,
            userId: authorizedId,
          },
        },
        select: {
          id: true, // Needed for Court 'createdBy' fields
          sessionPlayer: {
            select: { role: true },
          },
        },
      }),
      tx.court.count({
        where: {
          sessionId: sessionId,
          type: "match", // 🌟 FIX: Only count existing courts that are explicitly matches
        },
      }),
    ]);

    // 2. Auth Guards
    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not part of this session's roster",
        403,
      );
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role)) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can create a match court",
        403,
      );
    }

    // 3. Dynamic Sequential Naming (e.g., "Match 1", "Match 2")
    const finalName = name?.trim()
      ? cleanName
      : `${cleanName} ${matchCourtCount + 1}`;

    // 4. Create and return the Court with hardcoded 'match' type
    return await tx.court.create({
      data: {
        sessionId: sessionId,
        name: finalName,
        type: "match",
        createdBy: authorizingAttendee.id,
      },
    });
  });
};

export const updateMatchCourtName = async () => {};

export const deleteMatchCourt = async () => {};

export const createQueueCourt = async (
  communityId,
  sessionId,
  name,
  authorizedId,
) => {
  if (!communityId || !sessionId) {
    throw new AppError("Community ID and Session ID are required", 400);
  }

  // Base fallback name if none is explicitly provided by the user
  const cleanName = name?.trim() || "Queue";

  return await prisma.$transaction(async (tx) => {
    // 1. Concurrent Check: Verify player credentials and get count of ONLY 'match' type courts
    const [authorizingAttendee, queueCourtCount] = await Promise.all([
      tx.sessionPlayer.findFirst({
        where: {
          sessionId: sessionId,
          sessionPlayer: {
            communityId: communityId,
            userId: authorizedId,
          },
        },
        select: {
          id: true, // Needed for Court 'createdBy' fields
          sessionPlayer: {
            select: { role: true },
          },
        },
      }),
      tx.court.count({
        where: {
          sessionId: sessionId,
          type: "queue", // 🌟 FIX: Only count existing courts that are explicitly matches
        },
      }),
    ]);

    // 2. Auth Guards
    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not part of this session's roster",
        403,
      );
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role)) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can create a match court",
        403,
      );
    }

    // 3. Dynamic Sequential Naming (e.g., "Queue 1", "Queue 2")
    const finalName = name?.trim()
      ? cleanName
      : `${cleanName} ${queueCourtCount + 1}`;

    // 4. Create and return the Court with hardcoded 'Queue' type
    return await tx.court.create({
      data: {
        sessionId: sessionId,
        name: finalName,
        type: "queue",
        createdBy: authorizingAttendee.id,
      },
    });
  });
};

export const updateQueueCourtName = async () => {};

export const deleteQueueCourt = async () => {};

export const updateQueueCourtToMatch = async (
  communityId,
  sessionId,
  courtId,
  authorizedId,
) => {
  if (!communityId || !sessionId || !courtId) {
    throw new AppError(
      "Community ID, Session ID, and Court ID are required",
      400,
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch user authorization context, the target court, and the match court count concurrently
    const [authorizingAttendee, targetCourt, matchCourtCount] =
      await Promise.all([
        tx.sessionPlayer.findFirst({
          where: {
            sessionId: sessionId,
            sessionPlayer: {
              communityId: communityId,
              userId: authorizedId,
            },
          },
          select: {
            id: true,
            sessionPlayer: { select: { role: true } },
          },
        }),
        tx.court.findFirst({
          where: { id: courtId, sessionId: sessionId },
        }),
        tx.court.count({
          where: { sessionId: sessionId, type: "match" },
        }),
      ]);

    // 2. Security & Existence Guards
    if (!targetCourt) {
      throw new AppError("Court not found in this session", 404);
    }

    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not part of this session's roster",
        403,
      );
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role)) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can modify court setups",
        403,
      );
    }

    // 3. Determine Naming Strategy
    let finalName = targetCourt.name;

    // Regular Expression matching "Queue", "Queue ", "Queue 1", "Queue 12", etc. (case-insensitive)
    const defaultQueueRegex = /^queue(\s+\d+)?$/i;

    if (defaultQueueRegex.test(targetCourt.name.trim())) {
      // It was using a default name, so we transform it cleanly to "Match {count}"
      finalName = `Match ${matchCourtCount + 1}`;
    }

    // 4. Perform the update
    return await tx.court.update({
      where: { id: courtId },
      data: {
        name: finalName,
        type: "match",
        updatedBy: authorizingAttendee.id,
      },
    });
  });
};
