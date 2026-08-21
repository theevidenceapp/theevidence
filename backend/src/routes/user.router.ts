import { NextFunction, Request, Response, Router } from "express";
import { createUser, getUser } from "../controllers/auth.controller.js";
import config from "../config/config.js";
import passport from "../config/passport-config.js";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

const userRouter = Router();
const isProd = config.NODE_ENV === "production";

userRouter.route("/signup").post(createUser);
userRouter.route("/getuser/:id").get(getUser);

userRouter.get(
  "/auth/google",
  (req: Request, res: Response, next: NextFunction) => {
    const { site } = req.query;
    console.log("Using callback:", config.GOOGLE_CALLBACK_URL);
    console.log("Captured site query parameter:", site);
    passport.authenticate("google", {
      scope: ["openid", "profile", "email"],
      state: site ? String(site) : undefined,
    })(req, res, next);
  },
);

userRouter.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/api/user/auth/failure",
    failureMessage: true,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { state: site } = req.query;
      const user = req.user;
      console.log("site:", site);

      if (!user) {
        return next(new ApiError(401, "Authentication failed"));
      }

      if (site === "admin" && user.role !== "ADMIN") {
        return res.redirect(
          `${config.ADMIN_CLIENT_URL}/auth/login?error=admin_access_denied`,
        );
      }

      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      const userExists = await User.findById(user._id.toString());

      if (!userExists) {
        return res
          .status(500)
          .json(new ApiError(500, "Authentication Failure"));
      }

      await userExists.save();

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.redirect(
        `${site === "admin" ? config.ADMIN_CLIENT_URL : config.CLIENT_URL}/verify-token?token=${accessToken}`,
      );
    } catch (error) {
      console.error(error);
      next(error);
    }
  },
);

userRouter.get("/auth/failure", (req, res) => {
  const error = req.session.messages?.[0];

  if (error?.code === "EMAIL_ALREADY_EXISTS") {
    return res.status(409).json({
      success: false,
      error: {
        code: "EMAIL_ALREADY_EXISTS",
        message: "Account already exists. Please log in instead.",
      },
    });
  }

  return res.status(400).json({
    success: false,
    error: {
      code: "OAUTH_FAILED",
      message: "Google authentication failed",
    },
  });
});

export default userRouter;
