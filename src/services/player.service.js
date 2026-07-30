import { SkillLevel } from "../../generated/prisma/enums.ts";
import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";
import { randomUUID } from "crypto";

export const getAllPlayers = async (communityId) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  const players = await prisma.communityPlayer.findMany({
    where: {
      communityId: communityId,
      role: "player",
    },
    include: {
      communityPlayer: {
        select: {
          id: true,
          username: true,
          type: true,
          skillLevel: true,
        },
      },
    },
  });

  return players;
};

export const getCommunityManagement = async (communityId) => {
  if (!communityId) throw new AppError("Community ID is required", 400);

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  const managementTeam = await prisma.communityPlayer.findMany({
    where: {
      communityId: communityId,
      role: {
        in: ["owner", "admin"],
      },
    },
    include: {
      communityPlayer: {
        select: {
          id: true,
          username: true,
          type: true,
          skillLevel: true,
        },
      },
    },
    orderBy: {
      role: "asc", // Optional: Orders so 'admin' or 'owner' groups consistently
    },
  });

  return managementTeam;
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

export const getStaticPlayerNotInSession = async (
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
          skillLevel: true,
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

    // 🌟 2.5. Check for existing usernames in this specific community
    const trimmedUsernames = usernames.map((name) => name.trim());

    const existingPlayers = await tx.communityPlayer.findMany({
      where: {
        communityId: community.id,
        communityPlayer: {
          username: {
            in: trimmedUsernames,
            mode: "insensitive", // Optional: Makes the check case-insensitive
          },
        },
      },
      select: {
        communityPlayer: {
          select: { username: true },
        },
      },
    });

    if (existingPlayers.length > 0) {
      const duplicateNames = existingPlayers.map(
        (p) => p.communityPlayer.username,
      );
      throw new AppError(
        `The following usernames already exist in this community: ${duplicateNames.join(", ")}`,
        400,
      );
    }

    // 3. Map each username into an isolated create operation bound to the transaction context (tx)
    const promises = trimmedUsernames.map((trimmedName) => {
      return tx.user.create({
        data: {
          username: trimmedName,
          email: `${trimmedName}-${randomUUID()}@static-quetato.com`,
          password: `${trimmedName}-${randomUUID()}`,
          type: "static",
          skillLevel,
          players: {
            create: {
              communityId: community.id,
              status: "accepted",
            },
          },
        },
        include: {
          players: true,
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

export const getAllRequestPlayers = async (communityId, authorizedId) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!authorizedId) throw new AppError("Authorization ID is required", 400);

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

  const validRoles = ["owner", "admin"];
  if (!operatorRole || !validRoles.includes(operatorRole.role)) {
    throw new AppError(
      "Unauthorized: Only community owners, admins, or hosts can view pending join requests.",
      403,
    );
  }

  // 2. Verify the community exists
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!community) throw new AppError("Community not found", 404);

  // 3. Fetch all players with a "requested" status
  const requestPlayers = await prisma.communityPlayer.findMany({
    where: {
      communityId: communityId,
      status: "requested",
    },
    select: {
      id: true,
      communityId: true,
      role: true,
      status: true,
      createdAt: true,
      communityPlayer: {
        select: {
          id: true,
          username: true,
          email: true,
          skillLevel: true,
          type: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc", // Oldest requests first
    },
  });

  return requestPlayers;
};

export const joinCommunity = async (communityId, userId) => {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });
  if (!community) throw new AppError("Community not found", 404);

  // 🌟 Check if this user is already associated with the community
  const existingPlayer = await prisma.communityPlayer.findUnique({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId,
      },
    },
  });

  if (existingPlayer) {
    // Customize this error based on your needs (e.g., if they are already a member vs pending)
    throw new AppError(
      "You have already requested to join or are a member of this community",
      400,
    );
  }

  const player = await prisma.communityPlayer.create({
    data: {
      communityId: community.id,
      userId,
      role: "guest",
      // status will default to "requested" based on your schema default
    },
  });

  return player;
};

export const rejectPlayer = async (communityId, userId, authorizedId) => {
  if (!communityId || !userId || !authorizedId) {
    throw new AppError(
      "Community ID, User ID, and Authorization ID are required",
      400,
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Check if the authorizing user has admin rights in this community
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId,
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

    // 2. Find the target player's join request
    const targetPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
      select: {
        id: true,
        communityId: true,
        userId: true,
        role: true,
        status: true,
        communityPlayer: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!targetPlayer) {
      throw new AppError("Join request not found", 404);
    }

    // 3. Ensure they are actually in a "requested" state
    if (targetPlayer.status !== "requested") {
      throw new AppError(
        `Player request cannot be rejected (Current status: ${targetPlayer.status})`,
        400,
      );
    }

    // 4. Reject by removing the pending community membership record
    await tx.communityPlayer.delete({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
    });

    return { success: true, message: "Join request rejected successfully" };
  });
};

export const acceptPlayerInCommunity = async (
  communityId,
  userId,
  authorizedId,
) => {
  if (!communityId || !userId || !authorizedId) {
    throw new AppError(
      "Community ID, User ID, and Authorization ID are required",
      400,
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Check if the authorizing user has admin rights in this community
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId,
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

    // 2. Find the target player's join request
    const targetPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
    });

    if (!targetPlayer) {
      throw new AppError("Join request not found", 404);
    }

    // Optional: Prevent re-accepting someone who is already accepted
    if (targetPlayer.status !== "requested") {
      throw new AppError(
        `Player is already processed (Current status: ${targetPlayer.status})`,
        400,
      );
    }

    // 3. Update the player's status to accepted/member
    // Note: Change "accepted" to whatever matches your ApplicationStatus enum values
    const updatedPlayer = await tx.communityPlayer.update({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
      data: {
        status: "accepted",
        role: "player", // Upgrading them from "guest" to a standard "player" role
      },
    });

    return updatedPlayer;
  });
};

