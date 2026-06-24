import express from "express";
import { updateStaticPlayerController } from "../controllers/player.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
const router = express.Router();
router.use(authMiddleware);

router.put("/players/:playerId/static", updateStaticPlayerController);

export default router;
