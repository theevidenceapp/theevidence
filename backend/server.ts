import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./src/db/db.js";
import passport from "./src/config/passport-config.js";
import { sessionConfig } from "./src/config/session.js";

// routers
import userRouter from "./src/routes/user.router.js";
import blogRouter from "./src/routes/blog.router.js";
import { authenticate, authorize } from "./src/middleware/auth.middleware.js";
//

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.send("API Service is live at 5000");
});

app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());
app.use("/user", userRouter);
app.use("/blog", authenticate, blogRouter);

app.get(
  "/admin",
  authenticate,
  authorize("ADMIN"),
  (req: Request, res: Response) => {
    return res.status(200).json({ msg: "Welcome Admin" });
  },
);

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
