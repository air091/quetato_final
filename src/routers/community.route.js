import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  createCommunityController,
  deleteCommunityController,
  getAllCommunitiesController,
  getCommunityByIdController,
  updateCommunityByOwnerController,
} from "../controllers/community.controller.js";
import {
  createSessionController,
  deleteSessionController,
  getAllSessionsController,
  getSessionByIdController,
  updateSessionController,
} from "../controllers/session.controller.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/", getAllCommunitiesController);
router.get("/:communityId", getCommunityByIdController);

router.post("/", createCommunityController);
router.patch("/:communityId", updateCommunityByOwnerController);

router.delete("/:communityId", deleteCommunityController);

// SESSIONS

router.get("/:communityId/sessions", getAllSessionsController);
router.get("/:communityId/sessions/:sessionId", getSessionByIdController);

router.post("/:communityId/sessions", createSessionController);

router.patch("/:communityId/sessions/:sessionId", updateSessionController);

router.delete("/:communityId/sessions/:sessionId", deleteSessionController);

export default router;
