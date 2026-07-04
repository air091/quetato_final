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
  const authorizedMember = await prisma.communityPlayer.findUnique({
    where: {
      communityId_userId: {
        communityId,
        userId: authorizedId,
      },
    },
    select: {
      role: true,
    },
  });

  if (!authorizedMember) {
    throw new AppError("You are not a member of this community", 403);
  }

  const allowedRoles = ["owner", "admin", "host"];
  if (!allowedRoles.includes(authorizedMember.role)) {
    throw new AppError(
      "Unauthorized. Only owners, admins, or hosts can configure pricing.",
      403,
    );
  }

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