export const kickPlayerInCommunity = async (
  communityId,
  userId,
  authorizedId,
) => {
  if (!communityId || !userId || !authorizedId) {
    throw new AppError(
      "Community ID, User ID, and Authorization ID are required",
      400,
    );
  }

  // Prevent a user from mistakenly executing a kick command on themselves
  if (userId === authorizedId) {
    throw new AppError(
      "Forbidden: You cannot kick yourself from the community",
      400,
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Check if the authorizing user has admin/owner rights
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId,
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

    // 2. Verify the target member exists in the community
    const targetPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
    });

    if (!targetPlayer) {
      throw new AppError("Community player not found", 404);
    }

    // 3. Security Guardrail: Prevent kicking the community owner
    if (targetPlayer.role === "owner") {
      throw new AppError(
        "Forbidden: The primary community owner cannot be kicked",
        403,
      );
    }

    // 4. Remove the member from the community
    await tx.communityPlayer.delete({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
    });

    return {
      success: true,
      message: "Player kicked from community successfully",
    };
  });
};

export const joinSession = async (communityId, sessionId, userId) => {
  if (!communityId || !sessionId || !userId) {
    throw new AppError(
      "Community ID, Session ID, and User ID are required",
      400,
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Verify the session exists and belongs to this community
    const session = await tx.session.findFirst({
      where: {
        id: sessionId,
        communityId: communityId,
      },
    });

    if (!session) {
      throw new AppError("Session not found within this community", 404);
    }

    // 2. Security Guardrail: Check if the session is open for registration
    if (!session.isAvailable) {
      throw new AppError(
        "This session is currently closed for new player entries",
        400,
      );
    }

    // 3. Find the target user's CommunityPlayer record to get their bridge ID
    const communityPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId: communityId,
          userId: userId,
        },
      },
    });

    // 4. Enforce that only approved community members can join a session
    if (!communityPlayer || communityPlayer.status !== "accepted") {
      throw new AppError(
        "Forbidden: You must be an accepted community member to join this session",
        403,
      );
    }

    // 5. Prevent duplicate entries into the same session
    const existingSessionPlayer = await tx.sessionPlayer.findUnique({
      where: {
        sessionId_playerId: {
          sessionId: sessionId,
          playerId: communityPlayer.id, // 🎯 Matches the bridge ID
        },
      },
    });

    if (existingSessionPlayer) {
      throw new AppError("Player is already registered in this session", 400);
    }

    // 6. Create the registration entry
    const newSessionPlayer = await tx.sessionPlayer.create({
      data: {
        sessionId: sessionId,
        playerId: communityPlayer.id,
        status: "requested",
        requestedAt: new Date(),
      },
      include: {
        sessionPlayer: {
          select: {
            role: true,
            communityPlayer: {
              select: {
                id: true,
                username: true,
                skillLevel: true,
              },
            },
          },
        },
      },
    });

    return newSessionPlayer;
  });
};

