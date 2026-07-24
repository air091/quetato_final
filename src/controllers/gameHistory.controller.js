import { AppError } from "../libs/errorHandle.js";
import {
  addManualPoints,
  deleteMatchHistory,
  getCommunityPlayerHistory,
  getPlayerGameHistory,
  getPlayerTotalCommunityGames,
  transferCommunityPlayerGames,
  transferPlayerGames,
} from "../services/matchHistory.service.js";

export const getPlayerGameHistoryController = async (request, response) => {
  try {
    const { sessionPlayerId } = request.params;
    const results = await getPlayerGameHistory(sessionPlayerId);
    return response.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Get player session game history failed", error);
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

export const getCommunityPlayerHistoryController = async (
  request,
  response,
) => {
  try {
    const { communityId, communityPlayerId } = request.params;
    const results = await getCommunityPlayerHistory(
      communityId,
      communityPlayerId,
    );
    return response.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Get community player history failed", error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message =
      error instanceof AppError ? error.message : "Internal server error";
    return response.status(statusCode).json({ success: false, message });
  }
};

export const getPlayerTotalCommunityGamesController = async (
  request,
  response,
) => {
  try {
    const { communityId } = request.params;

    // Pass request.query (contains month, day, dayOfWeek) to the service
    const results = await getPlayerTotalCommunityGames(
      communityId,
      request.query,
    );

    return response.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Get player total community games failed", error);
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

export const deleteMatchHistoryController = async (request, response) => {
  try {
    const { communityId, sessionId, sessionPlayerId, matchHistoryId } =
      request.params;

    const results = await deleteMatchHistory(
      communityId,
      sessionId,
      sessionPlayerId,
      matchHistoryId,
      request.user?.sub,
    );

    return response.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Delete match history failed", error);
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

export const transferPlayerGamesController = async (request, response) => {
  try {
    const { communityId, sessionId, sessionPlayerId } = request.params;
    const { targetCommunityPlayerId, matchHistoryIds } = request.body;
    const authorizedUserId = request.user?.sub;

    const result = await transferPlayerGames({
      communityId,
      sessionId,
      sourceSessionPlayerId: sessionPlayerId,
      targetCommunityPlayerId,
      matchHistoryIds,
      authorizedUserId,
    });

    return response.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Delete match history failed", error);
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

export const transferCommunityPlayerGamesController = async (
  request,
  response,
) => {
  try {
    const { communityId, communityPlayerId } = request.params;
    const { targetCommunityPlayerId, matchHistoryIds } = request.body;
    const authorizedUserId = request.user?.sub;

    const result = await transferCommunityPlayerGames({
      communityId,
      sourceCommunityPlayerId: communityPlayerId,
      targetCommunityPlayerId,
      matchHistoryIds,
      authorizedUserId,
    });

    return response.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Transfer community player games failed", error);
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

export const addManualPointsController = async (request, response) => {
  try {
    const { communityId, communityPlayerId } = request.params;
    const { points, description } = request.body;
    const authorizedUserId = request.user?.sub;

    const result = await addManualPoints({
      communityId,
      communityPlayerId,
      points,
      description,
      authorizedUserId,
    });

    return response.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Add manual points failed", error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message =
      error instanceof AppError ? error.message : "Internal server error";
    return response.status(statusCode).json({ success: false, message });
  }
};
