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
  getAllSessionsController,
  getSessionByIdController,
  startSessionController,
  updateSessionController,
} from "../controllers/session.controller.js";

const router = express.Router();
router.use(authMiddleware);

// COMMUNITY

router.get("/", getAllCommunitiesController);
router.get("/my-communities", getAllMyCommunitiesController);
router.get("/:communityId", getCommunityByIdController);

router.post("/", createCommunityController);
router.patch("/:communityId", updateCommunityByOwnerController);

router.delete("/:communityId", deleteCommunityController);

// SESSIONS

router.get("/:communityId/sessions", getAllSessionsController);
router.get("/:communityId/sessions/:sessionId", getSessionByIdController);

router.post("/:communityId/sessions", createSessionController);

router.patch("/:communityId/sessions/:sessionId", updateSessionController);
router.put("/:communityId/sessions/:sessionId/start", startSessionController);
router.put("/:communityId/sessions/:sessionId/end", endSessionController);

router.delete("/:communityId/sessions/:sessionId", deleteSessionController);

export default router;
