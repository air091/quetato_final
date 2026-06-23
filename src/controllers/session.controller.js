import { request, response } from "express";
import { AppError } from "../libs/errorHandle.js";
import {
  createSession,
  deleteSession,
  getAllSessions,
  getSessionById,
  updateSession,
} from "../services/session.service.js";

export const getAllSessionsController = async (request, response) => {
  try {
    const { communityId } = request.params;
    const sessions = await getAllSessions(communityId);
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
    const { name, location } = request.body;
    const session = await createSession(
      communityId,
      name,
      location,
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

  export const updateSessionController = async (request, response) => {
    try {
      const { communityId, sessionId } = request.params;
      const { name, location } = request.body;
      const session = await updateSession(
        communityId,
        sessionId,
        name,
        location,
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
};
