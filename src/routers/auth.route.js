import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  loginController,
  logoutController,
  profileController,
  refreshController,
  registerController,
  requestPasswordResetController,
  resetPasswordController,
  validateResetTokenController,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.get("/profile", authMiddleware, profileController);

router.post("/login", loginController);
router.post("/register", registerController);
router.post("/logout", authMiddleware, logoutController);
router.post("/refresh", refreshController);
router.post("/request-password-reset", requestPasswordResetController);
router.post("/reset-password", resetPasswordController);
router.post("/validate-reset-token", validateResetTokenController);

export default router;
