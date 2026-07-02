import { SkillLevel } from "../../generated/prisma/enums.ts";
import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";
import { randomUUID } from "crypto";

export const getAllPlayers = async (communityId, type = "all") => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  let userFilter = {};
  if (type === "static") {
    userFilter = {
      player: {
        type: "static",
      },
    };
  } else if (type === "user") {
    userFilter = {
      player: {
        NOT: {
          type: "static",
        },
      },
    };
  }

  const players = await prisma.communityPlayer.findMany({
    where: {
      communityId: communityId,
      ...userFilter,
    },
    include: {
      communityPlayer: {
        select: {
          id: true,
          username: true,
          type: true,
        },
      },
    },
  });

  return players;
};

export const getPlayerById = async (communityId, playerId) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!playerId) throw new AppError("Player ID is required", 400);

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  const player = await prisma.communityPlayer.findUnique({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId: playerId,
      },
    },
  });

  if (!player) throw new AppError("Community player not found");
  return player;
};

export const getStaticPlayersNotInSession = async (
  communityId,
  sessionId,
  authorizedId,
) => {
  // 1. Authorization check: Ensure the operator is part of the community and holds an administrative role
  const operatorRole = await prisma.communityPlayer.findUnique({
    where: {
      communityId_userId: {
        communityId: communityId,
        userId: authorizedId,
      },
    },
    select: { role: true },
  });

  const validRoles = ["owner", "admin", "host"];
  if (!operatorRole || !validRoles.includes(operatorRole.role)) {
    throw new AppError(
      "Unauthorized: Only community owners, admins, or hosts can view available static rosters.",
      403,
    );
  }

  // 2. Verify the session exists and belongs to the specified community
  const sessionExists = await prisma.session.findFirst({
    where: {
      id: sessionId,
      communityId: communityId,
    },
  });

  if (!sessionExists) {
    throw new AppError("Session not found within this community.", 400);
  }

  // 3. Query community players that are static users AND don't have a row in SessionPlayer for this sessionId
  const availableStaticPlayers = await prisma.communityPlayer.findMany({
    where: {
      communityId: communityId,
      communityPlayer: {
        type: "static", // 🎯 Filter by the UserType.static enum value[cite: 9]
      },
      sessionPlayers: {
        none: {
          sessionId: sessionId, // 🙅‍♂️ Exclude players already linked to this session[cite: 9]
        },
      },
    },
    select: {
      id: true,
      communityId: true,
      role: true,
      // ⬇️ Move your relation query inside the select block instead of include!
      communityPlayer: {
        select: {
          id: true,
          username: true,
          email: true,
          skillLevel: true,
          type: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return availableStaticPlayers;
};

export const createStaticPlayers = async (
  communityId,
  usernames,
  skillLevel,
  authorizedId, // 🌟 Accept the authorizing user's ID
) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!Array.isArray(usernames) || usernames.length === 0)
    throw new AppError("Usernames array required", 400);
  if (!authorizedId) throw new AppError("Authorization ID is required", 400);

  if (skillLevel && !Object.values(SkillLevel).includes(skillLevel)) {
    throw new AppError(`Invalid skill level: ${skillLevel}`, 400);
  }

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });
  if (!community) throw new AppError("Community not found", 404);

  // 🌟 Switch to an interactive transaction to run authorization checks first
  return await prisma.$transaction(async (tx) => {
    // 1. Get the admin's CommunityPlayer record
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

    // 2. Validate role privileges
    const allowedRoles = ["admin", "host", "owner"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError("Forbidden", 403);
    }

    // 3. Map each username into an isolated create operation bound to the transaction context (tx)
    const promises = usernames.map((username) => {
      const trimmedName = username.trim();

      return tx.user.create({
        data: {
          username: trimmedName,
          email: `${trimmedName}-${randomUUID()}@static-quetato.com`,
          password: `${trimmedName}-${randomUUID()}`,
          type: "static",
          // Nested relation write: Creates the community player automatically!
          players: {
            create: {
              communityId: community.id,
            },
          },
        },
      });
    });

    // Resolve all promises concurrently inside this transaction session
    return await Promise.all(promises);
  });
};

export const updateStaticPlayer = async (
  communityId, // 🌟 Added to look up the admin's role in this community
  userId, // The ID of the static player being updated
  authorizedId, // 🌟 Added to identify the acting administrator
  newUsername,
  newSkillLevel,
) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!userId) throw new AppError("User ID is required", 400);
  if (!authorizedId) throw new AppError("Authorization ID is required", 400);

  // 1. Ensure at least one field is being updated
  if (newUsername === undefined && newSkillLevel === undefined) {
    throw new AppError(
      "At least one property (username or skill level) must be provided for update",
      400,
    );
  }

  // 2. Validate username if provided
  if (newUsername !== undefined) {
    if (!newUsername || newUsername.trim().length === 0) {
      throw new AppError("New username cannot be empty", 400);
    }
  }

  // 3. Validate skill level if provided
  if (newSkillLevel !== undefined) {
    if (!Object.values(SkillLevel).includes(newSkillLevel)) {
      throw new AppError(`Invalid skill level: ${newSkillLevel}`, 400);
    }
  }

  // 🌟 Wrap everything in an interactive transaction to handle sequential checks securely
  return await prisma.$transaction(async (tx) => {
    // 1. Get the admin's CommunityPlayer record for authorization
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId: communityId,
          userId: authorizedId,
        },
      },
    });

    if (!authorizedPlayer) {
      throw new AppError("Forbidden", 403);
    }

    // 2. Enforce allowed administrator roles
    const allowedRoles = ["admin", "host", "owner"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError("Forbidden", 403);
    }

    // 3. Fetch the target user to verify they are a static account
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) throw new AppError("Player not found", 404);

    // 4. Enforce the "Static Only" guard rail
    const isStatic = user.email.endsWith("@static-quetato.com");
    if (!isStatic) {
      throw new AppError(
        "Forbidden: Cannot modify non-static player profiles through this endpoint",
        403,
      );
    }

    // 5. Dynamically construct the update payload
    const updateData = {};
    if (newUsername !== undefined) {
      updateData.username = newUsername.trim();
    }
    if (newSkillLevel !== undefined) {
      updateData.skillLevel = newSkillLevel; // 🌟 Fixed typo (was 'skillLevel')
    }

    // 6. Perform the update locked safely to the transaction context (tx)
    const updatedPlayer = await tx.user.update({
      where: { id: userId },
      data: updateData,
    });

    return updatedPlayer;
  });
};

