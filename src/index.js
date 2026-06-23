import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

const startServer = () => {
  try {
    app.listen(PORT, () => console.log("Server running in port:", PORT));
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

startServer();
