import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./src/db/db.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "The Evidence Backend is running",
  });
});

const startServer = async (): Promise<void> => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();