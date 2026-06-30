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
          slots: true,
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

export const updateMatchCourtName = async (
  communityId,
  sessionId,
  courtId,
  newName,
  authorizedId,
) => {
  if (!communityId || !sessionId || !courtId || !newName?.trim()) {
    throw new AppError(
      "Community ID, Session ID, Court ID, and a valid Name are required",
      400,
    );
  }

  const cleanName = newName.trim();

  return await prisma.$transaction(async (tx) => {
    // 1. Verify player credentials and roles
    const authorizingAttendee = await tx.sessionPlayer.findFirst({
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
    });

    // 2. Security Guards
    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not part of this session's roster",
        403,
      );
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role)) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can rename courts",
        403,
      );
    }

    // 3. Update the court name safely
    // Adding type: "match" in the where clause guarantees you aren't accidentally renaming a queue court here
    const updatedCourt = await tx.court.updateMany({
      where: {
        id: courtId,
        sessionId: sessionId,
        type: "match",
      },
      data: {
        name: cleanName,
        updatedBy: authorizingAttendee.id,
      },
    });

    // 4. Verification Check
    if (updatedCourt.count === 0) {
      throw new AppError("Match court not found in this session", 404);
    }

    // Return the fresh court details
    return await tx.court.findUnique({
      where: { id: courtId },
    });
  });
};

export const deleteMatchCourt = async (
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
    // 1. Verify player credentials and roles
    const authorizingAttendee = await tx.sessionPlayer.findFirst({
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
    });

    // 2. Security Guards
    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not part of this session's roster",
        403,
      );
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role)) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can delete courts",
        403,
      );
    }

    // 3. Delete the match court
    // Explicitly filtering by type: "match" ensures a user cannot misuse this endpoint to drop a queue court
    const deletedCourt = await tx.court.deleteMany({
      where: {
        id: courtId,
        sessionId: sessionId,
        type: "match",
      },
    });

    // 4. Verification Check
    if (deletedCourt.count === 0) {
      throw new AppError("Match court not found in this session", 404);
    }

    return { id: courtId, message: "Match court successfully deleted" };
  });
};

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

export const updateQueueCourtName = async (
  communityId,
  sessionId,
  courtId,
  newName,
  authorizedId,
) => {
  if (!communityId || !sessionId || !courtId || !newName?.trim()) {
    throw new AppError(
      "Community ID, Session ID, Court ID, and a valid Name are required",
      400,
    );
  }

  const cleanName = newName.trim();

  return await prisma.$transaction(async (tx) => {
    // 1. Verify player credentials and roles
    const authorizingAttendee = await tx.sessionPlayer.findFirst({
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
    });

    // 2. Security Guards
    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not part of this session's roster",
        403,
      );
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role)) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can rename courts",
        403,
      );
    }

    // 3. Update the court name safely
    // Explicitly filtering by type: "queue" guarantees you don't accidentally rename a match court here
    const updatedCourt = await tx.court.updateMany({
      where: {
        id: courtId,
        sessionId: sessionId,
        type: "queue",
      },
      data: {
        name: cleanName,
        updatedBy: authorizingAttendee.id,
      },
    });

    // 4. Verification Check
    if (updatedCourt.count === 0) {
      throw new AppError("Queue court not found in this session", 404);
    }

    // Return the fresh court details
    return await tx.court.findUnique({
      where: { id: courtId },
    });
  });
};

export const deleteQueueCourt = async (
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
    // 1. Verify player credentials and roles
    const authorizingAttendee = await tx.sessionPlayer.findFirst({
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
    });

    // 2. Security Guards
    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not part of this session's roster",
        403,
      );
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role)) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can delete courts",
        403,
      );
    }

    // 3. Delete the queue court
    // Explicitly filtering by type: "queue" ensures a user cannot misuse this endpoint to drop a match court
    const deletedCourt = await tx.court.deleteMany({
      where: {
        id: courtId,
        sessionId: sessionId,
        type: "queue",
      },
    });

    // 4. Verification Check
    if (deletedCourt.count === 0) {
      throw new AppError("Queue court not found in this session", 404);
    }

    return { id: courtId, message: "Queue court successfully deleted" };
  });
};

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

