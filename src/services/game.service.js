import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";

export const getAllCourts = async (sessionId) => {
  if (!sessionId) {
    throw new AppError("Session ID is required", 400);
  }

  // Fetch all courts under the given session in one simple findMany query
  return await prisma.court.findMany({
    where: {
      sessionId: sessionId,
    },
    include: {
      // Safely join up the relations to get the User profile of who created it
      creator: {
        select: {
          id: true,
          sessionPlayer: {
            select: {
              communityPlayer: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
      },
    },
    // Keep it organized chronologically for your frontend UI grid
    orderBy: {
      createdAt: "asc",
    },
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
  const cleanName = name?.trim() || "Match Court";

  return await prisma.$transaction(async (tx) => {
    // 1. Concurrent Check: Verify player credentials and get current court count
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
          id: true, // Needed for Court 'createdBy' fields
          sessionPlayer: {
            select: { role: true },
          },
        },
      }),
      tx.court.count({
        where: { sessionId: sessionId },
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

    // 3. Dynamic Sequential Naming (e.g., "Match Court 1")
    const finalName = name?.trim()
      ? cleanName
      : `${cleanName} ${courtCount + 1}`;

    // 4. Create and return the Court with hardcoded 'match' type
    return await tx.court.create({
      data: {
        sessionId: sessionId,
        name: finalName,
        type: "match", // Hardcoded directly to enforce the court layout rule
        createdBy: authorizingAttendee.id,
      },
    });
  });
};

export const createQueueCourt = async () => {};

export const updateQueueCourtToMatch = async () => {};
