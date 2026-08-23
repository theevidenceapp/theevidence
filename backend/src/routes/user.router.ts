import { NextFunction, Request, Response, Router } from "express";
import {
  authenticateWithPassport,
  createUser,
  getUser,
  googleCallback,
  handleAuthFailure,
} from "../controllers/auth.controller.js";
import config from "../config/config.js";
import passport from "../config/passport-config.js";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

const userRouter = Router();
const isProd = config.NODE_ENV === "production";

userRouter.route("/signup").post(createUser);
userRouter.route("/getuser/:id").get(getUser);

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

export default userRouter;
