import { Router } from "express";
import { createBlog, getBlogs, getBlogBySlug, updateBlog, deleteBlog, updateBlogStatus,getPublishedBlogs } from "../controllers/blog.controller.js";
import { upload } from "../middleware/multer.middleware.js";

const blogRouter = Router();

blogRouter.post(
    "/upload",
    upload.fields([
        { name: "coverImage", maxCount: 1 },
        { name: "pdfs", maxCount: 3 },
    ]),
    createBlog
);

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