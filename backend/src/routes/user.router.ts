import { NextFunction, Request, Response, Router } from "express";
import {
  authenticateWithPassport,
  createUser,
  getAccessToken,
  getUser,
  googleCallback,
  handleAuthFailure,
  logout,
  refreshAccessToken,
} from "../controllers/auth.controller.js";
import config from "../config/config.js";
import passport from "../config/passport-config.js";
import { authenticate } from "../middleware/auth.middleware.js";

const userRouter = Router();
const isProd = config.NODE_ENV === "production";

userRouter.route("/signup").post(createUser);
userRouter.get("/getuser/:id", authenticate, getUser);

userRouter.get("/auth/google", authenticateWithPassport);

userRouter.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/api/user/auth/failure",
    failureMessage: true,
  }),
  googleCallback,
);

userRouter.get("/auth/failure", handleAuthFailure);

userRouter.get("/get-access-token", getAccessToken);

userRouter.get("/refresh-token", refreshAccessToken);

userRouter.get("/logout", logout);

export default userRouter;
