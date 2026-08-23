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
import {
  assignPlayerToSlot,
  createMatchCourt,
  createQueueCourt,
  deleteMatchCourt,
  deleteQueueCourt,
  endMatchCourt,
  getAllCourts,
  pauseMatchCourt,
  removePlayerFromSlot,
  startMatchCourt,
  transferQueueToMatch,
  updateMatchCourtName,
  updateQueueCourtName,
  updateQueueCourtToMatch,
  updateVolleyballScore,
} from "../services/game.service.js";

export const getAllPublicSessionsController = async (request, response) => {
  try {
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 10;

    const result = await getAllPublicSessions(page, limit);
    return response.status(200).json({ success: true, ...result });
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
    const { status, sport, sortBy, order, search, page, limit } = request.query;

    const result = await getAllSessions(communityId, {
      status,
      sport,
      sortBy,
      order,
      search,
      page,
      limit,
    });

    return response.status(200).json({
      success: true,
      sessions: result.sessions,
      pagination: result.pagination,
    });
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

// SESSION GAME

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

export const getAllCourtsController = async (request, response) => {
  try {
    const { sessionId } = request.params;
    const { type } = request.query;
    const courts = await getAllCourts(sessionId, type);

    return response.status(200).json({ success: true, courts });
  } catch (error) {
    console.error("Get all courts failed", error);
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

export const createMatchCourtController = async (request, response) => {
  try {
    const { communityId, sessionId } = request.params;
    const { name } = request.body;

    const court = await createMatchCourt(
      communityId,
      sessionId,
      name,
      request.user.sub,
    );

    return response.status(201).json({ success: true, court });
  } catch (error) {
    console.error("Create match court failed", error);
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

export const updateMatchCourtNameController = async (request, response) => {
  try {
    const { communityId, sessionId, courtId } = request.params;
    const { name } = request.body;

    const court = await updateMatchCourtName(
      communityId,
      sessionId,
      courtId,
      name,
      request.user.sub,
    );

    return response.status(200).json({ success: true, court });
  } catch (error) {
    console.error("Update match court name failed", error);
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

export const deleteMatchCourtController = async (request, response) => {
  try {
    const { communityId, sessionId, courtId } = request.params;

    const court = await deleteMatchCourt(
      communityId,
      sessionId,
      courtId,
      request.user.sub,
    );

    return response.status(204).json({ success: true });
  } catch (error) {
    console.error("Delete match court failed", error);
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

export const createQueueCourtController = async (request, response) => {
  try {
    const { communityId, sessionId } = request.params;
    const { name } = request.body;

    const court = await createQueueCourt(
      communityId,
      sessionId,
      name,
      request.user.sub,
    );

    return response.status(201).json({ success: true, court });
  } catch (error) {
    console.error("Queue match court failed", error);
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

export const updateQueueCourtNameController = async (request, response) => {
  try {
    const { communityId, sessionId, courtId } = request.params;
    const { name } = request.body;

    const court = await updateQueueCourtName(
      communityId,
      sessionId,
      courtId,
      name,
      request.user.sub,
    );

    return response.status(200).json({ success: true, court });
  } catch (error) {
    console.error("Update queue court name failed", error);
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

export const deleteQueueCourtController = async (request, response) => {
  try {
    const { communityId, sessionId, courtId } = request.params;

    const court = await deleteQueueCourt(
      communityId,
      sessionId,
      courtId,
      request.user.sub,
    );

    return response.status(204).json({ success: true });
  } catch (error) {
    console.error("Delete queue court failed", error);
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

export const updateQueueCourtToMatchController = async (request, response) => {
  try {
    const { communityId, sessionId, courtId } = request.params;

    const court = await updateQueueCourtToMatch(
      communityId,
      sessionId,
      courtId,
      request.user.sub,
    );

    return response.status(200).json({ success: true, court });
  } catch (error) {
    console.error("Update queue to match court failed", error);
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

export const assignPlayerToSlotController = async (request, response) => {
  try {
    const { communityId, sessionId } = request.params;
    const { courtId, sessionPlayerId, position } = request.body;
    const authorizedId = request.user.id;

    const updatedSlotsState = await assignPlayerToSlot(
      communityId,
      sessionId,
      courtId,
      sessionPlayerId,
      Number(position),
      request.user.sub,
    );

    return response.status(201).json({ success: true, updatedSlotsState });
  } catch (error) {
    console.error("Assign player to slot failed", error);
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

export const removePlayerFromSlotController = async (request, response) => {
  try {
    const { communityId, sessionId, courtId, slotId } = request.params;

    const court = await removePlayerFromSlot(
      communityId,
      sessionId,
      courtId,
      slotId,
      request.user.sub,
    );

    return response.status(204).json({ success: true });
  } catch (error) {
    console.error("Remove player from slot failed", error);
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

export const transferQueueToMatchController = async (request, response) => {
  try {
    const { communityId, sessionId } = request.params;
    const { queueCourtId } = request.body;

    const result = await transferQueueToMatch(
      communityId,
      sessionId,
      queueCourtId,
      request.user.sub,
    );

    return response.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Remove player from slot failed", error);
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

export const startMatchCourtController = async (request, response) => {
  try {
    const { communityId, sessionId, courtId } = request.params;

    const result = await startMatchCourt(
      communityId,
      sessionId,
      courtId,
      request.user.sub,
    );

    return response.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Start match court failed", error);
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

export const pauseMatchCourtController = async (request, response) => {
  try {
    const { communityId, sessionId, courtId } = request.params;

    const result = await pauseMatchCourt(
      communityId,
      sessionId,
      courtId,
      request.user.sub,
    );

    return response.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Start match court failed", error);
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

export const endMatchCourtController = async (request, response) => {
  try {
    const { communityId, sessionId, courtId } = request.params;
    const { winningTeam } = request.body;

    const result = await endMatchCourt(
      communityId,
      sessionId,
      courtId,
      request.user.sub,
      winningTeam,
    );

    return response.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("End match court failed", error);
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

export const updateVolleyballScoreController = async (request, response) => {
  try {
    const { communityId, sessionId, courtId } = request.params;
    const { team, delta } = request.body;
    const court = await updateVolleyballScore(
      communityId,
      sessionId,
      courtId,
      team,
      Number(delta),
      request.user.sub,
    );
    return response.status(200).json({ success: true, court });
  } catch (error) {
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    return response.status(statusCode).json({
      success: false,
      message: error instanceof AppError ? error.message : "Internal server error",
    });
  }
};