export const assignPlayerToSlot = async (
  communityId,
  sessionId,
  targetCourtId,
  sessionPlayerId,
  targetPosition, // Expects 0, 1, 2, or 3
  authorizedId,
) => {
  if (
    !communityId ||
    !sessionId ||
    !targetCourtId ||
    !sessionPlayerId ||
    !authorizedId
  ) {
    throw new AppError(
      "Community ID, Session ID, Court ID, Session Player ID, and Authorized ID are required",
      400,
    );
  }

  if (
    !Number.isInteger(targetPosition) ||
    ![0, 1, 2, 3].includes(targetPosition)
  ) {
    throw new AppError("Invalid slot position. Must be between 0 and 3.", 400);
  }

  const targetTeam = targetPosition % 2 === 0 ? "a" : "b";

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch entire context concurrently
    const [
      authorizingAttendee,
      allSessionCourts,
      allActiveSlots,
      playerExistsInSession,
    ] = await Promise.all([
      tx.sessionPlayer.findFirst({
        where: {
          sessionId,
          sessionPlayer: { communityId, userId: authorizedId },
        },
        select: { sessionPlayer: { select: { role: true } } },
      }),
      tx.court.findMany({
        where: { sessionId },
        select: { id: true, startedAt: true },
      }),
      tx.courtSlot.findMany({
        where: { court: { sessionId } },
      }),
      tx.sessionPlayer.findFirst({
        where: {
          id: sessionPlayerId,
          sessionId: sessionId,
          status: "accepted",
        },
      }),
    ]);

    // 2. Core Security & Authorization Guards
    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not checked into this session",
        403,
      );
    }
    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role)) {
      throw new AppError(
        "Forbidden: Only administrators or hosts can adjust lineups",
        403,
      );
    }

    // 3. Find targets in memory
    const targetCourt = allSessionCourts.find((c) => c.id === targetCourtId);
    if (!targetCourt) {
      throw new AppError("Target court not found in this session", 404);
    }

    if (!playerExistsInSession) {
      throw new AppError(`Invalid Player: Provided ID does not exist.`, 400);
    }

    const sourceSlot = allActiveSlots.find(
      (s) => s.sessionPlayerId === sessionPlayerId,
    );
    const occupiedSlot = allActiveSlots.find(
      (s) => s.courtId === targetCourtId && s.position === targetPosition,
    );

    // 4. Live Match Rule Guards
    if (targetCourt.startedAt !== null) {
      throw new AppError(
        "Forbidden: Cannot alter lineups on a live match court",
        400,
      );
    }
    if (sourceSlot) {
      const sourceCourt = allSessionCourts.find(
        (c) => c.id === sourceSlot.courtId,
      );
      if (sourceCourt?.startedAt !== null) {
        throw new AppError(
          "Forbidden: Cannot move a player out of an active live match",
          400,
        );
      }
    }

    // 5. Intelligent Assignment Matrix

    // Case 1: SWAP — Swapping positions between two distinct court slots.
    if (sourceSlot && occupiedSlot) {
      // 🟢 FIX: We swap the exact parameters (court, position, and team rules) so they take over each other's layout coordinates safely.
      await Promise.all([
        tx.courtSlot.update({
          where: { id: sourceSlot.id },
          data: {
            courtId: occupiedSlot.courtId,
            position: occupiedSlot.position,
            team: occupiedSlot.team,
          },
        }),
        tx.courtSlot.update({
          where: { id: occupiedSlot.id },
          data: {
            courtId: sourceSlot.courtId,
            position: sourceSlot.position,
            team: sourceSlot.team,
          },
        }),
      ]);
    }

    // Case 2: MOVE — Existing slot changes layout coordinates to an empty slot.
    else if (sourceSlot && !occupiedSlot) {
      // 🟢 FIX: Simply update the record directly instead of running a separate delete + create cycle.
      await tx.courtSlot.update({
        where: { id: sourceSlot.id },
        data: {
          courtId: targetCourtId,
          position: targetPosition,
          team: targetTeam,
        },
      });
    }

    // Case 3: KICK/REPLACE — Lobby player takes an occupied court slot.
    else if (!sourceSlot && occupiedSlot) {
      await Promise.all([
        tx.courtSlot.update({
          where: { id: occupiedSlot.id },
          data: {
            sessionPlayerId: sessionPlayerId, // Replaces occupant with the incoming user ID
          },
        }),
        tx.sessionPlayer.update({
          where: { id: occupiedSlot.sessionPlayerId },
          data: { gameStatus: "waiting" },
        }),
        tx.sessionPlayer.update({
          where: { id: sessionPlayerId },
          data: { gameStatus: "queued" },
        }),
      ]);
    }

    // Case 4: FRESH ASSIGNMENT — Lobby player moves into an empty court slot.
    else {
      await Promise.all([
        tx.courtSlot.create({
          data: {
            courtId: targetCourtId,
            sessionPlayerId: sessionPlayerId,
            position: targetPosition,
            team: targetTeam,
          },
        }),
        tx.sessionPlayer.update({
          where: { id: sessionPlayerId },
          data: { gameStatus: "queued" },
        }),
      ]);
    }

    // Return the updated states of the entire court collection
    return await tx.courtSlot.findMany({
      where: { court: { sessionId } },
    });
  });
};

