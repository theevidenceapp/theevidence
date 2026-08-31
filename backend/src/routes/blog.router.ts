import { Router } from "express";
import { createBlog, getBlogs, getBlogBySlug, updateBlog, deleteBlog, updateBlogStatus,getPublishedBlogs } from "../controllers/blog.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import multer from "multer";
const blogRouter = Router();

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

blogRouter.post("/upload", handleUpload, createBlog);

blogRouter.get("/getall", getBlogs);

blogRouter.get("/get/:slug", getBlogBySlug);

blogRouter.put(
    "/update/:id",
    upload.fields([
        {
            name: "coverImage",
            maxCount: 1,
        },
        {
            name: "pdfs",
            maxCount: 3,
        },
    ]),
    updateBlog
);

blogRouter.delete("/delete/:id", deleteBlog);
blogRouter.put("/statusupdate/:id",updateBlogStatus);
blogRouter.get("/published", getPublishedBlogs);
export default blogRouter;