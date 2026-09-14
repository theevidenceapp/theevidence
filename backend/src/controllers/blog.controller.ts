import { Request, Response } from "express";
import Blog from "../models/blog.model.js";
import fs from "fs";
import {
  uploadoncloudinary,
  deleteCloudnery,
} from "../services/cloudinary.service.js";
import mongoose from "mongoose";

// Helper to safely delete local temporary files
const safeUnlink = (filePath?: string) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error("Failed to clean up file:", filePath, e);
    }
  }
};

// ----------------------------------------------------
// 1. CREATE BLOG / RESEARCH PAPER (With Co-Authors Support)
// ----------------------------------------------------
export const createBlog = async (req: Request, res: Response) => {
  try {
    const docType = req.body.docType ? req.body.docType.toUpperCase() : "RESEARCH";
    const authorId = (req as any).user?._id;
    const { title, slug, content, excerpt, category, tags, status, coAuthors, seoKeywords } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    const cleanupUploadedFiles = () => {
      if (files) {
        if (files.coverImage) files.coverImage.forEach((f) => safeUnlink(f.path));
        if (files.csv) files.csv.forEach((f) => safeUnlink(f.path));
        if (files.pdfs) files.pdfs.forEach((f) => safeUnlink(f.path));
      }
    };

    if (!authorId) {
      cleanupUploadedFiles();
      return res.status(401).json({ success: false, message: "No user found in token" });
    }

    if (!title || !slug || !content) {
      cleanupUploadedFiles();
      return res.status(400).json({ success: false, message: "Title, slug, and content are required" });
    }

    let coverImage = {
      url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400",
      publicId: "default",
    };
    let csv = { url: "" };
    let pdfs: Array<{ url: string; publicId: string; originalName: string }> = [];

    if (files) {
      if (files.coverImage && files.coverImage[0]) {
        const coverResult = await uploadoncloudinary(files.coverImage[0].path);
        if (coverResult) {
          coverImage = { url: coverResult.secure_url, publicId: coverResult.public_id };
        }
      }
      if (files.csv && files.csv[0]) {
        const csvResult = await uploadoncloudinary(files.csv[0].path);
        if (csvResult) {
          csv = { url: csvResult.secure_url };
        }
      }
      if (files.pdfs && files.pdfs.length > 0) {
        const pdfUploadPromises = files.pdfs.map(async (file) => {
          const pdfResult = await uploadoncloudinary(file.path);
          if (pdfResult) {
            return { url: pdfResult.secure_url, publicId: pdfResult.public_id, originalName: file.originalname };
          }
          return null;
        });
        const uploadedPdfs = await Promise.all(pdfUploadPromises);
        pdfs = uploadedPdfs.filter(Boolean) as any;
      }
    }

    const parsedTags = Array.isArray(tags)
      ? tags
      : typeof tags === "string"
        ? tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [];

    // 🛠️ Parse Sir's SEO keywords from comma-separated string to array
    const parsedSeoKeywords = Array.isArray(seoKeywords)
      ? seoKeywords
      : typeof seoKeywords === "string"
        ? seoKeywords.split(",").map((k: string) => k.trim()).filter(Boolean)
        : [];

    // Safely parse coAuthors array of IDs from FormData or request body
    let parsedCoAuthors: mongoose.Types.ObjectId[] = [];
    const rawCoAuthors = coAuthors || req.body["coAuthors[]"];
    if (rawCoAuthors) {
      const coAuthorArray = Array.isArray(rawCoAuthors) ? rawCoAuthors : [rawCoAuthors];
      parsedCoAuthors = coAuthorArray
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    }

    const finalStatus = status === "DRAFT" ? "DRAFT" : "DRAFT";
    const publishedAt = finalStatus === "PUBLISHED" ? new Date() : null;

    const blog = await Blog.create({
      title,
      slug,
      content,
      excerpt,
      seoKeywords: parsedSeoKeywords, // 👈 Saved into database
      docType,
      category: category || "General",
      status: finalStatus,
      tags: parsedTags,
      publishedAt,
      author: authorId,
      coAuthors: parsedCoAuthors,
      coverImage,
      csv,
      pdfs,
    });

    console.log("✅ Blog created successfully:", blog._id);

    return res.status(201).json({
      success: true,
      message: "Blog created successfully",
      blog,
    });
  } catch (err: any) {
    console.error("❌ DB Creation Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ----------------------------------------------------
// 2. GET ALL BLOGS (Admin/Desk)
// ----------------------------------------------------
export const getBlogs = async (req: Request, res: Response) => {
  try {
    const blogs = await Blog.find()
      .select("title slug excerpt seoKeywords coverImage category status tags publishedAt createdAt author coAuthors")
      .populate("author", "name email avatar")
      .populate("coAuthors", "name email avatar")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Blogs fetched successfully",
      blogs,
    });
  } catch (error) {
    console.error("Get blogs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch blogs",
    });
  }
};

// ----------------------------------------------------
// 3. GET SINGLE BLOG BY SLUG (Fast Reader View)
// ----------------------------------------------------
export const getBlogBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    if (!slug || typeof slug !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid slug is required",
      });
    }

    const blog = await Blog.findOne({ slug: slug.trim() })
      .populate("author", "name username avatar bio")
      .populate("coAuthors", "name username avatar bio")
      .lean();

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Paper or blog post not found",
      });
    }

    Blog.updateOne({ _id: blog._id }, { $inc: { views: 1 } }).exec();

    res.setHeader(
      "Cache-Control",
      "public, max-age=120, stale-while-revalidate=300",
    );

    return res.status(200).json({
      success: true,
      blog,
    });
  } catch (error: any) {
    console.error("Get blog error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching article",
      error: error.message,
    });
  }
};

