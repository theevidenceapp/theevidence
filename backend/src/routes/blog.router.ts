import { Router, type Request, type Response, type NextFunction } from "express";
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
import Blog from "../models/blog.model.js";
import multer from "multer";

import { authenticate } from "../middleware/auth.middleware.js";

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

// Add this exact GET route in your backend router (e.g., blog.routes.ts or similar)
blogRouter.get("/published-by-type", async (req: Request, res: Response) => {
  try {
    const docType = (req.query.docType || "RESEARCH").toString().toUpperCase();
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 24);
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {
      status: "PUBLISHED",
      docType: docType,
    };

    // Execute queries in parallel for better database performance
    const [blogs, total] = await Promise.all([
      Blog.find(query)
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
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: skip + blogs.length < total,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
});

export default blogRouter;