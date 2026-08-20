import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import User, { IUser } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

type UserRole = IUser["role"];

interface JwtPayload {
  userId: string;
  fullname: string;
  email: string;
  role: "READER" | "PUBLISHER" | "ADMIN" | "EDITOR";
}

/**
 * Authentication Middleware
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json(new ApiError(401, "Authentication required"));
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json(new ApiError(401, "User not found"));
    }

    if (!user.isActive) {
      return res.status(403).json(new ApiError(403, "Account is inactive"));
    }

    req.user = user;

    next();
  } catch (error) {
    return res
      .status(401)
      .json(new ApiError(401, "Invalid or expired access token"));
  }
};

/**
 * Authorization Middleware
 */

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {

    if (!req.user) {
      return res.status(401).json(new ApiError(401, "Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json(
          new ApiError(
            403,
            "You do not have permission to perform this action",
          ),
        );
    }

    next();
  };
};
