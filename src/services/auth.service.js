import { prisma } from "../libs/prisma";
import bcrypt from "bcrypt";
import { signAccess, signRefresh } from "../libs/jwt";
import { randomUUID } from "crypto";
import { AppError } from "../libs/errorHandle";

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
      ipAddress: address,
      userAgent: agent,
      expiresAt,
    },
    select: { jti: true },
  });

  // access
  const access = signAccess({ sub: user.id });

  return { refresh, access };
};
