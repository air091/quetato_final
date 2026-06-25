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
  createSessionController,
  deleteSessionController,
  endSessionController,
  getAllPublicSessionsController,
  getAllSessionsController,
  getSessionByIdController,
  startSessionController,
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
  "/:communityId/sessions/:sessionId/:playerId/accept",
  acceptPlayerController,
);

export default router;
