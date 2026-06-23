import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  loginController,
  logoutController,
  profileController,
  refreshController,
  registerController,
} from "../controllers/auth.controller";

const router = express.Router();

router.get("/", authMiddleware, profileController);

router.post("/login", loginController);
router.post("/register", registerController);
router.post("/logout", authMiddleware, logoutController);
router.post("/refresh", refreshController);

export default router;