export const deleteStaticPlayer = async (communityId, userId, authorizedId) => {
  if (!communityId || !userId || !authorizedId) {
    throw new AppError(
      "Community ID, User ID, and Authorization ID are required",
      400,
    );
  }

  // 🌟 Perform all validation checks and deletions inside a single interactive transaction
  return await prisma.$transaction(async (tx) => {
    // 1. Get the admin's CommunityPlayer record for authorization
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId: communityId,
          userId: authorizedId,
        },
      },
    });

    if (!authorizedPlayer) {
      throw new AppError("Forbidden", 403);
    }

    // 2. Enforce allowed administrator roles
    const allowedRoles = ["admin", "host", "owner"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError("Forbidden", 403);
    }

    // 3. Verify the user exists and check if they are actually a static player
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) throw new AppError("Player not found", 404);

    // 4. Guardrail: Safety check to prevent deleting non-static accounts
    const isStatic = user.email.endsWith("@static-quetato.com");
    if (!isStatic) {
      throw new AppError(
        "Forbidden: Cannot delete non-static players through this endpoint",
        403,
      );
    }

    // 5. Delete the relation record first (avoids foreign key constraint errors)
    await tx.communityPlayer.deleteMany({
      where: {
        communityId: communityId,
        userId: userId,
      },
    });

    // 6. Delete the actual static user record
    await tx.user.delete({
      where: { id: userId },
    });

    return { success: true, message: "Static player deleted successfully" };
  });
};
