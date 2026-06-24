import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  createStaticPlayersController,
  deleteStaticPlayerController,
  getAllPlayersController,
  getPlayerByIdController,
  updateStaticPlayerController,
} from "../controllers/player.controller.js";

const router = express.Router();
router.use(authMiddleware);

// Community-scoped player actions
router.get("/communities/:communityId/players", getAllPlayersController);
router.get(
  "/communities/:communityId/players/:playerId",
  getPlayerByIdController,
);

router.post(
  "/communities/:communityId/players/static",
  createStaticPlayersController,
);

// Single profile actions
router.put("/players/:playerId/static", updateStaticPlayerController);

router.delete(
  "/communities/:communityId/players/:playerId/static",
  deleteStaticPlayerController,
);

export default router;