// ----------------------------------------------------
// 4. GET PUBLISHED BLOGS (Discover Feed)
// ----------------------------------------------------
export const getPublishedBlogs = async (req: Request, res: Response) => {
  try {
    const { search, category, tag, page = "1", limit = "12" } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.min(Math.max(Number(limit) || 12, 1), 50);

    const filter: any = {
      status: "PUBLISHED",
    };

    if (search && typeof search === "string" && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      filter.$or = [
        { title: searchRegex },
        { excerpt: searchRegex },
        { tags: searchRegex },
        { seoKeywords: searchRegex }, // 👈 Include SEO keywords in search filtering
      ];
    }

    if (category && typeof category === "string" && category.trim()) {
      filter.category = {
        $regex: `^${category.trim()}$`,
        $options: "i",
      };
    }

    if (tag && typeof tag === "string" && tag.trim()) {
      filter.tags = {
        $regex: tag.trim(),
        $options: "i",
      };
    }

    const skip = (currentPage - 1) * perPage;

    const [blogs, totalBlogs] = await Promise.all([
      Blog.find(filter)
        .select("title slug excerpt seoKeywords coverImage category tags publishedAt author coAuthors views createdAt docType")
        .populate("author", "name email avatar")
        .populate("coAuthors", "name email avatar")
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean(),

      Blog.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalBlogs / perPage);
    const hasMore = currentPage < totalPages;

    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");

    return res.status(200).json({
      success: true,
      message: "Published blogs fetched successfully",
      pagination: {
        page: currentPage,
        limit: perPage,
        totalBlogs,
        totalPages,
        hasMore,
      },
      blogs,
    });
  } catch (error) {
    console.error("Get published blogs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch published blogs",
    });
  }
};


export const getDeskOverview = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Query blogs belonging to this researcher
    const userBlogs = await Blog.find({ author: userId }).sort({ createdAt: -1 });

    const drafts = userBlogs.filter((b) => b.status === "DRAFT");
    const published = userBlogs.filter((b) => b.status === "PUBLISHED");
    const pending = userBlogs.filter((b) => b.status === "PENDING");
    const rejected = userBlogs.filter((b) => b.status === "REJECTED");

    return res.status(200).json({
      success: true,
      stats: {
        total: userBlogs.length,
        draftsCount: drafts.length,
        publishedCount: published.length,
        pendingCount: pending.length,
        rejectedCount: rejected.length,
      },
      papers: userBlogs,
      drafts,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

//update blog
export const updateBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { title, slug, content, excerpt, category, tags } = req.body;

    const files = req.files as {
      coverImage?: Express.Multer.File[];
      pdfs?: Express.Multer.File[];
    };

    // Find existing blog
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // -------------------------
    // UPDATE TEXT FIELDS
    // -------------------------

    if (title !== undefined) blog.title = title;
    if (slug !== undefined) blog.slug = slug;
    if (content !== undefined) blog.content = content;
    if (excerpt !== undefined) blog.excerpt = excerpt;
    if (category !== undefined) blog.category = category;
    if (tags !== undefined) blog.tags = tags;

    // -------------------------
    // UPDATE COVER IMAGE
    // -------------------------

    if (files?.coverImage && files.coverImage.length > 0) {
      // Delete old cover image
      if (blog.coverImage?.publicId) {
        await deleteCloudnery(blog.coverImage.publicId);
      }

      // Upload new cover image
      const result = await uploadoncloudinary(files.coverImage[0].path);

      if (!result) {
        return res.status(500).json({
          success: false,
          message: "Cover image upload failed",
        });
      }

      blog.coverImage = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    // -------------------------
    // UPDATE PDFs
    // -------------------------

    if (files?.pdfs && files.pdfs.length > 0) {
      // Delete old PDFs
      for (const pdf of blog.pdfs) {
        if (pdf.publicId) {
          await deleteCloudnery(pdf.publicId);
        }
      }

      // Remove old PDFs
      blog.pdfs = [];

      // Upload new PDFs
      for (const file of files.pdfs) {
        const result = await uploadoncloudinary(file.path);

        if (result) {
          blog.pdfs.push({
            url: result.secure_url,
            publicId: result.public_id,
            originalName: file.originalname,
          });
        }
      }
    }

    await blog.save();

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      blog,
    });
  } catch (error) {
    console.error("Update blog error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update blog",
    });
  }
};

export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find blog
    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // Delete cover image from Cloudinary
    if (blog.coverImage?.publicId) {
      await deleteCloudnery(blog.coverImage.publicId);
    }

    // Delete all PDFs from Cloudinary
    if (blog.pdfs && blog.pdfs.length > 0) {
      for (const pdf of blog.pdfs) {
        if (pdf.publicId) {
          await deleteCloudnery(pdf.publicId);
        }
      }
    }

    // Delete blog from MongoDB
    await Blog.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error("Delete blog error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete blog",
    });
  }
};

export const updateBlogStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = [
      "DRAFT",
      "PENDING",
      "APPROVED",
      "PUBLISHED",
      "REJECTED",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blog status",
      });
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    blog.status = status;

    // Set publishedAt when blog becomes published
    if (status === "PUBLISHED") {
      blog.publishedAt = new Date();
    }

    // Remove published date if it is moved away from published
    if (status !== "PUBLISHED") {
      blog.publishedAt = null;
    }

    await blog.save();

    return res.status(200).json({
      success: true,
      message: "Blog status updated successfully",
      blog,
    });
  } catch (error) {
    console.error("Update blog status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update blog status",
    });
  }
};
