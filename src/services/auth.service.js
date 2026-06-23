import { prisma } from "../libs/prisma.js";
import bcrypt from "bcrypt";
import { signAccess, signRefresh, verifyAccess } from "../libs/jwt.js";
import { randomUUID } from "crypto";
import { AppError } from "../libs/errorHandle.js";

export const register = async (payload) => {
  if (!payload.username || !payload.email || !payload.password)
    throw new AppError("All fields are required", 400);

  payload.username = username.trim();
  payload.email = email.trim().toLowerCase();

  const emailExist = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { id: true },
  });

  if (emailExist) throw new AppError("Email already exist", 409);

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
    },
    select: {
      id: true,
      username: true,
      email: true,
    },
  });

  // refresh
  const jti = randomUUID();
  const refresh = signRefresh({ jti, sub: user.id });
  const hashedRefresh = await bcrypt.hash(refresh, 10);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await prisma.refreshToken.create({
    data: {
      jti,
      userId: user.id,
      hashedToken: hashedRefresh,
      ipAddress: payload.ipAddress,
      userAgent: payload.agent,
      expiresAt,
    },
    select: { jti: true },
  });

  // access
  const access = signAccess({ sub: user.id });

  return { refresh, access };
};

export const login = async (payload) => {
  if (!payload.email || !payload.password)
    throw new AppError("All fields are required", 401);

  payload.email = payload.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (!user) throw new AppError("Email not found", 404);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError("Email or password is incorrect", 400);

  const jti = randomUUID();
  const refresh = signRefresh({ jti, sub: user.id });
  const hashedRefresh = await bcrypt.hash(refresh, 10);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await prisma.refreshToken.create({
    data: {
      jti,
      userId: user.id,
      hashedToken: hashedRefresh,
      ipAddress: payload.ipAddress,
      userAgent: payload.agent,
      expiresAt,
    },
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
  if (tokenRecord.expiresAt < new Date())
    throw new AppError("Token expired", 401);

  const isMatch = await bcrypt.compare(payload.token, tokenRecord.hashedToken);
  if (!isMatch) throw new AppError("Invalid token", 401);

  await prisma.refreshToken.updateMany({
    where: {
      userId: refreshPayload.sub,
      isRevoked: false,
    },
    data: { isRevoked: true },
  });

  // token rotation

  const newJti = randomUUID();
  const newRefresh = signRefresh({ jti: newJti, sub: tokenRecord.userId });
  const newHashedRefresh = await bcrypt.hash(newRefresh, 10);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await prisma.refreshToken.create({
    data: {
      jti: newJti,
      userId: tokenRecord.userId,
      hashedToken: newHashedRefresh,
      ipAddress: payload.ipAddress,
      userAgent: payload.agent,
      expiresAt,
    },
    select: { jti: true },
  });

  const accessToken = signAccess({ sub: refreshPayload.sub });
  return { newRefresh, accessToken };
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
