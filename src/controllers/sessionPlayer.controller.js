import { request, response } from "express";
import { acceptPlayer } from "../services/sessionPlayer.service.js";

export const acceptPlayerController = async (request, response) => {
  try {
    const { communityId, sessionId, playerId } = request.params;

    const player = await acceptPlayer(
      communityId,
      sessionId,
      playerId,
      request.user.sub,
    );

    return response.status(201).json({ success: true, player });
  } catch (error) {
    console.error("Accept player failed", error);
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
