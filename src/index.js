import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routers/auth.route.js";
import communityRoutes from "./routers/community.route.js";
import { prisma } from "./libs/prisma.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "https://quetato-sport.vercel.app",
    credentials: true,
  }),
);
app.use(express.json());
app.set("trust proxy", true);
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/communities", communityRoutes);

app.get("/health", async (req, res) => {
  try {
    // 1. Verify Prisma/Database is responsive
    await prisma.$queryRaw`SELECT 1`;

    // 2. Respond with 200 OK if everything is healthy
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    // 3. Respond with 500 Internal Server Error if the database is down
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});

const startServer = async () => {
  try {
    app.listen(PORT, () => console.log("Server running in port:", PORT));
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

await startServer();