export const getRequestedPlayerToJoinSession = async (
  communityId,
  sessionId,
  authorizedId,
) => {
  if (!communityId) throw new AppError("Community ID is required", 400);
  if (!sessionId) throw new AppError("Session ID is required", 400);
  if (!authorizedId) throw new AppError("Authorization ID is required", 400);

  // 1. Authorization check: Ensure the operator belongs to the community and holds admin/host privileges
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
      "Unauthorized: Only community owners, admins, or hosts can view pending session requests.",
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
    throw new AppError("Session not found within this community.", 404);
  }

  // 3. Query all SessionPlayer entries for this session where the registration status is 'requested'
  const requestedPlayers = await prisma.sessionPlayer.findMany({
    where: {
      sessionId: sessionId,
      status: "requested", // 🎯 Filters for pending session join requests
    },
    select: {
      id: true,
      playerId: true,
      status: true,
      // ⬇️ Include the community player relationship bridge data
      sessionPlayer: {
        select: {
          id: true,
          role: true,
          // ⬇️ Include the actual user profile data (username, skill level, type)
          communityPlayer: {
            select: {
              id: true,
              username: true,
              skillLevel: true,
            },
          },
        },
      },
    },
    orderBy: {
      requestedAt: "asc", // Oldest requests first
    },
  });

  return requestedPlayers;
};

export const assignAdmin = async (communityId, userId, authorizedId) => {
  if (!communityId || !userId || !authorizedId) {
    throw new AppError(
      "Community ID, User ID, and Authorization ID are required",
      400,
    );
  }

  // Prevent an owner from running this endpoint on themselves
  if (userId === authorizedId) {
    throw new AppError(
      "Forbidden: You cannot modify your own administrative ownership role",
      400,
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Authorization check: ONLY the primary community owner can promote someone to admin
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: authorizedId,
        },
      },
    });

    if (!authorizedPlayer || authorizedPlayer.role !== "owner") {
      throw new AppError(
        "Forbidden: Only the community owner can assign administrator roles",
        403,
      );
    }

    // 2. Verify the target member exists inside this community
    const targetPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
    });

    if (!targetPlayer) {
      throw new AppError("Target player not found in this community", 404);
    }

    // 3. Ensure the target player is an active member
    if (targetPlayer.status !== "accepted") {
      throw new AppError(
        "Forbidden: Target user must be an approved member before receiving promotions",
        400,
      );
    }

    // 4. Guardrail: Avoid re-promoting an existing admin or owner
    if (targetPlayer.role === "admin" || targetPlayer.role === "owner") {
      throw new AppError(
        `Target player is already an administrative role (${targetPlayer.role})`,
        400,
      );
    }

    // 5. Upgrade the player's role to "admin"
    const updatedPlayer = await tx.communityPlayer.update({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
      data: {
        role: "admin",
      },
      select: {
        id: true,
        communityId: true,
        userId: true,
        role: true,
        status: true,
        communityPlayer: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return updatedPlayer;
  });
};

export const removeAsAdmin = async (communityId, userId, authorizedId) => {
  if (!communityId || !userId || !authorizedId) {
    throw new AppError(
      "Community ID, User ID, and Authorization ID are required",
      400,
    );
  }

  // Prevent an owner from removing their own administrative/owner role
  if (userId === authorizedId) {
    throw new AppError(
      "Forbidden: You cannot modify your own administrative ownership role",
      400,
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Authorization check: ONLY the primary community owner can demote admins
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: authorizedId,
        },
      },
    });

    if (!authorizedPlayer || authorizedPlayer.role !== "owner") {
      throw new AppError(
        "Forbidden: Only the community owner can remove administrator privileges",
        403,
      );
    }

    // 2. Verify the target member exists inside this community
    const targetPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
    });

    if (!targetPlayer) {
      throw new AppError("Target player not found in this community", 404);
    }

    // 3. Ensure they currently hold the "admin" role
    if (targetPlayer.role !== "admin") {
      throw new AppError(
        `Target player is not an admin (Current role: ${targetPlayer.role})`,
        400,
      );
    }

    // 4. Downgrade the player's role back to "player"
    const updatedPlayer = await tx.communityPlayer.update({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
      data: {
        role: "player",
      },
      select: {
        id: true,
        communityId: true,
        userId: true,
        role: true,
        status: true,
        communityPlayer: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return updatedPlayer;
  });
};

