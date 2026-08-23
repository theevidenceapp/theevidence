import { NextFunction, Request, Response } from "express";
import User from "../models/user.model.js";
import passport from "../config/passport-config.js";
import config from "../config/config.js";
import { ApiError } from "../utils/ApiError.js";

const isProd = config.NODE_ENV === "production";

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, name, avatar } = req.body;

    const user = await User.create({
      email,
      name,
      avatar,
    });

    res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get user",
    });
  }
};

export const authenticateWithPassport = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { site } = req.query;
  passport.authenticate("google", {
    scope: ["openid", "profile", "email"],
    state: site ? String(site) : undefined,
  })(req, res, next);
};

export const googleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
      return res.status(500).json(new ApiError(500, "Authentication Failure"));
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
};

export const handleAuthFailure = (req: Request, res: Response) => {
  const error = req.session.messages?.[0];

  if (error?.code === "EMAIL_ALREADY_EXISTS") {
    return res.status(409).json({
      success: false,
      error: {
        code: "EMAIL_ALREADY_EXISTS",
        message: "Account already exists via email auth. Please log in instead.",
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
};
