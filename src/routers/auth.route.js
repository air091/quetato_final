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
  updateProfileController,
} from "../controllers/auth.controller.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    message: "Too many password reset requests. Please try again later.",
  },
  validate: { trustProxy: false },
});

router.get("/profile", authMiddleware, profileController);
router.patch("/profile", authMiddleware, updateProfileController);

router.post("/login", loginController);
router.post("/register", registerController);
router.post("/logout", authMiddleware, logoutController);
router.post("/refresh", refreshController);
router.post(
  "/request-password-reset",
  resetPasswordLimiter,
  requestPasswordResetController,
);
router.post("/reset-password", resetPasswordLimiter, resetPasswordController);
router.post("/validate-reset-token", validateResetTokenController);

export default router;
