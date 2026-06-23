import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  loginController,
  logoutController,
  profileController,
  refreshController,
  registerController,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.get("/", authMiddleware, profileController);

router.post("/login", loginController);
router.post("/register", registerController);
router.post("/logout", authMiddleware, logoutController);
router.post("/refresh", refreshController);

export default router;
