import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";
import { getSportGameRules, getSportGameRulesPayload } from "../constants/gameRules.js";

const shouldResetPlayerTimer = (currentStatus, nextStatus) =>
  (currentStatus !== "playing" && nextStatus === "playing") ||
  (currentStatus !== "paid" && nextStatus === "paid") ||
  (currentStatus === "playing" &&
    (nextStatus === "queued" || nextStatus === "waiting"));

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
    const [session, courts, countAggregations] = await Promise.all([
      tx.session.findUnique({
        where: { id: sessionId },
        select: { sport: true },
      }),
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

    if (!session) {
      throw new AppError("Session not found", 404);
    }

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
      sport: session.sport,
      gameRules: getSportGameRulesPayload(session.sport),
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
    const [authorizingAttendee, session, matchCourtCount] = await Promise.all([
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
          isHost: true,
          sessionPlayer: {
            select: { role: true },
          },
        },
      }),
      tx.session.findUnique({
        where: { id: sessionId },
        select: { sport: true },
      }),
      tx.court.count({
        where: {
          sessionId: sessionId,
          type: "match", // 🌟 FIX: Only count existing courts that are explicitly matches
        },
      }),
    ]);

    if (!session) throw new AppError("Session not found", 404);
    const gameRules = getSportGameRules(session.sport);
    if (
      gameRules.maxMatchCourts !== null &&
      matchCourtCount >= gameRules.maxMatchCourts
    ) {
      throw new AppError("Volleyball sessions can only have one Match Court", 409);
    }

    // 2. Auth Guards
    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not part of this session's roster",
        403,
      );
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (
      !allowedRoles.includes(authorizingAttendee.sessionPlayer.role) &&
      !authorizingAttendee.isHost
    ) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can create a match court",
        403,
      );
    }

    // 3. Dynamic Sequential Naming (e.g., "Match 1", "Match 2")
    const finalName = name?.trim()
      ? cleanName
      : session.sport === "volleyball"
        ? "Playing Court"
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
        isHost: true,
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
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role) && !authorizingAttendee.isHost) {
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
        isHost: true,
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
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role) && !authorizingAttendee.isHost) {
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
    const [authorizingAttendee, session, queueCourtCount] = await Promise.all([
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
          isHost: true,
          sessionPlayer: {
            select: { role: true },
          },
        },
      }),
      tx.session.findUnique({
        where: { id: sessionId },
        select: { sport: true },
      }),
      tx.court.count({
        where: {
          sessionId: sessionId,
          type: "queue", // 🌟 FIX: Only count existing courts that are explicitly matches
        },
      }),
    ]);

    if (!session) throw new AppError("Session not found", 404);
    const gameRules = getSportGameRules(session.sport);
    if (
      gameRules.maxQueueCourts !== null &&
      queueCourtCount >= gameRules.maxQueueCourts
    ) {
      throw new AppError("Volleyball sessions can only have one Queue Court", 409);
    }

    // 2. Auth Guards
    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not part of this session's roster",
        403,
      );
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role) && !authorizingAttendee.isHost) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can create a match court",
        403,
      );
    }

    // 3. Dynamic Sequential Naming (e.g., "Queue 1", "Queue 2")
    const finalName = name?.trim()
      ? cleanName
      : session.sport === "volleyball"
        ? "Queued Court"
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
        isHost: true,
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
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role) && !authorizingAttendee.isHost) {
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
        isHost: true,
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
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role) && !authorizingAttendee.isHost) {
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
            isHost: true,
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
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role) && !authorizingAttendee.isHost) {
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
  targetPosition,
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

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch entire context concurrently
    const [
      authorizingAttendee,
      session,
      allSessionCourts,
      allActiveSlots,
      playerExistsInSession,
    ] = await Promise.all([
      tx.sessionPlayer.findFirst({
        where: {
          sessionId,
          sessionPlayer: { communityId, userId: authorizedId },
        },
        select: { isHost: true, sessionPlayer: { select: { role: true } } },
      }),
      tx.session.findUnique({
        where: { id: sessionId },
        select: { sport: true },
      }),
      tx.court.findMany({
        where: { sessionId },
        select: { id: true, status: true, type: true },
      }),
      tx.courtSlot.findMany({
        where: { court: { sessionId } },
      }),
      tx.sessionPlayer.findFirst({
        where: {
          id: sessionPlayerId,
          sessionId: sessionId,
          status: { in: ["accepted", "requested"] },
          isHide: false,
        },
        select: { id: true, status: true, acceptedAt: true, gameStatus: true },
      }),
    ]);

    if (!session) {
      throw new AppError("Session not found", 404);
    }

    const gameRules = getSportGameRules(session.sport);
    if (!Number.isInteger(targetPosition) || !gameRules.positions.includes(targetPosition)) {
      throw new AppError(
        `Invalid ${session.sport} slot position. Must be between 0 and ${gameRules.positions.at(-1)}.`,
        400,
      );
    }
    const targetTeam = gameRules.teamForPosition(targetPosition);

    // 2. Core Security & Authorization Guards
    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not checked into this session",
        403,
      );
    }
    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role) && !authorizingAttendee.isHost) {
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
      throw new AppError(
        "Player is not an eligible, visible member of this session.",
        400,
      );
    }

    if (playerExistsInSession.gameStatus === "paid") {
      throw new AppError(
        "A paid player must be unmarked as paid before changing court slots.",
        400,
      );
    }

    // Older records were created by the accept flow with Prisma's default
    // requested status. They are valid session members, so normalize them.
    if (playerExistsInSession.status === "requested") {
      await tx.sessionPlayer.update({
        where: { id: playerExistsInSession.id },
        data: {
          status: "accepted",
          acceptedAt: playerExistsInSession.acceptedAt || new Date(),
        },
      });
    }

    const playerSlots = allActiveSlots.filter(
      (slot) => slot.sessionPlayerId === sessionPlayerId,
    );
    const findCourtForSlot = (slot) =>
      allSessionCourts.find((court) => court.id === slot.courtId);
    const activeMatchSlot = playerSlots.find((slot) => {
      const court = findCourtForSlot(slot);
      return (
        court?.type === "match" &&
        (court.status === "started" || court.status === "paused")
      );
    });
    const queueSlot = playerSlots.find(
      (slot) => findCourtForSlot(slot)?.type === "queue",
    );

    // A playing player keeps their live Match Court slot and receives an
    // additional Queue Court slot. Players who are not live can be moved from
    // their current assignment into the queue normally.
    const sourceSlot =
      targetCourt.type === "queue"
        ? queueSlot || (activeMatchSlot ? null : playerSlots[0])
        : activeMatchSlot || playerSlots[0];
    const isAdditionalQueueAssignment =
      targetCourt.type === "queue" && Boolean(activeMatchSlot) && !queueSlot;
    const sourceMatchCourt = activeMatchSlot
      ? findCourtForSlot(activeMatchSlot)
      : null;
    const isPausedMatchEdit =
      targetCourt.type === "match" &&
      targetCourt.status !== "started" &&
      sourceMatchCourt?.status === "paused";

    if (
      targetCourt.type === "match" &&
      playerExistsInSession.gameStatus === "playing" &&
      !isPausedMatchEdit
    ) {
      throw new AppError(
        "A player in a live match can only be moved after that match is paused.",
        400,
      );
    }
    const occupiedSlot = allActiveSlots.find(
      (s) => s.courtId === targetCourtId && s.position === targetPosition,
    );

    // 4. Live Match Rule Guards
    if (targetCourt.type === "match" && targetCourt.status === "started") {
      throw new AppError(
        "Forbidden: Cannot alter lineups on a live match court",
        400,
      );
    }
    if (sourceSlot) {
      const sourceCourt = allSessionCourts.find(
        (c) => c.id === sourceSlot.courtId,
      );
      if (
        sourceCourt?.type === "match" &&
        sourceCourt.status === "started" &&
        targetCourt.type !== "queue"
      ) {
        throw new AppError(
          "Forbidden: Cannot move a player out of an active live match except into a queue for their next match",
          400,
        );
      }
    }

    // 5. Intelligent Assignment Matrix
    // Case 1: SWAP — Swapping positions between two distinct court slots.
    if (isAdditionalQueueAssignment && occupiedSlot) {
      await tx.courtSlot.update({
        where: { id: occupiedSlot.id },
        data: {
          sessionPlayerId,
          queuedAt: new Date(),
        },
      });
    }

    // Case 1: SWAP â€” Swapping positions between two distinct court slots.
    else if (sourceSlot && occupiedSlot) {
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
            ...(targetCourt.type === "queue" ? { queuedAt: new Date() } : {}),
          },
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
            ...(targetCourt.type === "queue" ? { queuedAt: new Date() } : {}),
          },
        }),
      ]);
    }

    const touchedSlotPlayerIds = [
      sessionPlayerId,
      sourceSlot?.sessionPlayerId,
      occupiedSlot?.sessionPlayerId,
    ].filter(Boolean);

    if (touchedSlotPlayerIds.length > 0) {
      const previousPlayers = await tx.sessionPlayer.findMany({
        where: {
          id: { in: [...new Set(touchedSlotPlayerIds)] },
          sessionId,
        },
        select: { id: true, gameStatus: true },
      });
      const previousStatusByPlayerId = new Map(
        previousPlayers.map((player) => [player.id, player.gameStatus]),
      );
      const touchedSlots = await tx.courtSlot.findMany({
        where: {
          sessionPlayerId: { in: touchedSlotPlayerIds },
          court: { sessionId },
        },
        include: {
          court: {
            select: { type: true, status: true },
          },
        },
      });

      const slotsByPlayerId = new Map();
      touchedSlots.forEach((slot) => {
        const slots = slotsByPlayerId.get(slot.sessionPlayerId) || [];
        slots.push(slot);
        slotsByPlayerId.set(slot.sessionPlayerId, slots);
      });

      const nextStatusByPlayerId = new Map(
        [...slotsByPlayerId].map(([playerId, slots]) => [
          playerId,
          slots.some(
            (slot) =>
              slot.court.type === "match" &&
              (slot.court.status === "started" || slot.court.status === "paused"),
          )
            ? "playing"
            : slots.length > 0
              ? "queued"
              : "waiting",
        ]),
      );

      if (occupiedSlot && !nextStatusByPlayerId.has(occupiedSlot.sessionPlayerId)) {
        nextStatusByPlayerId.set(occupiedSlot.sessionPlayerId, "waiting");
      }

      await Promise.all(
        [...nextStatusByPlayerId].map(([playerId, nextStatus]) => {
          const data = { gameStatus: nextStatus };

          if (
            shouldResetPlayerTimer(
              previousStatusByPlayerId.get(playerId),
              nextStatus,
            )
          ) {
            data.updateStatus = new Date();
          }

          return tx.sessionPlayer.update({ where: { id: playerId }, data });
        }),
      );
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
        isHost: true,
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
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role) && !authorizingAttendee.isHost) {
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

    if (existingSlot.sessionPlayerId) {
      const remainingSlots = await tx.courtSlot.findMany({
        where: {
          sessionPlayerId: existingSlot.sessionPlayerId,
          court: { sessionId },
        },
        include: { court: { select: { type: true, status: true } } },
      });
      const remainsPlaying = remainingSlots.some(
        (slot) =>
          slot.court.type === "match" &&
          (slot.court.status === "started" || slot.court.status === "paused"),
      );

      await tx.sessionPlayer.update({
        where: { id: existingSlot.sessionPlayerId },
        data: {
          gameStatus: remainsPlaying
            ? "playing"
            : remainingSlots.length > 0
              ? "queued"
              : "waiting",
        },
      });
    }

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
        isHost: true,
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
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role) && !authorizingAttendee.isHost) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can manage match lineups",
        403,
      );
    }

    // 2. Fetch the session rules, selected Queue Court, and match courts concurrently
    const [session, queueCourt, matchCourts] = await Promise.all([
      tx.session.findUnique({
        where: { id: sessionId },
        select: { sport: true },
      }),
      tx.court.findFirst({
        where: { id: queueCourtId, sessionId: sessionId, type: "queue" }, // 👈 Verifies it belongs to this session and is a queue
        include: {
          slots: {
            include: { sessionPlayer: { select: { gameStatus: true } } },
          },
        },
      }),
      tx.court.findMany({
        where: { sessionId: sessionId, type: "match" },
        include: { slots: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!session) {
      throw new AppError("Session not found", 404);
    }
    const gameRules = getSportGameRules(session.sport);

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
      (c) => c.startedAt === null && c.slots.length < gameRules.positions.length,
    );

    if (!availableMatchCourt) {
      throw new AppError(
        "Cannot transfer: No available or open Match Courts found",
        422,
      );
    }

    // Sort queue slots to maintain the sequence order
    const hasPlayingPlayer = queueCourt.slots.some(
      (slot) => slot.sessionPlayer.gameStatus === "playing",
    );

    if (hasPlayingPlayer) {
      throw new AppError(
        "Cannot transfer a queue while one of its players is still in an active match",
        422,
      );
    }

    const queueSlotsToMove = [...queueCourt.slots].sort(
      (a, b) => a.position - b.position,
    );

    if (queueSlotsToMove.length === 0) {
      throw new AppError(
        "No transferable players were found in this queue",
        422,
      );
    }

    // 5. Calculate open match layout positions for the session's sport.
    const occupiedPositions = availableMatchCourt.slots.map((s) => s.position);
    const openPositions = gameRules.positions.filter(
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
      const targetTeam = gameRules.teamForPosition(targetPosition);

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
      movedSlots: movedSlotsLog,
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
    const [authorizingAttendee, session, targetCourt] = await Promise.all([
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
        isHost: true,
        sessionPlayer: { select: { role: true } },
        },
      }),
      tx.session.findUnique({
        where: { id: sessionId },
        select: { sport: true },
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
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role) && !authorizingAttendee.isHost) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can start matches",
        403,
      );
    }

    if (!targetCourt) {
      throw new AppError("Match court not found in this session", 404);
    }
    if (!session) {
      throw new AppError("Session not found", 404);
    }

    // 3. 🌟 UPDATED GAME STATE GUARDS
    // Allow starting if status is 'idle' OR 'paused'. Block if it's already 'started' or 'ended'.
    const allowedStatuses = ["idle", "paused"];
    if (!allowedStatuses.includes(targetCourt.status)) {
      throw new AppError(
        `Forbidden: This match court is currently '${targetCourt.status}' and cannot be started or resumed`,
        400,
      );
    }

    // 4. Each sport uses the same two-team model; rely on the stored team
    // assignment so its position layout can vary by sport.
    const occupiedSlots = targetCourt.slots.filter(
      (slot) => slot.sessionPlayerId,
    );
    const hasTeamAPlayer = occupiedSlots.some(
      (slot) => slot.team === "a",
    );
    const hasTeamBPlayer = occupiedSlots.some(
      (slot) => slot.team === "b",
    );

    if (!hasTeamAPlayer || !hasTeamBPlayer) {
      throw new AppError(
        `Cannot start match: "${targetCourt.name}" requires at least one player on both Team A and Team B to start`,
        400,
      );
    }

    const playerIdsInMatch = occupiedSlots.map((slot) => slot.sessionPlayerId);

    // 5. 🌟 UPDATED ATOMIC STATE UPDATE
    // Preserve the original startedAt timestamp if it was already set during a previous pause/resume loop
    const newStartedAt = targetCourt.startedAt || new Date();
    const playersInMatch = await tx.sessionPlayer.findMany({
      where: { id: { in: playerIdsInMatch }, sessionId },
      select: { id: true, gameStatus: true },
    });

    const [updatedCourt] = await Promise.all([
      tx.court.update({
        where: { id: courtId },
        data: {
          status: "started",
          startedAt: newStartedAt,
          ...(targetCourt.status === "idle" && session.sport === "volleyball"
            ? { teamAScore: 0, teamBScore: 0 }
            : {}),
          updatedBy: authorizingAttendee.id,
        },
        include: { slots: true },
      }),
      ...playersInMatch.map((player) => {
        const data = { gameStatus: "playing" };

        if (shouldResetPlayerTimer(player.gameStatus, "playing")) {
          data.updateStatus = new Date();
        }

        return tx.sessionPlayer.update({ where: { id: player.id }, data });
      }),
    ]);

    return updatedCourt;
  });
};

