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

blogRouter.get("/published-by-type", async (req, res) => {
  try {
    const docTypeParam = (req.query.docType || "RESEARCH")
      .toString()
      .toUpperCase();

    const docTypeRegex = new RegExp(`^${docTypeParam}$`, "i");

    const query: Record<string, any> = {
      status: "PUBLISHED",
      docType: docTypeRegex,
    };

    const blogs = await Blog.find(query)
      .populate("author", "name avatar")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      blogs,
      pagination: {
        page: 1,
        totalPages: 1,
        hasMore: false,
      },
    });
    return;
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
    return;
  }
});

export default blogRouter;
