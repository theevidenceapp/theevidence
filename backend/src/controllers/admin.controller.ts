import { Request, Response } from "express";
import User from "../models/user.model.js";
import Blog from "../models/blog.model.js";

export const BlockUser = async (req: Request, res: Response) => {
    try {
        const useremail = req.params.email;

        const user = await User.findOne({ email: useremail });

        if (!user) {
            return res.status(404).json({
                success: false,
                msg: "User not found",
            });
        }

        user.isActive = false;

        await user.save();

        return res.status(200).json({
            success: true,
            msg: "User blocked successfully",
            user,
        });
    } catch (error) {
        console.error("Block user error:", error);

        return res.status(500).json({
            success: false,
            msg: "Internal Server Error",
        });
    }
};

export const getBlockedUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ isActive: false });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get blocked users error:", error);

    return res.status(500).json({
      success: false,
      msg: "Internal Server Error",
    });
  }
};

export const unblockUser = async (req: Request, res: Response) => {
  try {
    const useremail = req.params.email;

    const user = await User.findOne({ email: useremail });

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });
    }

    if (user.isActive === true) {
      return res.status(409).json({
        success: false,
        msg: "User is already active",
      });
    }

    user.isActive = true;

    await user.save();

    return res.status(200).json({
      success: true,
      msg: "User unblocked successfully",
      user,
    });
  } catch (error) {
    console.error("Unblock user error:", error);

    return res.status(500).json({
      success: false,
      msg: "Internal Server Error",
    });
  }
};

export const makeEditor = async (req: Request, res: Response) => {
  try {
    const useremail = req.params.email;

    const user = await User.findOne({ email: useremail });

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });
    }

    if (user.role === "EDITOR") {
      return res.status(409).json({
        success: false,
        msg: "User is already an editor",
      });
    }

    user.role = "EDITOR";

    await user.save();

    return res.status(200).json({
      success: true,
      msg: "User promoted to editor successfully",
      user,
    });
  } catch (error) {
    console.error("Make editor error:", error);

    return res.status(500).json({
      success: false,
      msg: "Internal Server Error",
    });
  }
};

export const removeEditor = async (req: Request, res: Response) => {
  try {
    const useremail = req.params.email;

    const user = await User.findOne({ email: useremail });

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });
    }

    if (user.role !== "EDITOR") {
      return res.status(409).json({
        success: false,
        msg: "User is not an editor",
      });
    }

    user.role = "READER";

    await user.save();

    return res.status(200).json({
      success: true,
      msg: "Editor role removed successfully",
      user,
    });
  } catch (error) {
    console.error("Remove editor error:", error);

    return res.status(500).json({
      success: false,
      msg: "Internal Server Error",
    });
  }
};

export const getAnalytics = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await Blog.aggregate([
      {
        $match: {
          status: "PUBLISHED",
        },
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$views" },
          totalBlogs: { $sum: 1 },
        },
      },
    ]);

    const analytics = result[0] || {
      totalViews: 0,
      totalBlogs: 0,
    };

    return res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error("Analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
    });
  }
};

export const getBlogAnalytics = async (
  req: Request,
  res: Response
) => {
  try {
    const blogs = await Blog.find(
      { status: "PUBLISHED" },
      {
        title: 1,
        slug: 1,
        views: 1,
        createdAt: 1,
      }
    ).sort({ views: -1 });

    return res.status(200).json({
      success: true,
      blogs,
    });
  } catch (error) {
    console.error("Blog analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch blog analytics",
    });
  }
};