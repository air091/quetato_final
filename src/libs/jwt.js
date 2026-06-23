import "dotenv/config";
import jwt, { SignOptions } from "jsonwebtoken";

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN;

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN;

if (
  !REFRESH_SECRET ||
  !REFRESH_EXPIRES_IN ||
  !ACCESS_SECRET ||
  !ACCESS_EXPIRES_IN
)
  throw new Error("JWT missing params");

const refreshOptions = {
  expiresIn: REFRESH_EXPIRES_IN,
  algorithm: "HS256",
};

const accessOptions = {
  expiresIn: ACCESS_EXPIRES_IN,
  algorithm: "HS256",
};

// signs

export const signRefresh = (payload) => {
  return jwt.sign(payload, REFRESH_SECRET, refreshOptions);
};

export const signAccess = (payload) => {
  return jwt.sign(payload, ACCESS_SECRET, accessOptions);
};

// verify

export const verifyRefresh = (token) => {
  return jwt.verify(token, REFRESH_SECRET);
};

export const verifyAccess = (token) => {
  return jwt.verify(token, ACCESS_SECRET);
};
