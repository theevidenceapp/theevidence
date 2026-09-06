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
    } catch (e) {
      console.error("Failed to clean up file:", filePath, e);
    }
  }
};

export const createBlog = async (req: Request, res: Response) => {
  try {
    const docType = req.body.docType ? req.body.docType.toUpperCase() : "RESEARCH";
    const authorId = (req as any).user?._id;
    const { title, slug, content, excerpt, category, tags, author, status } = req.body;

    // Typecast files from multer so TypeScript recognizes the structure and file paths
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    // Helper for safe cleanup if files exist
    const cleanupUploadedFiles = () => {
      if (typeof safeUnlink === "function" && files) {
        if (files.coverImage) files.coverImage.forEach((f) => safeUnlink(f.path));
        if (files.csv) files.csv.forEach((f) => safeUnlink(f.path));
        if (files.pdfs) files.pdfs.forEach((f) => safeUnlink(f.path));
      }
    };

    // 1. Validate Authentication
    if (!authorId) {
      cleanupUploadedFiles();
      return res.status(401).json({ success: false, message: "No user found in token" });
    }

    // 2. Validate Required Fields
    if (!title || !slug || !content) {
      cleanupUploadedFiles();
      return res.status(400).json({ success: false, message: "Title, slug, and content are required" });
    }

    // 3. BYPASS CLOUDINARY TEMPORARILY (Declared in outer try-catch scope)
    const coverImage = {
      url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400",
      publicId: "test",
    };
    const csv = { url: "" };
    let pdfs: Array<{ url: string; publicId: string; originalName: string }> = [];

    // Note: If you want to enable uploadPromises later, define the array first before awaiting:
    // const uploadPromises: Promise<any>[] = [];
    // const uploadedResults = await Promise.all(uploadPromises);
    // pdfs = uploadedResults.filter(Boolean);

    // 4. PARSE TAGS & STATUS
    const parsedTags = Array.isArray(tags)
      ? tags
      : typeof tags === "string"
        ? tags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [];

    const finalStatus = status === "DRAFT" ? "DRAFT" : "PUBLISHED";
    const publishedAt = finalStatus === "PUBLISHED" ? new Date() : null;

    // 5. CREATE & SAVE BLOG
    const blog = await Blog.create({
      title,
      slug,
      content,
      excerpt,
      docType,
      category: category || "General",
      status: finalStatus,
      tags: parsedTags,
      publishedAt,
      author: authorId,
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

    // Notice the quotes: typeof slug !== "string"
    if (!slug || typeof slug !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid slug is required",
      });
    }


    // Find by slug, populate author info
    const blog = await Blog.findOne({ slug: slug.trim() })
      .populate("author", "name username avatar bio")
      .lean();

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Paper or blog post not found",
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

// 3. GET PUBLISHED BLOGS (Fast Discover Feed & Search)
export const getPublishedBlogs = async (req: Request, res: Response) => {
  try {
    const { search, category, tag, page = "1", limit = "12" } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.min(Math.max(Number(limit) || 12, 1), 50);

    const filter: any = {
      status: "PUBLISHED",
    };

    // Fast search: Only scan title, excerpt, and tags (NEVER scan heavy base64 content)
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
        .select("title slug excerpt coverImage category tags publishedAt author views createdAt")
        .populate("author", "name email avatar")
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean(),

      Blog.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalBlogs / perPage);
    const hasMore = currentPage < totalPages;

    // Cache responses briefly to maximize performance
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
