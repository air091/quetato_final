import { request, response } from "express";
import { AppError } from "../libs/errorHandle.js";
import {
  createSession,
  deleteSession,
  endSession,
  getAllPublicSessions,
  getAllSessions,
  getSessionById,
  getSessionDashboard,
  startSession,
  updateSession,
} from "../services/session.service.js";
import { createGame } from "../services/game.service.js";

export const getAllPublicSessionsController = async (request, response) => {
  try {
    const sessions = await getAllPublicSessions();
    return response.status(200).json({ success: true, sessions });
  } catch (error) {
    console.error("Get all public sessions failed", error);
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

export const getAllSessionsController = async (request, response) => {
  try {
    const { communityId } = request.params;
    // Extract search along with your existing filters
    const { status, sortBy, order, search } = request.query;

    const sessions = await getAllSessions(communityId, {
      status,
      sortBy,
      order,
      search,
    });

    return response.status(200).json({ success: true, sessions });
  } catch (error) {
    console.error("Get all sessions failed", error);
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

export const getSessionByIdController = async (request, response) => {
  try {
    const { communityId } = request.params;
    const { sessionId } = request.params;
    const session = await getSessionById(communityId, sessionId);
    return response.status(200).json({ success: true, session });
  } catch (error) {
    console.error("Get session failed", error);
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

export const createSessionController = async (request, response) => {
  try {
    const { communityId } = request.params;
    const { name, sport, description, location, startAt, endAt } = request.body;
    const session = await createSession(
      communityId,
      name,
      sport,
      description,
      location,
      startAt,
      endAt,
      request.user.sub,
    );
    return response.status(200).json({ success: true, session });
  } catch (error) {
    console.error("Create session failed", error);
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

export const updateSessionController = async (request, response) => {
  try {
    const { communityId, sessionId } = request.params;
    const { name, description, location, startAt, endAt } = request.body;
    const session = await updateSession(
      communityId,
      sessionId,
      name,
      description,
      location,
      startAt,
      endAt,
      request.user.sub,
    );
    return response.status(200).json({ success: true, session });
  } catch (error) {
    console.error("Update session failed", error);
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

export const startSessionController = async (request, response) => {
  try {
    const { communityId, sessionId } = request.params;

    const session = await startSession(
      communityId,
      sessionId,
      request.user.sub,
    );

    return response.status(200).json({ success: true, session });
  } catch (error) {
    console.error("Start session failed", error);
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

export const endSessionController = async (request, response) => {
  try {
    const { communityId, sessionId } = request.params;

    const session = await endSession(communityId, sessionId, request.user.sub);

    return response.status(200).json({ success: true, session });
  } catch (error) {
    console.error("End session failed", error);
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

export const deleteSessionController = async (request, response) => {
  try {
    const { communityId, sessionId } = request.params;

    await deleteSession(communityId, sessionId, request.user.sub);

    return response.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete session failed", error);
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

export const sessionDashboardController = async (request, response) => {
  try {
    const { communityId, sessionId } = request.params;
    const dashboard = await getSessionDashboard(communityId, sessionId);
    return response.status(200).json({ success: true, dashboard });
  } catch (error) {
    console.error("Session dashboard failed", error);
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

export const createGameController = async (request, response) => {
  try {
    const { communityId, sessionId } = request.params;
    const { name, type } = request.body;

    const newCourt = await createGame(
      communityId,
      sessionId,
      name,
      type,
      request.user.sub,
    );

    return response.status(201).json({ success: true, newCourt });
  } catch (error) {
    console.error("Create court failed", error);
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
