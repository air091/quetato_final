import { AppError } from "../libs/errorHandle.js";
import {
  addPricing,
  markPlayerAsPaid,
  unmarkPlayerAsPaid,
} from "../services/pricing.service.js";

export const addPricingController = async (request, response) => {
  try {
    const { communityId, sessionId } = request.params;
    const { entranceFee, perGameFee, currency } = request.body;

    const result = await addPricing(communityId, sessionId, request.user.sub, {
      entranceFee,
      perGameFee,
      currency,
    });

    return response.status(200).json({ success: true, result });
  } catch (error) {
    console.error("Add session price failed", error);
    let errMessage = "Internal server error";
    let statusCode = 500;

    if (error instanceof AppError) {
      errMessage = error.message;
      statusCode = error.statusCode;
    }

    return response
      .status(statusCode)
      .json({ success: false, message: errMessage });
  }
};

export const markPlayerAsPaidController = async (request, response) => {
  try {
    const { communityId, sessionId, sessionPlayerId } = request.params;
    const result = await markPlayerAsPaid(
      communityId,
      sessionId,
      sessionPlayerId,
      request.user.sub,
    );

    return response.status(200).json({ success: true, result });
  } catch (error) {
    console.error("Mark player as paid failed", error);
    let errMessage = "Internal server error";
    let statusCode = 500;

    if (error instanceof AppError) {
      errMessage = error.message;
      statusCode = error.statusCode;
    }

    return response
      .status(statusCode)
      .json({ success: false, message: errMessage });
  }
};

export const unmarkPlayerAsPaidController = async (request, response) => {
  try {
    const { communityId, sessionId, sessionPlayerId } = request.params;
    const result = await unmarkPlayerAsPaid(
      communityId,
      sessionId,
      sessionPlayerId,
      request.user.sub,
    );

    return response.status(200).json({ success: true, result });
  } catch (error) {
    console.error("Unmark player as paid failed", error);
    let errMessage = "Internal server error";
    let statusCode = 500;

    if (error instanceof AppError) {
      errMessage = error.message;
      statusCode = error.statusCode;
    }

    return response
      .status(statusCode)
      .json({ success: false, message: errMessage });
  }
};
