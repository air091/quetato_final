import { AppError } from "../libs/errorHandle.js";
import { prisma } from "../libs/prisma.js";

const toFeeNumber = (value, fieldName) => {
  if (value === undefined) return undefined;

  const fee = Number(value);

  if (!Number.isFinite(fee) || fee < 0) {
    throw new AppError(`${fieldName} must be a valid non-negative number`, 400);
  }

  return fee;
};

const assertPricingManager = async (communityId, sessionId, authorizedId) => {
  const authorizedMember = await prisma.sessionPlayer.findFirst({
    where: {
      sessionId,
      sessionPlayer: { communityId, userId: authorizedId },
    },
    select: {
      isHost: true,
      sessionPlayer: { select: { role: true } },
    },
  });

  if (!authorizedMember) {
    throw new AppError("You are not a member of this community", 403);
  }

  const allowedRoles = ["owner", "admin"];
  if (
    !allowedRoles.includes(authorizedMember.sessionPlayer.role) &&
    !authorizedMember.isHost
  ) {
    throw new AppError(
      "Unauthorized. Only owners, admins, or hosts can manage pricing.",
      403,
    );
  }

  return authorizedMember;
};

// add pricing
export const addPricing = async (
  communityId,
  sessionId,
  authorizedId,
  pricingData,
) => {
  // 1. Validate required ID parameters
  if (!communityId || !sessionId || !authorizedId) {
    throw new AppError(
      "Community ID, Session ID, and Authorized User ID are required",
      400,
    );
  }

  const { entranceFee, perGameFee, currency } = pricingData || {};
  const requestedEntranceFee = toFeeNumber(entranceFee, "Entrance fee");
  const requestedPerGameFee = toFeeNumber(perGameFee, "Per-game fee");

  // 2. Check authorization: User must be an owner, admin, or host in the community
  await assertPricingManager(communityId, sessionId, authorizedId);

  // 3. Verify that the session actually belongs to this community
  const sessionExists = await prisma.session.findFirst({
    where: {
      id: sessionId,
      communityId: communityId,
    },
  });

  if (!sessionExists) {
    throw new AppError("Session not found in this community", 404);
  }

  // 4. Upsert (Create or Update) the pricing record for the session.
  const existingPricing = await prisma.pricing.findFirst({
    where: { sessionId },
  });

  const effectiveEntranceFee =
    requestedEntranceFee !== undefined
      ? requestedEntranceFee
      : Number(existingPricing?.entranceFee || 0);
  const effectivePerGameFee =
    requestedPerGameFee !== undefined
      ? requestedPerGameFee
      : Number(existingPricing?.perGameFee || 0);

  const sessionPlayers = await prisma.sessionPlayer.findMany({
    where: {
      sessionId,
      status: "accepted",
      isHide: false,
    },
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
  });

  const sessionPlayerIds = sessionPlayers.map((player) => player.id);

  const gameRecords =
    sessionPlayerIds.length > 0
      ? await prisma.matchHistoryPlayer.findMany({
          where: {
            sessionPlayerId: {
              in: sessionPlayerIds,
            },
            matchHistory: {
              sessionId,
            },
          },
          select: {
            sessionPlayerId: true,
          },
        })
      : [];

  const gamesBySessionPlayerId = new Map();

  gameRecords.forEach((record) => {
    gamesBySessionPlayerId.set(
      record.sessionPlayerId,
      (gamesBySessionPlayerId.get(record.sessionPlayerId) || 0) + 1,
    );
  });

  const playerFees = sessionPlayers.map((player) => {
    const totalGames = gamesBySessionPlayerId.get(player.id) || 0;

    return {
      sessionPlayerId: player.id,
      username:
        player.sessionPlayer?.communityPlayer?.username || "Unknown Player",
      totalGames,
      totalFee: effectiveEntranceFee + totalGames * effectivePerGameFee,
    };
  });

  const totalFee = playerFees.reduce(
    (sum, playerFee) => sum + playerFee.totalFee,
    0,
  );

  let pricingRecord;

  if (existingPricing) {
    pricingRecord = await prisma.pricing.update({
      where: { id: existingPricing.id },
      data: {
        entranceFee:
          requestedEntranceFee !== undefined
            ? requestedEntranceFee
            : existingPricing.entranceFee,
        perGameFee:
          requestedPerGameFee !== undefined
            ? requestedPerGameFee
            : existingPricing.perGameFee,
        currency: currency || existingPricing.currency,
        totalFee,
      },
    });
  } else {
    pricingRecord = await prisma.pricing.create({
      data: {
        sessionId,
        entranceFee: requestedEntranceFee ?? 0.0,
        perGameFee: requestedPerGameFee ?? 0.0,
        currency: currency || "PHP",
        totalFee,
      },
    });
  }

  return {
    success: true,
    message: existingPricing
      ? "Pricing configuration updated successfully"
      : "Pricing configuration added successfully",
    pricing: pricingRecord,
    breakdown: {
      playerCount: sessionPlayers.length,
      totalPlayerGames: gameRecords.length,
      playerFees,
    },
  };
};

