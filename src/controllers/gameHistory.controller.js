import { AppError } from "../libs/errorHandle.js";
import { getPlayerGameHistory } from "../services/matchHistory.service.js";

export const getPlayerGameHistoryController = async (request, response) => {
  try {
    const { sessionPlayerId } = request.params;
    const results = await getPlayerGameHistory(sessionPlayerId);
    return response.status(200).json({ success: true, results });
  } catch (error) {
    console.error("Get all communities failed", error);
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

// TODO: IMPLEMENT PLAYER GAME HISTORY IN CLIENT
