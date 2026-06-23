import "dotenv/config";
import { verifyAccess } from "jwt";

export const authMiddleware = async (request, response, next) => {
  try {
    // 1. Get the Authorization header
    const authHeader = request.headers["authorization"];

    // 2. Check if the header exists and follows the 'Bearer <token>' pattern
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return response.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // 3. Extract the actual token string
    const token = authHeader.split(" ")[1];

    // 4. Verify the token using your secret key
    const decoded = verifyAccess(token, process.env.JWT_SECRET);

    // 5. Attach the decoded user payload (e.g., id, email) to the request object
    request.user = decoded;

    // 6. Pass control to the next middleware or controller
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    // Handle expired tokens specifically, otherwise throw a generic 403
    if (error.name === "TokenExpiredError") {
      return response
        .status(401)
        .json({ success: false, message: "Token has expired." });
    }

    return response
      .status(403)
      .json({ success: false, message: "Invalid token." });
  }
};
