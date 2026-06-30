import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  createCommunityController,
  deleteCommunityController,
  getAllCommunitiesController,
  getAllMyCommunitiesController,
  getCommunityByIdController,
  updateCommunityByOwnerController,
} from "../controllers/community.controller.js";
import {
  assignPlayerToSlotController,
  createMatchCourtController,
  createQueueCourtController,
  createSessionController,
  deleteMatchCourtController,
  deleteQueueCourtController,
  deleteSessionController,
  endMatchCourtController,
  endSessionController,
  getAllCourtsController,
  getAllPublicSessionsController,
  getAllSessionsController,
  getSessionByIdController,
  removePlayerFromSlotController,
  sessionDashboardController,
  startMatchCourtController,
  startSessionController,
  transferQueueToMatchController,
  updateMatchCourtNameController,
  updateQueueCourtNameController,
  updateSessionController,
} from "../controllers/session.controller.js";
import {
  createStaticPlayersController,
  deleteStaticPlayerController,
  getAllPlayersController,
  getPlayerByIdController,
  updateStaticPlayerController,
} from "../controllers/player.controller.js";
import {
  acceptPlayerController,
  getAllSessionPlayersController,
} from "../controllers/sessionPlayer.controller.js";
import { getPlayerGameHistoryController } from "../controllers/gameHistory.controller.js";

const router = express.Router();
router.use(authMiddleware);

// COMMUNITY

router.get("/", getAllCommunitiesController);
router.get("/my-communities", getAllMyCommunitiesController);
router.get("/:communityId", getCommunityByIdController);

router.post("/", createCommunityController);
router.patch("/:communityId", updateCommunityByOwnerController);

router.delete("/:communityId", deleteCommunityController);

// PLAYERS

// Community-scoped player actions
router.get("/:communityId/players", getAllPlayersController);
router.get("/:communityId/players/:playerId", getPlayerByIdController);

router.post("/:communityId/players/static", createStaticPlayersController);

router.delete(
  "/:communityId/players/:playerId/static",
  deleteStaticPlayerController,
);

// SESSIONS

router.get("/:communityId/sessions", getAllSessionsController);
router.get("/sessions/public", getAllPublicSessionsController);
router.get("/:communityId/sessions/:sessionId", getSessionByIdController);
router.get(
  "/:communityId/sessions/:sessionId/dashboard",
  sessionDashboardController,
);

router.post("/:communityId/sessions", createSessionController);

router.patch("/:communityId/sessions/:sessionId", updateSessionController);
router.put("/:communityId/sessions/:sessionId/start", startSessionController);
router.put("/:communityId/sessions/:sessionId/end", endSessionController);

router.delete("/:communityId/sessions/:sessionId", deleteSessionController);

// SESSION PLAYERS

router.get(
  "/:communityId/sessions/:sessionId/players",
  getAllSessionPlayersController,
);

router.post(
  "/:communityId/sessions/:sessionId/:communityPlayerId/accept",
  acceptPlayerController,
);

// SESSION GAMES

router.get("/:communityId/sessions/:sessionId/courts", getAllCourtsController);

router.post(
  "/:communityId/sessions/:sessionId/courts/match",
  createMatchCourtController,
);

router.patch(
  "/:communityId/sessions/:sessionId/courts/:courtId/match-name",
  updateMatchCourtNameController,
);

router.delete(
  "/:communityId/sessions/:sessionId/courts/:courtId/match",
  deleteMatchCourtController,
);

router.post(
  "/:communityId/sessions/:sessionId/courts/queue",
  createQueueCourtController,
);

router.patch(
  "/:communityId/sessions/:sessionId/courts/:courtId/queue-name",
  updateQueueCourtNameController,
);

router.delete(
  "/:communityId/sessions/:sessionId/courts/:courtId/queue",
  deleteQueueCourtController,
);

router.patch(
  "/:communityId/sessions/:sessionId/courts/:courtId/convert-to-match",
  createQueueCourtController,
);

router.post(
  "/:communityId/sessions/:sessionId/courts/slots/assign",
  assignPlayerToSlotController,
);

router.delete(
  "/:communityId/sessions/:sessionId/courts/:courtId/slots/:slotId/remove",
  removePlayerFromSlotController,
);

router.post(
  "/:communityId/sessions/:sessionId/courts/transfer-queue",
  transferQueueToMatchController,
);

router.patch(
  "/:communityId/sessions/:sessionId/courts/:courtId/start",
  startMatchCourtController,
);

router.patch(
  "/:communityId/sessions/:sessionId/courts/:courtId/end",
  endMatchCourtController,
);

// HISTORY

router.get(
  "/:communityId/sessions/:sessionId/players/:sessionPlayerId/history",
  getPlayerGameHistoryController,
);

export default router;
