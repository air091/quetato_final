import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  createCommunityController,
  deleteCommunityController,
  getAllCommunitiesController,
  getCommunityByIdController,
  updateCommunityByOwnerController,
} from "../controllers/community.controller.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/", getAllCommunitiesController);
router.get("/:communityId", getCommunityByIdController);

router.post("/", createCommunityController);
router.patch("/:communityId", updateCommunityByOwnerController);

router.delete("/:communityId", deleteCommunityController);

export default router;
