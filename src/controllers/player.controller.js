import { request } from "express";
import { AppError } from "../libs/errorHandle.js";
import {
  acceptPlayerInCommunity,
  assignAdmin,
  assignHost,
  createStaticPlayers,
  deleteStaticPlayer,
  getAllPlayers,
  getAllRequestPlayers,
  getPlayerById,
  getRequestedPlayerToJoinSession,
  joinCommunity,
  joinSession,
  kickPlayerInCommunity,
  rejectPlayer,
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

export const getAllRequestPlayersController = async (request, response) => {
  try {
    const { communityId } = request.params;
    const results = await getAllRequestPlayers(communityId, request.user.sub);
    return response.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Get all requested players failed", error);

    let statusCode = 500;
    let message = "Internal server error";

    if (error instanceof AppError) {
      statusCode = error.statusCode || 400;
      message = error.message;
    }

    return response.status(statusCode).json({ success: false, message });
  }
};

export const rejectPlayerController = async (request, response) => {
  try {
    const { communityId, userId } = request.params;
    await rejectPlayer(communityId, userId, request.user.sub);
    return response.status(201).json({ success: true });
  } catch (error) {
    console.error("Reject requested player failed", error);

    let statusCode = 500;
    let message = "Internal server error";

    if (error instanceof AppError) {
      statusCode = error.statusCode || 400;
      message = error.message;
    }

    return response.status(statusCode).json({ success: false, message });
  }
};

export const joinCommunityController = async (request, response) => {
  try {
    const { communityId } = request.params;
    await joinCommunity(communityId, request.user.sub);
    return response.status(201).json({ success: true });
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

export const acceptPlayerInCommunityController = async (request, response) => {
  try {
    const { communityId, userId } = request.params;
    await acceptPlayerInCommunity(communityId, userId, request.user.sub);
    return response.status(200).json({ success: true });
  } catch (error) {
    console.error("Accept player to community failed", error);

    let statusCode = 500;
    let message = "Internal server error";

    if (error instanceof AppError) {
      statusCode = error.statusCode || 400;
      message = error.message;
    }

    return response.status(statusCode).json({ success: false, message });
  }
};

export const kickPlayerInCommunityController = async (request, response) => {
  try {
    const { communityId, userId } = request.params;
    await kickPlayerInCommunity(communityId, userId, request.user.sub);
    return response.status(200).json({ success: true });
  } catch (error) {
    console.error("Kick player to community failed", error);

    let statusCode = 500;
    let message = "Internal server error";

    if (error instanceof AppError) {
      statusCode = error.statusCode || 400;
      message = error.message;
    }

    return response.status(statusCode).json({ success: false, message });
  }
};

export const joinSessionController = async (request, response) => {
  try {
    const { communityId, sessionId } = request.params;
    await joinSession(communityId, sessionId, request.user.sub);
    return response.status(200).json({ success: true });
  } catch (error) {
    console.error("Join session failed", error);

    let statusCode = 500;
    let message = "Internal server error";

    if (error instanceof AppError) {
      statusCode = error.statusCode || 400;
      message = error.message;
    }

    return response.status(statusCode).json({ success: false, message });
  }
};

export const getRequestedPlayerToJoinSessionController = async (
  request,
  response,
) => {
  try {
    const { communityId, sessionId } = request.params;
    const results = await getRequestedPlayerToJoinSession(
      communityId,
      sessionId,
      request.user.sub,
    );
    return response.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Get requested players not in session failed", error);

    let statusCode = 500;
    let message = "Internal server error";

    if (error instanceof AppError) {
      statusCode = error.statusCode || 400;
      message = error.message;
    }

    return response.status(statusCode).json({ success: false, message });
  }
};

export const assignAdminController = async (request, response) => {
  try {
    const { communityId, userId } = request.params;
    const result = await assignAdmin(communityId, userId, request.user.sub);
    return response.status(200).json({ success: true, result });
  } catch (error) {
    console.error("Assign community player as admin failed", error);

    let statusCode = 500;
    let message = "Internal server error";

    if (error instanceof AppError) {
      statusCode = error.statusCode || 400;
      message = error.message;
    }

    return response.status(statusCode).json({ success: false, message });
  }
};

export const assignHostController = async (request, response) => {
  try {
    const { communityId, userId } = request.params;
    const result = await assignHost(communityId, userId, request.user.sub);
    return response.status(200).json({ success: true, result });
  } catch (error) {
    console.error("Assign community player as admin failed", error);

    let statusCode = 500;
    let message = "Internal server error";

    if (error instanceof AppError) {
      statusCode = error.statusCode || 400;
      message = error.message;
    }

    return response.status(statusCode).json({ success: false, message });
  }
};
