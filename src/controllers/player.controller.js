import { AppError } from "../libs/errorHandle.js";
import {
  createStaticPlayers,
  deleteStaticPlayer,
  getAllPlayers,
  getPlayerById,
  requestToJoinCommunity,
  updateStaticPlayer,
} from "../services/player.service.js";

export const getAllPlayersController = async (request, response) => {
  try {
    const { communityId } = request.params;
    const { type } = request.query;
    const player = await getAllPlayers(communityId, type);
    return response.status(200).json({ success: true, player });
  } catch (error) {
    console.error("Get all players failed", error);

    let statusCode = 500;
    let message = "Internal server error";

    if (error instanceof AppError) {
      statusCode = error.statusCode || 400;
      message = error.message;
    }

    return response.status(statusCode).json({ success: false, message });
  }
};

export const getPlayerByIdController = async (request, response) => {
  try {
    const { communityId, playerId } = request.params;
    const player = await getPlayerById(communityId, playerId);
    return response.status(200).json({ success: true, player });
  } catch (error) {
    console.error("Get player failed", error);

    let statusCode = 500;
    let message = "Internal server error";

    if (error instanceof AppError) {
      statusCode = error.statusCode || 400;
      message = error.message;
    }

    return response.status(statusCode).json({ success: false, message });
  }
};

export const createStaticPlayersController = async (request, response) => {
  try {
    const { communityId } = request.params;
    const { usernames, skillLevel } = request.body;
    const players = await createStaticPlayers(
      communityId,
      usernames,
      skillLevel,
      request.user.sub,
    );
    return response.status(201).json({ success: true, players });
  } catch (error) {
    console.error("Create static player failed", error);

    let statusCode = 500;
    let message = "Internal server error";

    if (error instanceof AppError) {
      statusCode = error.statusCode || 400;
      message = error.message;
    }

    return response.status(statusCode).json({ success: false, message });
  }
};

export const updateStaticPlayerController = async (request, response) => {
  try {
    const { communityId, userId } = request.params;
    const { username, skillLevel } = request.body;
    const player = await updateStaticPlayer(
      communityId,
      userId,
      request.user.sub,
      username,
      skillLevel,
    );
    return response.status(200).json({ success: true, player });
  } catch (error) {
    console.error("Update static player failed", error);

    let statusCode = 500;
    let message = "Internal server error";

    if (error instanceof AppError) {
      statusCode = error.statusCode || 400;
      message = error.message;
    }

    return response.status(statusCode).json({ success: false, message });
  }
};

export const deleteStaticPlayerController = async (request, response) => {
  try {
    const { communityId, userId } = request.params;
    await deleteStaticPlayer(communityId, userId, request.user.sub);
    return response.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete static player failed", error);

    let statusCode = 500;
    let message = "Internal server error";

    if (error instanceof AppError) {
      statusCode = error.statusCode || 400;
      message = error.message;
    }

    return response.status(statusCode).json({ success: false, message });
  }
};

export const requestToJoinCommunityController = async (request, response) => {
  try {
    const { communityId, userId } = request.params;
    await requestToJoinCommunity(communityId, userId);
    return response.status(200).json({ success: true });
  } catch (error) {
    console.error("Request to join community failed", error);

    let statusCode = 500;
    let message = "Internal server error";

    if (error instanceof AppError) {
      statusCode = error.statusCode || 400;
      message = error.message;
    }

    return response.status(statusCode).json({ success: false, message });
  }
};