// mark player as paid
export const markPlayerAsPaid = async (
  communityId,
  sessionId,
  sessionPlayerId,
  authorizedId,
) => {
  if (!communityId || !sessionId || !sessionPlayerId || !authorizedId) {
    throw new AppError(
      "Community ID, Session ID, Session Player ID, and Authorized User ID are required",
      400,
    );
  }

  await assertPricingManager(communityId, sessionId, authorizedId);

  const targetPlayer = await prisma.sessionPlayer.findFirst({
    where: {
      id: sessionPlayerId,
      sessionId,
      session: {
        communityId,
      },
    },
    select: {
      id: true,
      gameStatus: true,
    },
  });

  if (!targetPlayer) {
    throw new AppError("Session player not found in this session", 404);
  }

  if (targetPlayer.gameStatus === "paid") {
    return {
      success: true,
      message: "Player is already marked as paid",
      player: targetPlayer,
    };
  }

  const player = await prisma.sessionPlayer.update({
    where: { id: sessionPlayerId },
    data: {
      gameStatus: "paid",
      updateStatus: new Date(),
    },
    select: {
      id: true,
      gameStatus: true,
      updateStatus: true,
      sessionPlayer: {
        select: {
          communityPlayer: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
    },
  });

  return {
    success: true,
    message: "Player marked as paid",
    pointsAdded: 3,
    player,
  };
};

export const unmarkPlayerAsPaid = async (
  communityId,
  sessionId,
  sessionPlayerId,
  authorizedId,
) => {
  if (!communityId || !sessionId || !sessionPlayerId || !authorizedId) {
    throw new AppError(
      "Community ID, Session ID, Session Player ID, and Authorized User ID are required",
      400,
    );
  }

  await assertPricingManager(communityId, sessionId, authorizedId);

  const targetPlayer = await prisma.sessionPlayer.findFirst({
    where: {
      id: sessionPlayerId,
      sessionId,
      session: {
        communityId,
      },
    },
    select: {
      id: true,
      gameStatus: true,
    },
  });

  if (!targetPlayer) {
    throw new AppError("Session player not found in this session", 404);
  }

  if (targetPlayer.gameStatus !== "paid") {
    return {
      success: true,
      message: "Player is not marked as paid",
      player: targetPlayer,
    };
  }

  const player = await prisma.sessionPlayer.update({
    where: { id: sessionPlayerId },
    data: {
      gameStatus: "waiting",
    },
    select: {
      id: true,
      gameStatus: true,
      updateStatus: true,
      sessionPlayer: {
        select: {
          communityPlayer: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
    },
  });

  return {
    success: true,
    message: "Player unmarked as paid",
    pointsRemoved: 3,
    player,
  };
};