export const updateVolleyballScore = async (
  communityId,
  sessionId,
  courtId,
  team,
  delta,
  authorizedId,
) => {
  if (!communityId || !sessionId || !courtId || !authorizedId) {
    throw new AppError(
      "Community ID, Session ID, Court ID, and Authorized ID are required",
      400,
    );
  }
  if (!["a", "b"].includes(team) || ![-1, 1].includes(delta)) {
    throw new AppError("Team and score change must be valid", 400);
  }

  return prisma.$transaction(async (tx) => {
    const [authorizingAttendee, targetCourt] = await Promise.all([
      tx.sessionPlayer.findFirst({
        where: {
          sessionId,
          sessionPlayer: { communityId, userId: authorizedId },
        },
        select: { isHost: true, sessionPlayer: { select: { role: true } } },
      }),
      tx.court.findFirst({
        where: { id: courtId, sessionId, type: "match" },
        include: { session: { select: { sport: true } } },
      }),
    ]);

    if (!authorizingAttendee) throw new AppError("Forbidden", 403);
    if (
      !authorizingAttendee.isHost &&
      !["owner", "admin"].includes(authorizingAttendee.sessionPlayer.role)
    ) {
      throw new AppError("Forbidden", 403);
    }
    if (!targetCourt) throw new AppError("Match court not found in this session", 404);
    if (targetCourt.session.sport !== "volleyball") {
      throw new AppError("Live scoring is only available for volleyball", 400);
    }
    if (targetCourt.status !== "started") {
      throw new AppError("A match must be live before its score can change", 400);
    }

    const scoreField = team === "a" ? "teamAScore" : "teamBScore";
    const nextScore = Math.max(0, targetCourt[scoreField] + delta);
    return tx.court.update({
      where: { id: courtId },
      data: { [scoreField]: nextScore },
    });
  });
};