export const removePlayerFromSlot = async (
  communityId,
  sessionId,
  courtId,
  slotId,
  authorizedId,
) => {
  // 1. Fail fast: Validate all required fields upfront
  if (!communityId || !sessionId || !courtId || !slotId || !authorizedId) {
    throw new AppError(
      "Community ID, Session ID, Court ID, Slot ID, and Authorized ID are required",
      400,
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 2. Verify player credentials and roles
    const authorizingAttendee = await tx.sessionPlayer.findFirst({
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
    });

    // 3. Security Guards
    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not part of this session's roster",
        403,
      );
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role)) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can remove players from slots",
        403,
      );
    }

    // 4. Find the court slot first to get the attached player's ID
    // and verify the court/session hierarchy safely
    const existingSlot = await tx.courtSlot.findFirst({
      where: {
        id: slotId,
        courtId: courtId,
        court: {
          sessionId: sessionId,
        },
      },
      select: {
        id: true,
        sessionPlayerId: true, // 👈 Grabbing this to target their roster status
      },
    });

    if (!existingSlot) {
      throw new AppError("Court slot not found in this court or session", 404);
    }

    // 5. Update the player's status back to "waiting"
    if (existingSlot.sessionPlayerId) {
      await tx.sessionPlayer.update({
        where: { id: existingSlot.sessionPlayerId },
        data: { gameStatus: "waiting" }, // 👈 Status reset
      });
    }

    // 6. Safely delete the court slot now that the player is free
    await tx.courtSlot.delete({
      where: { id: slotId },
    });

    return { id: slotId, message: "Player removed from slot successfully" };
  });
};

