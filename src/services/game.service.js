import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";

export const createGame = async (
  communityId,
  sessionId,
  name,
  type,
  authorizedId,
) => {
  if (!communityId || !sessionId) {
    throw new AppError("Community ID and Session ID are required", 400);
  }

  const cleanName = name?.trim() || "Court";

  return await prisma.$transaction(async (tx) => {
    // 1. Concurrent check: Fetch attendee context and existing court count
    const [authorizingAttendee, courtCount] = await Promise.all([
      tx.sessionPlayer.findFirst({
        where: {
          sessionId: sessionId,
          sessionPlayer: {
            communityId: communityId,
            userId: authorizedId,
          },
        },
        select: {
          id: true, // Needed for Court's 'createdBy' field
          sessionPlayer: {
            select: { role: true }, // Fetch their community role
          },
        },
      }),
      tx.court.count({
        where: { sessionId: sessionId },
      }),
    ]);

    // 2. Security Guardrails
    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not part of this session's roster",
        403,
      );
    }

    // Restrict access explicitly to privileged roles
    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role)) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can manage courts",
        403,
      );
    }

    // 3. Dynamic Sequential Naming Fallback (e.g., "Court 1")
    const finalName = name?.trim()
      ? cleanName
      : `${cleanName} ${courtCount + 1}`;

    // 4. Create and return the Court
    return await tx.court.create({
      data: {
        sessionId: sessionId,
        name: finalName,
        type: type,
        createdBy: authorizingAttendee.id,
      },
    });
  });
};

export const updateCourtType = async (
  communityId,
  sessionId,
  courtId,
  newType, // "queue" or "match" (values from your CourtType enum)
  authorizedId, // User ID of the person making the request
) => {
  if (!communityId || !sessionId || !courtId || !newType) {
    throw new AppError(
      "Community ID, Session ID, Court ID, and Type are required",
      400,
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch the user's session attendee record to check their role
    const authorizingAttendee = await tx.sessionPlayer.findFirst({
      where: {
        sessionId: sessionId,
        member: {
          communityId: communityId,
          userId: authorizedId,
        },
      },
      select: {
        id: true, // Needed to mark who updated the court
        sessionPlayer: {
          select: { role: true },
        },
      },
    });

    // 2. Auth Guardrails
    if (!authorizingAttendee) {
      throw new AppError(
        "Forbidden: You are not checked into this session",
        403,
      );
    }

    const allowedRoles = ["admin", "owner", "host"];
    if (!allowedRoles.includes(authorizingAttendee.sessionPlayer.role)) {
      throw new AppError(
        "Forbidden: Only admins, owners, or hosts can modify court types",
        403,
      );
    }

    // 3. Update the court type and track who did it
    const updatedCourt = await tx.court.updateMany({
      where: {
        id: courtId,
        sessionId: sessionId, // Ensures the court actually belongs to this specific session context
      },
      data: {
        type: newType,
        updatedBy: authorizingAttendee.id, // Maps to your schema's 'updater' relation
      },
    });

    // If no row was affected, it means the courtId doesn't exist under this sessionId
    if (updatedCourt.count === 0) {
      throw new AppError("Court not found in this session", 404);
    }

    // Fetch and return the freshly updated court item
    return await tx.court.findUnique({
      where: { id: courtId },
    });
  });
};