export const assignHost = async (
  communityId,
  userId,
  authorizedId,
  sessionId,
) => {
  if (!communityId || !userId || !authorizedId || !sessionId) {
    throw new AppError(
      "Community ID, User ID, Authorization ID, and Session ID are required",
      400,
    );
  }

  // Prevent users from changing their own host assignment via this endpoint
  if (userId === authorizedId) {
    throw new AppError(
      "Forbidden: You cannot modify your own administrative or host role status",
      400,
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Authorization check: Both "owner" and "admin" can assign a host role
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: authorizedId,
        },
      },
    });

    if (!authorizedPlayer) {
      throw new AppError("Forbidden", 403);
    }

    const allowedRoles = ["owner", "admin"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError(
        "Forbidden: Only the community owner or administrators can assign host privileges",
        403,
      );
    }

    // 2. Verify the target session exists inside this community
    const targetSession = await tx.session.findFirst({
      where: {
        id: sessionId,
        communityId,
      },
      select: { id: true },
    });

    if (!targetSession) {
      throw new AppError("Target session not found in this community", 404);
    }

    // 3. Verify the target member exists inside this community
    const targetPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
    });

    if (!targetPlayer) {
      throw new AppError("Target player not found in this community", 404);
    }

    // 4. Ensure the target player is an active, accepted member
    if (targetPlayer.status !== "accepted") {
      throw new AppError(
        "Forbidden: Target user must be an approved member before receiving promotions",
        400,
      );
    }

    // 5. Guardrails: Prevent downgrading protected management roles.
    if (targetPlayer.role === "owner") {
      throw new AppError(
        "Forbidden: Cannot modify the community owner's role",
        403,
      );
    }

    if (targetPlayer.role === "admin") {
      throw new AppError(
        "Target player is already an admin and has host-level access",
        400,
      );
    }

    // 6. Promote regular players to host, then make sure they are in the
    // selected session as an accepted participant.
    const updatedPlayer =
      targetPlayer.role === "host"
        ? targetPlayer
        : await tx.communityPlayer.update({
            where: {
              communityId_userId: {
                communityId,
                userId,
              },
            },
            data: {
              role: "host",
            },
            select: {
              id: true,
              communityId: true,
              userId: true,
              role: true,
              status: true,
              communityPlayer: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          });

    const sessionPlayer = await tx.sessionPlayer.upsert({
      where: {
        sessionId_playerId: {
          sessionId: targetSession.id,
          playerId: updatedPlayer.id,
        },
      },
      update: {
        status: "accepted",
        acceptedBy: authorizedPlayer.id,
        acceptedAt: new Date(),
        isHide: false,
      },
      create: {
        sessionId: targetSession.id,
        playerId: updatedPlayer.id,
        status: "accepted",
        acceptedBy: authorizedPlayer.id,
        acceptedAt: new Date(),
      },
      select: {
        id: true,
        sessionId: true,
        playerId: true,
        status: true,
        acceptedBy: true,
        acceptedAt: true,
      },
    });

    return { player: updatedPlayer, sessionPlayer };
  });
};

export const removeAsHost = async (
  communityId,
  userId,
  authorizedId,
  sessionId,
) => {
  if (!communityId || !userId || !authorizedId || !sessionId) {
    throw new AppError(
      "Community ID, User ID, Authorization ID, and Session ID are required",
      400,
    );
  }

  // Prevent users from changing their own host assignment
  if (userId === authorizedId) {
    throw new AppError(
      "Forbidden: You cannot modify your own administrative or host role status",
      400,
    );
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Authorization check: Both "owner" and "admin" can revoke a host role
    const authorizedPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId: authorizedId,
        },
      },
    });

    if (!authorizedPlayer) {
      throw new AppError("Forbidden", 403);
    }

    const allowedRoles = ["owner", "admin"];
    if (!allowedRoles.includes(authorizedPlayer.role)) {
      throw new AppError(
        "Forbidden: Only the community owner or administrators can revoke host privileges",
        403,
      );
    }

    // 2. Verify the target session exists inside this community
    const targetSession = await tx.session.findFirst({
      where: {
        id: sessionId,
        communityId,
      },
      select: { id: true },
    });

    if (!targetSession) {
      throw new AppError("Target session not found in this community", 404);
    }

    // 3. Verify the target member exists inside this community
    const targetPlayer = await tx.communityPlayer.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
    });

    if (!targetPlayer) {
      throw new AppError("Target player not found in this community", 404);
    }

    // 4. Ensure the target player is actually a host
    if (targetPlayer.role !== "host") {
      throw new AppError(
        `Target player is not a host (Current role: ${targetPlayer.role})`,
        400,
      );
    }

    // 5. Demote the communityPlayer record to a standard "player"
    const updatedPlayer = await tx.communityPlayer.update({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
      data: {
        role: "player",
      },
      select: {
        id: true,
        communityId: true,
        userId: true,
        role: true,
        status: true,
        communityPlayer: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // 6. Optional: Demote their session registration state.
    // If your `sessionPlayer` schema has a session-level role or status that needs resetting,
    // we can update it or delete the entry. Here, we'll keep them in the session as a regular accepted player.
    const updatedSessionPlayer = await tx.sessionPlayer.updateMany({
      where: {
        sessionId: targetSession.id,
        playerId: updatedPlayer.id,
      },
      data: {
        status: "accepted", // Ensuring they remain inside the session roster, just no longer with host privileges
      },
    });

    return { player: updatedPlayer, updatedSessionPlayer };
  });
};
