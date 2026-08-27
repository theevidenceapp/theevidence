import { NextFunction, Request, Response } from "express";
import User from "../models/user.model.js";
import passport from "../config/passport-config.js";
import config from "../config/config.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

const isProd = config.NODE_ENV === "production";

export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, name, avatar } = req.body;
    const user = await User.create({
      email,
      name,
      avatar,
      role: "PUBLISHER",
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

export const getEditor = async (req: Request, res: Response) => {
  try {
    const editor = await User.find({ role: "EDITOR" });
    if (!editor) {
      return res.status(404).json({ msg: "no editor found" });
    }
    return res.status(200).json({ msg: "editors found", editor });
  } catch (error) {
    return res.status(500).json({ msg: `Internal server error` });
  }
};

export const getPublisher = async (req: Request, res: Response) => {
  try {
    const editor = await User.find({ role: "PUBLISHER" });
    if (!editor) {
      return res.status(404).json({ msg: "no editor found" });
    }
    return res.status(200).json({ msg: "editors found", editor });
  } catch (error) {
    return res.status(500).json({ msg: `Internal server error` });
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

    if (userExists) {
      userExists.accessToken = accessToken;
    }

    await userExists.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
        message:
          "Account already exists via email auth. Please log in instead.",
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

export const getAccessToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res
        .status(401)
        .json(new ApiError(401, "No refresh token provided"));
    }

    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as {
      userId: string;
    };

    const userExists = await User.findById(decoded.userId);

    if (!userExists) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const accessToken = userExists.accessToken;

    if (!accessToken) {
      const newAccessToken = userExists.generateAuthToken();
      userExists.accessToken = newAccessToken;
      await userExists.save();
      return res.status(200).json({
        success: true,
        accessToken: newAccessToken,
      });
    }

    return res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error: any) {
    return res
      .status(401)
      .json(new ApiError(401, "Error fetching access token", error));
  }
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res
        .status(401)
        .json(new ApiError(401, "No refresh token provided"));
    }

    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as {
      userId: string;
    };

    const userExists = await User.findById(decoded.userId);

    if (!userExists) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    const newAccessToken = userExists.generateAuthToken();
    userExists.accessToken = newAccessToken;
    await userExists.save();

    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error: any) {
    return res
      .status(401)
      .json(new ApiError(401, "Error refreshing access token", error));
  }
};
