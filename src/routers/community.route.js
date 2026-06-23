import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getAllCommunitiesController,
  getCommunityByIdController,
} from "../controllers/community.controller.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/", getAllCommunitiesController);
router.get("/:communityId", getCommunityByIdController);

export default router;