export const transferQueueToMatch = async (
  communityId,
  sessionId,
  queueCourtId, // 👈 Added specific queueCourtId parameter
  authorizedId,
) => {
  if (!communityId || !sessionId || !queueCourtId || !authorizedId) {
    throw new AppError(
      "Community ID, Session ID, Queue Court ID, and Authorized ID are required",
      400,
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Security Guard: Verify authorizer role
    const authorizingAttendee = await tx.sessionPlayer.findFirst({
      where: {
        sessionId: sessionId,
        sessionPlayer: { communityId, userId: authorizedId },
      },
      select: {
        sessionPlayer: { select: { role: true } },
      },
    });

    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not part of this session's roster",
        403,
      );
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role)) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can manage match lineups",
        403,
      );
    }

    // 2. Fetch the specifically selected Queue Court and all match courts concurrently
    const [queueCourt, matchCourts] = await Promise.all([
      tx.court.findFirst({
        where: { id: queueCourtId, sessionId: sessionId, type: "queue" }, // 👈 Verifies it belongs to this session and is a queue
        include: { slots: true },
      }),
      tx.court.findMany({
        where: { sessionId: sessionId, type: "match" },
        include: { slots: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // 3. Validation Guards
    if (!queueCourt) {
      throw new AppError(
        "The selected Queue Court was not found or is invalid",
        404,
      );
    }

    if (queueCourt.slots.length === 0) {
      throw new AppError(
        `No players found in "${queueCourt.name}" to transfer`,
        400,
      );
    }

    // 4. Find the first available Match Court that hasn't started and has open slots
    const availableMatchCourt = matchCourts.find(
      (c) => c.startedAt === null && c.slots.length < 4,
    );

    if (!availableMatchCourt) {
      throw new AppError(
        "Cannot transfer: No available or open Match Courts found",
        422,
      );
    }

    // Sort queue slots to maintain the sequence order
    const queueSlotsToMove = [...queueCourt.slots].sort(
      (a, b) => a.position - b.position,
    );

    // 5. Calculate open match layout positions (0, 1, 2, 3)
    const occupiedPositions = availableMatchCourt.slots.map((s) => s.position);
    const allPositions = [0, 1, 2, 3];
    const openPositions = allPositions.filter(
      (pos) => !occupiedPositions.includes(pos),
    );

    // Determine how many players can fit
    const spotsToFillCount = Math.min(
      queueSlotsToMove.length,
      openPositions.length,
    );
    if (spotsToFillCount === 0) {
      throw new AppError(
        "Target Match Court has no empty positions available",
        422,
      );
    }

    const movedSlotsLog = [];

    // 6. Execute Transfer Loop
    for (let i = 0; i < spotsToFillCount; i++) {
      const sourceSlot = queueSlotsToMove[i];
      const targetPosition = openPositions[i];
      const targetTeam = targetPosition % 2 === 0 ? "a" : "b";

      // Step A: Evict player from the specific Queue Court slot
      await tx.courtSlot.delete({
        where: { id: sourceSlot.id },
      });

      // Step B: Set player status to "queued"
      await tx.sessionPlayer.update({
        where: { id: sourceSlot.sessionPlayerId },
        data: { gameStatus: "queued" },
      });

      // Step C: Place player in the Match Court slot
      const freshMatchSlot = await tx.courtSlot.create({
        data: {
          courtId: availableMatchCourt.id,
          sessionPlayerId: sourceSlot.sessionPlayerId,
          position: targetPosition,
          team: targetTeam,
        },
      });

      movedSlotsLog.push(freshMatchSlot);
    }

    return {
      message: `Successfully transferred ${movedSlotsLog.length} player(s) from "${queueCourt.name}" to "${availableMatchCourt.name}"`,
      targetCourtId: availableMatchCourt.id,
      transferredCount: movedSlotsLog.length,
    };
  });
};

export const startMatchCourt = async (
  communityId,
  sessionId,
  courtId,
  authorizedId,
) => {
  if (!communityId || !sessionId || !courtId || !authorizedId) {
    throw new AppError(
      "Community ID, Session ID, Court ID, and Authorized ID are required",
      400,
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch user authorization context and the target match court concurrently
    const [authorizingAttendee, targetCourt] = await Promise.all([
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
        where: {
          id: courtId,
          sessionId: sessionId,
          type: "match",
        },
        include: {
          slots: true,
        },
      }),
    ]);

    // 2. Auth & Existence Guards
    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not part of this session's roster",
        403,
      );
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role)) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can start matches",
        403,
      );
    }

    if (!targetCourt) {
      throw new AppError("Match court not found in this session", 404);
    }

    // 3. Game State Guards
    if (targetCourt.startedAt !== null || targetCourt.status !== "idle") {
      throw new AppError(
        "Forbidden: This match court has already started or concluded",
        400,
      );
    }

    // 🌟 FIX: Calculate occupied teams based on position integers (Even = Team A, Odd = Team B)
    const occupiedSlots = targetCourt.slots.filter(
      (slot) => slot.sessionPlayerId,
    );
    const hasTeamAPlayer = occupiedSlots.some(
      (slot) => slot.position % 2 === 0,
    );
    const hasTeamBPlayer = occupiedSlots.some(
      (slot) => slot.position % 2 === 1,
    );

    if (!hasTeamAPlayer || !hasTeamBPlayer) {
      throw new AppError(
        `Cannot start match: "${targetCourt.name}" requires at least one player on both Team A and Team B to start`,
        400,
      );
    }

    // 4. Extract all player IDs sitting in this court's slots
    const playerIdsInMatch = occupiedSlots.map((slot) => slot.sessionPlayerId);

    // 5. Update court information and shift players' game status atomically
    const [updatedCourt] = await Promise.all([
      tx.court.update({
        where: { id: courtId },
        data: {
          status: "started",
          startedAt: new Date(),
          updatedBy: authorizingAttendee.id,
        },
        include: { slots: true },
      }),
      tx.sessionPlayer.updateMany({
        where: {
          id: { in: playerIdsInMatch },
        },
        data: {
          gameStatus: "playing",
          updateStatus: new Date(),
        },
      }),
    ]);

    return updatedCourt;
  });
};

