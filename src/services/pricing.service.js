import { AppError } from "../libs/errorHandle.js";

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

  // 4. Upsert (Create or Update) the pricing record for the session
  // Since Pricing relates 1-to-1 or 1-to-many with session, we check if one exists first.
  const existingPricing = await prisma.pricing.findFirst({
    where: { sessionId },
  });

  let pricingRecord;

  if (existingPricing) {
    pricingRecord = await prisma.pricing.update({
      where: { id: existingPricing.id },
      data: {
        entranceFee:
          entranceFee !== undefined ? entranceFee : existingPricing.entranceFee,
        perGameFee:
          perGameFee !== undefined ? perGameFee : existingPricing.perGameFee,
        currency: currency || existingPricing.currency,
      },
    });
  } else {
    pricingRecord = await prisma.pricing.create({
      data: {
        sessionId,
        entranceFee: entranceFee ?? 0.0,
        perGameFee: perGameFee ?? 0.0,
        currency: currency || "PHP",
      },
    });
  }

  return {
    success: true,
    message: existingPricing
      ? "Pricing configuration updated successfully"
      : "Pricing configuration added successfully",
    pricing: pricingRecord,
  };
};
