import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./src/db/db.js";
import passport from "./src/controllers/config/passport-config.js";
import { sessionConfig } from "./src/controllers/config/session.js";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// routers
import userRouter from "./src/routes/user.router.js";
import blogRouter from "./src/routes/blog.router.js";
import { adminRouter } from "./src/routes/admin.router.js";
import { authenticate, authorize } from "./src/middleware/auth.middleware.js";

dotenv.config();

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, 
  legacyHeaders: false, 
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

app.use(globalLimiter);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(helmet());

app.get("/", (req: Request, res: Response) => {
  res.send("API Service is live at 5000");
});

app.use(sessionConfig);
app.use(passport.initialize());
app.use(passport.session());
app.use("/user", userRouter);
app.use("/blog", blogRouter);
app.use("/admin", authenticate, authorize("ADMIN", "EDITOR"), adminRouter);

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
