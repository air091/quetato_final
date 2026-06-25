import { request, response } from "express";
import {
  acceptPlayer,
  getAllSessionPlayers,
} from "../services/sessionPlayer.service.js";
import { AppError } from "../libs/errorHandle.js";

export const getAllSessionPlayersController = async (request, response) => {
  try {
    const { communityId, sessionId } = request.params;
    const players = await getAllSessionPlayers(communityId, sessionId);

    return response.status(200).json({ success: true, players });
  } catch (error) {
    console.error("Get all session players failed", error);
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
