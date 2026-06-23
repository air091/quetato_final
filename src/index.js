import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routers/auth.route.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.set("trust proxy", true);
app.use(cookieParser());

app.use("/api/auth", authRoutes);

const startServer = async () => {
  try {
    app.listen(PORT, () => console.log("Server running in port:", PORT));
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

await startServer();
