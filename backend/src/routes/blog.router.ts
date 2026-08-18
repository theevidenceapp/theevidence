import { Router } from "express";
import { createBlog } from "../controllers/blog.controller.js";
import upload from "../middleware/multer.middleware.js";

const blogRouter = Router();

blogRouter
  .route("/upload")
  .post(upload.single("coverImage"), createBlog);

export default blogRouter;