import { prisma } from "../libs/prisma.js";
import bcrypt from "bcrypt";
import {
  signAccess,
  signRefresh,
  verifyAccess,
  verifyRefresh,
} from "../libs/jwt.js";
import { randomBytes, randomUUID } from "crypto";
import { AppError } from "../libs/errorHandle.js";
import {
  sendPasswordResetEmail,
  sendResetConfirmationEmail,
} from "../libs/email.js";

const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 60;

const createRefreshToken = async ({ userId, ipAddress, agent }) => {
  const jti = randomUUID();
  const refresh = signRefresh({ jti, sub: userId });
  const hashedRefresh = await bcrypt.hash(refresh, 10);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.refreshToken.create({
    data: {
      jti,
      userId,
      hashedToken: hashedRefresh,
      ipAddress,
      userAgent: agent,
      expiresAt,
    },
    select: { jti: true },
  });

  return refresh;
};

export const register = async (payload) => {
  let { username, email, password, skillLevel, ipAddress, agent } = payload;

  if (!username || !email || !password)
    throw new AppError("All fields are required", 400);

  username = username.trim();
  email = email.trim().toLowerCase();

  const emailExist = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (emailExist) throw new AppError("Email already exist", 409);

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      skillLevel, // 2. Add skillLevel to the database record creation step
    },
    select: {
      id: true,
      username: true,
      email: true,
      skillLevel: true,
    },
  });

  const refresh = await createRefreshToken({
    userId: user.id,
    ipAddress,
    agent,
  });

  // access
  const access = signAccess({ sub: user.id });

  return { refresh, access };
};

export const login = async (payload) => {
  let { email, password } = payload;

  if (!payload.email || !payload.password)
    throw new AppError("All fields are required", 401);

  payload.email = payload.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (!user) throw new AppError("Email not found", 404);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError("Email or password is incorrect", 400);

  const refresh = await createRefreshToken({
    userId: user.id,
    ipAddress: payload.ipAddress,
    agent: payload.agent,
  });

  const access = signAccess({ sub: user.id });
  return { refresh, access };
};

const generateResetToken = () => {
  return randomBytes(32).toString("hex"); // Use randomBytes directly, not crypto.randomBytes
};

export const requestPasswordReset = async (payload) => {
  const { email } = payload;

  if (!email) {
    throw new AppError("Email is required", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, email: true, username: true },
  });

  if (!user) {
    return { message: "If an account exists, a reset link has been sent" };
  }

  // Generate token
  const resetToken = generateResetToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

  // Store token in database
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token: resetToken,
      expiresAt,
    },
  });

  // 1. Get your frontend client URL (Fallback to localhost for dev)
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

  // 2. Build the complete URL expected by your React router (/reset-password?token=...)
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

  // 3. Send the full resetUrl to email helper
  try {
    await sendPasswordResetEmail(user.email, resetUrl, user.username);
  } catch (error) {
    console.error("Failed to send reset email:", error);
  }

  return { message: "If an account exists, a reset link has been sent" };
};

export const resetPassword = async (payload) => {
  const { token, newPassword } = payload;

  if (!token || !newPassword) {
    throw new AppError("Token and new password are required", 400);
  }

  if (newPassword.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }

  // Find the reset token
  const resetRecord = await prisma.passwordReset.findFirst({
    where: {
      token,
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });

  if (!resetRecord) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update user password and mark token as used in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    }),
    // Revoke all refresh tokens for security
    prisma.refreshToken.updateMany({
      where: { userId: resetRecord.userId },
      data: { isRevoked: true },
    }),
  ]);

  // Send confirmation email
  try {
    await sendResetConfirmationEmail(
      resetRecord.user.email,
      resetRecord.user.username,
    );
  } catch (error) {
    console.error("Failed to send confirmation email:", error);
  }

  return { message: "Password reset successfully" };
};

export const validateResetToken = async (token) => {
  if (!token) {
    throw new AppError("Token is required", 400);
  }

  const resetRecord = await prisma.passwordReset.findFirst({
    where: {
      token,
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
    },
  });

  if (!resetRecord) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  return { valid: true, userId: resetRecord.userId };
};

// Optional: Clean expired reset tokens (run as a background job)
export const cleanExpiredResetTokens = async () => {
  await prisma.passwordReset.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
};

export const profile = async (userId) => {
  if (!userId) throw new AppError("User ID is required", 401);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      skillLevel: true,
      sports: { select: { id: true, sport: true, skillLevel: true } },
    },
  });

  if (!user) throw new AppError("No user found", 404);
  return user;
};

export const updateProfile = async (userId, payload) => {
  if (!userId) throw new AppError("User ID is required", 401);
  const { username, skillLevel, currentPassword, newPassword } = payload;
  const data = {};
  const skillLevels = ["LB", "BEG", "HB", "LI", "INT", "UI", "ADV", "EXP"];

  if (username !== undefined) {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) throw new AppError("Username is required", 400);
    data.username = trimmedUsername;
  }
  if (skillLevel !== undefined) {
    if (!skillLevels.includes(skillLevel)) throw new AppError("Invalid skill level", 400);
    data.skillLevel = skillLevel;
  }
  if (newPassword !== undefined && newPassword !== "") {
    if (!currentPassword) throw new AppError("Current password is required", 400);
    if (newPassword.length < 8) throw new AppError("New password must be at least 8 characters", 400);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
    if (!user) throw new AppError("No user found", 404);
    if (!(await bcrypt.compare(currentPassword, user.password))) throw new AppError("Current password is incorrect", 400);
    data.password = await bcrypt.hash(newPassword, 10);
  }
  if (Object.keys(data).length === 0) throw new AppError("No changes were provided", 400);
  await prisma.user.update({
    where: { id: userId }, data,
  });
  return profile(userId);
};

export const addSportToProfile = async (userId, { sport, skillLevel }) => {
  if (!userId) throw new AppError("User ID is required", 401);
  if (!["badminton", "volleyball"].includes(sport)) throw new AppError("Invalid sport", 400);
  if (!["LB", "BEG", "HB", "LI", "INT", "UI", "ADV", "EXP"].includes(skillLevel)) throw new AppError("Invalid skill level", 400);

  const existing = await prisma.userSport.findUnique({ where: { userId_sport: { userId, sport } } });
  if (existing) throw new AppError("This sport is already on your profile", 409);

  await prisma.userSport.create({ data: { userId, sport, skillLevel } });
  return profile(userId);
};

export const refresh = async (payload) => {
  if (!payload.token) throw new AppError("No token", 401);

  const refreshPayload = verifyRefresh(payload.token);

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { jti: refreshPayload.jti },
  });

  if (!tokenRecord) throw new AppError("No record", 401);
  if (tokenRecord.isRevoked) throw new AppError("Token revoked", 401);
  if (tokenRecord.expiresAt < new Date())
    throw new AppError("Token expired", 401);

  const isMatch = await bcrypt.compare(payload.token, tokenRecord.hashedToken);
  if (!isMatch) throw new AppError("Invalid token", 401);

  // Reuse the valid refresh token until its normal expiry. A new refresh
  // token is created only on login or registration.
  const access = signAccess({ sub: refreshPayload.sub });

  return { access };
};

export const logout = async (token) => {
  if (!token) throw new AppError("Unauthorized", 401);
  const payload = verifyRefresh(token);
  if (!payload) throw new AppError("Unauthorized", 401);

  const revokeToken = await prisma.refreshToken.updateMany({
    where: {
      userId: payload.sub,
    },
    data: { isRevoked: true },
  });
  if (!revokeToken) throw new AppError("Token not found", 404);

  return true;
};
