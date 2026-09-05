import { Request, Response } from "express";
import Blog from "../models/blog.model.js";
import fs from "fs";
import {
  uploadoncloudinary,
  deleteCloudnery,
} from "../services/cloudinary.service.js";

// Helper to safely delete local temporary files
const safeUnlink = (filePath?: string) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`Failed to delete temp file ${filePath}:`, err);
    }
  }
};

// ----------------------------------------------------
// 1. CREATE BLOG (Fast, Safe File Cleanup & Duplicate Handling)
// ----------------------------------------------------
export const createBlog = async (req: Request, res: Response) => {
  const files = req.files as {
    coverImage?: Express.Multer.File[];
    pdfs?: Express.Multer.File[];
    csv?: Express.Multer.File[];
  };

  try {
    const { title, slug, content, excerpt, category, tags, author, status } =
      req.body;

    // Validate required fields
    if (!title || !slug || !content || !author) {
      // Clean up uploaded files before early return
      if (files?.coverImage)
        files.coverImage.forEach((f) => safeUnlink(f.path));
      if (files?.csv) files.csv.forEach((f) => safeUnlink(f.path));
      if (files?.pdfs) files.pdfs.forEach((f) => safeUnlink(f.path));

      return res.status(400).json({
        success: false,
        message: "Missing required fields: title, slug, content, or author.",
      });
    }

    // 1. COVER IMAGE UPLOAD
    let coverImage = { url: "", publicId: "" };
    if (files?.coverImage && files.coverImage.length > 0) {
      const coverFile = files.coverImage[0];
      try {
        const result = await uploadoncloudinary(coverFile.path);
        if (result) {
          coverImage = {
            url: result.secure_url,
            publicId: result.public_id,
          };
        }
      } finally {
        safeUnlink(coverFile.path);
      }
    }

    // 2. CSV FILE UPLOAD
    let csv = { url: "" };
    if (files?.csv && files.csv.length > 0) {
      const csvFile = files.csv[0];
      try {
        const result = await uploadoncloudinary(csvFile.path);
        if (result) {
          csv = { url: result.secure_url };
        }
      } finally {
        safeUnlink(csvFile.path);
      }
    }

    // 3. PDFS UPLOAD (Parallel Uploads, Max 3)
    let pdfs: { url: string; publicId: string; originalName: string }[] = [];
    if (files?.pdfs && files.pdfs.length > 0) {
      const uploadPromises = files.pdfs.slice(0, 3).map(async (file) => {
        try {
          const result = await uploadoncloudinary(file.path);
          if (result) {
            return {
              url: result.secure_url,
              publicId: result.public_id,
              originalName: file.originalname,
            };
          }
          return null;
        } finally {
          safeUnlink(file.path);
        }
      });

      const uploadedResults = await Promise.all(uploadPromises);
      pdfs = uploadedResults.filter(Boolean) as {
        url: string;
        publicId: string;
        originalName: string;
      }[];
    }

    // 4. PARSE TAGS & STATUS
    const parsedTags = Array.isArray(tags)
      ? tags
      : typeof tags === "string"
        ? tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

    const finalStatus = status === "DRAFT" ? "DRAFT" : "PUBLISHED";
    const publishedAt = finalStatus === "PUBLISHED" ? new Date() : null;

    // 5. CREATE & SAVE BLOG
    const blog = await Blog.create({
      title: title.trim(),
      slug: slug.trim(),
      content,
      excerpt: excerpt ? excerpt.trim() : "",
      coverImage,
      csv,
      pdfs,
      author,
      category: category ? category.trim() : "General",
      tags: parsedTags,
      status: finalStatus,
      publishedAt,
    });

    return res.status(201).json({
      success: true,
      message: "Blog created successfully",
      blog,
    });
  } catch (error: any) {
    // Clean up all temp files if error occurs during process
    if (files?.coverImage) files.coverImage.forEach((f) => safeUnlink(f.path));
    if (files?.csv) files.csv.forEach((f) => safeUnlink(f.path));
    if (files?.pdfs) files.pdfs.forEach((f) => safeUnlink(f.path));

    console.error("Create blog error:", error);

    // Handle MongoDB duplicate slug collision gracefully
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An article with this title or slug already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create blog",
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};

// ----------------------------------------------------
// 2. GET ALL BLOGS (Admin/Desk - Excludes heavy content)
// ----------------------------------------------------
export const getBlogs = async (req: Request, res: Response) => {
  try {
    const blogs = await Blog.find()
      .select(
        "title slug excerpt coverImage category status tags publishedAt createdAt author",
      )
      .populate("author", "name email")
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
// 3. GET SINGLE BLOG (Fast Reader View + Cached Response)
// ----------------------------------------------------

export const getBlogBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    let slugTrimmed: string | undefined;
    if (slug && typeof slug === "string") {
      slugTrimmed = slug.trim();
    }

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Article slug is required",
      });
    }

    // 1. Fast, read-only query (Zero database write-locks)
    const blog = await Blog.findOne({
      slug: slugTrimmed,
      status: "PUBLISHED",
    })
      .populate("author", "name email")
      .lean();

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // 2. Fire-and-forget view increment (Runs asynchronously in background)
    Blog.updateOne({ _id: blog._id }, { $inc: { views: 1 } }).exec();

    // 3. Cache header: Allows browser & edge cache to serve instantly
    res.setHeader(
      "Cache-Control",
      "public, max-age=120, stale-while-revalidate=300",
    );

    return res.status(200).json({
      success: true,
      message: "Blog fetched successfully",
      blog,
    });
  } catch (error) {
    console.error("Get blog error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch blog",
    });
  }
};

// 3. GET PUBLISHED BLOGS (Fast Discover Feed & Search)
export const getPublishedBlogs = async (req: Request, res: Response) => {
  try {
    const { search, category, tag, page = "1", limit = "10" } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const filter: any = {
      status: "PUBLISHED",
    };

    // Fast search: search title, excerpt, and tags
    // (Never scan content with regex when content contains large base64 media)
    if (search && typeof search === "string" && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      filter.$or = [
        { title: searchRegex },
        { excerpt: searchRegex },
        { tags: searchRegex },
      ];
    }

    // Category filter
    if (category && typeof category === "string" && category.trim()) {
      filter.category = {
        $regex: `^${category.trim()}$`,
        $options: "i",
      };
    }

    // Tag filter
    if (tag && typeof tag === "string" && tag.trim()) {
      filter.tags = {
        $regex: tag.trim(),
        $options: "i",
      };
    }

    const skip = (currentPage - 1) * perPage;

    const [blogs, totalBlogs] = await Promise.all([
      Blog.find(filter)
        // Select ONLY feed metadata - cuts response payload by up to 95%
        .select(
          "title slug excerpt coverImage category tags publishedAt author views",
        )
        .populate("author", "name email")
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean(), // Fast plain JavaScript objects

      Blog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Published blogs fetched successfully",
      pagination: {
        page: currentPage,
        limit: perPage,
        totalBlogs,
        totalPages: Math.ceil(totalBlogs / perPage),
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
