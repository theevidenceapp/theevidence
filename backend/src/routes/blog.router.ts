import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import {
  createBlog,
  getBlogs,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  updateBlogStatus,
  getPublishedBlogs,
  getDeskOverview,
} from "../controllers/blog.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import Blog, { IBlog } from "../models/blog.model.js";
import multer from "multer";

import { authenticate } from "../middleware/auth.middleware.js";
import mongoose from "mongoose";

const blogRouter = Router();

// Reusable fields definition for upload & update
const uploadMiddleware = upload.fields([
  { name: "coverImage", maxCount: 1 },
  { name: "pdfs", maxCount: 3 },
  { name: "csv", maxCount: 1 },
]);

// Wrapper to catch Multer errors cleanly
const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer Error:", err);
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      console.error("Unknown Upload Error:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed",
      });
    }
    next();
  });
};

// ==========================================
// 1. PUBLIC ROUTES (Anyone can view/read)
// ==========================================
blogRouter.get("/published", getPublishedBlogs);
blogRouter.get("/getall", getBlogs);
blogRouter.get("/get/:slug", getBlogBySlug);

// ==========================================
// 2. PROTECTED ROUTES (Requires Login)
// ==========================================
// Everything below this line will require the user to be logged in
blogRouter.use(authenticate);

blogRouter.post("/upload", handleUpload, createBlog);
blogRouter.put("/update/:id", handleUpload, updateBlog); // Reuses handleUpload for safe error catching
blogRouter.delete("/delete/:id", deleteBlog);
blogRouter.put("/statusupdate/:id", updateBlogStatus);
blogRouter.get("/overview", getDeskOverview);
// Derive the filter type directly from Blog.find's actual parameter type.
// This is robust across Mongoose versions since it doesn't depend on a
// specific named/namespace export existing in the type declarations.
type BlogFilterQuery = Parameters<typeof Blog.find>[0];

const ALLOWED_DOC_TYPES = ["RESEARCH", "BLOG"] as const;
type DocType = (typeof ALLOWED_DOC_TYPES)[number];

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

blogRouter.get("/published-by-type", async (req: Request, res: Response) => {
  try {
    const rawDocType =
      (req.query.docType as string | undefined)?.toUpperCase() ?? "RESEARCH";

    if (!ALLOWED_DOC_TYPES.includes(rawDocType as DocType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid docType. Allowed values: ${ALLOWED_DOC_TYPES.join(", ")}`,
      });
    }
    const docType = rawDocType as DocType;

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(
        1,
        parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      ),
    );
    const skip = (page - 1) * limit;

    const query: BlogFilterQuery = {
      status: "PUBLISHED",
      docType,
    };

    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .select("-content")
        .populate("author", "name avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Blog.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      blogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasMore: skip + blogs.length < total,
      },
    });
  } catch (err) {
    console.error("[GET /published-by-type] Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

export default blogRouter;
