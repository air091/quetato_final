import { prisma } from "../libs/prisma.js";
import bcrypt from "bcrypt";
import {
  signAccess,
  signRefresh,
  verifyAccess,
  verifyRefresh,
} from "../libs/jwt.js";
import { randomUUID } from "crypto";
import { AppError } from "../libs/errorHandle.js";

const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

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
      skillLevel: true, // Optional: return skill level in return payload if needed
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

export const profile = async (userId) => {
  if (!userId) throw new AppError("User ID is required", 401);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
    },
  });

  if (!user) throw new AppError("No user found", 404);
  return user;
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