export const endMatchCourt = async (
  communityId,
  sessionId,
  courtId,
  authorizedId,
  winningTeam, // Expecting "a" or "b" (matches your lowercase Team enum format)
) => {
  if (!communityId || !sessionId || !courtId || !authorizedId) {
    throw new AppError(
      "Community ID, Session ID, Court ID, and Authorized ID are required",
      400,
    );
  }

  const normalizedWinningTeam = winningTeam.toLowerCase();
  if (!["a", "b"].includes(normalizedWinningTeam)) {
    throw new AppError(
      "A valid winning team ('a' or 'b') must be specified",
      400,
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch authorization context and target match court concurrently
    const [authorizingAttendee, targetCourt] = await Promise.all([
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
        where: {
          id: courtId,
          sessionId: sessionId,
          type: "match",
        },
        include: {
          slots: true,
        },
      }),
    ]);

    // 2. Safeguards
    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not part of this session's roster",
        403,
      );
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role)) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can end matches",
        403,
      );
    }

    if (!targetCourt) {
      throw new AppError("Match court not found in this session", 404);
    }

    if (targetCourt.status !== "started") {
      throw new AppError(
        "Bad Request: This match court is not currently active",
        400,
      );
    }

    // 3. Extract player snapshot items sitting on this court
    const currentSlots = targetCourt.slots || [];
    const playerIdsInMatch = currentSlots
      .map((s) => s.sessionPlayerId)
      .filter(Boolean);

    // 4. Create MatchHistory Log & Nested Players Log
    if (currentSlots.length > 0) {
      await tx.matchHistory.create({
        data: {
          sessionId: sessionId,
          courtId: courtId,
          courtName: targetCourt.name,
          winningTeam: normalizedWinningTeam,
          startedAt: targetCourt.startedAt || new Date(),
          players: {
            create: currentSlots.map((slot) => ({
              sessionPlayerId: slot.sessionPlayerId,
              team: slot.team,
              isWin: slot.team === normalizedWinningTeam,
            })),
          },
        },
      });
    }

    // 5. Delete active transient layout slots from live display view
    await tx.courtSlot.deleteMany({
      where: { courtId: courtId },
    });

    // 6. Free players back to lobby
    if (playerIdsInMatch.length > 0) {
      await tx.sessionPlayer.updateMany({
        where: {
          id: { in: playerIdsInMatch },
        },
        data: {
          gameStatus: "waiting",
          updateStatus: new Date(),
        },
      });
    }

    // 7. Revert court container status back to idle
    const updatedCourt = await tx.court.update({
      where: { id: courtId },
      data: {
        status: "idle",
        startedAt: null,
        endedAt: new Date(),
        updatedBy: authorizingAttendee.id,
      },
      include: {
        slots: true, // Returns [] so the court visual clears out cleanly
      },
    });

    return updatedCourt;
  });
};
