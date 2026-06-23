import "dotenv/config";
import { request, response } from "express";

export const registerController = async (request, response) => {
  try {
    const { username, email, password } = request.body;
    const agent = request.headers["user-agent"] || "Unknown Device";
    const ipAddress = request.ip || "127.0.0.1";

    const tokens = await register({
      username,
      email,
      password,
      ipAddress,
      agent,
    });

    response.cookie("session", tokens.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24 * 7,
      path: "/",
    });

    return response.status(200).json({ success: true, tokens });
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
      .json({ success: false, error: errorMessage });
  }
};

export const loginController = async (request, response) => {
  try {
    const { email, password } = request.body;
    const agent = request.headers["user-agent"] || "Unknown Device";
    const ipAddress = request.ip || "127.0.0.1";

    const tokens = await login(email, password, agent, ipAddress);
    const response = NextResponse.json(
      { success: true, tokens },
      { status: 200 },
    );

    response.cookie("session", tokens.refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 24 * 7,
      path: "/",
    });

    return response.status(200).json({ success: true, tokens });
  } catch (error) {
    console.error("Login failed", error);

    let errMessage = "Server Internal Error";
    let statusCode = 500;

    if (error instanceof Error) {
      errMessage = error.errMessage;
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

export const refreshController = async (request, response) => {
  try {
    const token = request.cookies ? request.cookies["session"] : null;
    const agent = request.headers["user-agent"] || "Unknown Device";
    const ipAddress = request.ip || "127.0.0.1";

    const tokens = await refresh({ token, ipAddress, agent });

    return NextResponse.json({ success: true, tokens }, { status: 201 });
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

    response.cookie("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
      path: "/",
    });

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
