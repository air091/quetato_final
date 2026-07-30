import { request, response } from "express";
import {
  acceptPlayer,
  getAllSessionPlayers,
  getSessionPlayerAccess,
  hideAuthorizedPlayerInSession,
  removePlayerFromSession,
  unhideAuthorizedPlayerInSession,
} from "../services/sessionPlayer.service.js";
import { AppError } from "../libs/errorHandle.js";
import { getStaticPlayerNotInSession } from "../services/player.service.js";

export const getAllSessionPlayersController = async (request, response) => {
  try {
    const { communityId, sessionId } = request.params;
    const [players, access] = await Promise.all([
      getAllSessionPlayers(communityId, sessionId, request.user.sub),
      getSessionPlayerAccess(communityId, request.user.sub),
    ]);

    return response.status(200).json({ success: true, players, ...access });
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

export const getStaticPlayerNotInSessionController = async (
  request,
  response,
) => {
  try {
    const { communityId, sessionId } = request.params;
    const queryFilters = {
      page: request.query.page,
      limit: request.query.limit,
      search: request.query.search,
      sort: request.query.sort,
    };

    const { results, pagination } = await getStaticPlayerNotInSession(
      communityId,
      sessionId,
      request.user.sub,
      queryFilters,
    );

    return response.status(200).json({ success: true, results, pagination });
  } catch (error) {
    console.error("Get static session players failed", error);
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
    const { communityId, sessionId, communityPlayerId } = request.params;

    const player = await acceptPlayer(
      communityId,
      sessionId,
      communityPlayerId,
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

export const hideAuthorizedPlayerInSessionController = async (
  request,
  response,
) => {
  try {
    const { communityId, sessionId, sessionPlayerId } = request.params;
    const result = await hideAuthorizedPlayerInSession(
      communityId,
      sessionId,
      sessionPlayerId,
      request.user.sub,
    );
    return response.status(200).json({ success: true, result });
  } catch (error) {
    console.error("Hide authorized player in session failed", error);
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

export const unhideAuthorizedPlayerInSessionController = async (
  request,
  response,
) => {
  try {
    const { communityId, sessionId, sessionPlayerId } = request.params;
    const result = await unhideAuthorizedPlayerInSession(
      communityId,
      sessionId,
      sessionPlayerId,
      request.user.sub,
    );
    return response.status(200).json({ success: true, result });
  } catch (error) {
    console.error("Unhide authorized player in session failed", error);
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

export const removePlayerFromSessionController = async (request, response) => {
  try {
    const { communityId, sessionId, sessionPlayerId } = request.params;
    const result = await removePlayerFromSession(
      communityId,
      sessionId,
      sessionPlayerId,
      request.user.sub,
    );
    return response.status(200).json({ success: true });
  } catch (error) {
    console.error("Remove player from session failed", error);
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