export const pauseMatchCourt = async (
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
          isHost: true,
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
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role) && !authorizingAttendee.isHost) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can pause matches",
        403,
      );
    }

    if (!targetCourt) {
      throw new AppError("Match court not found in this session", 404);
    }

    // 3. Game State Guards: Court must be actively 'started' to be paused
    if (targetCourt.status !== "started") {
      throw new AppError(
        `Forbidden: Cannot pause a court that is currently '${targetCourt.status}'`,
        400,
      );
    }

    // 4. Update court state to paused atomically
    const updatedCourt = await tx.court.update({
      where: { id: courtId },
      data: {
        status: "paused",
        updatedBy: authorizingAttendee.id,
      },
      include: { slots: true },
    });

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
          isHost: true,
          sessionPlayer: { select: { role: true } },
        },
      }),
      tx.court.findFirst({
        where: {
          id: courtId,
          sessionId: sessionId,
          type: "match",
        },
        include: { slots: true, session: { select: { sport: true } } },
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
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role) && !authorizingAttendee.isHost) {
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

    let normalizedWinningTeam = winningTeam?.toLowerCase();
    if (targetCourt.session.sport === "volleyball") {
      if (targetCourt.teamAScore === targetCourt.teamBScore) {
        throw new AppError(
          "Volleyball scores are tied; continue the game to determine a winner",
          400,
        );
      }
      normalizedWinningTeam =
        targetCourt.teamAScore > targetCourt.teamBScore ? "a" : "b";
    }
    if (!["a", "b"].includes(normalizedWinningTeam)) {
      throw new AppError("A valid winning team ('a' or 'b') must be specified", 400);
    }

    // 3. Extract player snapshot items sitting on this court
    const currentSlots = targetCourt.slots || [];
    const playerIdsInMatch = currentSlots
      .map((s) => s.sessionPlayerId)
      .filter(Boolean);
    const endedAt = new Date();

    // 4. Create MatchHistory Log & Nested Players Log
    if (currentSlots.length > 0) {
      await tx.matchHistory.create({
        data: {
          session: sessionId ? { connect: { id: sessionId } } : undefined,
          courtId: courtId,
          courtName: targetCourt.name,
          winningTeam: normalizedWinningTeam,
          ...(targetCourt.session.sport === "volleyball"
            ? {
                teamAScore: targetCourt.teamAScore,
                teamBScore: targetCourt.teamBScore,
              }
            : {}),
          startedAt: targetCourt.startedAt || new Date(),
          matchHistoryPlayer: {
            create: currentSlots.map((slot) => ({
              sessionPlayerId: slot.sessionPlayerId,
              team: slot.team,
              iswin: slot.team === normalizedWinningTeam, // 🌟 FIX: changed from isWin to iswin
            })),
          },
        },
      });
    }

    // 5. Delete active transient layout slots from live display view
    await tx.courtSlot.deleteMany({
      where: { courtId: courtId },
    });

    // 6. Players who already joined a Queue Court remain queued for their
    // next match; everyone else returns to the lobby.
    if (playerIdsInMatch.length > 0) {
      const [queueSlots, playersInMatch] = await Promise.all([
        tx.courtSlot.findMany({
          where: {
            sessionPlayerId: { in: playerIdsInMatch },
            court: { sessionId, type: "queue" },
          },
          select: { sessionPlayerId: true },
        }),
        tx.sessionPlayer.findMany({
          where: { id: { in: playerIdsInMatch }, sessionId },
          select: { id: true, gameStatus: true },
        }),
      ]);
      const queuedPlayerIds = new Set(
        queueSlots.map((slot) => slot.sessionPlayerId),
      );

      await Promise.all(
        playersInMatch.map((player) => {
          const nextStatus = queuedPlayerIds.has(player.id)
            ? "queued"
            : "waiting";
          const data = {
            gameStatus: nextStatus,
          };

          if (shouldResetPlayerTimer(player.gameStatus, nextStatus)) {
            data.updateStatus = endedAt;
          }

          return tx.sessionPlayer.update({
            where: { id: player.id },
            data,
          });
        }),
      );
    }

    // 7. Revert court container status back to idle
    const updatedCourt = await tx.court.update({
      where: { id: courtId },
      data: {
        status: "idle",
        startedAt: null,
        endedAt,
        updatedBy: authorizingAttendee.id,
      },
      include: {
        slots: true, // Returns [] so the court visual clears out cleanly
      },
    });

    return updatedCourt;
  });
};
