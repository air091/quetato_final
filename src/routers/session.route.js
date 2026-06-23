import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  createSessionController,
  deleteSessionController,
  getAllSessionsController,
  getSessionByIdController,
  updateSessionController,
} from "../controllers/session.controller.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/:communityId", getAllSessionsController);
router.get("/:communityId/:sessionId", getSessionByIdController);

router.post("/:communityId", createSessionController);

router.patch("/:communityId/:sessionId", updateSessionController);

router.delete("/:communityId/:sessionId", deleteSessionController);

export default router;
