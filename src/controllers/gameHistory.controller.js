import { AppError } from "../libs/errorHandle.js";
import {
  getPlayerGameHistory,
  getPlayerTotalCommunityGames,
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

export const getPlayerTotalCommunityGamesController = async (
  request,
  response,
) => {
  try {
    const { communityId } = request.params;
    const results = await getPlayerTotalCommunityGames(communityId);
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
