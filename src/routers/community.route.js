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
  pauseMatchCourtController,
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
  acceptPlayerInCommunityController,
  assignAdminController,
  assignHostController,
  createStaticPlayersController,
  deleteStaticPlayerController,
  getAllPlayersController,
  getAllRequestPlayersController,
  getPlayerByIdController,
  getRequestedPlayerToJoinSessionController,
  joinCommunityController,
  joinSessionController,
  kickPlayerInCommunityController,
  rejectPlayerController,
  updateStaticPlayerController,
} from "../controllers/player.controller.js";
import {
  acceptPlayerController,
  getAllSessionPlayersController,
  getStaticPlayerNotInSessionController,
  hideAuthorizedPlayerInSessionController,
  removePlayerFromSessionController,
  unhideAuthorizedPlayerInSessionController,
} from "../controllers/sessionPlayer.controller.js";
import {
  getCommunityPlayerHistoryController,
  getPlayerGameHistoryController,
  getPlayerTotalCommunityGamesController,
} from "../controllers/gameHistory.controller.js";
import {
  addPricingController,
  markPlayerAsPaidController,
  unmarkPlayerAsPaidController,
} from "../controllers/pricing.controller.js";

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
router.get(
  "/:communityId/players/total-community-games",
  getPlayerTotalCommunityGamesController,
);
router.get(
  "/:communityId/players/:communityPlayerId/history",
  getCommunityPlayerHistoryController,
);

router.get("/:communityId/players/requests", getAllRequestPlayersController);

router.get("/:communityId/players/:playerId", getPlayerByIdController);

router.post("/:communityId/players/static", createStaticPlayersController);

router.put(
  "/:communityId/players/:userId/static",
  updateStaticPlayerController,
);

router.patch(
  "/:communityId/players/:userId/assign-admin",
  assignAdminController,
);

router.patch("/:communityId/players/:userId/assign-host", assignHostController);

router.delete(
  "/:communityId/players/:userId/static",
  deleteStaticPlayerController,
);

router.delete("/:communityId/players/:userId/reject", rejectPlayerController);

router.delete(
  "/:communityId/players/:userId/kick",
  kickPlayerInCommunityController,
);

router.post("/:communityId/request", joinCommunityController);

router.patch(
  "/:communityId/players/:userId/accept",
  acceptPlayerInCommunityController,
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
router.post("/:communityId/sessions/:sessionId", joinSessionController);

router.patch("/:communityId/sessions/:sessionId", updateSessionController);
router.put("/:communityId/sessions/:sessionId/start", startSessionController);
router.put("/:communityId/sessions/:sessionId/end", endSessionController);

router.delete("/:communityId/sessions/:sessionId", deleteSessionController);

// SESSION PLAYERS

router.get(
  "/:communityId/sessions/:sessionId/players",
  getAllSessionPlayersController,
);

router.get(
  "/:communityId/sessions/:sessionId/players/static",
  getStaticPlayerNotInSessionController,
);

router.get(
  "/:communityId/sessions/:sessionId/players/requested",
  getRequestedPlayerToJoinSessionController,
);

router.post(
  "/:communityId/sessions/:sessionId/:communityPlayerId/accept",
  acceptPlayerController,
);

router.patch(
  "/:communityId/sessions/:sessionId/players/:sessionPlayerId/hide",
  hideAuthorizedPlayerInSessionController,
);

router.patch(
  "/:communityId/sessions/:sessionId/players/:sessionPlayerId/unhide",
  unhideAuthorizedPlayerInSessionController,
);

router.delete(
  "/:communityId/sessions/:sessionId/players/:sessionPlayerId/remove",
  removePlayerFromSessionController,
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
  "/:communityId/sessions/:sessionId/courts/:courtId/pause",
  pauseMatchCourtController,
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

router.get(
  "/:communityId/sessions/:sessionId/players/history",
  getPlayerTotalCommunityGamesController,
);

// PRICING

router.post("/:communityId/sessions/:sessionId/pricing", addPricingController);
router.patch(
  "/:communityId/sessions/:sessionId/players/:sessionPlayerId/paid",
  markPlayerAsPaidController,
);
router.patch(
  "/:communityId/sessions/:sessionId/players/:sessionPlayerId/unpaid",
  unmarkPlayerAsPaidController,
);

export default router;
