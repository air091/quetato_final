import "dotenv/config";
import { request, response } from "express";
import {
  login,
  logout,
  profile,
  refresh,
  register,
  requestPasswordReset,
  resetPassword,
  validateResetToken,
  updateProfile,
  addSportToProfile,
} from "../services/auth.service.js";
import { AppError } from "../libs/errorHandle.js";

const isSecureDeployment = () =>
  process.env.NODE_ENV === "production" ||
  process.env.RENDER ||
  process.env.RENDER_EXTERNAL_URL ||
  process.env.FRONTEND_URL?.startsWith("https://") ||
  process.env.CLIENT_URL?.startsWith("https://");

const getSessionCookieOptions = () => ({
  httpOnly: true,
  secure: isSecureDeployment(),
  sameSite: isSecureDeployment() ? "none" : "lax",
  maxAge: 1000 * 60 * 60 * 24 * 7,
  path: "/",
});

const getClearSessionCookieOptions = () => {
  const { maxAge, ...options } = getSessionCookieOptions();
  return {
    ...options,
    expires: new Date(0),
  };
};

export const registerController = async (request, response) => {
  try {
    const { username, email, password, skillLevel } = request.body;
    const agent = request.headers["user-agent"] || "Unknown Device";
    const ipAddress = request.ip || "127.0.0.1";

    const tokens = await register({
      username,
      email,
      password,
      skillLevel,
      ipAddress,
      agent,
    });

    response.cookie("session", tokens.refresh, getSessionCookieOptions());

    // The refresh token is deliberately HttpOnly and is only sent as the
    // session cookie. Never expose it to JavaScript or localStorage.
    return response.status(200).json({
      success: true,
      tokens: { access: tokens.access },
    });
  } catch (error) {
    console.error("Register failed", error);

    let statusCode = 500;
    let errorMessage = "Internal Server Error";

    if (error instanceof AppError) {
      statusCode = error.statusCode;
      errorMessage = error.message;
    }

    return response
      .status(statusCode)
      .json({ success: false, message: errorMessage });
  }
};

export const loginController = async (request, response) => {
  try {
    const { email, password } = request.body;
    const agent = request.headers["user-agent"] || "Unknown Device";
    const ipAddress = request.ip || "127.0.0.1";

    const tokens = await login({ email, password, agent, ipAddress });

    response.cookie("session", tokens.refresh, getSessionCookieOptions());

    // The refresh token is deliberately HttpOnly and is only sent as the
    // session cookie. Never expose it to JavaScript or localStorage.
    return response.status(200).json({
      success: true,
      tokens: { access: tokens.access },
    });
  } catch (error) {
    console.error("Login failed", error);

    let errMessage = "Server Internal Error";
    let statusCode = 500;

    if (error instanceof AppError) {
      errMessage = error.message;
      statusCode = error.statusCode;
    }
    return response
      .status(statusCode)
      .json({ success: false, message: errMessage });
  }
};

export const profileController = async (request, response) => {
  try {
    // request.user was populated right above in the authMiddleware!
    const userId = request.user.sub;

    const user = await profile(userId);

    return response.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Profile failed", error);

    let errMessage = "Server internal error";
    let statusCode = 500;

    if (error instanceof AppError) {
      errMessage = error.message;
      statusCode = error.statusCode;
    }

    return response
      .status(statusCode)
      .json({ success: false, message: errMessage });
  }
};

export const updateProfileController = async (request, response) => {
  try {
    const user = await updateProfile(request.user.sub, request.body);
    return response.status(200).json({ success: true, message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Profile update failed", error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof AppError ? error.message : "Server internal error";
    return response.status(statusCode).json({ success: false, message });
  }
};

export const addSportToProfileController = async (request, response) => {
  try {
    const user = await addSportToProfile(request.user.sub, request.body);
    return response.status(201).json({ success: true, message: "Sport added successfully", user });
  } catch (error) {
    console.error("Add sport failed", error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof AppError ? error.message : "Server internal error";
    return response.status(statusCode).json({ success: false, message });
  }
};

export const refreshController = async (request, response) => {
  try {
    const token = request.cookies ? request.cookies["session"] : null;
    const tokens = await refresh({ token });

    // The existing HttpOnly refresh-token cookie remains unchanged. The
    // client needs only a new short-lived access token.
    return response.status(201).json({
      success: true,
      tokens: { access: tokens.access },
    });
  } catch (error) {
    console.error("Refresh failed", error);
    let errorMessage = "Internal server error";
    let statusCode = 500;

    if (error instanceof AppError) {
      errorMessage = error.message;
      statusCode = error.statusCode;
    }

    return response
      .status(statusCode)
      .json({ success: false, message: errorMessage });
  }
};

export const logoutController = async (request, response) => {
  try {
    const token = request.cookies ? request.cookies["session"] : null;
    if (token) {
      await logout(token);
    }

    response.cookie("session", "", getClearSessionCookieOptions());

    return response.status(200).json({ success: true });
  } catch (error) {
    console.error("Logout failed", error);
    let errMessage = "Internal server error";
    let statusCode = 500;

    if (error instanceof AppError) {
      errMessage = error.message;
      statusCode = error.statusCode;
    }

    return response
      .status(statusCode)
      .json({ success: false, message: errMessage });
  }
};

export const requestPasswordResetController = async (request, response) => {
  try {
    const result = await requestPasswordReset(request.body);
    response.status(200).json({ success: true, message: result.message });
  } catch (error) {
    console.error("Request password reset failed", error);
    let errMessage = "Internal server error";
    let statusCode = 500;

    if (error instanceof AppError) {
      errMessage = error.message;
      statusCode = error.statusCode;
    }

    return response
      .status(statusCode)
      .json({ success: false, message: errMessage });
  }
};

export const resetPasswordController = async (request, response) => {
  try {
    const { token, newPassword } = request.body;
    const result = await resetPassword({ token, newPassword });
    response.status(200).json({ success: true, message: result.message });
  } catch (error) {
    console.error("Reset password failed", error);
    let errMessage = "Internal server error";
    let statusCode = 500;

    if (error instanceof AppError) {
      errMessage = error.message;
      statusCode = error.statusCode;
    }

    return response
      .status(statusCode)
      .json({ success: false, message: errMessage });
  }
};

export const validateResetTokenController = async (request, response) => {
  try {
    const { token } = request.body;
    const result = await validateResetToken(token);
    response
      .status(200)
      .json({ success: true, valid: result.valid, userId: result.userId });
  } catch (error) {
    console.error("Validate reset token failed", error);
    let errMessage = "Internal server error";
    let statusCode = 500;

    if (error instanceof AppError) {
      errMessage = error.message;
      statusCode = error.statusCode;
    }

    return response
      .status(statusCode)
      .json({ success: false, message: errMessage });
  }
};
